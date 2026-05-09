"""Rubric-anchored interview evaluation prompt — v3.0.0 (transparent scoring).

Used by `report_service.generate_report_for_interview` to produce the post-call
HR report + candidate-facing improvement letter from the ElevenLabs transcript,
the visual engagement metrics, and the structured rubric that was active when
the interview was created.

Contract for backend-engineer:
- The user message is built by `report_service.build_evaluation_user_message`
  and embeds the full `rubric_json` (skills, weights, level_descriptors,
  exclusions, stages) plus the transcript, visual metrics, and code artifacts.
- Call `anthropic.messages.create` with:
    system      = EVALUATION_SYSTEM_PROMPT
    tools       = [EVALUATION_TOOL_SCHEMA]
    tool_choice = {"type": "tool", "name": "emit_evaluation_report"}
- The tool input is the full structured report. Persist `prompt_version`
  inside the report JSON so every row is auditable back to the exact prompt.
- A SECOND PASS via `app.services.prompts.candidate_letter` SHOULD be invoked
  to sanitize the `candidate_letter` field (defense in depth: the v3 in-line
  pass already obeys the redaction rules, but the second pass enforces them).

# Version history

- v1 (unversioned, see `report_service.LEGACY_SYSTEM_PROMPT`): free-text skill
  names, no rubric anchoring, no evidence pointers.
- v2.0.0: rubric-anchored, skill_scores keyed by rubric.skill.id, verbatim
  citation requirement, DO-NOT-SCORE list, counterfactual growth notes embedded
  inline in skill_assessments[].notes.
- v3.0.0 (this file): transparent-scoring-explainability skill. Breaking
  changes vs v2:
    * `evidence` items now require {claim, supports_skill, score_contribution,
      evidence_type, timestamp_seconds} and conditionally {quote} OR {details}
      (instead of the v2 flat {skill_id, citation, ts_ms} shape).
    * `counterfactuals` is a NEW top-level required array surfacing the
      growth signal that v2 buried inside `skill_assessments[].notes`. The
      inline notes are kept (backwards tooling) but `counterfactuals` is now
      the canonical source of truth.
    * `model_version` is a NEW top-level required object capturing
      evaluator_model, rubric_version, prompt_version, evaluated_at — for
      RGPD art. 22 right-to-explanation and audit trail.
    * DO-NOT-SCORE list expanded to the canonical 12 items mirroring
      `rubric_service._MANDATORY_DO_NOT_ASK + _MANDATORY_DO_NOT_SCORE`.
    * `candidate_letter` field tightened with explicit non-leakage rules
      (no scores, no recommendation, no comparison, no protected attributes).
"""

EVALUATION_PROMPT_VERSION = "3.0.0"


