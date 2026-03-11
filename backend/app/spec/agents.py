"""
Three-agent validation pipeline for architecture recommendations:
1. Validator Agent — checks recommendation against compliance rules and capability requirements
2. Requirements Test Agent — checks if simpler tools could handle the use case
3. Corrective Agent — fixes discrepancies found by the other two agents
"""


# Architecture capability matrix
ARCH_CAPABILITIES = {
    "COPILOT_STUDIO": {
        "phi_compliant": False,
        "custom_model": False,
        "byom": False,
        "multi_agent": False,
        "autonomous": False,
        "snowflake": False,
        "fabric_native": False,
        "external_api": False,
        "max_complexity": "moderate",
        "channels": ["teams", "web"],
        "code_level": "lowcode",
        "description": "Low-code conversational AI for Teams/Web. Best for simple guided workflows without PHI.",
    },
    "AGENT_BUILDER": {
        "phi_compliant": False,
        "custom_model": False,
        "byom": False,
        "multi_agent": False,
        "autonomous": False,
        "snowflake": False,
        "fabric_native": False,
        "external_api": False,
        "max_complexity": "moderate",
        "channels": ["m365copilot"],
        "code_level": "lowcode",
        "description": "M365 Copilot declarative agents with SharePoint grounding. Best for document analysis and M365 workflows.",
    },
    "FABRIC_AGENT": {
        "phi_compliant": False,
        "custom_model": False,
        "byom": False,
        "multi_agent": False,
        "autonomous": False,
        "snowflake": True,
        "fabric_native": True,
        "external_api": False,
        "max_complexity": "complex",
        "channels": ["web"],
        "code_level": "mixed",
        "description": "Data-centric AI agent on Microsoft Fabric + OneLake. Best for analytics-heavy use cases with large structured datasets.",
    },
    "FOUNDRY_AGENT": {
        "phi_compliant": True,
        "custom_model": True,
        "byom": True,
        "multi_agent": True,
        "autonomous": True,
        "snowflake": True,
        "fabric_native": False,
        "external_api": True,
        "max_complexity": "multiagent",
        "channels": ["web", "api", "teams"],
        "code_level": "procode",
        "description": "Enterprise-grade AI on Azure AI Foundry. Required for PHI/HIPAA, custom models, autonomous agents, and multi-agent orchestration.",
    },
}

COMPLEXITY_ORDER = {"simple": 1, "moderate": 2, "complex": 3, "multiagent": 4}


