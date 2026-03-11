"""
Copilot Architecture Advisor — FastAPI Backend
Phases 1-4: Wizard + Scoring + RAG + Foundry + Admin
"""

import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.scoring.engine import compute_scores
from app.scoring.contracts import validate_answers
from app.scoring.rag import apply_rag_adjustment
from app.knowledge.sqlite_store import get_connection, save_use_case, get_cases
from app.knowledge.healthcare_cases import HEALTHCARE_CASES
from app.knowledge.chroma_store import get_collection, get_doc_count
from app.spec.generator import generate_spec
from app.spec.agents import run_full_validation_pipeline
from app.agents.guidance_sync import (
    run_full_sync,
    get_sync_status,
    add_custom_document,
    SEED_SOURCES,
)
from app.agents.foundry_client import (
    call_foundry_agent,
    is_foundry_available,
    handle_search_guidance,
)
from app.auth import require_entra

logger = logging.getLogger(__name__)

_scheduler = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    global _scheduler
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        _scheduler = AsyncIOScheduler()
        _scheduler.add_job(
            run_full_sync, "cron", hour=6, minute=0,
            id="daily_guidance_sync", replace_existing=True,
        )
        _scheduler.start()
        logger.info("APScheduler started — daily guidance sync at 06:00 UTC")
    except Exception as e:
        logger.warning(f"APScheduler setup failed (non-critical): {e}")
    yield
    if _scheduler:
        _scheduler.shutdown(wait=False)


app = FastAPI(title="Copilot Architecture Advisor", lifespan=lifespan)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


# ─── Request Models ───────────────────────────────────────────────

class RecommendRequest(BaseModel):
    useCaseName: str = ""
    primaryGoal: str = ""
    complexity: str = "simple"
    dataSources: list[str] = []
    hasPhi: str = "no"
    uxChannel: str = "teams"
    codeCapability: str = "lowcode"
    userVolume: str = "medium"
    realtime: str = "no"
    teamSize: str = "medium"
    agentBehavior: str = ""
    customModel: str = "no"
    humanInLoop: str = "no"


class FeedbackRequest(BaseModel):
    use_case_id: str
    actual_arch: str
    was_correct: bool
    notes: str = ""


class GuidanceAskRequest(BaseModel):
    question: str
    arch_filter: str = "ALL"



class UploadCaseRequest(BaseModel):
    useCaseName: str
    primaryGoal: str
    category: str = "Custom"
    complexity: str = "moderate"
    dataSources: list[str] = []
    hasPhi: str = "no"
    uxChannel: str = "web"
    codeCapability: str = "mixed"
    userVolume: str = "medium"
    realtime: str = "no"
    teamSize: str = "medium"
    agentBehavior: str = "guided"
    customModel: str = "no"
    humanInLoop: str = "no"
    description: str = ""

class AnalyzeDocumentRequest(BaseModel):
    content: str
    filename: str = ""

class CustomDocRequest(BaseModel):
    url: str
    title: str = ""
    arch_tags: list[str] = []


# ─── Health ───────────────────────────────────────────────────────

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "chroma_docs": get_doc_count(),
        "foundry_available": is_foundry_available(),
    }


# ─── Phase 1: Core Wizard + Scoring ──────────────────────────────

