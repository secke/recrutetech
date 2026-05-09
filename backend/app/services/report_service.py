"""Generates the post-interview HR report + candidate improvement letter
from the ElevenLabs transcript and MediaPipe visual metrics.

Architecture:
- Claude Opus 4.7 (the platform's most capable model) with adaptive thinking
- Two prompt paths:
    * Rubric-anchored (preferred) — uses the structured Rubric.rubric_json
      via `app.services.prompts.evaluation` (EVALUATION_PROMPT_VERSION 2.0.0,
      tool_use enforced JSON).
    * Legacy (fallback) — kept inline as `LEGACY_SYSTEM_PROMPT` for roles
      that have not yet been migrated to a structured rubric (see SKILL.md
      §9; sunset planned 6 months after rubric rollout).
- Single API call returns both the HR-facing JSON *and* the candidate letter.
- Run as a FastAPI BackgroundTask off the post-call webhook.

Transparency / explainability additions (transparent-scoring-explainability skill):
- verify_evidence_pointers: deterministic substring check, no Claude call.
- compute_integrity_hash: canonical SHA-256 over all evaluation inputs + overrides.
- generate_report_v3: wrapper that calls the v3 prompt path, verifies pointers,
  scrubs the candidate letter, and writes the integrity hash to the DB row.
"""
from __future__ import annotations

import hashlib
import json
import logging
import re
from typing import Any, Optional

from sqlmodel import Session

from app.core.config import settings
from app.db import engine
from app.models import Interview, Role, Rubric
from app.services.email_service import (
    candidate_completion_email,
    send_email,
)
from app.services.prompts.evaluation import (
    EVALUATION_PROMPT_VERSION,
    EVALUATION_SYSTEM_PROMPT,
    EVALUATION_TOOL_SCHEMA,
)


logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Legacy prompt + schema (pre-rubric path)
# Kept inline so that roles which have not been migrated to a structured
# Rubric still get a sensible report. Emit a warning whenever this path
# fires so the migration backlog stays visible. Sunset target: 6 months
# after structured-rubric-builder ships (CLAUDE.md, SKILL.md §9).
# ---------------------------------------------------------------------------

LEGACY_SYSTEM_PROMPT = """You are the senior recruiter analyst at RecruteTech, an AI-based visual recruiter platform (Mercor-like) focused on the francophone African market. Your job is to save time for both HR and candidates by producing a useful, fair evaluation of an autonomous interview Aria (the AI interviewer) has just conducted.

You will receive:
- Role context (title, seniority, company, target language, expected skills, planned stages)
- Full transcript of the conversation between Aria and the candidate
- Aggregated visual engagement metrics from the candidate's webcam (eye contact ratio, smile ratio, attention ratio, blink rate, head stability) — all best-effort signals, not ground truth

Produce two outputs in a SINGLE structured JSON response:

1) HR-facing evaluation:
   - overall_score (0.0-10.0)
   - summary (2-4 sentences for the recruiter)
   - strengths (concrete, with examples from the transcript)
   - gaps (concrete, with examples — be honest but professional)
   - skill_assessments (per-skill score + 1-2 line note)
   - stage_notes (per-stage observation: intro, experience, technical, code, etc.)
   - communication (clarity, structure, language proficiency)
   - engagement (how present/engaged the candidate seemed; weight visual signals lightly — they vary across cultures and individuals)
   - hiring_recommendation: one of strong_yes | yes | maybe | no | strong_no

2) Candidate-facing improvement letter:
   - Warm, encouraging tone — this person took time to interview
   - Written ENTIRELY in the candidate's interview language (`fr` or `en`)
   - 3-6 specific, actionable recommendations they can apply to their NEXT interview
   - Frame as growth, never judgment
   - NEVER reveal the score, recommendation, or HR analysis labels
   - Subject line should be encouraging and refer to the role they interviewed for

Anchor every observation in something the candidate actually said or did. If the transcript is too short or empty, say so honestly in the summary and lower the overall_score appropriately.

Protected attributes — DO NOT score on, infer about, or mention: age, race, ethnicity, religion, gender identity, sexual orientation, country of origin, disability status, marital status, accent, school/university name, photo.
"""

