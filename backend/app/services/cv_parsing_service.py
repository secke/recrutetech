"""CV parsing and personalization service — cv-adaptive-personalization skill.

This module provides:
- extract_text_from_upload: PDF/DOCX/TXT -> raw text
- parse_cv: raw text -> CVParsedSchema via Claude opus (tool_use)
- compose_personalized_prompt: Role + CVParsedSchema -> Aria system prompt string
- adapt_prompt_mid_interview: Phase 2 placeholder stub

RGPD: All inputs/outputs here may contain candidate PII (name, work history).
  - cv_text: retained 90 days from cv_received_at, then NULL'd (see purge script).
  - cv_parsed_json: same 90-day retention; stored as JSON text in Interview.
  - personalized_prompt: same 90-day retention.
  See backend/app/scripts/purge_expired_cv_text.py and Interview model docstring.
"""
from __future__ import annotations

import json
import logging
import re
import unicodedata
from typing import Literal

from pydantic import BaseModel, Field

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pydantic schema for the structured CV output
# ---------------------------------------------------------------------------

_MAX_CV_CHARS = 50_000


class NotableProject(BaseModel):
    title: str
    tech: list[str] = Field(default_factory=list)
    scale_signals: list[str] = Field(default_factory=list)
    role: str = ""
    duration_months: int | None = None


class CVParsedSchema(BaseModel):
    """Structured representation of a candidate's CV, produced by Claude parsing.

    prompt_version tracks which cv_parsing prompt was used, enabling future A/B evals.
    redactions_applied lists fields that were explicitly stripped (PII/protected attrs).
    """

    candidate_name: str
    years_of_experience: int
    seniority_inferred: Literal["junior", "mid", "senior", "staff", "principal"]
    primary_stack: list[str] = Field(default_factory=list)
    secondary_stack: list[str] = Field(default_factory=list)
    domains: list[str] = Field(default_factory=list)
    notable_projects: list[NotableProject] = Field(default_factory=list)
    potential_red_flags: list[str] = Field(default_factory=list)
    suggested_deep_dive_topics: list[str] = Field(default_factory=list)
    language_signals: Literal["french_only", "english_only", "both", "unknown"] = "unknown"
    prompt_version: str = "unknown"
    redactions_applied: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Lazy async Anthropic client — same pattern as synthetic_runner.py
# ---------------------------------------------------------------------------

_async_client = None


def _get_async_client():
    global _async_client
    if _async_client is None:
        try:
            from anthropic import AsyncAnthropic
        except ImportError as exc:
            raise ImportError(
                "anthropic package required for cv_parsing_service. "
                "Install with: pip install anthropic"
            ) from exc
        _async_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _async_client


# ---------------------------------------------------------------------------
# extract_text_from_upload
# ---------------------------------------------------------------------------


def _strip_control_chars(text: str) -> str:
    """Remove non-printable control characters (keep newlines and tabs)."""
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", " ", text)