@app.post("/api/recommend")
async def recommend(req: RecommendRequest):
    """Rule-based scoring with optional RAG augmentation."""
    answers = req.model_dump()
    validate_answers(answers)
    ranked = compute_scores(answers)

    # Phase 2: Apply RAG augmentation if ChromaDB has data
    citations: list[dict] = []
    try:
        collection = get_collection()
        if collection.count() > 0:
            scores_dict = {r["id"]: r["score"] for r in ranked}
            scores_dict, citations = apply_rag_adjustment(scores_dict, answers, collection)
            for r in ranked:
                r["score"] = scores_dict.get(r["id"], r["score"])
                r["citations"] = [c for c in citations if r["id"] in c.get("arch", "")]
            ranked.sort(key=lambda x: x["score"], reverse=True)
            max_score = max(r["score"] for r in ranked) if ranked else 1
            if max_score == 0:
                max_score = 1
            for r in ranked:
                r["confidence"] = round(r["score"] / max_score, 2) if max_score > 0 else 0.0
    except Exception as e:
        logger.warning(f"RAG augmentation skipped: {e}")

    primary = ranked[0] if ranked else {}
    spec = generate_spec(answers, ranked)

    sync_status = get_sync_status()
    guidance_version = None
    if sync_status.get("last_sync"):
        guidance_version = sync_status["last_sync"].get("synced_at")

    session_id = save_use_case(
        answers=answers,
        primary_arch=primary.get("id", ""),
        confidence=primary.get("confidence", 0.0),
        ranked=ranked,
    )

    return {
        "session_id": session_id,
        "ranked": ranked,
        "spec": spec,
        "foundry_enhanced": False,
        "guidance_version": guidance_version,
        "citations": citations,
    }


@app.get("/api/cases")
async def list_cases(page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100)):
    cases = get_cases(page=page, per_page=per_page)
    return {"cases": cases, "page": page, "per_page": per_page}


@app.get("/api/healthcare-cases")
async def healthcare_cases(category: str = Query("", description="Filter by category")):
    """Return 50 predefined healthcare use cases, each pre-scored through the engine."""
    results = []
    for case in HEALTHCARE_CASES:
        answers = {
            "useCaseName": case["useCaseName"],
            "primaryGoal": case["primaryGoal"],
            "complexity": case.get("complexity", "simple"),
            "dataSources": case.get("dataSources", []),
            "hasPhi": case.get("hasPhi", "no"),
            "uxChannel": case.get("uxChannel", "teams"),
            "codeCapability": case.get("codeCapability", "lowcode"),
            "userVolume": case.get("userVolume", "medium"),
            "realtime": case.get("realtime", "no"),
            "teamSize": case.get("teamSize", "medium"),
            "agentBehavior": case.get("agentBehavior", ""),
            "customModel": case.get("customModel", "no"),
            "humanInLoop": case.get("humanInLoop", "no"),
        }
        ranked = compute_scores(answers)
        spec = generate_spec(answers, ranked)
        primary = ranked[0] if ranked else {}
        # Inject architecture reasoning into spec for display
        if case.get("whyThisArchitecture"):
            spec["whyThisArchitecture"] = case["whyThisArchitecture"]
        if case.get("alternativeConsidered"):
            spec["alternativeConsidered"] = case["alternativeConsidered"]
        entry = {
            "id": case["id"],
            "useCaseName": case["useCaseName"],
            "primaryGoal": case["primaryGoal"],
            "category": case.get("category", ""),
            "answers": answers,
            "ranked": ranked,
            "spec": spec,
            "primary_arch": primary.get("id", ""),
            "primary_label": primary.get("label", ""),
            "confidence": primary.get("confidence", 0.0),
            "score": primary.get("score", 0),
        }
        if category and case.get("category", "") != category:
            continue
        results.append(entry)

    return {"cases": results, "total": len(results)}


# ─── Phase 2: Guidance Sync ──────────────────────────────────────

@app.post("/api/guidance/sync")
async def trigger_sync():
    """Trigger a manual guidance sync."""
    result = await run_full_sync()
    return result


@app.get("/api/guidance/status")
async def guidance_status():
    """Get guidance sync status, doc count, last sync time."""
    return get_sync_status()


@app.get("/api/guidance/sources")
async def guidance_sources():
    """Get list of configured seed sources."""
    return {"sources": SEED_SOURCES, "total": len(SEED_SOURCES)}


@app.post("/api/guidance/add-document")
async def add_document(req: CustomDocRequest):
    """Add a custom document URL to the knowledge base."""
    result = await add_custom_document(
        url=req.url, title=req.title,
        arch_tags=req.arch_tags if req.arch_tags else None,
    )
    return result


