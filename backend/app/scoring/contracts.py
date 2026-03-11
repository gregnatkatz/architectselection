"""
Canonical enum schema and validation for wizard answers.
Section 12 GAP 1: Wizard -> Scoring Contract.
"""

from fastapi import HTTPException

VALID_ENUMS: dict[str, type | list[str]] = {
    "useCaseName": str,       # free text
    "primaryGoal": str,       # free text
    "complexity": ["simple", "moderate", "complex", "multiagent"],
    "dataSources": ["sharepoint", "fabric", "snowflake", "salesforce",
                    "servicenow", "workday", "azuresql", "external_api", "none"],
    "hasPhi": ["no", "none", "pii", "yes", "financial"],
    "uxChannel": ["teams", "m365copilot", "web", "api"],
    "codeCapability": ["lowcode", "mixed", "procode"],
    "userVolume": ["small", "medium", "large", "enterprise"],
    "realtime": ["no", "yes"],
    "teamSize": ["small", "medium", "large"],
    "agentBehavior": ["", "readonly", "guided", "autonomous", "multiagent"],
    "customModel": ["no", "finetune", "byom", "unsure"],
    "humanInLoop": ["no", "soft", "hard", "escalation"],
}


def validate_answers(answers: dict) -> dict:
    """Validate and normalize wizard answers. Raise 422 on invalid enum."""
    errors: list[str] = []
    for field, valid in VALID_ENUMS.items():
        if field not in answers:
            continue
        if isinstance(valid, list):
            val = answers[field]
            if field == "dataSources":
                if not isinstance(val, list):
                    errors.append(f"{field}: must be array")
                else:
                    bad = [v for v in val if v not in valid]
                    if bad:
                        errors.append(f"{field}: invalid values {bad}")
            else:
                if val not in valid:
                    errors.append(f'{field}: "{val}" not in {valid}')
    if errors:
        raise HTTPException(status_code=422, detail={"validation_errors": errors})
    return answers
