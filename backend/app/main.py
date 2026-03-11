from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.scoring.engine import compute_scores
from app.scoring.contracts import validate_answers
from app.knowledge.sqlite_store import save_use_case, get_cases
from app.knowledge.healthcare_cases import HEALTHCARE_CASES
from app.spec.generator import generate_spec

app = FastAPI(title="Copilot Architecture Advisor")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


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


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/recommend")
async def recommend(req: RecommendRequest):
    answers = req.model_dump()
    validate_answers(answers)
    ranked = compute_scores(answers)

    primary = ranked[0] if ranked else {}
    spec = generate_spec(answers, ranked)

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
        "guidance_version": None,
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