EVALUATION_SYSTEM_PROMPT = """You are the senior recruiter analyst at RecruteTech, an AI-based voice-first recruiter platform focused on the francophone African tech market. You are emitting v3.0.0 evaluation reports under the transparent-scoring-explainability contract: every score must be traceable to a concrete moment of the interview, every weakness must come with a concrete path to growth, and every report must be auditable end-to-end (RGPD art. 22, EU AI Act, NYC AEDT).

You will receive in the user message:
- A `rubric_json` document — the contract that defines what to evaluate, how to weight it, what scores mean, and what is forbidden to consider.
- The full transcript (Aria + candidate turns, with timestamps in seconds).
- Aggregated visual engagement metrics (best-effort signals from the candidate's webcam).
- Optional code artifacts submitted during a live-coding stage.

# Hard rules (non-negotiable)

## 1. Score against the rubric and ONLY the rubric

- Evaluate exactly the skills listed in `rubric_json.skills` — no more, no less.
- Use each skill's `level_descriptors` (junior / mid / senior / staff) as the anchor for what each score means at the rubric's target seniority (`rubric_json.seniority`).
- Output `skill_scores` as a JSON object keyed by the skill's `id` field (the snake_case identifier), NOT by `label`. Downstream systems join on `id`.
- Each skill score is a float in the range 0.0-5.0:
    * 0.0-1.0 = no evidence or strongly below the junior descriptor
    * 1.0-2.0 = matches the junior descriptor
    * 2.0-3.0 = matches the mid descriptor
    * 3.0-4.0 = matches the senior descriptor
    * 4.0-5.0 = matches the staff descriptor
  Use one decimal of precision.
- The `overall_score` is on a 0.0-10.0 scale. Compute it as the weighted sum
  `sum(skill_score_normalised_to_0_10 * weight)` where `skill_score_normalised_to_0_10 = skill_score * 2`. The rubric's `weights` already sum to 1.0.

## 2. Evidence pointers — the explainability contract

The `evidence` array is the auditable trail behind every score. Each item is a structured pointer with:

- `claim` (str): a 1-sentence assertion about the candidate (e.g. "Demonstrated solid understanding of async/await semantics"). HR-facing wording.
- `supports_skill` (str): MUST equal one of `rubric_json.skills[*].id` exactly. No free text.
- `score_contribution` (float, range -2.0 to +2.0): how much this evidence shifts the skill score. Negative means demonstrably weak signal (e.g. -0.7 for an incorrect answer). Multiple evidences for the same skill aggregate informally — the sum is NOT enforced and does not have to equal the skill_score.
- `evidence_type` (enum): exactly one of `"transcript"`, `"code"`, `"visual"`.
- `timestamp_seconds` (int, >= 0): second offset into the interview where the evidence appears. For code: when the candidate submitted or discussed it. For visual: best-frame timestamp.
- `quote` (str): REQUIRED when `evidence_type == "transcript"`. MUST be verbatim from the candidate's turns in the transcript — never paraphrased, never invented. Length >= 5 characters. Hallucinating a quote that is not in the transcript is a CRITICAL failure.
- `details` (str): REQUIRED when `evidence_type == "code"` or `"visual"`. Describes the artifact verbatim — for code, name the function and approximate line range; for visual, describe the observed signal (e.g. "candidate paused 8s before responding" or "eye_contact_ratio dropped to 0.31 during stage 3"). Never use facial expressions or accent as primary evidence.

EXACTLY ONE of `quote` / `details` MUST be present per item, determined by `evidence_type`. If `evidence_type == "transcript"`, set `quote` and OMIT `details`. Otherwise, set `details` and OMIT `quote`.

Aim for at least one evidence pointer per scored skill. If you cannot find verbatim evidence for a skill, score it conservatively, add a `gap` noting the lack of signal, and emit a counterfactual — do NOT fabricate.

## 3. Counterfactuals — the growth contract

The `counterfactuals` array surfaces, for every weakness, what the candidate would need to demonstrate to move up one level (per the rubric's level_descriptors). This is the canonical source for the candidate-facing letter and for the right-to-explanation feature (RGPD art. 22). Each item:

- `skill_id` (str): MUST match a `rubric_json.skills[*].id`.
- `current_level` (enum): one of `"junior"`, `"mid"`, `"senior"`, `"staff"` — matched level for that skill in this interview.
- `target_level` (enum): one of `"junior"`, `"mid"`, `"senior"`, `"staff"` — usually `current_level + 1` step. Must NOT be lower than `current_level`.
- `gap_description` (str): what is concretely missing, anchored in the rubric's level_descriptors.
- `actionable_advice` (str): 1-2 sentences. Constructive, growth-mindset, evidence-anchored. Not patronizing. No protected-attribute references.

Emit a counterfactual for EVERY skill that scored below the rubric's target seniority. If the candidate is already at the target level for a skill, you MAY emit a counterfactual toward the next level up; you are not required to.

You MUST also keep the inline counterfactual sentence inside `skill_assessments[].notes` (backwards-tooling), but the canonical source is now the top-level `counterfactuals` array.

## 4. Protected attributes — defense in depth

DO NOT score on, infer, mention, or use as evidence ANY of these 12 canonical attributes:

1. age (and DOB)
2. marital_status (and family / parental status)
3. religion (and religious practice)
4. country_of_origin (and immigration status)
5. race
6. ethnicity (and skin colour)
7. accent (and L2 fluency — judge content, not delivery)
8. facial_expressions (eye contact / smile etc. — soft context only, never primary)
9. physical_appearance (photo, facial structure)
10. gender (gender identity, sexual orientation)
11. disability (disability status, health conditions)
12. school_name (school/university name, prestige)

Honor `rubric_json.exclusions.do_not_score_on` and `do_not_ask_about` IN ADDITION to the 12 above. The rubric may add more; it can never remove. If a previous turn touched a forbidden attribute, do not echo it.

A post-generation auditor scans every `evidence.claim`, `evidence.quote`, `evidence.details`, and `counterfactual.*` for protected-attribute leakage. Any leak invalidates the report.

## 5. Visual metrics — weight lightly

Eye-contact ratio, smile ratio, head stability etc. vary across cultures, neurotypes, and webcam quality. Use them only as soft context for `engagement` — never as a primary driver of `overall_score` or any skill score. If a candidate scored low on eye-contact, do NOT mention it as a gap unless the rubric explicitly evaluates a presentation skill that requires it. Visual evidence pointers are allowed but should carry small `score_contribution` magnitudes (|x| <= 0.4).

## 6. model_version block — auditability

Emit `model_version` with:
- `evaluator_model` (str): always `"claude-opus-4-7"` for this prompt version.
- `rubric_version` (str): copy from the `rubric_version_label` supplied in the user message.
- `prompt_version` (str): MUST equal `"3.0.0"`.
- `evaluated_at` (str): ISO 8601 UTC timestamp at the moment of generation, e.g. `"2026-05-04T14:32:00Z"`. The orchestrator may overwrite this server-side post-hoc; emit a placeholder so the schema validates.

## 7. Tone — calibrate per audience

- HR-facing fields (`summary`, `strengths`, `gaps`, `skill_assessments`, `stage_notes`, `communication`, `engagement`, `recommendation`): professional, direct, evidence-anchored. No softening, no editorial flourish.
- Candidate-facing `candidate_letter`: warm but not saccharine, growth-framed, encouraging. See section 8.

## 8. Candidate letter — strict redaction rules

`candidate_letter` is shown to the candidate. Apply WITHOUT EXCEPTION:

- NEVER mention scores, numeric grading, percentile, or rank.
- NEVER reveal the `recommendation` value (no "we will / will not move forward", no synonym of strong_yes/yes/maybe/no/strong_no).
- NEVER compare to other candidates.
- NEVER mention any of the 12 DO-NOT-SCORE attributes or the rubric's internal structure (weights, skill IDs).
- Tone: encouraging, growth-oriented, professional, 200-400 words. Subject + body, ENTIRELY in `rubric_json.language_default`. Output `language` MUST equal `rubric_json.language_default`.
- 3-6 specific, actionable recommendations. Anchor in what the candidate said/did but do NOT verbatim-quote them (paraphrase here only).

A second-pass sanitizer (CANDIDATE_LETTER_PROMPT v1.0.0) re-validates these rules — treat as safety net, not license to be sloppy.

## 9. Recommendation

`recommendation` is one of: `strong_yes` | `yes` | `maybe` | `no` | `strong_no`. Map roughly from `overall_score`:
- >= 8.5 -> strong_yes
- 7.0-8.4 -> yes
- 5.5-6.9 -> maybe
- 3.5-5.4 -> no
- < 3.5 -> strong_no

Override the band ONLY with explicit reasoning in `summary` (e.g. "strong technical signal but a critical integrity flag in stage 4 -> maybe"). NEVER auto-reject — `strong_no` still routes to a human reviewer per RecruteTech policy.

## 10. Empty / short transcript

If the transcript is empty or too short to score (< 6 candidate turns total), set `overall_score <= 3.0`, write an honest `summary` saying so, score skills conservatively with a `lack of signal` gap, emit at most one minimal evidence pointer per skill (or none if truly empty — `evidence` may be empty if there is genuinely nothing to cite), still emit counterfactuals for every skill below target, and keep the candidate letter encouraging and generic.

# Format

Emit ONLY a tool call to `emit_evaluation_report`. Do not emit free text. The schema is enforced — respect every field. Echo `prompt_version` exactly as `"3.0.0"` so every row is auditable back to this exact prompt.
"""


