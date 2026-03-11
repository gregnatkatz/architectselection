"""
Scoring engine for Copilot Architecture Advisor.
Deterministic rule-based scoring with PHI enforcement.
"""

from app.scoring.weights import (
    ARCHITECTURES,
    WEIGHT_MATRIX,
    PHI_HARD_CAP_ARCHS,
    PHI_HARD_CAP_VALUE,
    CUSTOM_MODEL_HARD_VALUES,
    CUSTOM_MODEL_CAPS,
)


def compute_scores(answers: dict) -> list[dict]:
    """
    Compute architecture scores from wizard answers.
    Returns ranked list of architectures with scores and confidence.
    """
    scores: dict[str, int] = {arch_id: 0 for arch_id in ARCHITECTURES}

    # Process each signal
    for signal, conditions in WEIGHT_MATRIX.items():
        value = answers.get(signal)
        if value is None:
            continue

        if signal == "dataSources":
            # dataSources is a list — accumulate weights for each selected source
            sources = value if isinstance(value, list) else [value]
            for source in sources:
                source_lower = source.lower()
                if source_lower in conditions:
                    for arch_id, weight in conditions[source_lower].items():
                        scores[arch_id] += weight
        else:
            # Single-value signal
            val_lower = str(value).lower()
            if val_lower in conditions:
                for arch_id, weight in conditions[val_lower].items():
                    scores[arch_id] += weight

    # PHI hard-cap enforcement
    has_phi = str(answers.get("hasPhi", "no")).lower()
    if has_phi == "yes":
        for arch_id in PHI_HARD_CAP_ARCHS:
            if scores[arch_id] > PHI_HARD_CAP_VALUE:
                scores[arch_id] = PHI_HARD_CAP_VALUE

    # Custom model hard-cap enforcement (finetune/byom → Foundry only)
    custom_model = str(answers.get("customModel", "no")).lower()
    if custom_model in CUSTOM_MODEL_HARD_VALUES:
        scores["FOUNDRY_AGENT"] += 50
        for arch_id, cap in CUSTOM_MODEL_CAPS.items():
            scores[arch_id] = min(scores[arch_id], cap)

    # Build ranked list
    max_score = max(scores.values()) if scores else 1
    if max_score == 0:
        max_score = 1

    ranked = []
    for arch_id, score in scores.items():
        confidence = round(score / max_score, 2) if max_score > 0 else 0.0
        ranked.append({
            "id": arch_id,
            "label": ARCHITECTURES[arch_id],
            "score": score,
            "confidence": confidence,
            "citations": [],
        })

    # Sort by score descending
    ranked.sort(key=lambda x: x["score"], reverse=True)

    return ranked