@app.post("/api/tools/search_guidance")
async def search_guidance_tool(query: str = "", arch_filter: str = "ALL"):
    """Tool endpoint for Foundry agent to search guidance."""
    if not query:
        raise HTTPException(status_code=400, detail="query is required")
    return handle_search_guidance(query, arch_filter)


# ─── Phase 3: Enhanced Recommend (SSE + Foundry) ─────────────────

async def _enhanced_recommend_stream(answers: dict):
    """SSE generator for Foundry-enhanced spec."""
    validate_answers(answers)
    ranked = compute_scores(answers)

    citations: list[dict] = []
    try:
        collection = get_collection()
        if collection.count() > 0:
            scores_dict = {r["id"]: r["score"] for r in ranked}
            scores_dict, citations = apply_rag_adjustment(scores_dict, answers, collection)
            for r in ranked:
                r["score"] = scores_dict.get(r["id"], r["score"])
                r["citations"] = [c for c in citations if r["id"] in c.get("arch", "")]
            ranked.sort(key=lambda x: x["score"], reverse=True)
            max_score = max(r["score"] for r in ranked) if ranked else 1
            if max_score == 0:
                max_score = 1
            for r in ranked:
                r["confidence"] = round(r["score"] / max_score, 2) if max_score > 0 else 0.0
    except Exception:
        pass

    primary = ranked[0] if ranked else {}
    confidence = primary.get("confidence", 0.0)
    spec = generate_spec(answers, ranked)

    base_result = {"ranked": ranked, "spec": spec, "citations": citations}
    yield f"data: {json.dumps({'status': 'scoring_complete', 'result': base_result})}\n\n"

    if confidence < 0.70 and is_foundry_available():
        yield f"data: {json.dumps({'status': 'foundry_thinking'})}\n\n"
        try:
            enhanced = await asyncio.wait_for(call_foundry_agent(answers, spec), timeout=8.0)
            if enhanced:
                yield f"data: {json.dumps({'status': 'foundry_complete', 'enhanced_narrative': enhanced})}\n\n"
            else:
                yield f"data: {json.dumps({'status': 'foundry_unavailable'})}\n\n"
        except asyncio.TimeoutError:
            yield f"data: {json.dumps({'status': 'foundry_timeout'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'status': 'foundry_error', 'msg': str(e)})}\n\n"
    else:
        reason = "high_confidence" if confidence >= 0.70 else "foundry_unavailable"
        yield f"data: {json.dumps({'status': 'skipped', 'reason': reason})}\n\n"

    yield "data: [DONE]\n\n"


@app.post("/api/recommend/enhanced")
async def enhanced_recommend(req: RecommendRequest, _=Depends(require_entra)):
    """SSE endpoint for Foundry-enhanced recommendations."""
    return StreamingResponse(
        _enhanced_recommend_stream(req.model_dump()),
        media_type="text/event-stream",
    )


# ─── Phase 3: Guidance Q&A ───────────────────────────────────────

@app.post("/api/guidance/ask")
async def guidance_ask(req: GuidanceAskRequest, _=Depends(require_entra)):
    """Natural language Q&A via Foundry + ChromaDB."""
    from app.agents.foundry_client import ask_guidance

    search_results = handle_search_guidance(req.question, req.arch_filter)
    context = "\n\n".join(
        f"[{c['citation']}] {c['text']}" for c in search_results.get("chunks", [])
    )

    foundry_result = await ask_guidance(req.question, context)
    if foundry_result:
        return {
            "answer": foundry_result["answer"],
            "citations": search_results.get("chunks", []),
            "foundry_used": True,
        }

    # Fallback: return ChromaDB results without Foundry narrative
    if search_results.get("chunks"):
        summary = "Based on Microsoft guidance documentation:\n\n"
        for chunk in search_results["chunks"][:3]:
            summary += f"- {chunk['text']}\n  Source: {chunk['citation']}\n\n"
        return {
            "answer": summary,
            "citations": search_results.get("chunks", []),
            "foundry_used": False,
        }

    return {
        "answer": "No relevant guidance found. Try rephrasing your question.",
        "citations": [],
        "foundry_used": False,
    }




