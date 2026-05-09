"""CV parsing prompt for Claude Opus 4.7 (cv-adaptive-personalization skill).

Used by `cv_parsing_service.parse_cv_for_interview` (backend-engineer) to turn
raw CV text into a structured `cv_parsed_json` payload that the prompt builder
(`prompt_builder.compose_aria_prompt_from_rubric`) consumes when composing the
personalized Aria system prompt.

Contract for backend-engineer
-----------------------------
- The user message is built by `build_cv_parsing_user_message(raw_text, role_hint)`.
- Call `anthropic.messages.create` with:
    model       = settings.ANTHROPIC_MODEL  # "claude-opus-4-7"
    system      = CV_PARSING_SYSTEM_PROMPT
    tools       = [CV_PARSING_TOOL_SCHEMA]
    tool_choice = {"type": "tool", "name": "emit_cv_parsed"}
    max_tokens  = 1500
- The tool input is the structured CV payload. Persist `prompt_version` on the
  row (Interview.cv_parsed_json) so every parse is auditable back to the exact
  prompt that produced it (CLAUDE.md hard rule).

Token budget
------------
- System prompt: ~1.4k tokens (raise if you grow it past 1500).
- Raw CV text: capped at ~10k chars (~2.5k tokens) by the caller.
- Total input context: ≤ 5k tokens; output ≤ 800 tokens. Keep
  max_tokens=1500 as headroom.

Output schema (12 required fields)
----------------------------------
candidate_name, years_of_experience, seniority_inferred, primary_stack,
secondary_stack, domains, notable_projects, potential_red_flags,
suggested_deep_dive_topics, language_signals, prompt_version,
redactions_applied.

Downstream consumer note (TODO for backend-engineer)
----------------------------------------------------
`prompt_builder.compose_aria_prompt_from_rubric` currently reads
`cv_parsed["top_projects"]` / `cv_parsed["projects"]` with a `name` key.
This module emits `notable_projects` with a `title` key (matches the SKILL.md
contract and db-architect's handoff). The shim layer in `cv_parsing_service`
must adapt: copy `notable_projects` -> `top_projects` and rename
`title` -> `name` before passing into `compose_aria_prompt_from_rubric`.
Do NOT mutate this prompt's output shape; fix it in the service layer.

Three worked examples
=====================

Example 1 — senior backend (English CV, scale signals)
------------------------------------------------------

Input (excerpt, ~300 chars):

    Marc Diallo - Senior Backend Engineer
    7 years building Python/FastAPI services at fintech scale.
    @ PayCorp 2021-2024 (Tech Lead): real-time fraud detection on Kafka,
    sustained 12k req/s with p99 < 80ms. Owned the fraud model retraining
    loop. Stack: Python, FastAPI, Kafka, Postgres, Redis, Kubernetes.
    Domains: fintech, fraud, real-time data.

Expected tool input (abridged):

    {
      "candidate_name": "Marc Diallo",
      "years_of_experience": 7,
      "seniority_inferred": "senior",
      "primary_stack": ["Python", "FastAPI", "Kafka", "PostgreSQL"],
      "secondary_stack": ["Redis", "Kubernetes"],
      "domains": ["fintech", "fraud detection", "real-time data"],
      "notable_projects": [
        {
          "title": "Real-time fraud detection at PayCorp",
          "tech": ["Kafka", "Python", "FastAPI"],
          "scale_signals": ["12k req/s", "p99 < 80ms"],
          "role": "Tech Lead",
          "duration_months": 36
        }
      ],
      "potential_red_flags": [],
      "suggested_deep_dive_topics": [
        "kafka exactly-once semantics under 12k req/s",
        "fraud model retraining loop ownership and drift detection",
        "p99 latency budget breakdown across the fraud pipeline"
      ],
      "language_signals": "english_only",
      "prompt_version": "1.0.0",
      "redactions_applied": []
    }

Example 2 — junior frontend (sparse, no scale signals)
------------------------------------------------------

Input (excerpt, ~250 chars):

    Awa Sow - Junior Frontend Developer
    1 year experience. Bootcamp graduate.
    @ StartupX 2024-now: React app for internal dashboard, ~30 users.
    Built 4 pages with React + Tailwind. Some Jest tests.
    Currently learning TypeScript and Next.js.

Expected tool input (abridged):

    {
      "candidate_name": "Awa Sow",
      "years_of_experience": 1,
      "seniority_inferred": "junior",
      "primary_stack": ["React", "TailwindCSS", "JavaScript"],
      "secondary_stack": ["Jest"],
      "domains": ["internal tooling"],
      "notable_projects": [
        {
          "title": "Internal dashboard at StartupX",
          "tech": ["React", "TailwindCSS"],
          "scale_signals": [],
          "role": "Frontend Developer",
          "duration_months": 12
        }
      ],
      "potential_red_flags": [],
      "suggested_deep_dive_topics": [
        "react component decomposition for the 4 dashboard pages",
        "test coverage approach with Jest",
        "concrete contribution beyond the bootcamp curriculum"
      ],
      "language_signals": "unknown",
      "prompt_version": "1.0.0",
      "redactions_applied": []
    }

Example 3 — CV with forbidden fields (security-critical)
--------------------------------------------------------

Input (excerpt, ~400 chars; SENSITIVE fields IN BOLD in the input):

    Fatou Ndiaye, born 1992-04-15, female, married, 2 children.
    Catholic. Lives in Dakar, Senegal.
    Master's degree from ESP Dakar (2018).
    Currently 6 months pregnant - requesting remote interview.
    5 years backend Python at Orange Senegal: ETL pipelines on Airflow,
    1TB/day batch jobs. Stack: Python, Airflow, Spark, PostgreSQL.

Expected tool input (abridged):

    {
      "candidate_name": "Fatou Ndiaye",
      "years_of_experience": 5,
      "seniority_inferred": "mid",
      "primary_stack": ["Python", "Airflow", "Spark", "PostgreSQL"],
      "secondary_stack": [],
      "domains": ["data engineering", "telecom"],
      "notable_projects": [
        {
          "title": "ETL pipelines at Orange",
          "tech": ["Airflow", "Spark", "Python"],
          "scale_signals": ["1TB/day"],
          "role": "Backend Engineer",
          "duration_months": 60
        }
      ],
      "potential_red_flags": [],
      "suggested_deep_dive_topics": [
        "airflow DAG idempotency at 1TB/day",
        "spark partitioning choices for the ETL workload",
        "data quality checks on the daily batch"
      ],
      "language_signals": "unknown",
      "prompt_version": "1.0.0",
      "redactions_applied": [
        "date_of_birth",
        "gender",
        "marital_status",
        "dependents",
        "religion",
        "city",
        "country",
        "university_name",
        "health_information"
      ]
    }

Note: NONE of the redacted attributes leak into `candidate_name` (first+last
only), `domains`, `notable_projects`, `suggested_deep_dive_topics`, or
`potential_red_flags`. The "6 months pregnant" line is health information and
MUST NOT become a red flag — it is redacted, period.
"""

