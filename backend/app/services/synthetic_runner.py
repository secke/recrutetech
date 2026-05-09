"""SDK wrappers for the structured-rubric-builder synthetic-test flow.

Deliverable #1 of the rubric skill backend implementation.

Two async functions:
  - simulate_candidate_transcript  — fires Claude with tool_use to produce a fake
                                     interview transcript at a given seniority level.
  - score_transcript_against_rubric — fires Claude (evaluation prompt) to score that
                                      transcript against the rubric; returns per-skill
                                      scores and an overall score on a 0-5 scale.

Both functions are intentionally thin SDK plumbing: they delegate all prompt
content to the prompt-engineer's modules (synthetic_candidate, evaluation).
If those modules are unavailable at import time, each function raises ImportError
with a clear message so the caller (run_synthetic_test) can activate its stub fallback.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy async Anthropic client — reuse single instance per process lifetime.
# Same pattern as report_service (sync client there; async here because
# run_synthetic_test is async).
# ---------------------------------------------------------------------------

_async_client = None


def _get_async_client():
    global _async_client
    if _async_client is None:
        try:
            from anthropic import AsyncAnthropic
        except ImportError as exc:
            raise ImportError(
                "anthropic package is required for synthetic_runner. "
                "Install it with: pip install anthropic"
            ) from exc
        _async_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _async_client


# ---------------------------------------------------------------------------
# simulate_candidate_transcript
# ---------------------------------------------------------------------------


async def simulate_candidate_transcript(
    rubric_dict: dict,
    level: str,
) -> list[dict]:
    """Return a list of transcript turns for a synthetic candidate at the given level.

    Each turn has the shape expected by report_service._build_user_message and
    the ElevenLabs webhook handler:
        {"role": "agent"|"user", "text": str, "time_in_call_secs": int}

    Raises ImportError if synthetic_candidate prompt module is missing.
    Raises RuntimeError if the Claude call fails or returns no tool_use block.
    """
    try:
        from app.services.prompts.synthetic_candidate import (
            SYNTHETIC_CANDIDATE_SYSTEM_PROMPT,
            SYNTHETIC_CANDIDATE_TOOL_SCHEMA,
            build_synthetic_candidate_user_message,
        )
    except ImportError as exc:
        raise ImportError(
            "simulate_candidate_transcript requires "
            "app.services.prompts.synthetic_candidate — module not yet published. "
            "Check with prompt-engineer."
        ) from exc

    if level not in ("junior", "mid", "senior"):
        raise ValueError(f"level must be junior/mid/senior, got {level!r}")

    rubric_version_label = str(rubric_dict.get("role_title", ""))
    user_message = build_synthetic_candidate_user_message(
        rubric_json=rubric_dict,
        target_level=level,
        rubric_version_label=rubric_version_label,
    )

    client = _get_async_client()

    logger.debug(
        "synthetic_runner.simulate.start",
        extra={"level": level, "model": settings.ANTHROPIC_MODEL},
    )

    response = await client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=8192,
        system=SYNTHETIC_CANDIDATE_SYSTEM_PROMPT,
        tools=[SYNTHETIC_CANDIDATE_TOOL_SCHEMA],
        tool_choice={"type": "tool", "name": "emit_synthetic_transcript"},
        messages=[{"role": "user", "content": user_message}],
        timeout=60,
    )

    # Extract the tool_use block.
    tool_input: dict[str, Any] | None = None
    for block in response.content:
        if getattr(block, "type", None) == "tool_use":
            tool_input = block.input  # type: ignore[attr-defined]
            break

    if tool_input is None:
        raise RuntimeError(
            f"Claude did not return a tool_use block for synthetic transcript "
            f"(level={level}). Stop reason: {response.stop_reason}"
        )

    raw_turns: list[dict] = tool_input.get("transcript", [])

    # Normalise to the shape report_service / webhooks expect.
    # Tool schema uses "content"; downstream parsers look for "text".
    turns: list[dict] = []
    for t in raw_turns:
        turns.append(
            {
                "role": t.get("role", "agent"),
                "text": t.get("content", t.get("text", "")),
                "time_in_call_secs": t.get("time_in_call_secs", 0),
            }
        )

    logger.info(
        "synthetic_runner.simulate.done",
        extra={"level": level, "turn_count": len(turns)},
    )
    return turns


# ---------------------------------------------------------------------------
# score_transcript_against_rubric
# ---------------------------------------------------------------------------


async def score_transcript_against_rubric(
    rubric_dict: dict,
    transcript: list[dict],
) -> tuple[dict[str, float], float]:
    """Score a transcript against the rubric.

    Returns:
        (skill_scores, overall_score) where skill_scores maps skill.id -> float [0-5]
        and overall_score is a float [0-5].

    Raises ImportError if evaluation prompt module is not yet published.
    Raises RuntimeError on Claude call failure.
    """
    try:
        from app.services.prompts.evaluation import (  # type: ignore[import]
            EVALUATION_SYSTEM_PROMPT,
            EVALUATION_TOOL_SCHEMA,
        )
    except ImportError as exc:
        raise ImportError(
            "score_transcript_against_rubric requires "
            "app.services.prompts.evaluation — module not yet published by prompt-engineer."
        ) from exc

    # Build the user message: rubric context + formatted transcript + empty visual/code.
    skill_ids = [s["id"] for s in rubric_dict.get("skills", [])]

    transcript_lines: list[str] = []
    for t in transcript:
        speaker = "Aria" if t.get("role") in ("agent", "ai", "aria") else "Candidate"
        ts = t.get("time_in_call_secs")
        prefix = f"[{int(ts)}s] " if isinstance(ts, (int, float)) else ""
        transcript_lines.append(f"{prefix}{speaker}: {t.get('text', '')}")

    user_message = (
        f"# Rubric\n"
        f"```json\n{json.dumps(rubric_dict, ensure_ascii=False, indent=2)}\n```\n\n"
        f"# Transcript\n"
        + "\n".join(transcript_lines)
        + "\n\n# Visual metrics\n(synthetic test — no visual data)\n"
        "\n# Code artifacts\n(none for this simulation)\n\n"
        "Score this transcript against the rubric. "
        "Return skill_scores keyed by skill id on a 0-5 scale and overall_score on 0-5."
    )

    client = _get_async_client()

    logger.debug(
        "synthetic_runner.score.start",
        extra={"model": settings.ANTHROPIC_MODEL, "skill_count": len(skill_ids)},
    )

    response = await client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=4096,
        system=EVALUATION_SYSTEM_PROMPT,
        tools=[EVALUATION_TOOL_SCHEMA],
        tool_choice={"type": "tool", "name": EVALUATION_TOOL_SCHEMA["name"]},
        messages=[{"role": "user", "content": user_message}],
        timeout=60,
    )

    tool_input: dict[str, Any] | None = None
    for block in response.content:
        if getattr(block, "type", None) == "tool_use":
            tool_input = block.input  # type: ignore[attr-defined]
            break

    if tool_input is None:
        raise RuntimeError(
            f"Claude did not return a tool_use block for scoring. "
            f"Stop reason: {response.stop_reason}"
        )

    raw_skill_scores: dict = tool_input.get("skill_scores", {})
    raw_overall: float = float(tool_input.get("overall_score", 0.0))

    # Normalise: clamp to [0, 5] and ensure all rubric skills have an entry.
    skill_scores: dict[str, float] = {}
    for sid in skill_ids:
        raw = raw_skill_scores.get(sid, raw_overall)
        skill_scores[sid] = max(0.0, min(5.0, float(raw)))

    overall_score = max(0.0, min(5.0, raw_overall))

    logger.info(
        "synthetic_runner.score.done",
        extra={"overall_score": overall_score},
    )
    return skill_scores, overall_score