# ─── Validation Pipeline ─────────────────────────────────────────

@app.post("/api/validate-all")
async def validate_all_cases():
    """Run Validator + Requirements Test + Corrective agents on all 50 healthcare cases."""
    results = []
    stats = {"validated": 0, "warning": 0, "corrected": 0, "advisory": 0}

    for case in HEALTHCARE_CASES:
        answers = {
            "useCaseName": case["useCaseName"],
            "primaryGoal": case["primaryGoal"],
            "complexity": case.get("complexity", "simple"),
            "dataSources": case.get("dataSources", []),
            "hasPhi": case.get("hasPhi", "no"),
            "uxChannel": case.get("uxChannel", "teams"),
            "codeCapability": case.get("codeCapability", "lowcode"),
            "userVolume": case.get("userVolume", "medium"),
            "realtime": case.get("realtime", "no"),
            "teamSize": case.get("teamSize", "medium"),
            "agentBehavior": case.get("agentBehavior", ""),
            "customModel": case.get("customModel", "no"),
            "humanInLoop": case.get("humanInLoop", "no"),
        }
        ranked = compute_scores(answers)
        primary = ranked[0] if ranked else {}
        primary_arch = primary.get("id", "UNKNOWN")

        pipeline_result = run_full_validation_pipeline(answers, primary_arch)

        status = pipeline_result["overall_status"]
        if status == "validated":
            stats["validated"] += 1
        elif status == "corrected":
            stats["corrected"] += 1
        elif status == "advisory":
            stats["advisory"] += 1
        else:
            stats["warning"] += 1

        results.append({
            "id": case["id"],
            "useCaseName": case["useCaseName"],
            "category": case.get("category", ""),
            "recommended_arch": primary_arch,
            "validation": pipeline_result,
        })

    return {
        "results": results,
        "stats": stats,
        "total": len(results),
    }


@app.post("/api/validate-case/{case_id}")
async def validate_single_case(case_id: str):
    """Run validation pipeline on a single healthcare case."""
    case = next((c for c in HEALTHCARE_CASES if c["id"] == case_id), None)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    answers = {
        "useCaseName": case["useCaseName"],
        "primaryGoal": case["primaryGoal"],
        "complexity": case.get("complexity", "simple"),
        "dataSources": case.get("dataSources", []),
        "hasPhi": case.get("hasPhi", "no"),
        "uxChannel": case.get("uxChannel", "teams"),
        "codeCapability": case.get("codeCapability", "lowcode"),
        "userVolume": case.get("userVolume", "medium"),
        "realtime": case.get("realtime", "no"),
        "teamSize": case.get("teamSize", "medium"),
        "agentBehavior": case.get("agentBehavior", ""),
        "customModel": case.get("customModel", "no"),
        "humanInLoop": case.get("humanInLoop", "no"),
    }
    ranked = compute_scores(answers)
    primary = ranked[0] if ranked else {}
    spec = generate_spec(answers, ranked)

    pipeline_result = run_full_validation_pipeline(answers, primary.get("id", "UNKNOWN"))

    return {
        "id": case["id"],
        "useCaseName": case["useCaseName"],
        "recommended_arch": primary.get("id", ""),
        "spec": spec,
        "validation": pipeline_result,
    }


