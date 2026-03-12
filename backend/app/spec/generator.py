"""
Functional spec JSON builder for the Copilot Architecture Advisor.
Generates a structured spec document from wizard answers and scoring results.
"""



def generate_spec(answers: dict, ranked: list[dict]) -> dict:
    """Generate a functional specification JSON from answers and ranked results."""
    primary = ranked[0] if ranked else {}
    primary_id = primary.get("id", "UNKNOWN")
    primary_label = primary.get("label", "Unknown")

    spec = {
        "title": f"Functional Specification: {answers.get('useCaseName', 'Untitled')}",
        "useCaseName": answers.get("useCaseName", ""),
        "primaryGoal": answers.get("primaryGoal", ""),
        "recommendedArchitecture": {
            "id": primary_id,
            "label": primary_label,
            "confidence": primary.get("confidence", 0),
            "score": primary.get("score", 0),
        },
        "allRankings": ranked,
        "inputs": {
            "complexity": answers.get("complexity", ""),
            "dataSources": answers.get("dataSources", []),
            "hasPhi": answers.get("hasPhi", "no"),
            "uxChannel": answers.get("uxChannel", ""),
            "codeCapability": answers.get("codeCapability", ""),
            "userVolume": answers.get("userVolume", ""),
            "realtime": answers.get("realtime", "no"),
            "teamSize": answers.get("teamSize", ""),
        },
        "architectureOverview": _get_architecture_overview(primary_id),
        "keyConsiderations": _get_key_considerations(answers, primary_id),
        "nextSteps": _get_next_steps(primary_id),
        "implementationPrompt": _generate_implementation_prompt(answers, primary_id, primary_label),
    }

    # Add AI Lightning optimization insights for applicable architectures
    lightning = _get_ai_lightning_insights(answers, primary_id)
    if lightning:
        spec["aiLightning"] = lightning

    return spec


def _get_architecture_overview(arch_id: str) -> dict:
    """Return architecture-specific overview details."""
    overviews = {
        "COPILOT_STUDIO": {
            "platform": "Microsoft Copilot Studio",
            "description": "Low-code conversational AI platform for building chatbots and virtual agents. Ideal for simple to moderate use cases with M365 integration.",
            "strengths": [
                "Rapid prototyping with low-code tools",
                "Native M365 and Teams integration",
                "Built-in connectors for common data sources",
                "No pro-code skills required",
            ],
            "limitations": [
                "Limited customization for complex workflows",
                "Not suitable for PHI/HIPAA workloads",
                "Constrained multi-agent orchestration",
            ],
        },
        "AGENT_BUILDER": {
            "platform": "Microsoft 365 Copilot Agent Builder",
            "description": "Declarative agent framework extending M365 Copilot with custom skills, SharePoint grounding, and plugin actions.",
            "strengths": [
                "Deep M365 Copilot integration",
                "SharePoint grounding for enterprise knowledge",
                "Plugin-based extensibility",
                "Familiar M365 user experience",
            ],
            "limitations": [
                "Requires M365 Copilot licenses",
                "Not suitable for PHI/HIPAA workloads",
                "Limited to M365 ecosystem",
            ],
        },
        "FABRIC_AGENT": {
            "platform": "Microsoft Copilot + Fabric Data Agent",
            "description": "Data-centric AI agent leveraging Microsoft Fabric and OneLake for analytics-heavy use cases with large structured datasets.",
            "strengths": [
                "Native Fabric/OneLake integration",
                "Optimized for large-scale data analytics",
                "Real-time data processing capabilities",
                "Strong data governance features",
            ],
            "limitations": [
                "Requires Fabric workspace setup",
                "Higher complexity for simple use cases",
                "Data-centric — less suited for conversational-only patterns",
            ],
        },
        "FOUNDRY_AGENT": {
            "platform": "Microsoft Copilot + Azure AI Foundry",
            "description": "Enterprise-grade AI agent platform with full compliance control, multi-agent orchestration, and custom model support. Required for PHI/HIPAA workloads.",
            "strengths": [
                "Full HIPAA/PHI compliance",
                "Multi-agent orchestration",
                "Custom model deployment",
                "Snowflake and external data source support",
                "Maximum flexibility and control",
            ],
            "limitations": [
                "Requires pro-code development skills",
                "Higher setup complexity",
                "More infrastructure to manage",
            ],
        },
    }
    return overviews.get(arch_id, {"platform": "Unknown", "description": "", "strengths": [], "limitations": []})