LEGACY_REPORT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "overall_score": {"type": "number"},
        "summary": {"type": "string"},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "gaps": {"type": "array", "items": {"type": "string"}},
        "skill_assessments": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "skill": {"type": "string"},
                    "score": {"type": "number"},
                    "notes": {"type": "string"},
                },
                "required": ["skill", "score", "notes"],
            },
        },
        "stage_notes": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "stage": {"type": "string"},
                    "observation": {"type": "string"},
                },
                "required": ["stage", "observation"],
            },
        },
        "communication": {"type": "string"},
        "engagement": {"type": "string"},
        "hiring_recommendation": {
            "type": "string",
            "enum": ["strong_yes", "yes", "maybe", "no", "strong_no"],
        },
        "candidate_letter": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "subject": {"type": "string"},
                "body": {"type": "string"},
            },
            "required": ["subject", "body"],
        },
    },
    "required": [
        "overall_score", "summary", "strengths", "gaps",
        "skill_assessments", "stage_notes", "communication",
        "engagement", "hiring_recommendation", "candidate_letter",
    ],
}

LEGACY_PROMPT_VERSION = "1.0.0-legacy"


# ---------------------------------------------------------------------------
# Anthropic client (lazy)
# ---------------------------------------------------------------------------

_client = None


def _get_client():
    global _client
    if _client is None:
        from anthropic import Anthropic
        _client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


def _is_configured() -> bool:
    return bool(settings.ANTHROPIC_API_KEY)


# ---------------------------------------------------------------------------
# Helpers — transcript / visual / code normalisation
# ---------------------------------------------------------------------------

def _normalise_transcript(transcript: list) -> str:
    """Render a list of transcript turns to a stable Aria/Candidate block."""
    lines: list[str] = []
    for t in transcript or []:
        speaker = (t.get("role") or t.get("source") or "agent") if isinstance(t, dict) else "agent"
        text = (t.get("text") or t.get("message") or t.get("content") or "") if isinstance(t, dict) else ""
        if not text:
            continue
        speaker_label = "Aria" if speaker in ("agent", "ai", "aria") else "Candidate"
        ts = t.get("time_in_call_secs") if isinstance(t, dict) else None
        prefix = f"[{int(ts)}s] " if isinstance(ts, (int, float)) else ""
        lines.append(f"{prefix}{speaker_label}: {text}")
    return "\n".join(lines) or "(empty transcript)"


def _normalise_visual_metrics(visual_metrics: dict) -> str:
    if not visual_metrics:
        return "(no visual metrics captured)"
    lines: list[str] = []
    for k, v in visual_metrics.items():
        if v is None:
            continue
        if isinstance(v, float) and 0 <= v <= 1:
            lines.append(f"- {k}: {v:.0%}")
        else:
            lines.append(f"- {k}: {v}")
    return "\n".join(lines) or "(no visual metrics captured)"


def _normalise_code_artifacts(code_artifacts: list) -> str:
    if not code_artifacts:
        return "(no code artifacts submitted)"
    blocks: list[str] = []
    for a in code_artifacts:
        if not isinstance(a, dict):
            continue
        lang = a.get("language", "")
        stage = a.get("stage_id") or a.get("stage") or ""
        code = a.get("final_code") or a.get("code") or ""
        if not code:
            continue
        blocks.append(
            f"## stage={stage} language={lang}\n```{lang}\n{code}\n```"
        )
    return "\n\n".join(blocks) or "(no code artifacts submitted)"


# ---------------------------------------------------------------------------
# User-message builders
# ---------------------------------------------------------------------------

def build_evaluation_user_message(
    rubric: dict | None,
    transcript: list,
    visual_metrics: dict,
    code_artifacts: list,
    *,
    rubric_version_label: str = "",
    candidate_name: str = "",
) -> str:
    """Compose the user message for the rubric-anchored evaluation prompt.

    If `rubric` is None, callers should fall back to the legacy path
    (`_build_legacy_user_message`) and emit a `evaluation.legacy_path` warning.
    This function is pure — no I/O, no DB.

    Pairs with `EVALUATION_SYSTEM_PROMPT` and `EVALUATION_TOOL_SCHEMA`.
    """
    if rubric is None:
        raise ValueError(
            "build_evaluation_user_message requires a rubric dict. "
            "For roles without a structured rubric, use the legacy path."
        )

    transcript_block = _normalise_transcript(transcript)
    visual_block = _normalise_visual_metrics(visual_metrics or {})
    code_block = _normalise_code_artifacts(code_artifacts or [])

    return (
        f"# Rubric (the contract — score against this and ONLY this)\n"
        f"```json\n{json.dumps(rubric, ensure_ascii=False, indent=2)}\n```\n\n"
        f"# Rubric version label (echo back in tool output)\n"
        f"{rubric_version_label or 'unspecified'}\n\n"
        f"# Prompt version to echo back\n"
        f"{EVALUATION_PROMPT_VERSION}\n\n"
        f"# Candidate\n"
        f"- Name: {candidate_name or '(unknown)'}\n\n"
        f"# Transcript\n{transcript_block}\n\n"
        f"# Visual engagement metrics (weight LIGHTLY)\n{visual_block}\n\n"
        f"# Code artifacts\n{code_block}\n\n"
        f"Produce the structured evaluation report. Write the candidate_letter "
        f"in `{rubric.get('language_default', 'fr')}`. Emit ONLY a tool call to "
        f"`emit_evaluation_report`."
    )


