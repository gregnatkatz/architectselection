"""
Daily guidance sync agent for the Copilot Architecture Advisor.
Crawls Microsoft Learn docs, chunks, embeds, and upserts to ChromaDB.
"""

import hashlib
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.knowledge.chroma_store import add_documents, get_collection
from app.knowledge.sqlite_store import get_connection

logger = logging.getLogger(__name__)

# Hard cap per daily run to prevent runaway cost
MAX_CLASSIFICATIONS_PER_SYNC = 200
CHUNK_SIZE = 800
CHUNK_OVERLAP = 100

# Microsoft Learn seed sources for Copilot guidance
SEED_SOURCES: list[dict] = [
    {
        "url": "https://learn.microsoft.com/en-us/microsoft-copilot-studio/fundamentals-what-is-copilot-studio",
        "title": "What is Microsoft Copilot Studio",
        "source": "mslearn",
        "arch_tags": ["COPILOT_STUDIO"],
    },
    {
        "url": "https://learn.microsoft.com/en-us/microsoft-copilot-studio/environments-first-run-experience",
        "title": "Create and manage Copilot Studio environments",
        "source": "mslearn",
        "arch_tags": ["COPILOT_STUDIO"],
    },
    {
        "url": "https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/overview-agent-builder",
        "title": "Microsoft 365 Copilot Agent Builder Overview",
        "source": "mslearn",
        "arch_tags": ["AGENT_BUILDER"],
    },
    {
        "url": "https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/build-declarative-agents",
        "title": "Build declarative agents for Microsoft 365 Copilot",
        "source": "mslearn",
        "arch_tags": ["AGENT_BUILDER"],
    },
    {
        "url": "https://learn.microsoft.com/en-us/fabric/data-science/copilot-notebooks-overview",
        "title": "Microsoft Fabric Copilot for Data Science",
        "source": "mslearn",
        "arch_tags": ["FABRIC_AGENT"],
    },
    {
        "url": "https://learn.microsoft.com/en-us/fabric/get-started/copilot-fabric-overview",
        "title": "Copilot in Microsoft Fabric Overview",
        "source": "mslearn",
        "arch_tags": ["FABRIC_AGENT"],
    },
    {
        "url": "https://learn.microsoft.com/en-us/azure/ai-studio/what-is-ai-studio",
        "title": "What is Azure AI Foundry",
        "source": "mslearn",
        "arch_tags": ["FOUNDRY_AGENT"],
    },
    {
        "url": "https://learn.microsoft.com/en-us/azure/ai-services/agents/overview",
        "title": "Azure AI Agent Service Overview",
        "source": "mslearn",
        "arch_tags": ["FOUNDRY_AGENT"],
    },
    {
        "url": "https://learn.microsoft.com/en-us/azure/ai-studio/how-to/develop/create-hub-project-sdk",
        "title": "Create Azure AI Foundry hub and project",
        "source": "mslearn",
        "arch_tags": ["FOUNDRY_AGENT"],
    },
    {
        "url": "https://learn.microsoft.com/en-us/microsoft-copilot-studio/advanced-plugin-actions",
        "title": "Copilot Studio Plugin Actions",
        "source": "mslearn",
        "arch_tags": ["COPILOT_STUDIO"],
    },
    {
        "url": "https://learn.microsoft.com/en-us/azure/ai-services/agents/quickstart",
        "title": "Quickstart: Create an Azure AI Agent",
        "source": "mslearn",
        "arch_tags": ["FOUNDRY_AGENT"],
    },
    {
        "url": "https://learn.microsoft.com/en-us/microsoft-copilot-studio/copilot-conversational-plugins",
        "title": "Copilot Studio Conversational Plugins",
        "source": "mslearn",
        "arch_tags": ["COPILOT_STUDIO", "AGENT_BUILDER"],
    },
    {
        "url": "https://learn.microsoft.com/en-us/fabric/data-engineering/copilot-data-engineering-overview",
        "title": "Copilot for Data Engineering in Fabric",
        "source": "mslearn",
        "arch_tags": ["FABRIC_AGENT"],
    },
    {
        "url": "https://learn.microsoft.com/en-us/azure/ai-studio/concepts/deployments-overview",
        "title": "Azure AI Model Deployments Overview",
        "source": "mslearn",
        "arch_tags": ["FOUNDRY_AGENT"],
    },
]

