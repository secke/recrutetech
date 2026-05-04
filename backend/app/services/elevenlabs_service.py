"""Thin wrapper around the ElevenLabs Conversational AI REST API.

We intentionally keep this lean — voice/STT/LLM/turn-taking all live inside the
ElevenLabs Agent. We only need to:
  1) create the agent once (bootstrap script),
  2) mint a short-lived signed WebSocket URL per candidate session,
  3) verify the post-call webhook signature.
"""
from __future__ import annotations

import hashlib
import hmac
import time
from typing import Any

import httpx

from app.core.config import settings

API_BASE = "https://api.elevenlabs.io/v1"


def _headers() -> dict[str, str]:
    if not settings.ELEVENLABS_API_KEY:
        raise RuntimeError("ELEVENLABS_API_KEY is not configured")
    return {"xi-api-key": settings.ELEVENLABS_API_KEY, "Content-Type": "application/json"}


async def get_signed_url(agent_id: str | None = None) -> str:
    """Mint a short-lived signed wss:// URL for the browser to connect with."""
    aid = agent_id or settings.ELEVENLABS_AGENT_ID
    if not aid:
        raise RuntimeError("ELEVENLABS_AGENT_ID is not configured")

    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(
            f"{API_BASE}/convai/conversation/get-signed-url",
            params={"agent_id": aid},
            headers=_headers(),
        )
        r.raise_for_status()
        return r.json()["signed_url"]


async def get_conversation(conversation_id: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{API_BASE}/convai/conversations/{conversation_id}",
            headers=_headers(),
        )
        r.raise_for_status()
        return r.json()


def verify_webhook(body: bytes, signature_header: str | None, *, tolerance: int = 30 * 60) -> bool:
    """Verify the HMAC signature ElevenLabs sends with each webhook.

    Header format (per ElevenLabs docs): `t=<unix_ts>,v0=<hex_hmac_sha256>`
    """
    if not signature_header or not settings.ELEVENLABS_WEBHOOK_SECRET:
        return False

    parts = dict(p.split("=", 1) for p in signature_header.split(",") if "=" in p)
    ts = parts.get("t")
    sig = parts.get("v0")
    if not ts or not sig:
        return False

    try:
        if abs(int(time.time()) - int(ts)) > tolerance:
            return False
    except ValueError:
        return False

    payload = f"{ts}.".encode() + body
    expected = hmac.new(
        settings.ELEVENLABS_WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, sig)