def _build_legacy_user_message(role: Role, iv: Interview) -> str:
    """Compose the user message for the legacy (pre-rubric) prompt path."""
    transcript: list = []
    if iv.transcript_json:
        try:
            transcript = json.loads(iv.transcript_json)
        except Exception:
            transcript = []

    visual_metrics: dict = {}
    if iv.visual_metrics_json:
        try:
            visual_metrics = json.loads(iv.visual_metrics_json)
        except Exception:
            visual_metrics = {}

    transcript_block = _normalise_transcript(transcript)
    visual_block = _normalise_visual_metrics(visual_metrics)

    skills: list = []
    try:
        skills = json.loads(role.skills_json or "[]")
    except Exception:
        pass
    stages: list = []
    try:
        stages = json.loads(role.stages_json or "[]")
    except Exception:
        pass

    return (
        f"# Role context\n"
        f"- Title: {role.title}\n"
        f"- Seniority: {role.seniority}\n"
        f"- Company: {role.company}\n"
        f"- Planned duration: {role.duration_minutes} minutes\n"
        f"- Interview language: {role.language}\n"
        f"- Expected skills: {', '.join(skills) if skills else '(unspecified)'}\n"
        f"- Planned stages: {', '.join(stages) if stages else '(unspecified)'}\n\n"
        f"# Candidate\n"
        f"- Name: {iv.candidate_name or '(unknown)'}\n\n"
        f"# Transcript\n{transcript_block}\n\n"
        f"# Visual engagement metrics\n{visual_block}\n\n"
        f"Produce the structured JSON report. Write the candidate_letter in `{role.language}`."
    )


# ---------------------------------------------------------------------------
# Claude call
# ---------------------------------------------------------------------------