# Rule-based classification keywords (used when Foundry/GPT classification not available)
ARCH_KEYWORDS: dict[str, list[str]] = {
    "COPILOT_STUDIO": [
        "copilot studio", "power virtual agents", "low-code", "low code",
        "conversational", "chatbot", "power automate", "power platform",
        "adaptive card", "topics", "entities",
    ],
    "AGENT_BUILDER": [
        "agent builder", "declarative agent", "m365 copilot", "microsoft 365 copilot",
        "copilot extension", "copilot plugin", "graph connector",
        "sharepoint grounding",
    ],
    "FABRIC_AGENT": [
        "fabric", "onelake", "lakehouse", "data warehouse", "data engineering",
        "data science", "power bi", "real-time analytics", "eventhouse",
        "kql", "kusto",
    ],
    "FOUNDRY_AGENT": [
        "azure ai foundry", "ai studio", "azure ai agent", "foundry",
        "azure openai", "fine-tune", "fine-tuned", "byom", "bring your own model",
        "multi-agent", "managed identity", "hipaa", "phi", "compliance",
        "custom model", "rag", "retrieval augmented",
    ],
}


def classify_chunk_by_keywords(text: str) -> list[str]:
    """
    Rule-based classification using keyword matching.
    Falls back to this when Foundry/GPT classification is not available.
    """
    text_lower = text.lower()
    tags = []
    scores: dict[str, int] = {}

    for arch, keywords in ARCH_KEYWORDS.items():
        count = sum(1 for kw in keywords if kw in text_lower)
        if count > 0:
            scores[arch] = count

    if not scores:
        return ["ALL"]

    # Return all architectures that had at least 1 keyword match
    max_score = max(scores.values())
    for arch, score in scores.items():
        if score >= max(1, max_score // 2):
            tags.append(arch)

    return tags if tags else ["ALL"]


async def fetch_page_content(url: str) -> Optional[str]:
    """Fetch and extract text content from a URL."""
    try:
        async with httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={"User-Agent": "CopilotArchAdvisor/1.0"},
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")

        # Remove script, style, nav elements
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        # Try to find main content area
        main = soup.find("main") or soup.find("article") or soup.find("div", {"role": "main"})
        if main:
            text = main.get_text(separator="\n", strip=True)
        else:
            text = soup.get_text(separator="\n", strip=True)

        # Clean up whitespace
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r" {2,}", " ", text)

        return text.strip() if len(text) > 100 else None

    except Exception as e:
        logger.warning(f"Failed to fetch {url}: {e}")
        return None


def chunk_text(text: str) -> list[str]:
    """Split text into chunks using LangChain text splitter."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(text)
    return [c for c in chunks if len(c.strip()) > 50]


async def sync_source(
    url: str,
    title: str,
    source: str,
    arch_tags: list[str],
) -> dict:
    """Sync a single source: fetch, chunk, embed, upsert."""
    result = {"url": url, "added": 0, "updated": 0, "skipped": 0, "error": None}

    content = await fetch_page_content(url)
    if not content:
        result["error"] = "Failed to fetch or empty content"
        result["skipped"] = 1
        return result

    chunks = chunk_text(content)
    if not chunks:
        result["skipped"] = 1
        return result

    conn = get_connection()
    ids_to_upsert = []
    docs_to_upsert = []
    metas_to_upsert = []

    try:
        for i, chunk in enumerate(chunks):
            chunk_hash = hashlib.sha256(chunk.encode()).hexdigest()

            # Check if chunk already exists with same hash
            existing = conn.execute(
                "SELECT id, chunk_hash FROM guidance_documents WHERE url = ? AND chunk_index = ?",
                (url, i),
            ).fetchone()

            if existing and existing["chunk_hash"] == chunk_hash:
                result["skipped"] += 1
                continue

            # Classify chunk using rule-based keywords
            detected_tags = classify_chunk_by_keywords(chunk)
            # Merge with source-level tags
            all_tags = list(set(arch_tags + detected_tags))
            if "ALL" in all_tags and len(all_tags) > 1:
                all_tags.remove("ALL")

            tags_json = json.dumps(all_tags)
            confidence_weight = 1.0 if detected_tags != ["ALL"] else 0.7

            doc_id = existing["id"] if existing else str(uuid.uuid4())
            chroma_id = f"guid_{doc_id}"

            # Upsert to SQLite
            if existing:
                conn.execute(
                    """UPDATE guidance_documents
                       SET chunk_text = ?, chunk_hash = ?, arch_tags = ?,
                           confidence_weight = ?, embedded_at = ?, chroma_id = ?
                       WHERE id = ?""",
                    (chunk, chunk_hash, tags_json, confidence_weight,
                     datetime.now(timezone.utc).isoformat(), chroma_id, doc_id),
                )
                result["updated"] += 1
            else:
                conn.execute(
                    """INSERT INTO guidance_documents
                       (id, url, title, source, arch_tags, chunk_index, chunk_text,
                        chunk_hash, chroma_id, embedded_at, confidence_weight)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (doc_id, url, title, source, tags_json, i, chunk,
                     chunk_hash, chroma_id,
                     datetime.now(timezone.utc).isoformat(), confidence_weight),
                )
                result["added"] += 1

            ids_to_upsert.append(chroma_id)
            docs_to_upsert.append(chunk)
            metas_to_upsert.append({
                "source": source,
                "url": url,
                "title": title,
                "arch_tags": tags_json,
                "published_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "confidence_weight": confidence_weight,
                "chunk_index": i,
            })

        conn.commit()
    finally:
        conn.close()

    # Batch upsert to ChromaDB
    if ids_to_upsert:
        try:
            add_documents(ids_to_upsert, docs_to_upsert, metas_to_upsert)
        except Exception as e:
            logger.error(f"ChromaDB upsert failed for {url}: {e}")
            result["error"] = f"ChromaDB error: {str(e)}"

    return result


