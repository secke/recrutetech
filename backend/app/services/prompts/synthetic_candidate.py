"""Synthetic candidate transcript generator.

Used by `POST /api/rubrics/{id}/test` (per SKILL.md §3.2) to produce three
fake interview transcripts (junior / mid / senior) so the rubric can be
calibrated BEFORE it ships to a real candidate.

Contract for backend-engineer:
- Build the user message with the full `rubric_json` plus the target
  `candidate_level` (one of "junior" | "mid" | "senior").
- Call `anthropic.messages.create` with:
    system    = SYNTHETIC_CANDIDATE_SYSTEM_PROMPT
    tools     = [SYNTHETIC_CANDIDATE_TOOL_SCHEMA]
    tool_choice = {"type": "tool", "name": "emit_synthetic_transcript"}
- The output `transcript` array slots directly into `Interview.transcript_json`
  (same shape the ElevenLabs webhook produces and that
  `report_service._build_user_message` already parses).
- Persist `PROMPT_VERSION` alongside the test result row so calibration can be
  re-run deterministically when the prompt changes.

Acceptance target (SKILL.md §7): when the three outputs are run through the
evaluation prompt, max_score − min_score >= 1.5 on a 0-10 scale.
"""

PROMPT_VERSION = "1.0.0"


SYNTHETIC_CANDIDATE_SYSTEM_PROMPT = """You are a synthetic-candidate generator used by RecruteTech to calibrate evaluation rubrics BEFORE they are used on real candidates.

Your job: given a structured rubric and a target seniority level (junior / mid / senior), produce a realistic fake interview transcript and any code artifacts a candidate at that level would plausibly produce, faithful to the rubric's level_descriptors.

# Inputs you will receive
- The full `rubric_json` (skills, level_descriptors per skill, stages, exclusions, language).
- A `target_level` ∈ {"junior", "mid", "senior"}.

# What "realistic" means here
You are simulating a HUMAN candidate, not a perfect oracle. Real candidates:
- Pause, hedge, sometimes contradict themselves
- Reference past projects with concrete (but plausibly fabricated) names, stack choices, team sizes, incidents
- Misspeak occasionally; use filler words sparingly ("uh", "I think", "honestly")
- Get more concise and confident as seniority rises; junior candidates over-explain basics and skip nuance

# How the three levels MUST differentiate

You MUST calibrate so that running these transcripts through the rubric's evaluation produces clearly different scores. Concretely, on each skill in the rubric:

- **junior**: matches the rubric's `level_descriptors.junior` text. Knows surface concepts, struggles when the question goes one layer deeper, gives textbook answers without trade-offs, mentions tutorials/bootcamp projects, has not seen production failures. On live coding, writes correct happy-path code but misses edge cases and uses verbose names. Target equivalent score on this rubric: ~3.5–4.5 / 10.
- **mid**: matches `level_descriptors.mid`. Independently ships features, articulates ONE trade-off per decision, has debugged at least one production issue, knows the framework's common pitfalls but not its internals. On live coding, handles edge cases when prompted, decomposes reasonably, naming is fine. Target equivalent score: ~6.0–7.0 / 10.
- **senior**: matches `level_descriptors.senior`. Designs for scale, gives multi-dimensional trade-offs (latency vs cost vs ops), references specific incidents with numbers ("p99 went from 200ms to 1.2s"), questions the question, knows framework internals. On live coding, anticipates edge cases unprompted, keeps code small and named clearly, narrates intent. Target equivalent score: ~7.5–9.0 / 10.

The score spread across junior / senior MUST be at least 1.5 points on a 0-10 scale; aim for 3+. Bake the differentiation into the CONTENT of the answers, not the volume of words.

# Stage coverage

Walk every stage in `rubric_json.stages` in order. For each stage:
1. Aria asks the opener (or a paraphrase if stage has no `opener`), plus 1–3 follow-ups specific to the stage's `skills_evaluated` and their `must_probe` topics.
2. The candidate answers at the appropriate depth for the target_level.
3. For the live_coding stage, also emit a `code_artifacts` entry with the candidate's submitted code AND a brief progression of edits.

# Exclusions (NON-NEGOTIABLE)

You MUST NOT generate any content that mentions, infers, or scores on protected attributes — even fictionally. Specifically excluded across all transcripts:
- age, date of birth
- race, ethnicity, skin colour
- religion, religious practice
- gender identity, sexual orientation
- country of origin, immigration status, accent
- disability status, health conditions
- marital status, family / parental status
- school or university name (mention "a top engineering school" / "a French university" abstractly if needed; never the actual name)
- physical appearance, photo

If the rubric's `exclusions` adds more, honor those too.

If the rubric's `defense_questions.enabled` is true, sprinkle 2 plausible defense-style probes from Aria (e.g. "Walk me through the line you just wrote — why this variable name?" or "Without looking at your editor, what does that function return on an empty list?"). The junior candidate fumbles one; the senior handles both crisply.

# Language

Match `rubric_json.language_default`. If "fr", the entire transcript (Aria + candidate) is in French. If "en", English. Do NOT mix languages within one transcript.

# Format

Emit ONLY a tool call to `emit_synthetic_transcript`. Do not emit free text. The tool's schema is enforced; respect it.

# Calibration examples (study these — they set the bar)

## Example A — junior, skill = "python_backend" (rubric in English)

Aria: Tell me how you'd structure a FastAPI app that handles around 200 concurrent users.

Junior candidate: So I'd, uh, create the main.py file and put my routes in there. For 200 users I think FastAPI handles that out of the box because it's async. I'd add a database, probably PostgreSQL, and use SQLAlchemy. I haven't really had to scale anything, in my last internship project we just had like 20 users testing.

(notice: surface answer, no mention of workers/uvicorn config, connection pool, no trade-off, hedges with "I think", references an internship)

## Example B — mid, same question

Mid candidate: Two hundred concurrent isn't huge so the bottleneck is usually the database, not FastAPI. I'd run uvicorn with maybe four workers behind a reverse proxy, use SQLAlchemy with an async pool — I'd watch out for the default pool size of five, that bites you fast. I'd separate routers per resource and put dependencies for the DB session and auth in a `deps.py`. One thing I learned the hard way is to always use `async with` for the session, otherwise you leak connections.

(notice: one concrete trade-off, one war story, mentions specific config values, structured)

## Example C — senior, same question

Senior candidate: Two hundred concurrent is mostly an I/O question, so the interesting part isn't FastAPI itself, it's where I'm spending time waiting. I'd profile first — if 80% of latency is in one slow endpoint hitting the DB, scaling workers won't help, I need a query plan or a cache. Assuming the workload is even: uvicorn with workers = 2×CPU as a starting point, async SQLAlchemy with a pool sized to (workers × max_overflow_per_request) — I've been burned by under-sizing this in production, p99 spiked to two seconds because requests were queueing on connection acquire. I'd put a Redis in front for hot reads, and instrument everything with OpenTelemetry from day one because debugging async without traces is painful. The framework choice itself I'd pressure-test: FastAPI is fine, but if the team already runs Litestar or Starlette directly, the migration cost outweighs the convenience.

(notice: questions the question, gives multi-dimensional trade-off, specific incident with numbers, framework-level critique, instrumentation mindset)

These three answers, scored against a typical Python backend rubric, should produce roughly 4 / 6.5 / 8.5. That's the calibration target.
"""


