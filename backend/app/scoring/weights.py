"""
Scoring weight constants for the Copilot Architecture Advisor.
All weights are additive. PHI detection applies hard-cap enforcement.
"""

ARCHITECTURES = {
    "COPILOT_STUDIO": "Copilot Studio",
    "AGENT_BUILDER": "Copilot Agent Builder",
    "FABRIC_AGENT": "Copilot + Fabric Data Agent",
    "FOUNDRY_AGENT": "Copilot + Azure AI Foundry",
}

# Scoring weight matrix: signal -> condition -> {arch_id: weight}
WEIGHT_MATRIX: dict[str, dict[str, dict[str, int]]] = {
    "teamSize": {
        "small":  {"COPILOT_STUDIO": 20, "AGENT_BUILDER": 0,  "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 0},
        "medium": {"COPILOT_STUDIO": 10, "AGENT_BUILDER": 15, "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 0},
        "large":  {"COPILOT_STUDIO": 0,  "AGENT_BUILDER": 0,  "FABRIC_AGENT": 15, "FOUNDRY_AGENT": 20},
    },
    "complexity": {
        "simple":     {"COPILOT_STUDIO": 25, "AGENT_BUILDER": 0,  "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 0},
        "moderate":   {"COPILOT_STUDIO": 10, "AGENT_BUILDER": 20, "FABRIC_AGENT": 10, "FOUNDRY_AGENT": 0},
        "complex":    {"COPILOT_STUDIO": 0,  "AGENT_BUILDER": 0,  "FABRIC_AGENT": 15, "FOUNDRY_AGENT": 25},
        "multiagent": {"COPILOT_STUDIO": 0,  "AGENT_BUILDER": 0,  "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 30},
    },
    "dataSources": {
        "sharepoint":  {"COPILOT_STUDIO": 15, "AGENT_BUILDER": 20, "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 0},
        "fabric":      {"COPILOT_STUDIO": 0,  "AGENT_BUILDER": 0,  "FABRIC_AGENT": 30, "FOUNDRY_AGENT": 10},
        "snowflake":   {"COPILOT_STUDIO": 0,  "AGENT_BUILDER": 0,  "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 25},
        "salesforce":  {"COPILOT_STUDIO": 10, "AGENT_BUILDER": 0,  "FABRIC_AGENT": 10, "FOUNDRY_AGENT": 15},
        "servicenow":  {"COPILOT_STUDIO": 15, "AGENT_BUILDER": 0,  "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 10},
        "workday":     {"COPILOT_STUDIO": 10, "AGENT_BUILDER": 0,  "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 15},
        "azuresql":    {"COPILOT_STUDIO": 0,  "AGENT_BUILDER": 0,  "FABRIC_AGENT": 10, "FOUNDRY_AGENT": 10},
        "none":        {"COPILOT_STUDIO": 0,  "AGENT_BUILDER": 0,  "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 0},
    },
    "hasPhi": {
        "yes":       {"COPILOT_STUDIO": -20, "AGENT_BUILDER": -15, "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 30},
        "pii":       {"COPILOT_STUDIO": 0,   "AGENT_BUILDER": 0,   "FABRIC_AGENT": 10, "FOUNDRY_AGENT": 20},
        "financial": {"COPILOT_STUDIO": 0,   "AGENT_BUILDER": 0,   "FABRIC_AGENT": 20, "FOUNDRY_AGENT": 20},
        "no":        {"COPILOT_STUDIO": 0,   "AGENT_BUILDER": 0,   "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 0},
    },
    "uxChannel": {
        "teams":      {"COPILOT_STUDIO": 20, "AGENT_BUILDER": 20, "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 0},
        "m365copilot": {"COPILOT_STUDIO": 0,  "AGENT_BUILDER": 30, "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 0},
        "web":        {"COPILOT_STUDIO": 0,  "AGENT_BUILDER": 0,  "FABRIC_AGENT": 10, "FOUNDRY_AGENT": 0},
        "api":        {"COPILOT_STUDIO": 0,  "AGENT_BUILDER": 0,  "FABRIC_AGENT": 10, "FOUNDRY_AGENT": 25},
    },
    "codeCapability": {
        "lowcode":  {"COPILOT_STUDIO": 25, "AGENT_BUILDER": 15, "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 0},
        "procode":  {"COPILOT_STUDIO": 0,  "AGENT_BUILDER": 0,  "FABRIC_AGENT": 15, "FOUNDRY_AGENT": 20},
        "mixed":    {"COPILOT_STUDIO": 10, "AGENT_BUILDER": 10, "FABRIC_AGENT": 5,  "FOUNDRY_AGENT": 10},
    },
    "userVolume": {
        "small":      {"COPILOT_STUDIO": 0, "AGENT_BUILDER": 0, "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 0},
        "medium":     {"COPILOT_STUDIO": 0, "AGENT_BUILDER": 0, "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 0},
        "large":      {"COPILOT_STUDIO": 0, "AGENT_BUILDER": 0, "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 0},
        "enterprise": {"COPILOT_STUDIO": 0, "AGENT_BUILDER": 0, "FABRIC_AGENT": 15, "FOUNDRY_AGENT": 20},
    },
    "realtime": {
        "yes": {"COPILOT_STUDIO": 0, "AGENT_BUILDER": 0, "FABRIC_AGENT": 10, "FOUNDRY_AGENT": 15},
        "no":  {"COPILOT_STUDIO": 0, "AGENT_BUILDER": 0, "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 0},
    },
    "agentBehavior": {
        "readonly":   {"COPILOT_STUDIO": 15, "AGENT_BUILDER": 10, "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 0},
        "guided":     {"COPILOT_STUDIO": 20, "AGENT_BUILDER": 15, "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 0},
        "autonomous": {"COPILOT_STUDIO": -10, "AGENT_BUILDER": 0, "FABRIC_AGENT": 0,  "FOUNDRY_AGENT": 30},
        "multiagent": {"COPILOT_STUDIO": -20, "AGENT_BUILDER": -15, "FABRIC_AGENT": 0, "FOUNDRY_AGENT": 35},
    },
    "humanInLoop": {
        "no":         {"COPILOT_STUDIO": 0,  "AGENT_BUILDER": 0,  "FABRIC_AGENT": 0, "FOUNDRY_AGENT": 0},
        "soft":       {"COPILOT_STUDIO": 15, "AGENT_BUILDER": 10, "FABRIC_AGENT": 0, "FOUNDRY_AGENT": 0},
        "hard":       {"COPILOT_STUDIO": 25, "AGENT_BUILDER": 0,  "FABRIC_AGENT": 0, "FOUNDRY_AGENT": -10},
        "escalation": {"COPILOT_STUDIO": 15, "AGENT_BUILDER": 10, "FABRIC_AGENT": 0, "FOUNDRY_AGENT": 0},
    },
}

# PHI hard-cap: when hasPhi='yes', cap COPILOT_STUDIO and AGENT_BUILDER at 20
PHI_HARD_CAP_ARCHS = ["COPILOT_STUDIO", "AGENT_BUILDER"]
PHI_HARD_CAP_VALUE = 20

# Custom model hard-cap: when customModel is 'finetune' or 'byom'
CUSTOM_MODEL_HARD_VALUES = ["finetune", "byom"]
CUSTOM_MODEL_CAPS = {
    "COPILOT_STUDIO": 15,
    "AGENT_BUILDER": 15,
    "FABRIC_AGENT": 20,
}
