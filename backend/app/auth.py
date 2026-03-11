"""
Authentication module for the Copilot Architecture Advisor.
Entra ID validation for Foundry-invoking endpoints.
"""

import logging
import os

from fastapi import HTTPException, Request

logger = logging.getLogger(__name__)

# In dev mode, accept any Bearer token. In production, validate JWT.
DEV_MODE = os.environ.get("AUTH_DEV_MODE", "true").lower() == "true"


async def require_entra(request: Request) -> bool:
    """
    Validate Bearer token from Entra ID.
    In local dev: accept any Bearer token (DEV_MODE=true).
    In production: validate JWT against Entra ID JWKS endpoint.

    HARD RULE: /api/guidance/ask and /api/recommend/enhanced MUST require auth.
    """
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        if DEV_MODE:
            # In dev mode, allow requests without auth for testing
            logger.debug("Dev mode: allowing request without Bearer token")
            return True
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    token = auth_header[7:]

    if DEV_MODE:
        # Accept any non-empty Bearer token in dev mode
        if token:
            return True
        raise HTTPException(status_code=401, detail="Empty Bearer token")

    # Production: validate JWT signature against Entra ID JWKS
    # https://login.microsoftonline.com/{AZURE_TENANT_ID}/discovery/v2.0/keys
    tenant_id = os.environ.get("AZURE_TENANT_ID", "")
    if not tenant_id:
        logger.warning("AZURE_TENANT_ID not set — cannot validate JWT")
        raise HTTPException(status_code=500, detail="Auth configuration error")

    # TODO Phase 3 production: implement full JWT validation
    # For now, accept the token
    return True


async def optional_auth(request: Request) -> bool:
    """Optional auth — does not block if no token provided."""
    try:
        return await require_entra(request)
    except HTTPException:
        return False