async def run_full_sync(sources: Optional[list[dict]] = None) -> dict:
    """
    Run a full guidance sync across all seed sources.
    Returns summary with counts and status.
    """
    if sources is None:
        sources = SEED_SOURCES

    summary = {
        "docs_added": 0,
        "docs_updated": 0,
        "docs_skipped": 0,
        "status": "success",
        "error_msg": None,
        "sources_processed": 0,
        "errors": [],
    }

    for source_def in sources:
        try:
            result = await sync_source(
                url=source_def["url"],
                title=source_def["title"],
                source=source_def["source"],
                arch_tags=source_def["arch_tags"],
            )
            summary["docs_added"] += result["added"]
            summary["docs_updated"] += result["updated"]
            summary["docs_skipped"] += result["skipped"]
            summary["sources_processed"] += 1

            if result["error"]:
                summary["errors"].append(f"{source_def['url']}: {result['error']}")
        except Exception as e:
            logger.error(f"Sync failed for {source_def['url']}: {e}")
            summary["errors"].append(f"{source_def['url']}: {str(e)}")

    # Log sync to SQLite
    if summary["errors"]:
        summary["status"] = "partial" if summary["docs_added"] > 0 else "error"
        summary["error_msg"] = "; ".join(summary["errors"][:5])

    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO guidance_sync_log
               (docs_added, docs_updated, docs_skipped, status, error_msg)
               VALUES (?, ?, ?, ?, ?)""",
            (summary["docs_added"], summary["docs_updated"],
             summary["docs_skipped"], summary["status"], summary["error_msg"]),
        )
        conn.commit()
    finally:
        conn.close()

    return summary


def get_sync_status() -> dict:
    """Get the latest guidance sync status."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM guidance_sync_log ORDER BY synced_at DESC LIMIT 1"
        ).fetchone()

        total_docs = conn.execute(
            "SELECT COUNT(*) as cnt FROM guidance_documents"
        ).fetchone()

        unique_urls = conn.execute(
            "SELECT COUNT(DISTINCT url) as cnt FROM guidance_documents"
        ).fetchone()

        sync_count = conn.execute(
            "SELECT COUNT(*) as cnt FROM guidance_sync_log"
        ).fetchone()

        return {
            "last_sync": dict(row) if row else None,
            "total_chunks": total_docs["cnt"] if total_docs else 0,
            "unique_sources": unique_urls["cnt"] if unique_urls else 0,
            "total_syncs": sync_count["cnt"] if sync_count else 0,
            "chroma_count": get_collection().count() if total_docs and total_docs["cnt"] > 0 else 0,
        }
    except Exception as e:
        logger.error(f"Failed to get sync status: {e}")
        return {
            "last_sync": None,
            "total_chunks": 0,
            "unique_sources": 0,
            "total_syncs": 0,
            "chroma_count": 0,
        }
    finally:
        conn.close()


async def add_custom_document(url: str, title: str = "", arch_tags: Optional[list[str]] = None) -> dict:
    """Add a custom document URL to the knowledge base."""
    if arch_tags is None:
        arch_tags = ["ALL"]

    result = await sync_source(
        url=url,
        title=title or url,
        source="custom",
        arch_tags=arch_tags,
    )
    return result