@app.post("/api/upload-case")
async def upload_case(req: UploadCaseRequest):
    """Upload a new use case, analyze it through the scoring engine and validation pipeline."""
    answers = {
        "useCaseName": req.useCaseName,
        "primaryGoal": req.primaryGoal,
        "complexity": req.complexity,
        "dataSources": req.dataSources,
        "hasPhi": req.hasPhi,
        "uxChannel": req.uxChannel,
        "codeCapability": req.codeCapability,
        "userVolume": req.userVolume,
        "realtime": req.realtime,
        "teamSize": req.teamSize,
        "agentBehavior": req.agentBehavior,
        "customModel": req.customModel,
        "humanInLoop": req.humanInLoop,
    }
    ranked = compute_scores(answers)
    primary = ranked[0] if ranked else {}
    spec = generate_spec(answers, ranked)
    pipeline_result = run_full_validation_pipeline(answers, primary.get("id", "UNKNOWN"))

    return {
        "id": f"custom-{hash(req.useCaseName) % 10000:04d}",
        "useCaseName": req.useCaseName,
        "primaryGoal": req.primaryGoal,
        "category": req.category,
        "answers": answers,
        "ranked": ranked,
        "spec": spec,
        "primary_arch": primary.get("id", ""),
        "primary_label": primary.get("label", ""),
        "confidence": primary.get("confidence", 0.0),
        "score": primary.get("score", 0),
        "validation": pipeline_result,
    }


# ─── Document Analysis ────────────────────────────────────────────

@app.post("/api/analyze-document")
async def analyze_document(req: AnalyzeDocumentRequest):
    """Analyze an uploaded document and extract architecture-relevant insights."""
    content = req.content[:10000]  # Limit input size
    filename = req.filename or "untitled"

    # Simple keyword-based analysis for architecture signals
    content_lower = content.lower()
    signals = []
    arch_mentions = {
        "copilot_studio": ["copilot studio", "power virtual agents", "low-code bot", "teams bot"],
        "agent_builder": ["agent builder", "m365 copilot", "declarative agent", "sharepoint grounding"],
        "fabric_agent": ["fabric", "onelake", "lakehouse", "data pipeline", "power bi"],
        "foundry_agent": ["foundry", "azure ai", "hipaa", "phi", "multi-agent", "custom model"],
    }
    detected_archs = []
    for arch, keywords in arch_mentions.items():
        for kw in keywords:
            if kw in content_lower:
                detected_archs.append(arch)
                signals.append(f"Detected '{kw}' — relevant to {arch.replace('_', ' ').title()}")
                break

    # Check for compliance signals
    if any(w in content_lower for w in ["hipaa", "phi", "protected health", "baa"]):
        signals.append("COMPLIANCE: Document references PHI/HIPAA — Azure AI Foundry required")
    if any(w in content_lower for w in ["real-time", "realtime", "streaming"]):
        signals.append("REAL-TIME: Document mentions real-time processing requirements")
    if any(w in content_lower for w in ["snowflake", "databricks", "external data"]):
        signals.append("EXTERNAL DATA: Document references external data platforms")

    word_count = len(content.split())
    summary = (
        f"Analyzed '{filename}' ({word_count} words). "
        f"Found {len(signals)} architecture-relevant signals. "
    )
    if detected_archs:
        summary += f"Relevant architectures: {', '.join(set(detected_archs))}. "
    if not signals:
        summary += "No strong architecture signals detected — consider running through the wizard for detailed analysis."
    else:
        summary += "Signals: " + "; ".join(signals[:5])

    # Index into ChromaDB if available
    indexed = False
    try:
        collection = get_collection()
        collection.add(
            documents=[content[:2000]],
            metadatas=[{"source": filename, "type": "uploaded_document"}],
            ids=[f"doc-{hash(content[:500]) % 100000}"]
        )
        indexed = True
    except Exception:
        pass

    return {
        "summary": summary,
        "signals": signals,
        "detected_architectures": list(set(detected_archs)),
        "word_count": word_count,
        "indexed": indexed,
    }


# ─── Phase 4: Feedback + Admin ───────────────────────────────────

