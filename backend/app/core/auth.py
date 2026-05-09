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


# ---------------------------------------------------------------------------
# Admin / hiring manager stub — same key as HR for Wave 1.
# TODO: replace with role-based JWT claims in Wave 2 (Company/User model).
# ---------------------------------------------------------------------------

def require_admin_or_hm(
    x_hr_api_key: str | None = Header(default=None, alias="X-HR-API-Key"),
) -> str:
    """Return the caller identity string (stub: 'admin' for Wave 1).

    Enforces the same X-HR-API-Key check as require_hr_api_key.
    Wave 2 TODO: decode JWT, return user.email, check role in {admin, hm}.
    """
    global _warned_dev_bypass
    if not settings.HR_API_KEY:
        if not _warned_dev_bypass:
            print("⚠️  HR_API_KEY not set — HR endpoints are unauthenticated (dev mode)")
            _warned_dev_bypass = True
        return "admin"
    if not x_hr_api_key or x_hr_api_key != settings.HR_API_KEY:
        raise HTTPException(401, "Invalid or missing X-HR-API-Key")
    return "admin"