from __future__ import annotations

PROMPT_VERSION = "1.0.0"


CV_PARSING_SYSTEM_PROMPT = """You are a recruitment-side CV analyzer for RecruteTech. Your ONLY job is to extract structured signals that help an interview agent (Aria) tailor questions to the candidate's actual experience. You do NOT score the candidate. You do NOT make hiring decisions. You do NOT extract demographic data.

You will receive in the user message:
- The raw CV text (plain text, possibly imperfect OCR or LinkedIn paste, up to ~10k chars).
- An optional `role_hint` describing the role the candidate is applying for (title, seniority target, key skills) — use this only as light context for which technologies to prioritize, never to invent experience the candidate doesn't claim.

# What you DO extract

Twelve fields, all required, matching the tool schema exactly. Personalization-grade fields (`primary_stack`, `notable_projects`, `suggested_deep_dive_topics`) are the most important — they directly drive question quality.

For `notable_projects`, prize CONCRETE numbers (`scale_signals` like "10k req/s", "$2M ARR", "p99 < 50ms", "1TB/day batch", "team of 8"). These are gold for personalization. If the CV has no numbers, leave `scale_signals` as an empty list — do NOT invent.

For `suggested_deep_dive_topics` (3-5 items), be SPECIFIC and grounded in the candidate's actual projects. Bad: "ask about backend skills". Good: "kafka exactly-once at 12k req/s on the PayCorp fraud pipeline". The follow-up writer should be able to ask the question verbatim.

For `potential_red_flags`, phrase as factual, neutral observations: "3 jobs in 18 months", "claimed 'expert in' 12 different stacks", "5-year gap with no explanation". Empty list is fine and even preferred when nothing notable. NEVER include forbidden fields here (no "married, mother of 2", no "30 years old"). Pregnancy, illness, family obligations, military service gaps tied to nationality — NOT red flags, period.

# What you DO NOT extract — REDACTION RULES (NON-NEGOTIABLE)

You MUST NOT extract OR infer ANY of the following, even if they appear explicitly in the CV:

- `age`, `date_of_birth`, `year_of_birth`
- `school_name`, `university_name`, `alma_mater`, `education_institution_name` (ACCEPTABLE: degree level + general field, e.g. "Master's in Computer Science". NEVER the institution.)
- `city`, `country`, `address`, `country_of_origin`, `nationality`
- `gender`, `gender_identity`, `pronouns`
- `ethnicity`, `race`, `skin_colour`
- `religion`, `religious_affiliation`
- `marital_status`, `family_status`, `dependents`, `parental_status`, `pregnancy_status`
- `disability_status`, `health_information`, `medical_conditions`
- `photo_descriptors`, `physical_appearance`
- `accent`, `language_proficiency_proxies` (ACCEPTABLE: a high-level `language_signals` field with values from the closed enum below — never infer accent or fluency from a name)

If you encounter ANY forbidden field in the CV text, REDACT it from your output AND add the matching key (lowercase snake_case from the list above) to the `redactions_applied` array. The audit team uses this list to verify you are actively suppressing protected attributes.

If you are unsure whether a piece of information is permitted, EXCLUDE it. When in doubt, leave it out.

The `candidate_name` field is the ONE exception that needs a name through — and only first + last name, used by Aria for the greeting. NEVER include titles, honorifics, suffixes, or middle/family-religious names beyond first+last.

# Inference discipline

- `seniority_inferred` is based on years of experience + scope/role-title signals (Lead, Staff, Principal, Architect) + scale signals. NEVER on age, graduation year, or country.
- `years_of_experience` counts only PROFESSIONAL roles (intern + full-time + contract). Round to integer. If unclear, prefer the conservative estimate.
- `primary_stack` (top 3-5 technologies the candidate is fluent in, used in their main projects) vs `secondary_stack` (mentioned but not central). Use canonical capitalization ("PostgreSQL" not "postgres", "JavaScript" not "javascript", "FastAPI" not "fastapi", "TailwindCSS" or "Tailwind CSS"). When canonical is genuinely lowercase (e.g. "iOS"), respect it.
- `language_signals` is a CLOSED enum: `french_only` | `english_only` | `both` | `unknown`. Inferred from the language the CV is written in PLUS explicit "Languages" section claims. NEVER inferred from name, country, school, or photo.

# Empty / non-CV / nonsensical input

If the input text is < 50 characters, blank, lorem ipsum, or clearly not a CV (random prose, code dump, error message), DO NOT hallucinate skills or projects. Emit:
- `candidate_name = ""`
- `years_of_experience = 0`
- `seniority_inferred = "junior"`
- All stacks/domains/notable_projects/suggested_deep_dive_topics empty lists
- `potential_red_flags = ["CV text is empty or non-CV content"]`
- `language_signals = "unknown"`
- `redactions_applied = []`

# Hallucination is a critical failure

Every value you emit must trace back to text actually present in the CV (or be a reasonable inference from concrete CV signals). If the candidate's CV says "Python" but never mentions FastAPI, do NOT add FastAPI just because the role hint says so. The downstream Aria prompt assumes your output is grounded — if it isn't, Aria will ask the candidate about projects they never had, which is worse than the rigid baseline we're trying to fix.

# Format

Emit ONLY a tool call to `emit_cv_parsed`. Do not emit free text. The schema is enforced. Echo `prompt_version` exactly as supplied in the user message so the row is auditable.
"""