@app.post("/api/feedback")
async def submit_feedback(req: FeedbackRequest):
    """Submit accuracy feedback for a use case session."""
    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO feedback (use_case_id, actual_arch, was_correct, notes)
               VALUES (?, ?, ?, ?)""",
            (req.use_case_id, req.actual_arch, 1 if req.was_correct else 0, req.notes),
        )
        conn.commit()
    finally:
        conn.close()
    return {"status": "ok", "message": "Feedback recorded"}


@app.get("/api/admin/stats")
async def admin_stats():
    """Admin dashboard stats: accuracy, feedback summary, sync status."""
    conn = get_connection()
    try:
        total_cases = conn.execute("SELECT COUNT(*) as cnt FROM use_cases").fetchone()
        feedback_total = conn.execute("SELECT COUNT(*) as cnt FROM feedback").fetchone()
        feedback_correct = conn.execute(
            "SELECT COUNT(*) as cnt FROM feedback WHERE was_correct = 1"
        ).fetchone()
        arch_dist = conn.execute(
            """SELECT primary_arch, COUNT(*) as cnt FROM use_cases
               WHERE primary_arch IS NOT NULL GROUP BY primary_arch ORDER BY cnt DESC"""
        ).fetchall()
        accuracy_by_arch = conn.execute(
            """SELECT f.actual_arch, COUNT(*) as total, SUM(f.was_correct) as correct
               FROM feedback f GROUP BY f.actual_arch"""
        ).fetchall()
        recent_feedback = conn.execute(
            """SELECT f.*, u.answers, u.primary_arch FROM feedback f
               LEFT JOIN use_cases u ON f.use_case_id = u.id
               ORDER BY f.submitted_at DESC LIMIT 10"""
        ).fetchall()

        return {
            "total_cases": total_cases["cnt"] if total_cases else 0,
            "feedback": {
                "total": feedback_total["cnt"] if feedback_total else 0,
                "correct": feedback_correct["cnt"] if feedback_correct else 0,
                "accuracy": round(
                    feedback_correct["cnt"] / max(feedback_total["cnt"], 1), 3
                ) if feedback_total and feedback_correct else 0.0,
            },
            "architecture_distribution": [
                {"arch": row["primary_arch"], "count": row["cnt"]} for row in arch_dist
            ],
            "accuracy_by_architecture": [
                {"arch": row["actual_arch"], "total": row["total"],
                 "correct": row["correct"],
                 "accuracy": round(row["correct"] / max(row["total"], 1), 3)}
                for row in accuracy_by_arch
            ],
            "recent_feedback": [dict(row) for row in recent_feedback],
            "guidance_sync": get_sync_status(),
            "chroma_docs": get_doc_count(),
            "foundry_available": is_foundry_available(),
        }
    finally:
        conn.close()


@app.get("/api/admin/guidance-documents")
async def admin_guidance_docs(
    page: int = Query(1, ge=1), per_page: int = Query(50, ge=1, le=200),
):
    """List guidance documents with pagination."""
    conn = get_connection()
    try:
        offset = (page - 1) * per_page
        rows = conn.execute(
            """SELECT id, url, title, source, arch_tags, chunk_index,
                      LENGTH(chunk_text) as chunk_length, embedded_at, confidence_weight
               FROM guidance_documents ORDER BY embedded_at DESC LIMIT ? OFFSET ?""",
            (per_page, offset),
        ).fetchall()
        total = conn.execute("SELECT COUNT(*) as cnt FROM guidance_documents").fetchone()
        return {
            "documents": [dict(row) for row in rows],
            "total": total["cnt"] if total else 0,
            "page": page,
            "per_page": per_page,
        }
    finally:
        conn.close()


@app.get("/api/admin/sync-history")
async def admin_sync_history(limit: int = Query(20, ge=1, le=100)):
    """Get guidance sync history."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM guidance_sync_log ORDER BY synced_at DESC LIMIT ?", (limit,),
        ).fetchall()
        return {"history": [dict(row) for row in rows]}
    finally:
        conn.close()
