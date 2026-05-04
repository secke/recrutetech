"""HR-side auth: a single shared API key passed via X-HR-API-Key header.

Lightweight on purpose — the alpha is single-tenant. Swap this for a real
identity layer (JWT / OAuth) before multi-tenant rollout.
"""
from fastapi import Header, HTTPException

from app.core.config import settings

_warned_dev_bypass = False


def require_hr_api_key(
    x_hr_api_key: str | None = Header(default=None, alias="X-HR-API-Key"),
) -> None:
    global _warned_dev_bypass
    if not settings.HR_API_KEY:
        if not _warned_dev_bypass:
            print("⚠️  HR_API_KEY not set — HR endpoints are unauthenticated (dev mode)")
            _warned_dev_bypass = True
        return
    if not x_hr_api_key or x_hr_api_key != settings.HR_API_KEY:
        raise HTTPException(401, "Invalid or missing X-HR-API-Key")