CV_PARSING_TOOL_SCHEMA = {
    "name": "emit_cv_parsed",
    "description": (
        "Emit the structured CV signals used by Aria for question personalization. "
        "All 12 fields required. Protected attributes MUST be redacted and listed "
        "in `redactions_applied` for audit."
    ),
    "input_schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "candidate_name": {
                "type": "string",
                "maxLength": 100,
                "description": (
                    "Candidate's first + last name only. Used by Aria for the "
                    "interview greeting. NOT used for evaluation. Empty string "
                    "if the CV does not provide a name."
                ),
            },
            "years_of_experience": {
                "type": "integer",
                "minimum": 0,
                "maximum": 60,
                "description": (
                    "Total years across all professional roles (intern + "
                    "full-time + contract). Rounded to integer. Conservative "
                    "estimate if ambiguous."
                ),
            },
            "seniority_inferred": {
                "type": "string",
                "enum": ["junior", "mid", "senior", "staff", "principal"],
                "description": (
                    "Inferred seniority based on years of experience + scope "
                    "signals + role titles. NEVER on age or graduation year."
                ),
            },
            "primary_stack": {
                "type": "array",
                "maxItems": 5,
                "items": {"type": "string", "minLength": 1, "maxLength": 200},
                "description": (
                    "Top 3-5 technologies the candidate is fluent in, used in "
                    "their main projects. Canonical capitalization."
                ),
            },
            "secondary_stack": {
                "type": "array",
                "maxItems": 15,
                "items": {"type": "string", "minLength": 1, "maxLength": 200},
                "description": (
                    "Additional technologies mentioned but not central to the "
                    "candidate's main work. Empty list if none."
                ),
            },
            "domains": {
                "type": "array",
                "maxItems": 8,
                "items": {"type": "string", "minLength": 1, "maxLength": 200},
                "description": (
                    "Business / problem domains the candidate has worked in "
                    "(e.g. fintech, fraud detection, real-time data). Empty "
                    "list if none clearly identifiable."
                ),
            },
            "notable_projects": {
                "type": "array",
                "maxItems": 5,
                "description": (
                    "Up to 5 most personalization-relevant projects. Prize "
                    "concrete scale signals (numbers). Empty list is allowed."
                ),
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "title": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 200,
                            "description": (
                                "Short descriptive project title. NEVER include "
                                "the employer's geographic location or the "
                                "candidate's school."
                            ),
                        },
                        "tech": {
                            "type": "array",
                            "maxItems": 10,
                            "items": {"type": "string", "minLength": 1, "maxLength": 200},
                            "description": (
                                "Technologies actually used in this project."
                            ),
                        },
                        "scale_signals": {
                            "type": "array",
                            "maxItems": 6,
                            "items": {"type": "string", "minLength": 1, "maxLength": 200},
                            "description": (
                                "Concrete numbers: throughput, latency, ARR, "
                                "team size, data volume. Empty if CV has no "
                                "numbers — do NOT invent."
                            ),
                        },
                        "role": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": 200,
                            "description": (
                                "Candidate's role on the project (e.g. Tech "
                                "Lead, Backend Engineer, Data Scientist)."
                            ),
                        },
                        "duration_months": {
                            "type": "integer",
                            "minimum": 0,
                            "maximum": 600,
                            "description": (
                                "Project duration in months, integer. 0 if "
                                "unclear from the CV."
                            ),
                        },
                    },
                    "required": [
                        "title",
                        "tech",
                        "scale_signals",
                        "role",
                        "duration_months",
                    ],
                },
            },
            "potential_red_flags": {
                "type": "array",
                "maxItems": 6,
                "items": {"type": "string", "minLength": 1, "maxLength": 200},
                "description": (
                    "Factual, neutral observations: gaps, frequent job changes, "
                    "inflated claims. NEVER include forbidden attributes. Empty "
                    "list is preferred when nothing notable."
                ),
            },
            "suggested_deep_dive_topics": {
                "type": "array",
                "minItems": 0,
                "maxItems": 5,
                "items": {"type": "string", "minLength": 1, "maxLength": 200},
                "description": (
                    "3-5 specific, grounded follow-up topics the interviewer "
                    "should probe. Reference actual projects or technologies "
                    "the candidate claimed. Empty list only if the CV is "
                    "empty / non-CV."
                ),
            },
            "language_signals": {
                "type": "string",
                "enum": ["french_only", "english_only", "both", "unknown"],
                "description": (
                    "Closed enum. Inferred from the language the CV is "
                    "written in plus explicit 'Languages' fluency claims. "
                    "NEVER from name, country, school, or photo."
                ),
            },
            "prompt_version": {
                "type": "string",
                "description": (
                    "Echo of PROMPT_VERSION supplied in the user message. "
                    "Persisted with the cv_parsed_json row for auditability."
                ),
            },
            "redactions_applied": {
                "type": "array",
                "maxItems": 30,
                "items": {"type": "string", "minLength": 1, "maxLength": 100},
                "description": (
                    "Snake_case keys of forbidden attributes the parser saw "
                    "and redacted from output (e.g. 'date_of_birth', 'city', "
                    "'university_name', 'gender', 'religion'). Empty list "
                    "if the CV had nothing to redact. Used by the bias audit."
                ),
            },
        },
        "required": [
            "candidate_name",
            "years_of_experience",
            "seniority_inferred",
            "primary_stack",
            "secondary_stack",
            "domains",
            "notable_projects",
            "potential_red_flags",
            "suggested_deep_dive_topics",
            "language_signals",
            "prompt_version",
            "redactions_applied",
        ],
    },
}


