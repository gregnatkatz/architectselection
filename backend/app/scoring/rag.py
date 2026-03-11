"""
RAG augmentation for the scoring engine.
Queries ChromaDB and applies at most ONE score adjustment per run.
PHI hard-cap is NEVER overridden by RAG.
"""

import json
import logging

logger = logging.getLogger(__name__)


def apply_rag_adjustment(
    scores: dict[str, int],
    answers: dict,
    collection,
) -> tuple[dict[str, int], list[dict]]:
    """
    Query ChromaDB, apply at most ONE score adjustment per run.
    PHI hard-cap is NEVER overridden by RAG.
    Returns: (adjusted_scores, citations)
    """
    citations: list[dict] = []

    if collection is None or collection.count() == 0:
        return scores, citations

    top_arch = max(scores, key=scores.get)

    # Build query from use case description + top arch
    query = f"{answers.get('useCaseName', '')} {answers.get('primaryGoal', '')} {top_arch}"

    try:
        results = collection.query(
            query_texts=[query],
            n_results=min(5, collection.count()),
            include=["documents", "metadatas", "distances"],
        )
    except Exception as e:
        logger.error(f"RAG query failed: {e}")
        return scores, citations

    if not results["documents"] or not results["documents"][0]:
        return scores, citations

    adjustment_applied = False  # MAX ONE adjustment per run

    for i, meta in enumerate(results["metadatas"][0]):
        chunk_weight = meta.get("confidence_weight", 1.0)
        if isinstance(chunk_weight, str):
            try:
                chunk_weight = float(chunk_weight)
            except ValueError:
                chunk_weight = 1.0

        arch_tags_raw = meta.get("arch_tags", '["ALL"]')
        if isinstance(arch_tags_raw, str):
            try:
                chunk_tags = json.loads(arch_tags_raw)
            except json.JSONDecodeError:
                chunk_tags = ["ALL"]
        else:
            chunk_tags = arch_tags_raw if isinstance(arch_tags_raw, list) else ["ALL"]

        distance = results["distances"][0][i] if results["distances"] and results["distances"][0] else 1.0
        similarity = 1 - distance  # cosine distance to similarity

        doc_text = results["documents"][0][i] if results["documents"][0] else ""

        # Always collect as citation
        citation = {
            "text": doc_text[:200],
            "url": meta.get("url", ""),
            "arch": ",".join(chunk_tags),
            "similarity": round(similarity, 3),
        }
        citations.append(citation)

        if adjustment_applied:
            continue

        # Only act on high-confidence chunks pointing to a DIFFERENT arch
        if chunk_weight >= 0.8 and similarity >= 0.75:
            for tag in chunk_tags:
                if tag != top_arch and tag in scores:
                    # HARD RULE: Never boost non-Foundry if PHI is set
                    if answers.get("hasPhi") == "yes" and tag != "FOUNDRY_AGENT":
                        continue
                    scores[tag] += 5
                    adjustment_applied = True
                    break

    return scores, citations