def _generate(
    role: Role,
    iv: Interview,
    rubric_dict: dict | None = None,
    rubric_version_label: str = "",
) -> Optional[dict]:
    """Generate an evaluation report.

    Routes through the rubric-anchored prompt when `rubric_dict` is provided;
    otherwise falls back to the legacy prompt and warns. The returned dict
    always carries `prompt_version` so downstream rows are auditable.
    """
    if not _is_configured():
        logger.warning("evaluation.skipped_no_api_key", extra={"interview_id": iv.id})
        return None

    client = _get_client()

    # ------------------------------------------------------------------
    # Path A — rubric-anchored (preferred)
    # ------------------------------------------------------------------
    if rubric_dict is not None:
        transcript: list = []
        if iv.transcript_json:
            try:
                transcript = json.loads(iv.transcript_json)
            except Exception:
                transcript = []
        visual_metrics: dict = {}
        if iv.visual_metrics_json:
            try:
                visual_metrics = json.loads(iv.visual_metrics_json)
            except Exception:
                visual_metrics = {}
        code_artifacts: list = []
        # Code artifacts may be embedded in analysis_json or report_json in
        # future skills; for now they default to empty list — the live-coding
        # evaluator skill will populate this.

        user_message = build_evaluation_user_message(
            rubric=rubric_dict,
            transcript=transcript,
            visual_metrics=visual_metrics,
            code_artifacts=code_artifacts,
            rubric_version_label=rubric_version_label,
            candidate_name=iv.candidate_name or "",
        )

        try:
            response = client.messages.create(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=16000,
                thinking={"type": "adaptive"},
                system=[
                    {
                        "type": "text",
                        "text": EVALUATION_SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                tools=[EVALUATION_TOOL_SCHEMA],
                tool_choice={"type": "tool", "name": "emit_evaluation_report"},
                messages=[{"role": "user", "content": user_message}],
            )
        except Exception as e:
            logger.exception(
                "evaluation.claude_call_failed",
                extra={"interview_id": iv.id, "path": "rubric"},
            )
            return None

        for block in response.content:
            if getattr(block, "type", None) == "tool_use" and getattr(block, "name", "") == "emit_evaluation_report":
                report = dict(block.input)
                # Defense-in-depth: ensure prompt_version is present even if
                # the model forgot to echo it.
                report.setdefault("prompt_version", EVALUATION_PROMPT_VERSION)
                return report

        logger.error(
            "evaluation.no_tool_use_block",
            extra={"interview_id": iv.id},
        )
        return None

    # ------------------------------------------------------------------
    # Path B — legacy (no rubric available)
    # ------------------------------------------------------------------
    logger.warning(
        "evaluation.legacy_path",
        extra={
            "interview_id": iv.id,
            "role_id": role.id,
            "reason": "no rubric_dict provided",
        },
    )

    user_message = _build_legacy_user_message(role, iv)

    try:
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=16000,
            thinking={"type": "adaptive"},
            system=[
                {
                    "type": "text",
                    "text": LEGACY_SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            output_config={
                "format": {"type": "json_schema", "schema": LEGACY_REPORT_SCHEMA}
            },
            messages=[{"role": "user", "content": user_message}],
        )
    except Exception:
        logger.exception(
            "evaluation.claude_call_failed",
            extra={"interview_id": iv.id, "path": "legacy"},
        )
        return None

    text_parts: list[str] = []
    for block in response.content:
        if getattr(block, "type", None) == "text":
            text_parts.append(block.text)
    raw = "".join(text_parts).strip()
    if not raw:
        logger.error("evaluation.empty_response", extra={"interview_id": iv.id})
        return None

    try:
        report = json.loads(raw)
    except json.JSONDecodeError:
        logger.exception(
            "evaluation.json_parse_failed",
            extra={"interview_id": iv.id, "raw_preview": raw[:500]},
        )
        return None

    report.setdefault("prompt_version", LEGACY_PROMPT_VERSION)
    return report


# ---------------------------------------------------------------------------
# Public entry point — used as a FastAPI BackgroundTask
# ---------------------------------------------------------------------------

def generate_report_for_interview(
    interview_id: int,
    *,
    rubric_dict: dict | None = None,
    rubric_version_label: str = "",
) -> None:
    """Background-task entry point: load → generate → save → email candidate.

    Parameters
    ----------
    interview_id:
        Interview row id.
    rubric_dict:
        Optional structured rubric document (parsed `Rubric.rubric_json`).
        When explicitly provided, that dict is used. When None, this function
        auto-fetches the Rubric from `interview.rubric_version_used_id` (set
        at interview creation by the screening endpoint). If neither is set,
        falls back to the legacy prompt path with a warning.
    rubric_version_label:
        Optional human-readable label (e.g. "Backend Senior v3") echoed
        into the report for auditability. Auto-derived from the Rubric row
        when rubric_dict is fetched internally.

    Designed to be safe to retry: skips if no transcript, falls back to a
    static thank-you email if the Claude call or parse fails.
    """
    with Session(engine) as session:
        iv = session.get(Interview, interview_id)
        if iv is None:
            logger.info("generate_report.interview_not_found", extra={"interview_id": interview_id})
            return
        if not iv.transcript_json:
            logger.info("generate_report.no_transcript_yet", extra={"interview_id": interview_id})
            return
        role = session.get(Role, iv.role_id)
        if role is None:
            logger.info("generate_report.role_missing", extra={"interview_id": interview_id})
            return

        # ------------------------------------------------------------------
        # Rubric routing (deliverable #4)
        # If rubric_dict was not passed explicitly, look it up via the FK
        # that was set at interview creation time.
        # Legacy path: rubric_version_used_id is None (old interviews or
        # roles without a structured rubric yet).
        # ------------------------------------------------------------------
        if rubric_dict is None and iv.rubric_version_used_id is not None:
            rubric_row = session.get(Rubric, iv.rubric_version_used_id)
            if rubric_row is not None:
                try:
                    rubric_dict = json.loads(rubric_row.rubric_json)
                    rubric_version_label = rubric_version_label or rubric_row.name
                    logger.info(
                        "generate_report.rubric_path",
                        extra={
                            "interview_id": interview_id,
                            "rubric_id": rubric_row.id,
                            "rubric_version": rubric_row.version,
                            "rubric_version_label": rubric_version_label,
                        },
                    )
                except (json.JSONDecodeError, TypeError) as exc:
                    logger.warning(
                        "generate_report.rubric_json_corrupt",
                        extra={"interview_id": interview_id, "rubric_id": rubric_row.id, "error": str(exc)},
                    )
                    rubric_dict = None  # fall through to legacy path
            else:
                logger.warning(
                    "generate_report.rubric_not_found",
                    extra={"interview_id": interview_id, "rubric_version_used_id": iv.rubric_version_used_id},
                )

        if rubric_dict is None:
            logger.info(
                "generate_report.legacy_path",
                extra={"interview_id": interview_id, "role_id": role.id},
            )

        report = _generate(
            role,
            iv,
            rubric_dict=rubric_dict,
            rubric_version_label=rubric_version_label,
        )
        sent_personalized = False

        if report is not None:
            iv.report_json = json.dumps(report, ensure_ascii=False)
            session.add(iv)
            session.commit()

            letter = report.get("candidate_letter") or {}
            subject = (letter.get("subject") or "").strip()
            body = (letter.get("body") or "").strip()
            if iv.candidate_email and subject and body:
                sent_personalized = send_email(to=iv.candidate_email, subject=subject, body=body)

        if not sent_personalized and iv.candidate_email:
            subject, body = candidate_completion_email(
                candidate_name=iv.candidate_name,
                role_title=role.title,
                company=role.company,
                language=role.language,
            )
            send_email(to=iv.candidate_email, subject=subject, body=body)


# ---------------------------------------------------------------------------
# Transparency / Explainability helpers
# transparent-scoring-explainability skill
# ---------------------------------------------------------------------------

def _collapse_whitespace(s: str) -> str:
    """Collapse any run of whitespace (including newlines) to a single space."""
    return re.sub(r"\s+", " ", s).strip()


def _build_transcript_corpus(transcript_json: str | None) -> str:
    """Build a single searchable corpus string from the transcript.

    Handles three shapes:
    1. JSON list of turn objects — concatenate .text / .message / .content of all turns.
    2. JSON object with a "turns" key — same, applied to the list at that key.
    3. Anything else — treat the raw JSON string as the corpus (Claude's verbatim
       quotes will be embedded in the JSON text itself anyway).

    Whitespace is NOT collapsed here; collapsing is applied at comparison time
    so we preserve exact positions for substring lookup.
    """
    if not transcript_json:
        return ""
    try:
        parsed = json.loads(transcript_json)
    except (json.JSONDecodeError, TypeError):
        return transcript_json  # raw fallback

    turns: list = []
    if isinstance(parsed, list):
        turns = parsed
    elif isinstance(parsed, dict):
        # Try common envelope keys
        for key in ("turns", "transcript", "messages", "conversation"):
            if isinstance(parsed.get(key), list):
                turns = parsed[key]
                break
        if not turns:
            # Dict with no recognisable list — fallback to raw
            return transcript_json

    parts: list[str] = []
    for t in turns:
        if not isinstance(t, dict):
            continue
        text = t.get("text") or t.get("message") or t.get("content") or ""
        if text:
            parts.append(str(text))
    return " ".join(parts) if parts else transcript_json


def verify_evidence_pointers(
    report: dict,
    transcript_json: str | None,
) -> tuple[bool, list[str]]:
    """For every evidence item with evidence_type='transcript', assert that
    its `quote` field is a verbatim substring of the transcript
    (case-sensitive, whitespace-collapsed).

    Whitespace normalisation: collapse runs of whitespace to a single space
    on both sides before the substring check. This handles transcript
    line-wrapping artifacts where a multi-line paragraph in the stored JSON
    spans the same words as a single-line quote in the report.

    Returns (all_verified, list_of_failed_quotes).
    Sets report['evidence_verified'] = bool (mutates in place for the caller).

    This function is PURE — no Claude call, no I/O. Deterministic.

    Scope (security review LOW-3): only `evidence_type=="transcript"` items are
    verified today. `code` and `visual` items pass through. When the
    live-coding-evaluator skill ships code_artifacts, this function should also
    substring-match `details` against the code corpus. Track at SKILL.md §7.
    """
    corpus_raw = _build_transcript_corpus(transcript_json)
    corpus_normalised = _collapse_whitespace(corpus_raw)

    failed: list[str] = []

    evidence_list: list = []
    # v3 reports use "evidence_pointers" key per the skill spec;
    # v2 / legacy reports use "evidence" (list of {skill_id, citation, ts_ms}).
    # Check both to be forward/backward compatible.
    for key in ("evidence_pointers", "evidence"):
        val = report.get(key)
        if isinstance(val, list):
            evidence_list.extend(val)

    for item in evidence_list:
        if not isinstance(item, dict):
            continue
        # v3 shape: evidence_type='transcript', quote=...
        # v2 shape: citation=...  (always transcript-type by schema)
        evidence_type = item.get("evidence_type", "transcript")
        if evidence_type != "transcript":
            continue

        quote = item.get("quote") or item.get("citation") or ""
        if not quote:
            continue

        quote_normalised = _collapse_whitespace(quote)
        if quote_normalised not in corpus_normalised:
            failed.append(quote)

    all_verified = len(failed) == 0
    report["evidence_verified"] = all_verified
    return all_verified, failed


def compute_integrity_hash(
    *,
    transcript_json: str | None,
    visual_metrics_json: str | None,
    rubric_id: int | None,
    rubric_version: int | None,
    prompt_version: str,
    evaluator_model: str,
    report_json: dict,
    overrides: list[dict] | None = None,
) -> str:
    """SHA-256 hex digest over all canonical evaluation inputs.

    Canonical encoding: each input is JSON-encoded with
    sort_keys=True, ensure_ascii=False, then joined with a NULL-byte separator
    (\\x00) to prevent canonicalization collisions across fields.
    The NULL-byte separator prevents distinct (a, b, c) input tuples from
    colliding when their plain concatenation would be identical — this is
    standard practice for multi-field hashing (NOT a MAC construction, so
    length-extension attacks do not apply here; the separator prevents input
    ambiguity only).

    The `report_integrity_hash` key is stripped from report_json before
    encoding so the hash can be persisted into the very report it covers.

    Overrides are included so that an override operation produces a new
    hash that covers the full override history. The audit-trail endpoint
    returns the override list, allowing external auditors to re-hash with
    the same inputs and verify the stored hash.

    Deterministic — running twice on the same inputs yields the same digest.
    """
    NULL = "\x00"

    def _enc(obj: Any) -> str:
        return json.dumps(obj, sort_keys=True, ensure_ascii=False)

    # Strip the integrity_hash key so the hash covers the report body only.
    report_clean = {k: v for k, v in report_json.items() if k != "report_integrity_hash"}

    components = [
        _enc(transcript_json),
        _enc(visual_metrics_json),
        _enc(rubric_id),
        _enc(rubric_version),
        _enc(prompt_version),
        _enc(evaluator_model),
        _enc(report_clean),
        _enc(overrides or []),
    ]

    canonical = NULL.join(components)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


async def generate_report_v3(interview: "Interview", *, session: Any) -> dict:
    """Wrapper around generate_report_for_interview that applies v3 enrichment.

    Steps:
      1. Calls the existing report flow (generate_report_for_interview via
         _generate, which routes through the rubric-anchored prompt when a
         rubric is available, or falls back to the legacy path).
         NOTE: prompt-engineer is landing v3 prompt exports at
         `app.services.prompts.evaluation` and
         `app.services.prompts.candidate_letter`. Until those exports land,
         this wrapper uses the existing v2 path and marks the report with
         evidence_verified=False so downstream consumers know the v3 pointers
         are not yet available.
      2. Calls verify_evidence_pointers on the generated report.
      3. (Optional) calls the candidate_letter scrubbing prompt if available.
      4. Computes the integrity hash and writes it to interview.report_integrity_hash.
      5. Persists report_json to interview.report_json.

    Returns the report dict (with evidence_verified and report_integrity_hash set).
    """
    # ------------------------------------------------------------------
    # Lazy-import v3 prompt exports — prompt-engineer is landing these in
    # parallel. If not yet importable, fall back gracefully and stub out.
    # ------------------------------------------------------------------
    try:
        from app.services.prompts.evaluation import (  # noqa: F401
            EVALUATION_PROMPT_VERSION as _EPV,
        )
        v3_prompt_version = _EPV
    except ImportError:
        raise NotImplementedError(
            "generate_report_v3 requires "
            "app.services.prompts.evaluation.EVALUATION_PROMPT_VERSION — "
            "prompt-engineer module not yet landed."
        )

    candidate_letter_scrub = None
    try:
        from app.services.prompts.candidate_letter import scrub_candidate_letter  # type: ignore[import]
        candidate_letter_scrub = scrub_candidate_letter
    except ImportError:
        logger.debug(
            "generate_report_v3.candidate_letter_scrub_unavailable",
            extra={"reason": "app.services.prompts.candidate_letter not yet landed"},
        )

    # ------------------------------------------------------------------
    # Resolve rubric for the interview
    # ------------------------------------------------------------------
    rubric_dict: dict | None = None
    rubric_version_label: str = ""
    rubric_id: int | None = None
    rubric_version_num: int | None = None

    if interview.rubric_version_used_id is not None:
        rubric_row = session.get(Rubric, interview.rubric_version_used_id)
        if rubric_row is not None:
            try:
                rubric_dict = json.loads(rubric_row.rubric_json)
                rubric_version_label = rubric_row.name
                rubric_id = rubric_row.id
                rubric_version_num = rubric_row.version
            except (json.JSONDecodeError, TypeError) as exc:
                logger.warning(
                    "generate_report_v3.rubric_json_corrupt",
                    extra={"interview_id": interview.id, "error": str(exc)},
                )

    role = session.get(Role, interview.role_id)
    if role is None:
        raise ValueError(f"Role {interview.role_id} not found for interview {interview.id}")

    # ------------------------------------------------------------------
    # Generate the report via the existing engine
    # ------------------------------------------------------------------
    report = _generate(
        role,
        interview,
        rubric_dict=rubric_dict,
        rubric_version_label=rubric_version_label,
    )
    if report is None:
        raise RuntimeError(
            f"Report generation failed for interview {interview.id} — "
            "Claude call returned None (check ANTHROPIC_API_KEY and logs)."
        )

    # ------------------------------------------------------------------
    # Step 2: verify evidence pointers
    # ------------------------------------------------------------------
    verify_evidence_pointers(report, interview.transcript_json)
    # report['evidence_verified'] is now set in-place

    # ------------------------------------------------------------------
    # Step 3: candidate letter scrubbing (optional, second-pass prompt)
    # ------------------------------------------------------------------
    if candidate_letter_scrub is not None:
        try:
            scrubbed_letter, scrubbed_fields = candidate_letter_scrub(
                report.get("candidate_letter", {})
            )
            report["candidate_letter"] = scrubbed_letter
            report["scrubbed_fields"] = scrubbed_fields
        except Exception:
            logger.warning(
                "generate_report_v3.candidate_letter_scrub_failed",
                extra={"interview_id": interview.id},
            )

    # ------------------------------------------------------------------
    # Step 4: compute integrity hash (overrides list is empty at generation
    # time; re-hashed on each subsequent override via the override endpoint).
    # ------------------------------------------------------------------
    prompt_version = report.get("prompt_version", v3_prompt_version)
    model_version_block: dict = report.get("model_version") or {}
    evaluator_model = (
        model_version_block.get("evaluator_model")
        or settings.ANTHROPIC_MODEL
    )

    integrity_hash = compute_integrity_hash(
        transcript_json=interview.transcript_json,
        visual_metrics_json=interview.visual_metrics_json,
        rubric_id=rubric_id,
        rubric_version=rubric_version_num,
        prompt_version=prompt_version,
        evaluator_model=evaluator_model,
        report_json=report,
        overrides=[],
    )
    report["report_integrity_hash"] = integrity_hash

    # ------------------------------------------------------------------
    # Step 5: persist both fields to the Interview row
    # ------------------------------------------------------------------
    interview.report_json = json.dumps(report, ensure_ascii=False)
    interview.report_integrity_hash = integrity_hash
    session.add(interview)
    session.commit()

    logger.info(
        "generate_report_v3.done",
        extra={
            "interview_id": interview.id,
            "evidence_verified": report.get("evidence_verified"),
            # Do NOT log the hash itself (it's derived from transcript — PII risk at DEBUG only)
        },
    )
    return report