def build_cv_parsing_user_message(
    raw_text: str,
    role_hint: dict | None = None,
) -> str:
    """Compose the user-message payload paired with CV_PARSING_SYSTEM_PROMPT.

    Pure function — no I/O. Backend-engineer slots this into
    `messages=[{"role":"user","content": ...}]`.

    Parameters
    ----------
    raw_text:
        The raw CV text. Caller is responsible for capping length (~10k chars
        recommended). Empty / very short text is handled by the prompt's
        "empty / non-CV" branch.
    role_hint:
        Optional `{"title": str, "seniority": str, "key_skills": [str, ...]}`
        used as light context for which technologies to prioritize. Never used
        to invent experience the candidate doesn't claim.

    Returns
    -------
    str: the user-message string ready to send to Anthropic.
    """
    import json as _json

    safe_text = raw_text or ""
    # Defensive cap: prompt-engineer convention, the service layer should also enforce.
    if len(safe_text) > 12000:
        safe_text = safe_text[:12000]

    if role_hint and isinstance(role_hint, dict):
        role_hint_block = _json.dumps(role_hint, ensure_ascii=False, indent=2)
    else:
        role_hint_block = "null"

    return (
        f"# Raw CV text\n"
        f"```\n{safe_text}\n```\n\n"
        f"# Role hint (light context only — do NOT invent experience)\n"
        f"```json\n{role_hint_block}\n```\n\n"
        f"# Prompt version to echo back\n"
        f"{PROMPT_VERSION}\n\n"
        f"Extract the structured CV signals now. Apply the redaction rules "
        f"strictly. Emit ONLY the tool call."
    )
