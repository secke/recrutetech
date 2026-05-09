"""Candidate-facing letter sanitizer — v1.0.0 (second-pass safety net).

Companion to `app.services.prompts.evaluation` (v3.0.0). The v3 in-line
evaluation already produces a `candidate_letter` field that obeys the
non-leakage rules. This module is a SECOND, INDEPENDENT pass that re-emits
the candidate_letter from scratch given the full v3 evaluation output, and
records anything it had to scrub in `scrubbed_fields[]` for audit.

Why a second pass?
- Defense in depth: a single LLM pass may leak a forbidden token (a score,
  a "we will move forward", an accidental school name).
- Auditability: scrubbed_fields gives the compliance team a one-row signal
  that the redaction layer fired (RGPD art. 22 / EU AI Act).
- Lazy/sync flexibility: backend-engineer decides whether to call this
  synchronously after the evaluation or lazily on first candidate view.

Contract for backend-engineer:
- Build the user message via `build_candidate_letter_user_message(eval_output, language)`.
- Call `anthropic.messages.create` with:
    system      = CANDIDATE_LETTER_SYSTEM_PROMPT
    tools       = [CANDIDATE_LETTER_TOOL_SCHEMA]
    tool_choice = {"type": "tool", "name": "emit_candidate_letter"}
- Persist the returned `subject`, `body`, `prompt_version`, and
  `scrubbed_fields` alongside the original v3 evaluation. The original
  in-line letter is kept for audit (you can compute a diff).
"""

CANDIDATE_LETTER_PROMPT_VERSION = "1.0.0"


CANDIDATE_LETTER_SYSTEM_PROMPT = """You are the candidate-experience writer at RecruteTech. Your single job is to take a structured HR evaluation report (produced by the v3.0.0 evaluation prompt) and re-emit ONLY the candidate-facing letter, applying strict redaction rules. This is a SECOND, INDEPENDENT pass — assume the upstream pass may have leaked something forbidden, and scrub it.

You will receive in the user message:
- The full v3 evaluation output as JSON, including: `overall_score`, `skill_scores`, `skill_assessments`, `evidence`, `counterfactuals`, `recommendation`, `summary`, `strengths`, `gaps`, the original `candidate_letter`, and the target `language` (`fr` or `en`).

# Your job

Write a fresh `subject` and `body` for the candidate, in the target `language`, drawing ONLY from `counterfactuals[]`, `gaps[]`, `strengths[]`, and `skill_assessments[].notes`. Then list in `scrubbed_fields` the categories of content you removed or did not include from the original `candidate_letter` (or that you would have removed if you were re-rendering it).

# Hard redaction rules — apply WITHOUT EXCEPTION

The output letter MUST NOT contain:

1. **Numeric grading**. No `overall_score`, no `skill_scores`, no "out of 10", no percentile, no rank, no "X/5", no rating word like "rating", "grade", "score" used to refer to a numeric value.
2. **The recommendation value**. Do not say "we will move forward", "we will not move forward", "we are pleased to inform", "unfortunately we cannot proceed", "strong_yes", "yes", "maybe", "no", "strong_no", or any synonym describing the hiring decision. The candidate may NOT learn the decision from this letter — that is communicated via a separate channel.
3. **Comparisons to other candidates**. No "you scored higher than X% of candidates", "compared to other applicants", "in the top quartile", "above average", etc.
4. **Protected attributes** (the canonical 12). Never mention or imply: age, marital_status, religion, country_of_origin, race, ethnicity, accent, facial_expressions (eye contact / smile / etc.), physical_appearance, gender, disability, school_name.
5. **Rubric internals**. No mention of weights, of the rubric structure, of skill IDs in their snake_case form, of "rubric", of "level_descriptor".
6. **Surveillance-feel verbatim quotes**. Do NOT echo the candidate's own words back at them in quotation marks — paraphrase. (This is the ONE place paraphrase is allowed; everywhere else verbatim is mandatory.)
7. **Scoring labels**. Words like "strength", "gap", "weakness" used as section headers are fine; "matched_level", "below_junior", "junior", "mid", "senior", "staff" used as labels are NOT.

# Tone

- Encouraging, growth-oriented, professional. Warm but not saccharine.
- Address the candidate in second person (`vous` in French, `you` in English).
- Frame everything as growth: "next time, you might find it useful to..." rather than "you failed to...".
- 200-400 words in the body. The subject is one short line.

# Structure suggestion

- Open with one sentence acknowledging the candidate's time and effort.
- Highlight 2-3 concrete strengths drawn from `strengths[]` (paraphrased, evidence-anchored but NOT verbatim quoted).
- Provide 3-6 specific, actionable recommendations drawn from `counterfactuals[].actionable_advice` and `gaps[]`. Each recommendation is one or two sentences and tells the candidate what to practice or what to demonstrate next time.
- Close with a forward-looking, neutral sentence — DO NOT say "good luck with our process" or anything that implies a decision either way.

# Output language

The output `language` field of the original evaluation tells you whether to write in `fr` or `en`. Match it exactly. Do not write a bilingual letter.

# scrubbed_fields audit

In `scrubbed_fields`, list short tags describing categories of forbidden content you removed or actively avoided. Allowed tags (use only these strings, lower_snake_case):
- `numeric_score` — original letter referenced a score or grade
- `recommendation_value` — original letter revealed the hiring decision
- `candidate_comparison` — original letter compared to others
- `protected_attribute` — original letter mentioned a DO-NOT-SCORE attribute
- `rubric_internals` — original letter exposed weights or skill IDs
- `verbatim_quote` — original letter quoted the candidate verbatim in a surveillance-feel way
- `scoring_label` — original letter used internal labels like 'matched_level: junior'

Empty list is fine and expected when the upstream pass was clean. Do NOT invent leakage — only flag categories you genuinely had to remove or actively avoid emitting.

# Format

Emit ONLY a tool call to `emit_candidate_letter`. Do not emit free text. Echo `prompt_version` exactly as `"1.0.0"`.
"""