async def extract_text_from_upload(filename: str, content: bytes) -> str:
    """Extract plain text from an uploaded CV file.

    Supports .pdf, .docx, .txt (case-insensitive). Rejects anything else.
    Caps output at 50_000 chars.

    Raises:
        ValueError: unsupported extension, or extracted text exceeds 50_000 chars.
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf":
        try:
            import pypdf  # type: ignore[import]
        except ImportError as exc:
            raise ImportError(
                "pypdf is required for PDF extraction. "
                "Add pypdf>=5.0 to pyproject.toml and run uv sync."
            ) from exc
        import io
        reader = pypdf.PdfReader(io.BytesIO(content))
        pages: list[str] = []
        for page in reader.pages:
            page_text = page.extract_text() or ""
            pages.append(page_text)
        raw = "\n\n".join(pages)
        raw = _strip_control_chars(raw)

    elif ext == "docx":
        try:
            import docx  # type: ignore[import]
        except ImportError as exc:
            raise ImportError(
                "python-docx is required for DOCX extraction. "
                "Add python-docx>=1.1 to pyproject.toml and run uv sync."
            ) from exc
        import io
        doc = docx.Document(io.BytesIO(content))
        paras = [p.text for p in doc.paragraphs if p.text.strip()]
        raw = "\n".join(paras)

    elif ext == "txt":
        raw = content.decode("utf-8", errors="replace")

    else:
        raise ValueError(
            f"Unsupported file type '.{ext}'. Only .pdf, .docx, .txt are accepted."
        )

    if len(raw) > _MAX_CV_CHARS:
        raise ValueError(
            f"Extracted CV text is {len(raw)} chars, which exceeds the 50,000-char limit. "
            "This is almost certainly not a CV. Please upload the correct file."
        )

    return raw


# ---------------------------------------------------------------------------
# parse_cv — calls Claude with tool_use to produce CVParsedSchema
# ---------------------------------------------------------------------------


async def parse_cv(raw_text: str, role_hint: dict | None = None) -> CVParsedSchema:
    """Parse a raw CV text into a structured CVParsedSchema via Claude opus tool_use.

    Lazy-imports app.services.prompts.cv_parsing (shipped by prompt-engineer).
    If the module is not yet importable, raises NotImplementedError so callers
    can handle it gracefully (the CV endpoint does best-effort: stores cv_text
    and returns 200 even if parsing fails).

    Raises:
        NotImplementedError: cv_parsing prompt module not yet published.
        ValueError: Claude returned an unparseable or schema-invalid response.
        RuntimeError: Claude call failed entirely (no tool_use block).
    """
    # Lazy import — prompt-engineer module may not be published yet.
    try:
        from app.services.prompts.cv_parsing import (  # type: ignore[import]
            PROMPT_VERSION,
            CV_PARSING_SYSTEM_PROMPT,
            CV_PARSING_TOOL_SCHEMA,
            build_cv_parsing_user_message,
        )
    except ImportError as exc:
        raise NotImplementedError(
            "cv_parsing prompt module not yet published — "
            "expected at app.services.prompts.cv_parsing. "
            "Check with prompt-engineer."
        ) from exc

    user_message = build_cv_parsing_user_message(raw_text, role_hint)

    client = _get_async_client()

    logger.debug(
        "cv_parsing.parse.start",
        extra={"model": "claude-opus-4-7", "text_length": len(raw_text)},
    )

    response = await client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1500,
        system=CV_PARSING_SYSTEM_PROMPT,
        tools=[CV_PARSING_TOOL_SCHEMA],
        tool_choice={"type": "tool", "name": CV_PARSING_TOOL_SCHEMA["name"]},
        messages=[{"role": "user", "content": user_message}],
        timeout=60,
    )

    # Extract tool_use block — same pattern as synthetic_runner.py.
    tool_input: dict | None = None
    for block in response.content:
        if getattr(block, "type", None) == "tool_use":
            tool_input = block.input  # type: ignore[attr-defined]
            break

    if tool_input is None:
        raise RuntimeError(
            f"Claude did not return a tool_use block for CV parsing. "
            f"Stop reason: {response.stop_reason}"
        )

    # Defense in depth: ensure redactions_applied is always present.
    if "redactions_applied" not in tool_input or tool_input["redactions_applied"] is None:
        tool_input["redactions_applied"] = []

    # Stamp the prompt version from the imported module.
    tool_input["prompt_version"] = PROMPT_VERSION

    try:
        parsed = CVParsedSchema.model_validate(tool_input)
    except Exception as exc:
        logger.error(
            "cv_parsing.validation_error",
            extra={"error": str(exc)},
        )
        raise ValueError(f"CV parsing failed validation: {exc}") from exc

    logger.info(
        "cv_parsing.parse.done",
        extra={
            "seniority": parsed.seniority_inferred,
            "projects_count": len(parsed.notable_projects),
            "redactions_count": len(parsed.redactions_applied),
        },
    )
    return parsed


# ---------------------------------------------------------------------------
# compose_personalized_prompt
# ---------------------------------------------------------------------------


def compose_personalized_prompt(
    role: "Role",  # type: ignore[name-defined]  # noqa: F821
    cv_parsed: CVParsedSchema,
    rubric: "Rubric | None" = None,  # type: ignore[name-defined]  # noqa: F821
) -> str:
    """Compose the personalized Aria system prompt for an interview.

    Rubric path (preferred): if a rubric with rubric_json is supplied, delegates to
        prompt_builder.compose_aria_prompt_from_rubric(rubric_json, cv_parsed=dict).
    Legacy path (fallback): appends a # Candidate context section to role.system_prompt
        with notable_projects and suggested_deep_dive_topics (≤ 800 added tokens).

    Returns:
        Composed prompt string.
    """
    cv_dict = cv_parsed.model_dump()

    # Schema shim: prompt_builder reads cv_parsed["top_projects"][i]["name"], but the parser
    # emits notable_projects[i]["title"]. Translate so the project-anchoring bullet fires.
    cv_dict["top_projects"] = [
        {**p, "name": p.get("title", "")} for p in cv_dict.get("notable_projects", [])
    ]

    # Rubric path.
    if rubric is not None and rubric.rubric_json:
        try:
            import json as _json
            from app.services.prompt_builder import compose_aria_prompt_from_rubric
            rubric_dict = _json.loads(rubric.rubric_json)
            return compose_aria_prompt_from_rubric(rubric_dict, cv_parsed=cv_dict)
        except ImportError:
            logger.warning(
                "cv_personalization.compose.rubric_builder_missing",
                extra={"role_id": role.id},
            )
            # Fall through to legacy path.

    # Legacy path — append a compact candidate context block.
    base_prompt = role.system_prompt or ""

    projects_lines: list[str] = []
    for proj in cv_parsed.notable_projects[:3]:
        tech_str = ", ".join(proj.tech[:4]) if proj.tech else ""
        line = f"- {proj.title}"
        if tech_str:
            line += f" ({tech_str})"
        projects_lines.append(line)

    deep_dive_lines = [f"- {t}" for t in cv_parsed.suggested_deep_dive_topics[:4]]

    candidate_block_parts = [
        "\n\n# Candidate context",
        f"Name: {cv_parsed.candidate_name}",
        f"Inferred seniority: {cv_parsed.seniority_inferred} ({cv_parsed.years_of_experience} yrs)",
        f"Primary stack: {', '.join(cv_parsed.primary_stack[:5]) or 'unknown'}",
    ]

    if projects_lines:
        candidate_block_parts.append("\nNotable projects to reference:")
        candidate_block_parts.extend(projects_lines)

    if deep_dive_lines:
        candidate_block_parts.append("\nSuggested deep-dive topics (use as follow-ups, not scripted questions):")
        candidate_block_parts.extend(deep_dive_lines)

    candidate_block_parts.append(
        "\n(Reference the candidate's own projects naturally. "
        "Adjust difficulty to their seniority level. "
        "Surface potential red flags only AFTER initial rapport is established.)"
    )

    candidate_block = "\n".join(candidate_block_parts)

    # Cap addition to roughly 800 tokens (3200 chars / 4 chars-per-token estimate).
    if len(candidate_block) > 3200:
        candidate_block = candidate_block[:3197] + "..."

    return base_prompt + candidate_block


# ---------------------------------------------------------------------------
# adapt_prompt_mid_interview — Phase 2 placeholder
# ---------------------------------------------------------------------------


async def adapt_prompt_mid_interview(
    interview: "Interview",  # type: ignore[name-defined]  # noqa: F821
    signal: str,
) -> str | None:
    """Phase 2 placeholder: adapt the Aria prompt during the interview based on
    new signals (e.g. candidate revealing unexpected expertise). Not implemented in Phase 1."""
    # TODO(Phase 2): Send partial transcript + cv_parsed_json to claude-haiku-4-5-20251001
    # (cheap/fast classification per CLAUDE.md) at every ~5-10 turns.
    # Return a next_question_hint string or None if no adaptation needed.
    # Wire into the WebSocket message handler once ElevenLabs confirms agent.update support.
    return None
