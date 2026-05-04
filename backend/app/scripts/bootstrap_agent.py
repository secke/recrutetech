"""One-shot script: creates the Aria agent in your ElevenLabs workspace.

Usage:
    cd backend
    python -m app.scripts.bootstrap_agent

Prereq:
    `ELEVENLABS_API_KEY` set in .env
    `PUBLIC_BACKEND_URL` set to where the webhook will be reachable
      (use ngrok / a tunnel during local dev — webhook must be publicly reachable)

After it runs, the agent_id is printed; copy it into .env as ELEVENLABS_AGENT_ID.
"""
from __future__ import annotations

import sys

import httpx

from app.core.config import settings

API = "https://api.elevenlabs.io/v1"

# We use a generic warm French/English agent — per-session prompt overrides happen at start time.
GENERIC_PROMPT = (
    "You are Aria, a warm and competent AI interviewer. "
    "When you connect, follow the system prompt provided in the session overrides. "
    "If no override is provided, briefly introduce yourself and ask the candidate to introduce themselves."
)
GENERIC_FIRST_MESSAGE = (
    "Bonjour, je suis Aria. Connexion en cours..."
)

# A French-friendly multilingual voice. You can swap this in the dashboard later.
DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB"  # Adam — multilingual

CONFIG = {
    "name": "Aria — RecruteTech",
    "conversation_config": {
        "agent": {
            "prompt": {
                "prompt": GENERIC_PROMPT,
                # Use a smart, multilingual model. Can be changed in the dashboard.
                "llm": "gemini-2.0-flash-001",
            },
            "first_message": GENERIC_FIRST_MESSAGE,
            "language": "fr",
        },
        "tts": {
            "voice_id": DEFAULT_VOICE_ID,
            "model_id": "eleven_turbo_v2_5",  # multilingual + low-latency
        },
        "asr": {"quality": "high"},
        "turn": {"turn_timeout": 7},
    },
    # Allow per-session overrides — REQUIRED for our dynamic-prompt flow.
    "platform_settings": {
        "overrides": {
            "conversation_config_override": {
                "agent": {
                    "prompt": {"prompt": True},
                    "first_message": True,
                    "language": True,
                },
            },
        },
    },
}


def main() -> int:
    if not settings.ELEVENLABS_API_KEY:
        print("❌ ELEVENLABS_API_KEY is not set. Add it to backend/.env first.", file=sys.stderr)
        return 1

    headers = {"xi-api-key": settings.ELEVENLABS_API_KEY, "Content-Type": "application/json"}

    print("→ creating ElevenLabs agent...")
    r = httpx.post(f"{API}/convai/agents/create", headers=headers, json=CONFIG, timeout=30)
    if r.status_code >= 400:
        print(f"❌ create failed: HTTP {r.status_code}", file=sys.stderr)
        print(r.text, file=sys.stderr)
        return 1
    agent_id = r.json().get("agent_id")
    if not agent_id:
        print(f"❌ unexpected response: {r.json()}", file=sys.stderr)
        return 1

    print(f"✓ agent created: {agent_id}")
    print()
    print("Next steps:")
    print(f"  1. Add this line to backend/.env:")
    print(f"     ELEVENLABS_AGENT_ID={agent_id}")
    print()
    print("  2. In the ElevenLabs dashboard → your agent → Webhooks tab, set the post-call webhook URL to:")
    print(f"     {settings.PUBLIC_BACKEND_URL}/api/webhooks/elevenlabs")
    print(f"     and copy the generated secret into backend/.env as ELEVENLABS_WEBHOOK_SECRET.")
    print()
    print("  3. Restart the backend.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