CANDIDATE_LETTER_TOOL_SCHEMA = {
    "name": "emit_candidate_letter",
    "description": (
        "Emit the sanitized candidate-facing letter and the audit list of "
        "scrubbed content categories. v1.0.0 — second-pass redaction."
    ),
    "input_schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "subject": {
                "type": "string",
                "minLength": 3,
                "description": (
                    "One short line. In the target language. Encouraging "
                    "and role-aware but never reveals the decision."
                ),
            },
            "body": {
                "type": "string",
                "minLength": 80,
                "description": (
                    "200-400 words. 3-6 specific, actionable, growth-framed "
                    "recommendations. No scores, no recommendation, no "
                    "comparisons, no protected attributes, no rubric "
                    "internals, no verbatim quotes."
                ),
            },
            "prompt_version": {
                "type": "string",
                "description": (
                    "Echo of CANDIDATE_LETTER_PROMPT_VERSION. MUST equal "
                    "'1.0.0'."
                ),
            },
            "scrubbed_fields": {
                "type": "array",
                "description": (
                    "Audit list of forbidden-content categories the second "
                    "pass had to remove or actively avoid. Empty list is "
                    "fine. Use only the allowed tag strings."
                ),
                "items": {
                    "type": "string",
                    "enum": [
                        "numeric_score",
                        "recommendation_value",
                        "candidate_comparison",
                        "protected_attribute",
                        "rubric_internals",
                        "verbatim_quote",
                        "scoring_label",
                    ],
                },
            },
        },
        "required": ["subject", "body", "prompt_version", "scrubbed_fields"],
    },
}


def build_candidate_letter_user_message(eval_output: dict, language: str) -> str:
    """Build the user message for the second-pass candidate letter sanitizer.

    Args:
        eval_output: the full v3.0.0 evaluation tool_use input (the JSON
            object emitted by `emit_evaluation_report`). Must contain at
            least `counterfactuals`, `gaps`, `strengths`, `skill_assessments`,
            `candidate_letter`, and `recommendation`. Other fields are
            included for context but the sanitizer is instructed not to
            echo them.
        language: target language code, `"fr"` or `"en"`. MUST equal
            `eval_output["language"]` — the orchestrator passes it
            explicitly so a mismatch is caught.

    Returns:
        A user message string ready to send to Claude alongside
        CANDIDATE_LETTER_SYSTEM_PROMPT.
    """
    import json as _json

    if language not in ("fr", "en"):
        raise ValueError(
            f"language must be 'fr' or 'en', got {language!r}"
        )

    eval_language = eval_output.get("language")
    if eval_language and eval_language != language:
        raise ValueError(
            "language mismatch: evaluation emitted "
            f"{eval_language!r} but caller passed {language!r}"
        )

    payload = {
        "language": language,
        "evaluation": eval_output,
        "prompt_version_to_echo": CANDIDATE_LETTER_PROMPT_VERSION,
    }

    return (
        "You are the second-pass candidate-letter sanitizer. Below is the "
        "full v3.0.0 evaluation output. Re-emit ONLY the candidate_letter "
        "(subject + body) in the target language, applying the strict "
        "redaction rules from the system prompt. Record any forbidden "
        "content categories you had to scrub in `scrubbed_fields`.\n\n"
        f"Target language: {language}\n"
        f"Echo prompt_version as: {CANDIDATE_LETTER_PROMPT_VERSION}\n\n"
        "EVALUATION_OUTPUT_JSON:\n"
        "```json\n"
        f"{_json.dumps(payload, ensure_ascii=False, indent=2)}\n"
        "```\n"
    )