def _get_key_considerations(answers: dict, arch_id: str) -> list[str]:
    """Generate key considerations based on answers."""
    considerations = []

    if answers.get("hasPhi") == "yes":
        considerations.append(
            "PHI/HIPAA COMPLIANCE: This use case involves Protected Health Information. "
            "Azure AI Foundry is required to ensure full HIPAA compliance and BAA coverage."
        )

    if answers.get("hasPhi") == "financial":
        considerations.append(
            "FINANCIAL DATA: This use case involves financial data requiring enhanced security controls."
        )

    if answers.get("complexity") == "multiagent":
        considerations.append(
            "MULTI-AGENT ORCHESTRATION: Complex multi-agent workflows require Azure AI Foundry's "
            "orchestration capabilities."
        )

    if answers.get("realtime") == "yes":
        considerations.append(
            "REAL-TIME PROCESSING: Real-time requirements favor Fabric or Foundry architectures "
            "for streaming data support."
        )

    if "snowflake" in (answers.get("dataSources") or []):
        considerations.append(
            "SNOWFLAKE INTEGRATION: Snowflake data sources require Azure AI Foundry for native connector support."
        )

    if answers.get("userVolume") == "enterprise":
        considerations.append(
            "ENTERPRISE SCALE: Enterprise-level user volumes require robust scaling — "
            "consider Fabric or Foundry for high-throughput scenarios."
        )

    return considerations


def _get_next_steps(arch_id: str) -> list[str]:
    """Generate next steps based on recommended architecture."""
    steps_map = {
        "COPILOT_STUDIO": [
            "Create a Copilot Studio environment in Power Platform admin center",
            "Design conversation flows using the visual designer",
            "Configure data source connectors (SharePoint, etc.)",
            "Set up Teams channel deployment",
            "Test with pilot users and iterate",
        ],
        "AGENT_BUILDER": [
            "Ensure M365 Copilot licenses are provisioned",
            "Set up SharePoint knowledge base for grounding",
            "Define agent capabilities and plugin actions",
            "Build and test declarative agent in Agent Builder",
            "Deploy to M365 Copilot for end users",
        ],
        "FABRIC_AGENT": [
            "Provision Microsoft Fabric workspace",
            "Configure OneLake data connections",
            "Set up data pipelines and transformations",
            "Build Copilot agent with Fabric data grounding",
            "Configure real-time analytics if needed",
        ],
        "FOUNDRY_AGENT": [
            "Set up Azure AI Foundry project and resource group",
            "Configure managed identity and RBAC",
            "Implement agent with Azure AI SDK",
            "Set up data connections (Snowflake, SQL, etc.)",
            "Implement compliance controls and audit logging",
            "Deploy with multi-agent orchestration if needed",
        ],
    }
    return steps_map.get(arch_id, [])


