"""
Azure AI Foundry integration for the Copilot Architecture Advisor.
Implements the exact SDK pattern from spec Section 2.2.
Gracefully falls back when Azure credentials are unavailable.
"""

import json
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

FOUNDRY_ENDPOINT = os.environ.get(
    "AZURE_FOUNDRY_ENDPOINT",
    "https://ahfy26-resource.services.ai.azure.com/api/projects/ahfy26",
)
FOUNDRY_AGENT_NAME = os.environ.get("AZURE_FOUNDRY_AGENT_NAME", "greg")
FOUNDRY_AGENT_VERSION = os.environ.get("AZURE_FOUNDRY_AGENT_VERSION", "1")
FOUNDRY_TIMEOUT = int(os.environ.get("FOUNDRY_TIMEOUT_SECONDS", "8"))

# Track whether Foundry is available
_foundry_available: Optional[bool] = None
_openai_client = None


def _init_foundry_client():
    """
    Initialize the Azure AI Foundry client using DefaultAzureCredential.
    Returns None if Azure credentials are not available.
    """
    global _foundry_available, _openai_client

    if _foundry_available is not None:
        return _openai_client

    try:
        from azure.identity import DefaultAzureCredential
        from azure.ai.projects import AIProjectClient

        credential = DefaultAzureCredential()
        project_client = AIProjectClient(
            endpoint=FOUNDRY_ENDPOINT,
            credential=credential,
        )
        _openai_client = project_client.get_openai_client()
        _foundry_available = True
        logger.info("Azure AI Foundry client initialized successfully")
        return _openai_client

    except ImportError:
        logger.warning("Azure AI SDK not installed — Foundry features disabled")
        _foundry_available = False
        return None
    except Exception as e:
        logger.warning(f"Azure AI Foundry unavailable: {e}")
        _foundry_available = False
        return None


def is_foundry_available() -> bool:
    """Check if Foundry client is available."""
    global _foundry_available
    if _foundry_available is None:
        _init_foundry_client()
    return _foundry_available or False


async def call_foundry_agent(answers: dict, base_spec: dict) -> Optional[str]:
    """
    Call the Foundry agent (greg) for enhanced spec narrative.
    Returns enhanced narrative text or None on failure.
    """
    client = _init_foundry_client()
    if client is None:
        return None

    prompt = _build_enhanced_prompt(answers, base_spec)

    try:
        response = client.responses.create(
            input=[{"role": "user", "content": prompt}],
            extra_body={
                "agent": {
                    "name": FOUNDRY_AGENT_NAME,
                    "version": FOUNDRY_AGENT_VERSION,
                    "type": "agent_reference",
                }
            },
        )
        return response.output_text

    except Exception as e:
        logger.error(f"Foundry agent call failed: {e}")
        return None


async def ask_guidance(question: str, context: str = "") -> Optional[dict]:
    """
    Route a natural language question to the Foundry agent with ChromaDB context.
    Returns dict with 'answer' and 'citations' or None on failure.
    """
    client = _init_foundry_client()
    if client is None:
        return None

    prompt = f"""You are a Microsoft Copilot architecture expert. Answer the following question 
using the provided context from Microsoft documentation.

Context:
{context}

Question: {question}

Provide a clear, specific answer with architecture recommendations. 
Reference specific Microsoft products and their capabilities."""

    try:
        response = client.responses.create(
            input=[{"role": "user", "content": prompt}],
            extra_body={
                "agent": {
                    "name": FOUNDRY_AGENT_NAME,
                    "version": FOUNDRY_AGENT_VERSION,
                    "type": "agent_reference",
                }
            },
        )
        return {
            "answer": response.output_text,
            "foundry_used": True,
        }

    except Exception as e:
        logger.error(f"Foundry guidance ask failed: {e}")
        return None


def handle_search_guidance(query: str, arch_filter: str = "ALL") -> dict:
    """
    Called by Foundry agent when it invokes the search_guidance tool.
    Searches ChromaDB for relevant guidance chunks.
    """
    from app.knowledge.chroma_store import query_guidance

    results = query_guidance(query_text=query, n_results=5, arch_filter=arch_filter)

    chunks = []
    if results["documents"] and results["documents"][0]:
        for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
            chunks.append({
                "text": doc[:400],
                "citation": meta.get("url", ""),
                "arch_tags": json.loads(meta.get("arch_tags", '["ALL"]')),
                "confidence_weight": meta.get("confidence_weight", 1.0),
            })

    return {"chunks": chunks, "count": len(chunks)}


# Foundry agent tool schema (registered in Azure AI Foundry portal)
SEARCH_GUIDANCE_TOOL = {
    "name": "search_guidance",
    "description": "Search the Microsoft Copilot guidance knowledge base for architecture recommendations.",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Natural language query about Microsoft Copilot or AI platform architecture",
            },
            "arch_filter": {
                "type": "string",
                "enum": ["COPILOT_STUDIO", "AGENT_BUILDER", "FABRIC_AGENT", "FOUNDRY_AGENT", "ALL"],
                "description": "Optional: filter results to a specific architecture",
                "default": "ALL",
            },
        },
        "required": ["query"],
    },
    "output_schema": {
        "chunks": [
            {
                "text": "string",
                "citation": "string",
                "arch_tags": ["string"],
                "confidence_weight": "float",
            }
        ],
        "count": "int",
    },
}


def _build_enhanced_prompt(answers: dict, base_spec: dict) -> str:
    """Build prompt for Foundry agent enhanced narrative."""
    arch_label = base_spec.get("recommendedArchitecture", {}).get("label", "Unknown")
    confidence = base_spec.get("recommendedArchitecture", {}).get("confidence", 0)

    return f"""You are the Copilot Architecture Advisor. Analyze this use case and provide an enhanced 
recommendation narrative.

Use Case: {answers.get('useCaseName', 'Unknown')}
Goal: {answers.get('primaryGoal', 'Unknown')}
Complexity: {answers.get('complexity', 'Unknown')}
Data Sources: {', '.join(answers.get('dataSources', []))}
PHI: {answers.get('hasPhi', 'no')}
Channel: {answers.get('uxChannel', 'Unknown')}
Code Capability: {answers.get('codeCapability', 'Unknown')}

Current Recommendation: {arch_label} (Confidence: {confidence:.0%})

Provide:
1. A detailed justification for the recommendation
2. Key implementation considerations
3. Potential risks and mitigations
4. Alternative approaches if confidence is low
5. Specific Microsoft product features to leverage"""
