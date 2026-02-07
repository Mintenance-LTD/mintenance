"""
API Key authentication middleware for SAM3 Service.

Validates requests using either:
  - X-API-Key header
  - Authorization: Bearer <key> header

The expected key is read from the API_KEY environment variable.
Health endpoint is excluded from authentication.
"""

import os
import hmac
import logging
from typing import Optional

from fastapi import Request, HTTPException, Security
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# Security schemes
api_key_header_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)

# Paths excluded from authentication (health checks, docs)
EXCLUDED_PATHS = {"/health", "/", "/docs", "/openapi.json", "/redoc"}


def _get_api_key() -> Optional[str]:
    """Retrieve the expected API key from environment."""
    return os.environ.get("API_KEY")


def _constant_time_compare(a: str, b: str) -> bool:
    """Compare two strings in constant time to prevent timing attacks."""
    return hmac.compare_digest(a.encode("utf-8"), b.encode("utf-8"))


class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware that enforces API key authentication on all endpoints
    except health checks and documentation.

    Checks X-API-Key header first, then Authorization: Bearer token.
    If API_KEY env var is not set, authentication is disabled (dev mode).
    """

    async def dispatch(self, request: Request, call_next):
        # Skip auth for excluded paths
        if request.url.path in EXCLUDED_PATHS:
            return await call_next(request)

        # Skip auth for OPTIONS (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        expected_key = _get_api_key()

        # If no API_KEY configured, log warning and allow (dev mode)
        if not expected_key:
            logger.warning(
                "API_KEY environment variable not set. "
                "Authentication is disabled. Set API_KEY in production."
            )
            return await call_next(request)

        # Check X-API-Key header
        provided_key = request.headers.get("X-API-Key")

        # Fallback to Authorization: Bearer header
        if not provided_key:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                provided_key = auth_header[7:]  # Strip "Bearer " prefix

        # Validate
        if not provided_key:
            logger.warning(
                "Rejected request to %s: missing API key", request.url.path
            )
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing API key. Provide X-API-Key header or Authorization: Bearer token."},
            )

        if not _constant_time_compare(provided_key, expected_key):
            logger.warning(
                "Rejected request to %s: invalid API key", request.url.path
            )
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid API key."},
            )

        return await call_next(request)


async def require_api_key(
    api_key: Optional[str] = Security(api_key_header_scheme),
    bearer: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
) -> str:
    """
    FastAPI dependency for per-route API key validation.
    Use as an alternative to the global middleware for selective protection.
    """
    expected_key = _get_api_key()

    if not expected_key:
        return "dev-mode"

    provided_key = api_key or (bearer.credentials if bearer else None)

    if not provided_key:
        raise HTTPException(
            status_code=401,
            detail="Missing API key. Provide X-API-Key header or Authorization: Bearer token.",
        )

    if not _constant_time_compare(provided_key, expected_key):
        raise HTTPException(status_code=403, detail="Invalid API key.")

    return provided_key


# Convenience alias
api_key_auth = APIKeyAuthMiddleware