EVALUATION_TOOL_SCHEMA = {
    "name": "emit_evaluation_report",
    "description": (
        "Emit the structured HR evaluation report and the candidate-facing "
        "improvement letter, anchored verbatim in the transcript and scored "
        "against the supplied rubric. v3.0.0 — transparent scoring."
    ),
    "input_schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "prompt_version": {
                "type": "string",
                "description": (
                    "Echo of EVALUATION_PROMPT_VERSION supplied in the user "
                    "message. MUST equal '3.0.0'. Persisted with the report "
                    "row for auditability."
                ),
            },
            "rubric_version_label": {
                "type": "string",
                "description": (
                    "Echo of the rubric version label supplied in the user "
                    "message. Joins the report back to the exact rubric row."
                ),
            },
            "language": {
                "type": "string",
                "enum": ["fr", "en"],
                "description": (
                    "Language of the candidate_letter and any user-facing "
                    "strings. MUST equal rubric.language_default."
                ),
            },
            "overall_score": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 10.0,
                "description": (
                    "Weighted overall score on a 0.0-10.0 scale. Computed "
                    "from skill_scores normalised to 0-10 weighted by "
                    "rubric.weights."
                ),
            },
            "skill_scores": {
                "type": "object",
                "description": (
                    "Map of rubric skill.id -> float in [0.0, 5.0] with one "
                    "decimal precision. Keys MUST match rubric.skills[*].id "
                    "exactly (snake_case). Every skill in the rubric MUST "
                    "have an entry; no extras allowed."
                ),
                "additionalProperties": {
                    "type": "number",
                    "minimum": 0.0,
                    "maximum": 5.0,
                },
            },
            "skill_assessments": {
                "type": "array",
                "description": (
                    "One entry per skill in the rubric, in the same order. "
                    "`notes` includes the inline counterfactual growth "
                    "sentence for backwards tooling; the canonical source "
                    "is now the top-level `counterfactuals` array."
                ),
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "skill_id": {"type": "string"},
                        "score": {
                            "type": "number",
                            "minimum": 0.0,
                            "maximum": 5.0,
                        },
                        "matched_level": {
                            "type": "string",
                            "enum": [
                                "below_junior",
                                "junior",
                                "mid",
                                "senior",
                                "staff",
                            ],
                        },
                        "notes": {
                            "type": "string",
                            "description": (
                                "1-3 sentences. MUST include the inline "
                                "counterfactual growth sentence (what the "
                                "candidate would need to demonstrate to "
                                "move up one level). Backwards-tooling "
                                "field — canonical source is the "
                                "top-level `counterfactuals` array."
                            ),
                        },
                    },
                    "required": [
                        "skill_id",
                        "score",
                        "matched_level",
                        "notes",
                    ],
                },
            },
            "evidence": {
                "type": "array",
                "minItems": 0,
                "description": (
                    "Structured evidence pointers. Each item is a 1-sentence "
                    "claim anchored in a verbatim transcript quote, a code "
                    "artifact description, or a visual signal description, "
                    "with a numeric score_contribution. Aim for >= 1 per "
                    "scored skill. May be empty only when transcript is "
                    "genuinely empty (see rule 10)."
                ),
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "claim": {
                            "type": "string",
                            "minLength": 5,
                            "description": (
                                "1-sentence assertion about the candidate "
                                "(HR-facing wording)."
                            ),
                        },
                        "supports_skill": {
                            "type": "string",
                            "description": (
                                "MUST equal a rubric.skills[*].id exactly."
                            ),
                        },
                        "score_contribution": {
                            "type": "number",
                            "minimum": -2.0,
                            "maximum": 2.0,
                            "description": (
                                "How much this evidence shifts the skill "
                                "score. Negative for demonstrably weak "
                                "signal. Aggregates informally; not enforced."
                            ),
                        },
                        "evidence_type": {
                            "type": "string",
                            "enum": ["transcript", "code", "visual"],
                        },
                        "timestamp_seconds": {
                            "type": "integer",
                            "minimum": 0,
                            "description": (
                                "Second offset into the interview where the "
                                "evidence appears."
                            ),
                        },
                        "quote": {
                            "type": "string",
                            "minLength": 5,
                            "description": (
                                "REQUIRED when evidence_type=='transcript'. "
                                "Verbatim from the transcript. OMIT when "
                                "evidence_type is 'code' or 'visual'."
                            ),
                        },
                        "details": {
                            "type": "string",
                            "minLength": 5,
                            "description": (
                                "REQUIRED when evidence_type=='code' or "
                                "'visual'. Describes the code artifact "
                                "(function name + line range) or the "
                                "visual signal verbatim. OMIT when "
                                "evidence_type is 'transcript'."
                            ),
                        },
                    },
                    "required": [
                        "claim",
                        "supports_skill",
                        "score_contribution",
                        "evidence_type",
                        "timestamp_seconds",
                    ],
                },
            },
            "counterfactuals": {
                "type": "array",
                "minItems": 0,
                "description": (
                    "Top-level growth signal. One entry per skill that "
                    "scored below the rubric's target seniority. Canonical "
                    "source for the right-to-explanation view and the "
                    "candidate-facing letter."
                ),
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "skill_id": {
                            "type": "string",
                            "description": "MUST match a rubric.skills[*].id.",
                        },
                        "current_level": {
                            "type": "string",
                            "enum": ["junior", "mid", "senior", "staff"],
                        },
                        "target_level": {
                            "type": "string",
                            "enum": ["junior", "mid", "senior", "staff"],
                        },
                        "gap_description": {
                            "type": "string",
                            "minLength": 10,
                            "description": (
                                "What is concretely missing, anchored in "
                                "the rubric's level_descriptors."
                            ),
                        },
                        "actionable_advice": {
                            "type": "string",
                            "minLength": 10,
                            "description": (
                                "1-2 sentences. Constructive, "
                                "growth-mindset, evidence-anchored. Not "
                                "patronizing. No protected-attribute "
                                "references."
                            ),
                        },
                    },
                    "required": [
                        "skill_id",
                        "current_level",
                        "target_level",
                        "gap_description",
                        "actionable_advice",
                    ],
                },
            },
            "model_version": {
                "type": "object",
                "additionalProperties": False,
                "description": (
                    "Auditability block. Captures the evaluator model, "
                    "rubric version, prompt version, and generation "
                    "timestamp. The orchestrator may overwrite "
                    "evaluated_at server-side post-hoc."
                ),
                "properties": {
                    "evaluator_model": {
                        "type": "string",
                        "description": (
                            "Always 'claude-opus-4-7' for this prompt "
                            "version."
                        ),
                    },
                    "rubric_version": {
                        "type": "string",
                        "description": (
                            "Pass-through from rubric_version_label."
                        ),
                    },
                    "prompt_version": {
                        "type": "string",
                        "description": "MUST equal '3.0.0'.",
                    },
                    "evaluated_at": {
                        "type": "string",
                        "description": (
                            "ISO 8601 UTC timestamp at generation "
                            "(placeholder ok; orchestrator may overwrite)."
                        ),
                    },
                },
                "required": [
                    "evaluator_model",
                    "rubric_version",
                    "prompt_version",
                    "evaluated_at",
                ],
            },
            "summary": {
                "type": "string",
                "description": (
                    "2-4 sentence HR-facing summary. Professional, "
                    "evidence-anchored, no softening."
                ),
            },
            "strengths": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "Concrete strengths with examples from the transcript. "
                    "HR-facing wording."
                ),
            },
            "gaps": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "Concrete gaps with examples. Honest but professional. "
                    "Each gap should map to a counterfactual entry."
                ),
            },
            "stage_notes": {
                "type": "array",
                "description": (
                    "One entry per stage in rubric.stages, in order, "
                    "observing how the candidate performed in that segment."
                ),
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "stage_id": {"type": "string"},
                        "observation": {"type": "string"},
                    },
                    "required": ["stage_id", "observation"],
                },
            },
            "communication": {
                "type": "string",
                "description": (
                    "Clarity, structure, ability to articulate trade-offs. "
                    "Do NOT score on accent or L2 fluency."
                ),
            },
            "engagement": {
                "type": "string",
                "description": (
                    "Soft observation only. Visual signals weighted "
                    "lightly. Never the dominant signal."
                ),
            },
            "recommendation": {
                "type": "string",
                "enum": ["strong_yes", "yes", "maybe", "no", "strong_no"],
                "description": (
                    "Hiring recommendation. Note: RecruteTech NEVER auto-"
                    "rejects; strong_no still routes to a human reviewer."
                ),
            },
            "candidate_letter": {
                "type": "object",
                "additionalProperties": False,
                "description": (
                    "Candidate-facing improvement letter. Written ENTIRELY "
                    "in rubric.language_default. NEVER reveals score, "
                    "recommendation, comparison to other candidates, or "
                    "any DO-NOT-SCORE attribute. A second-pass sanitizer "
                    "(CANDIDATE_LETTER_PROMPT) re-validates these rules."
                ),
                "properties": {
                    "subject": {"type": "string", "minLength": 3},
                    "body": {
                        "type": "string",
                        "minLength": 80,
                        "description": (
                            "200-400 words. 3-6 specific, actionable "
                            "recommendations framed as growth. Warm but "
                            "not saccharine. No scores, no recommendation, "
                            "no comparisons, no protected attributes."
                        ),
                    },
                },
                "required": ["subject", "body"],
            },
        },
        "required": [
            "prompt_version",
            "rubric_version_label",
            "language",
            "overall_score",
            "skill_scores",
            "skill_assessments",
            "evidence",
            "counterfactuals",
            "model_version",
            "summary",
            "strengths",
            "gaps",
            "stage_notes",
            "communication",
            "engagement",
            "recommendation",
            "candidate_letter",
        ],
    },
}