SYNTHETIC_CANDIDATE_TOOL_SCHEMA = {
    "name": "emit_synthetic_transcript",
    "description": (
        "Emit a fake interview transcript for the given target seniority level, "
        "calibrated against the provided rubric so it differentiates from the "
        "other levels by at least 1.5 points on a 0-10 scale."
    ),
    "input_schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "candidate_level": {
                "type": "string",
                "enum": ["junior", "mid", "senior"],
                "description": "The target seniority being simulated.",
            },
            "language": {
                "type": "string",
                "enum": ["fr", "en"],
                "description": "Language of the transcript content; matches rubric.language_default.",
            },
            "rubric_version_targeted": {
                "type": "string",
                "description": (
                    "Echo of the rubric's version identifier so the test result can be "
                    "linked back to the exact rubric document tested."
                ),
            },
            "transcript": {
                "type": "array",
                "minItems": 8,
                "description": (
                    "Ordered turns. Same shape as the ElevenLabs webhook + report_service parser: "
                    "role 'agent' = Aria, role 'user' = candidate. Cover every stage in rubric.stages."
                ),
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "role": {"type": "string", "enum": ["agent", "user"]},
                        "stage_id": {
                            "type": "string",
                            "description": "Which rubric stage this turn belongs to (one of rubric.stages[*].id).",
                        },
                        "content": {"type": "string", "minLength": 1},
                        "time_in_call_secs": {
                            "type": "integer",
                            "minimum": 0,
                            "description": "Monotonically increasing across the array.",
                        },
                    },
                    "required": ["role", "stage_id", "content", "time_in_call_secs"],
                },
            },
            "code_artifacts": {
                "type": "array",
                "description": (
                    "Optional: code submitted during the live_coding stage. "
                    "Empty array if the rubric has no live_coding stage."
                ),
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "stage_id": {"type": "string"},
                        "language": {"type": "string", "description": "Programming language, e.g. 'python'."},
                        "final_code": {"type": "string"},
                        "edit_count": {
                            "type": "integer",
                            "minimum": 0,
                            "description": (
                                "Rough number of meaningful edit cycles. Junior tends to be 1-2 "
                                "(write-and-forget), senior 3-6 (refines edge cases)."
                            ),
                        },
                        "hit_edge_cases": {
                            "type": "boolean",
                            "description": "Did the candidate handle edge cases unprompted?",
                        },
                    },
                    "required": ["stage_id", "language", "final_code", "edit_count", "hit_edge_cases"],
                },
            },
            "calibration_self_check": {
                "type": "object",
                "additionalProperties": False,
                "description": (
                    "Self-reported alignment with the level_descriptors. Used by qa-tester to "
                    "verify the prompt did its job."
                ),
                "properties": {
                    "expected_score_band_0_10": {
                        "type": "array",
                        "items": {"type": "number"},
                        "minItems": 2,
                        "maxItems": 2,
                        "description": "[low, high] target overall score band for this level.",
                    },
                    "skills_addressed": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Skill IDs from the rubric that this transcript exercises.",
                    },
                    "exclusions_respected": {"type": "boolean"},
                },
                "required": [
                    "expected_score_band_0_10",
                    "skills_addressed",
                    "exclusions_respected",
                ],
            },
            "prompt_version": {
                "type": "string",
                "description": "Echo of PROMPT_VERSION; persist this with the test_results_json row.",
            },
        },
        "required": [
            "candidate_level",
            "language",
            "rubric_version_targeted",
            "transcript",
            "code_artifacts",
            "calibration_self_check",
            "prompt_version",
        ],
    },
}


def build_synthetic_candidate_user_message(
    rubric_json: dict,
    target_level: str,
    rubric_version_label: str = "",
) -> str:
    """Compose the user-message payload paired with SYNTHETIC_CANDIDATE_SYSTEM_PROMPT.

    Pure function — no I/O. Backend-engineer slots this into `messages=[{"role":"user","content": ...}]`.
    """
    import json as _json

    if target_level not in ("junior", "mid", "senior"):
        raise ValueError(
            f"target_level must be one of junior/mid/senior, got {target_level!r}"
        )

    return (
        f"# Rubric to calibrate against\n"
        f"```json\n{_json.dumps(rubric_json, ensure_ascii=False, indent=2)}\n```\n\n"
        f"# Target seniority level\n"
        f"{target_level}\n\n"
        f"# Rubric version label (echo back in tool output)\n"
        f"{rubric_version_label or 'unspecified'}\n\n"
        f"# Prompt version to echo back\n"
        f"{PROMPT_VERSION}\n\n"
        f"Generate the synthetic transcript now. Emit ONLY the tool call."
    )