def _get_ai_lightning_insights(answers: dict, arch_id: str) -> dict | None:
    """Generate Microsoft AI Lightning optimization insights.

    Microsoft AI Lightning (from MS Research) decouples reinforcement learning
    training from agent logic, enabling agent optimization without code rewrites.
    This is most relevant for Foundry multi-agent scenarios but also applies to
    complex Fabric and Agent Builder patterns.
    """
    complexity = answers.get("complexity", "simple")
    agent_behavior = answers.get("agentBehavior", "")
    custom_model = answers.get("customModel", "no")

    # AI Lightning is most relevant for complex/multi-agent Foundry scenarios
    if arch_id == "FOUNDRY_AGENT":
        insights: dict = {
            "applicable": True,
            "framework": "Microsoft AI Lightning (MS Research)",
            "summary": (
                "AI Lightning decouples RL training from agent logic, enabling "
                "continuous optimization of agent behavior without rewriting code. "
                "This is especially valuable for multi-agent healthcare workflows "
                "where agent coordination must improve over time."
            ),
            "optimizationPaths": [],
            "trainingStrategy": "",
        }

        if complexity in ("multiagent", "complex"):
            insights["optimizationPaths"].append({
                "name": "Multi-Agent Coordination RL",
                "description": (
                    "Use Lightning's decoupled RL to train coordination policies "
                    "across agents without modifying individual agent code. Agents "
                    "learn optimal handoff timing, task allocation, and escalation patterns."
                ),
            })
            insights["trainingStrategy"] = (
                "Offline RL with logged interaction data. Lightning separates the "
                "training loop from the serving loop, so agent behavior improves "
                "from historical data without production code changes."
            )

        if agent_behavior == "autonomous":
            insights["optimizationPaths"].append({
                "name": "Autonomous Decision Optimization",
                "description": (
                    "Lightning enables reward shaping for autonomous agents — "
                    "define clinical accuracy, latency, and safety reward signals, "
                    "then let the RL trainer optimize decision boundaries independently."
                ),
            })

        if custom_model != "no":
            insights["optimizationPaths"].append({
                "name": "Fine-Tuned Model Alignment",
                "description": (
                    "Use Lightning's RLHF pipeline to align fine-tuned models with "
                    "clinical workflow requirements. The decoupled architecture means "
                    "model alignment training runs independently of serving infrastructure."
                ),
            })

        # Default path for all Foundry cases
        if not insights["optimizationPaths"]:
            insights["optimizationPaths"].append({
                "name": "Agent Performance Monitoring",
                "description": (
                    "Lightning provides a framework for tracking agent performance "
                    "metrics and identifying optimization opportunities through "
                    "reinforcement learning signals."
                ),
            })
            insights["trainingStrategy"] = (
                "Start with supervised monitoring, then transition to RL-based "
                "optimization as interaction data accumulates."
            )

        return insights

    # Fabric Agent with complex analytics can benefit from Lightning
    if arch_id == "FABRIC_AGENT" and complexity in ("complex", "multiagent"):
        return {
            "applicable": True,
            "framework": "Microsoft AI Lightning (MS Research)",
            "summary": (
                "AI Lightning can optimize Fabric Data Agent query routing and "
                "data pipeline orchestration through reinforcement learning, "
                "improving response accuracy and latency over time."
            ),
            "optimizationPaths": [{
                "name": "Query Routing Optimization",
                "description": (
                    "Use RL to learn optimal query routing across Fabric "
                    "lakehouse tables, reducing latency and improving result relevance."
                ),
            }],
            "trainingStrategy": (
                "Collect query performance metrics, then use Lightning's offline "
                "RL to train routing policies without modifying the data agent code."
            ),
        }

    # Not applicable for simpler architectures
    return None


def _generate_implementation_prompt(answers: dict, arch_id: str, arch_label: str) -> str:
    """Generate an implementation prompt."""
    data_sources = ", ".join(answers.get("dataSources", [])) or "none"
    return (
        f"Build a {arch_label} implementation for: {answers.get('useCaseName', 'Untitled')}. "
        f"Primary goal: {answers.get('primaryGoal', 'N/A')}. "
        f"Complexity: {answers.get('complexity', 'N/A')}. "
        f"Data sources: {data_sources}. "
        f"PHI: {answers.get('hasPhi', 'no')}. "
        f"UX channel: {answers.get('uxChannel', 'N/A')}. "
        f"Code capability: {answers.get('codeCapability', 'N/A')}. "
        f"User volume: {answers.get('userVolume', 'N/A')}. "
        f"Real-time: {answers.get('realtime', 'no')}. "
        f"Team size: {answers.get('teamSize', 'N/A')}."
    )