def run_validator_agent(answers: dict, recommended_arch: str) -> dict:
    """
    Validator Agent: Check if the recommended architecture can actually handle
    all the requirements of the use case. Returns validation result.
    """
    caps = ARCH_CAPABILITIES.get(recommended_arch, {})
    issues = []
    passed_checks = []

    # PHI check
    if answers.get("hasPhi") == "yes":
        if caps.get("phi_compliant"):
            passed_checks.append("PHI/HIPAA compliance: Architecture supports HIPAA BAA coverage")
        else:
            issues.append({
                "severity": "critical",
                "check": "PHI/HIPAA Compliance",
                "message": f"{recommended_arch} does NOT support PHI/HIPAA workloads. Azure AI Foundry is required.",
                "fix": "FOUNDRY_AGENT",
            })

    # Custom model check
    if answers.get("customModel") == "finetune":
        if caps.get("custom_model"):
            passed_checks.append("Fine-tuned model support: Architecture supports custom model deployment")
        else:
            issues.append({
                "severity": "critical",
                "check": "Fine-tuned Model Support",
                "message": f"{recommended_arch} cannot host fine-tuned models. Azure AI Foundry required.",
                "fix": "FOUNDRY_AGENT",
            })

    # BYOM check
    if answers.get("customModel") == "byom":
        if caps.get("byom"):
            passed_checks.append("BYOM support: Architecture supports bring-your-own-model deployment")
        else:
            issues.append({
                "severity": "critical",
                "check": "Bring-Your-Own-Model Support",
                "message": f"{recommended_arch} cannot host BYOM deployments. Azure AI Foundry required.",
                "fix": "FOUNDRY_AGENT",
            })

    # Multi-agent check
    if answers.get("agentBehavior") == "multiagent":
        if caps.get("multi_agent"):
            passed_checks.append("Multi-agent orchestration: Architecture supports multi-agent workflows")
        else:
            issues.append({
                "severity": "critical",
                "check": "Multi-Agent Orchestration",
                "message": f"{recommended_arch} does not support multi-agent orchestration. Azure AI Foundry required.",
                "fix": "FOUNDRY_AGENT",
            })

    # Autonomous check
    if answers.get("agentBehavior") == "autonomous":
        if caps.get("autonomous"):
            passed_checks.append("Autonomous behavior: Architecture supports autonomous agent operation")
        else:
            issues.append({
                "severity": "high",
                "check": "Autonomous Agent Support",
                "message": f"{recommended_arch} does not support autonomous agents. Consider Azure AI Foundry.",
                "fix": "FOUNDRY_AGENT",
            })

    # Snowflake data source check
    data_sources = answers.get("dataSources", [])
    if "snowflake" in data_sources:
        if caps.get("snowflake"):
            passed_checks.append("Snowflake integration: Architecture supports Snowflake connectors")
        else:
            issues.append({
                "severity": "high",
                "check": "Snowflake Integration",
                "message": f"{recommended_arch} lacks native Snowflake support. Consider Fabric Agent or Foundry.",
                "fix": "FABRIC_AGENT",
            })

    # Fabric data source check
    if "fabric" in data_sources:
        if caps.get("fabric_native"):
            passed_checks.append("Fabric integration: Architecture has native Fabric/OneLake support")
        else:
            if recommended_arch != "FOUNDRY_AGENT":
                issues.append({
                    "severity": "medium",
                    "check": "Fabric Data Integration",
                    "message": f"{recommended_arch} is not Fabric-native. Consider Fabric Agent for OneLake data.",
                    "fix": "FABRIC_AGENT",
                })
            else:
                passed_checks.append("Fabric integration: Foundry can connect to Fabric via data connectors")

    # Complexity check
    case_complexity = answers.get("complexity", "simple")
    max_complexity = caps.get("max_complexity", "simple")
    if COMPLEXITY_ORDER.get(case_complexity, 1) > COMPLEXITY_ORDER.get(max_complexity, 1):
        issues.append({
            "severity": "medium",
            "check": "Complexity Ceiling",
            "message": f"{recommended_arch} max complexity is '{max_complexity}' but this case requires '{case_complexity}'.",
            "fix": "FOUNDRY_AGENT" if case_complexity == "multiagent" else "FABRIC_AGENT",
        })
    else:
        passed_checks.append(f"Complexity: '{case_complexity}' is within architecture capability ceiling")

    # External API check
    if "external_api" in data_sources:
        if caps.get("external_api") or recommended_arch in ("FOUNDRY_AGENT", "FABRIC_AGENT"):
            passed_checks.append("External API integration: Architecture supports external API calls")
        else:
            issues.append({
                "severity": "medium",
                "check": "External API Integration",
                "message": f"{recommended_arch} has limited external API support. Consider Foundry for complex integrations.",
                "fix": "FOUNDRY_AGENT",
            })

    status = "validated" if not issues else ("needs_correction" if any(i["severity"] == "critical" for i in issues) else "warning")

    return {
        "status": status,
        "issues": issues,
        "passed_checks": passed_checks,
        "total_checks": len(issues) + len(passed_checks),
        "pass_rate": round(len(passed_checks) / max(len(issues) + len(passed_checks), 1) * 100),
    }


def run_requirements_test_agent(answers: dict, recommended_arch: str) -> dict:
    """
    Requirements Test Agent: Check if the use case REALLY needs the recommended
    architecture or if a simpler tool would suffice. Explains why/why not.
    """
    simplification_options = []
    reasons_needs_current = []
    has_phi = answers.get("hasPhi") == "yes"
    complexity = answers.get("complexity", "simple")
    custom_model = answers.get("customModel", "no")
    agent_behavior = answers.get("agentBehavior", "guided")
    data_sources = answers.get("dataSources", [])
    ux_channel = answers.get("uxChannel", "web")

    # --- Check if Copilot Studio could work ---
    studio_blockers = []
    if has_phi:
        studio_blockers.append("PHI/HIPAA data requires Foundry compliance controls")
    if custom_model in ("finetune", "byom"):
        studio_blockers.append(f"Custom model ({custom_model}) not supported in Copilot Studio")
    if agent_behavior in ("autonomous", "multiagent"):
        studio_blockers.append(f"'{agent_behavior}' agent behavior exceeds Copilot Studio capabilities")
    if complexity in ("complex", "multiagent"):
        studio_blockers.append(f"'{complexity}' complexity exceeds Copilot Studio ceiling")
    if "external_api" in data_sources:
        studio_blockers.append("External API integration is limited in Copilot Studio")
    if "fabric" in data_sources or "snowflake" in data_sources:
        studio_blockers.append("Fabric/Snowflake data sources not available in Copilot Studio")

    if not studio_blockers:
        simplification_options.append({
            "architecture": "COPILOT_STUDIO",
            "label": "Microsoft Copilot Studio",
            "viable": True,
            "reasoning": "This use case has no blockers for Copilot Studio. Simple, low-code, and fast to deploy.",
        })
    else:
        simplification_options.append({
            "architecture": "COPILOT_STUDIO",
            "label": "Microsoft Copilot Studio",
            "viable": False,
            "reasoning": "Cannot use Copilot Studio: " + "; ".join(studio_blockers),
        })

    # --- Check if Agent Builder could work ---
    builder_blockers = []
    if has_phi:
        builder_blockers.append("PHI/HIPAA data requires Foundry compliance controls")
    if custom_model in ("finetune", "byom"):
        builder_blockers.append(f"Custom model ({custom_model}) not supported in Agent Builder")
    if agent_behavior in ("autonomous", "multiagent"):
        builder_blockers.append(f"'{agent_behavior}' agent behavior exceeds Agent Builder capabilities")
    if complexity in ("complex", "multiagent"):
        builder_blockers.append(f"'{complexity}' complexity exceeds Agent Builder ceiling")
    if ux_channel not in ("m365copilot",):
        builder_blockers.append(f"UX channel '{ux_channel}' is not M365 Copilot — Agent Builder is optimized for M365")
    if "fabric" in data_sources or "snowflake" in data_sources:
        builder_blockers.append("Fabric/Snowflake data sources not natively available in Agent Builder")

    if not builder_blockers:
        simplification_options.append({
            "architecture": "AGENT_BUILDER",
            "label": "M365 Copilot Agent Builder",
            "viable": True,
            "reasoning": "This use case could work with Agent Builder. M365 Copilot integration with SharePoint grounding.",
        })
    else:
        simplification_options.append({
            "architecture": "AGENT_BUILDER",
            "label": "M365 Copilot Agent Builder",
            "viable": False,
            "reasoning": "Cannot use Agent Builder: " + "; ".join(builder_blockers),
        })

    # --- Check if Fabric Agent could work ---
    fabric_blockers = []
    if has_phi:
        fabric_blockers.append("PHI/HIPAA data requires Foundry compliance controls")
    if custom_model in ("finetune", "byom"):
        fabric_blockers.append(f"Custom model ({custom_model}) not supported in Fabric Agent")
    if agent_behavior in ("autonomous", "multiagent"):
        fabric_blockers.append(f"'{agent_behavior}' agent behavior exceeds Fabric Agent capabilities")

    if not fabric_blockers:
        has_fabric_signal = "fabric" in data_sources or "snowflake" in data_sources
        simplification_options.append({
            "architecture": "FABRIC_AGENT",
            "label": "Copilot + Fabric Data Agent",
            "viable": True,
            "reasoning": ("This use case involves Fabric/Snowflake data — Fabric Agent is a natural fit." if has_fabric_signal
                          else "Fabric Agent could work but there is no Fabric/Snowflake data signal. Other architectures may be more appropriate."),
        })
    else:
        simplification_options.append({
            "architecture": "FABRIC_AGENT",
            "label": "Copilot + Fabric Data Agent",
            "viable": False,
            "reasoning": "Cannot use Fabric Agent: " + "; ".join(fabric_blockers),
        })

    # --- Why the current recommendation is needed ---
    if recommended_arch == "FOUNDRY_AGENT":
        if has_phi:
            reasons_needs_current.append("PHI/HIPAA compliance requires Azure AI Foundry for BAA coverage and audit controls")
        if custom_model in ("finetune", "byom"):
            reasons_needs_current.append(f"Custom model ({custom_model}) deployment requires Foundry infrastructure")
        if agent_behavior == "autonomous":
            reasons_needs_current.append("Autonomous agent behavior requires Foundry orchestration and safety controls")
        if agent_behavior == "multiagent":
            reasons_needs_current.append("Multi-agent orchestration requires Foundry control plane")
        if "external_api" in data_sources and has_phi:
            reasons_needs_current.append("External API calls with PHI data require Foundry compliance boundary")
        if not reasons_needs_current:
            reasons_needs_current.append("Complex pro-code requirements and enterprise scale justify Foundry")
    elif recommended_arch == "FABRIC_AGENT":
        if "fabric" in data_sources:
            reasons_needs_current.append("Native Fabric/OneLake data integration requires Fabric Agent")
        if "snowflake" in data_sources:
            reasons_needs_current.append("Snowflake data warehouse integration is optimized in Fabric Agent")
        if not reasons_needs_current:
            reasons_needs_current.append("Analytics-heavy data pipeline pattern is best served by Fabric Agent")
    elif recommended_arch == "AGENT_BUILDER":
        reasons_needs_current.append("M365 Copilot integration with SharePoint grounding is the optimal pattern for this use case")
    elif recommended_arch == "COPILOT_STUDIO":
        reasons_needs_current.append("Simple low-code conversational pattern in Teams — Copilot Studio is the fastest and most cost-effective path")

    simpler_viable = [s for s in simplification_options if s["viable"] and COMPLEXITY_ORDER.get(
        ARCH_CAPABILITIES.get(s["architecture"], {}).get("max_complexity", "simple"), 1
    ) < COMPLEXITY_ORDER.get(
        ARCH_CAPABILITIES.get(recommended_arch, {}).get("max_complexity", "simple"), 1
    )]

    could_simplify = len(simpler_viable) > 0

    return {
        "simplification_options": simplification_options,
        "reasons_needs_current": reasons_needs_current,
        "could_simplify": could_simplify,
        "simplification_candidates": [s["architecture"] for s in simpler_viable],
        "verdict": (
            f"A simpler architecture ({simpler_viable[0]['label']}) could potentially handle this use case."
            if could_simplify else
            f"{recommended_arch} is the correct choice. Simpler architectures cannot meet the requirements."
        ),
    }


def run_corrective_agent(answers: dict, recommended_arch: str, validation: dict, requirements_test: dict) -> dict:
    """
    Corrective Agent: If the Validator found critical issues, determine the
    correct architecture and explain the correction.
    """
    if validation["status"] == "validated":
        return {
            "action": "none",
            "message": "No correction needed. Architecture recommendation is validated.",
            "original_arch": recommended_arch,
            "corrected_arch": None,
            "corrections": [],
        }

    critical_issues = [i for i in validation["issues"] if i["severity"] == "critical"]
    if not critical_issues:
        return {
            "action": "advisory",
            "message": "Minor concerns found but no critical issues. Recommendation stands with advisories.",
            "original_arch": recommended_arch,
            "corrected_arch": None,
            "corrections": [
                {"issue": i["check"], "advisory": i["message"]} for i in validation["issues"]
            ],
        }

    # Determine correct architecture from critical issues
    fix_targets = [i["fix"] for i in critical_issues]
    # If any critical issue points to Foundry, that wins (it's the most capable)
    if "FOUNDRY_AGENT" in fix_targets:
        corrected = "FOUNDRY_AGENT"
    elif "FABRIC_AGENT" in fix_targets:
        corrected = "FABRIC_AGENT"
    else:
        corrected = fix_targets[0]

    corrections = []
    for issue in critical_issues:
        corrections.append({
            "issue": issue["check"],
            "problem": issue["message"],
            "fix": f"Corrected to {issue['fix']}",
        })

    return {
        "action": "corrected",
        "message": f"Critical issues found. Corrected from {recommended_arch} to {corrected}.",
        "original_arch": recommended_arch,
        "corrected_arch": corrected,
        "corrections": corrections,
    }


def run_full_validation_pipeline(answers: dict, recommended_arch: str) -> dict:
    """Run all three agents in sequence and return combined results."""
    validation = run_validator_agent(answers, recommended_arch)
    requirements_test = run_requirements_test_agent(answers, recommended_arch)
    corrective = run_corrective_agent(answers, recommended_arch, validation, requirements_test)

    return {
        "validator": validation,
        "requirementsTest": requirements_test,
        "corrective": corrective,
        "overall_status": corrective["action"] if corrective["action"] != "none" else validation["status"],
    }
