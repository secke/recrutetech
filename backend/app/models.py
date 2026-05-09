"""
RecruteTech data models.

Schema invariants for Rubric:
- ONE active rubric per role at a time: enforced at application layer in rubric_service.
  Before activating a new version, the service must set is_active=False on the current
  active rubric for that role_id within the same transaction.
- Rubric rows are APPEND-ONLY / IMMUTABLE: once a Rubric row is persisted, rubric_json
  must never be UPDATE'd. To change a rubric, bump the version and insert a new row.
  This preserves the exact evaluation context for every past Interview.
- Mandatory exclusions (age, marital_status, religion, country_of_origin, accent,
  facial_expressions, physical_appearance) live inside rubric_json["exclusions"] and
  are validated at the service layer. They are pre-populated and cannot be removed by HR.
- interview.rubric_version_used_id is nullable (expand-contract phase 1). Existing
  interviews created before the Rubric feature keep NULL; all new interviews must set it.

CV Personalization cluster (cv-adaptive-personalization skill, migration 0003):
- cv_text, cv_parsed_json, personalized_prompt are PII-bearing fields.
  RGPD retention: 90 days from cv_received_at, then NULL out all three.
  cv_consent_processing and cv_received_at are retained as non-PII audit trail.
  Purge logic: backend/app/scripts/purge_expired_cv_text.py.
- cv_parsed_json encodes a CVParsedSchema dict (see SKILL.md §3.2 for shape).
- personalized_prompt is the composed Aria system prompt with CV context injected.
  Whether it is actually sent to ElevenLabs is controlled by settings.CV_PERSONALIZATION_INJECT
  (Phase 1 silent rollout: False = compute + persist, but do NOT inject).

Transparency / Explainability cluster (transparent-scoring-explainability skill, migration 0004):
- report_integrity_hash: SHA-256 over canonical inputs (see column comment for exact scope).
  Used for EU AI Act Art. 12 / RGPD Art. 22 audit reproducibility.
- share_with_candidate: HR-opt-in gate for the public candidate-view endpoint. Indexed.
- EvaluationOverride: append-only sidecar table for HR-initiated score corrections.
  Never mutates report_json; original Claude evaluation remains permanently traceable.

Practice Mode cluster (candidate-practice-mode skill, migration 0005):
- PracticeSession is FULLY ISOLATED from Interview / Role / Rubric / EvaluationOverride.
  NO foreign keys to any HR-side table. NO candidate_score, NO hiring_recommendation,
  NO company_id, NO rubric_version_used_id, NO role_id.
  Practice role types (role_type, seniority, language, duration_choice) are STRING
  CONSTANTS enforced at the API/service layer — never links to Role rows.
  This isolation is structural: HR queries that scan Interview cannot surface practice
  data by construction (different table, zero shared FKs).
- RGPD retention: 30 days from session_received_at, then NULL out transcript_json,
  practice_report_json, candidate_email. Audit KPI fields (role_type, seniority,
  language, duration_choice, started_at, completed_at, session_received_at) are
  retained indefinitely after PII removal.
  Purge logic: backend/app/scripts/purge_expired_practice_sessions.py.
"""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Index
import secrets


def _token() -> str:
    return secrets.token_urlsafe(12)


class Role(SQLModel, table=True):
    """An interview template created by HR. Candidates apply via its public_token."""

    id: Optional[int] = Field(default=None, primary_key=True)
    public_token: str = Field(default_factory=_token, unique=True, index=True)

    title: str
    seniority: str  # junior | mid | senior | staff
    company: str = "Lumen Labs"
    duration_minutes: int = 45
    language: str = "fr"  # fr | en
    tone: str = "warm"    # warm | neutral | rigorous

    # JSON-encoded lists
    stages_json: str = "[]"
    skills_json: str = "[]"

    # Generated content used to override the ElevenLabs agent per session.
    # Phase 1 coexistence: system_prompt is kept alongside Rubric.rubric_json.
    # Sunset planned after 6 months once all roles have a structured rubric (see SKILL.md §9).
    system_prompt: str = ""
    first_message: str = ""

    created_at: datetime = Field(default_factory=datetime.utcnow)


class Rubric(SQLModel, table=True):
    """
    A versioned, structured evaluation rubric for a Role.

    Invariants (see module docstring for full details):
    - One active rubric per role at a time (app-layer enforced).
    - Rows are immutable once persisted; bump version to change.
    - Mandatory exclusions are always present in rubric_json["exclusions"].

    rubric_json shape (all fields, see SKILL.md §2.2 for full spec):
    {
      "role_title": str,
      "seniority": str,                       # junior | mid | senior | staff
      "language_default": str,                # fr | en
      "languages_supported": list[str],
      "duration_target_minutes": int,
      "skills": [                             # 1–8 skills; weights must sum to 1.0 ± 0.001
        {
          "id": str,                          # snake_case, unique within rubric
          "label": str,
          "weight": float,                    # 0.0–1.0
          "level_descriptors": {             # optional but recommended
            "junior": str, "mid": str, "senior": str, "staff": str
          },
          "must_probe": list[str]             # key topics Aria must cover
        }
      ],
      "stages": [
        {
          "id": str,
          "label": str,
          "duration_minutes": int,
          "skills_evaluated": list[str],      # references skill ids
          "opener": str | None,
          "challenge_pool": list[str] | None, # for system_design stage
          "challenge_difficulty": str | None  # for live_coding stage
        }
      ],
      "exclusions": {                         # MANDATORY — pre-populated, inviolable subset
        "do_not_ask_about": list[str],        # e.g. ["age", "marital_status", "religion", "country_of_origin"]
        "do_not_score_on": list[str]          # e.g. ["accent", "facial_expressions", "physical_appearance"]
      },
      "defense_questions": {
        "enabled": bool,
        "min_per_session": int,
        "max_per_session": int,
        "from_skill": str                     # "anti-cheating-integrity-layer"
      },
      "language_handling": {
        "candidate_can_switch_language": bool,
        "score_unaffected_by_language_proficiency": bool
      }
    }

    test_results_json shape (stored after synthetic-candidate test runs, see SKILL.md §3.2):
    {
      "tested_at": str,                       # ISO-8601 UTC
      "simulations": [
        {
          "candidate_level": str,             # junior | mid | senior
          "overall_score": float,             # 0.0–10.0, one decimal precision
          "skill_scores": dict[str, float]    # skill_id -> score
        }
      ],
      "differentiation_ok": bool,            # True if max_score - min_score >= 1.5
      "warnings": list[str]
    }
    """

    id: Optional[int] = Field(default=None, primary_key=True)

    # Foreign key to the role this rubric belongs to; indexed for multi-tenancy queries.
    role_id: int = Field(foreign_key="role.id", index=True)

    # Monotonically increasing per role. Composite unique (role_id, version) enforced via
    # index in migration 0002. Service must auto-increment when creating a new version.
    version: int

    # Only one rubric per role should be active at a time. Invariant enforced at app layer.
    # Partial unique index intentionally omitted for SQLite portability (dev compat).
    is_active: bool = Field(default=False, index=True)

    # Human-readable name, e.g. "Backend Mid v1"
    name: str

    # Full structured rubric document. Stored as TEXT/JSON. Schema documented above.
    # Validated at service layer (weight sum, mandatory exclusions, max 8 skills).
    # Immutable once persisted — bump version instead of updating.
    rubric_json: str  # JSON text; see Pydantic schema in app/services/rubric_service.py

    # Free string for now — TODO(skills/structured-rubric-builder): normalise to User.id FK
    # once the Company/User models are introduced (expected Wave 1 Phase 2).
    created_by: str  # e.g. "hr@company.com"

    # All datetimes UTC.
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Set when the rubric has been run through synthetic-candidate test simulations.
    last_tested_at: Optional[datetime] = None

    # Output of synthetic-candidate test runs. Schema documented above.
    # Null until the rubric has been tested (required before is_active=True).
    test_results_json: Optional[str] = None  # JSON text


class Interview(SQLModel, table=True):
    """
    One candidate session against a Role.

    CV Personalization cluster (fields added in migration 0003):
    - cv_text: raw CV content uploaded by candidate or HR. PII — NULL'd after 90 days.
    - cv_parsed_json: structured CVParsedSchema output from Claude parsing. PII — NULL'd after 90 days.
    - personalized_prompt: composed Aria system prompt with CV context. PII — NULL'd after 90 days.
    - cv_consent_processing: granular Article 9 RGPD consent for CV AI processing.
      Must be True before cv_text is stored or cv_parsed_json is generated.
      Kept as audit trail after purge — not itself PII.
    - cv_received_at: UTC timestamp when the CV was received. Anchor for 90-day retention window.
      Kept as audit trail after purge — not itself PII.

    RGPD retention rule: if cv_received_at IS NOT NULL AND cv_received_at < (now - 90 days),
    set cv_text=NULL, cv_parsed_json=NULL, personalized_prompt=NULL. Run via
    backend/app/scripts/purge_expired_cv_text.py (daily cron / k8s CronJob).

    Transparency / Explainability cluster (fields added in migration 0004):
    - report_integrity_hash: SHA-256 over canonical (transcript_json + visual_metrics_json +
      rubric_version_used_id + evaluator_model + report_json with hash field stripped).
      Allows external auditors to verify a report was not altered after generation.
      EU AI Act Art. 12 / RGPD Art. 22. NOT PII — retained indefinitely.
    - share_with_candidate: HR opt-in flag (default False). When True, the candidate-view
      endpoint at GET /api/interviews/{token}/candidate-view becomes accessible.
      Indexed because every candidate-view request filters on this column.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    public_token: str = Field(default_factory=_token, unique=True, index=True)
    role_id: int = Field(foreign_key="role.id", index=True)

    # Expand-contract phase 1: nullable FK to the Rubric version used at interview creation.
    # NULL for interviews created before the structured-rubric-builder skill was deployed.
    # All new interviews MUST populate this field (enforced in interview_service).
    rubric_version_used_id: Optional[int] = Field(
        default=None, foreign_key="rubric.id", index=True
    )

    candidate_name: str = ""  # RGPD: retain 90 days after interview ended_at, then nullify
    candidate_email: str = ""  # RGPD: retain 90 days after interview ended_at, then nullify

    elevenlabs_conversation_id: Optional[str] = Field(default=None, index=True)
    status: str = "pending"  # pending | in_progress | completed | error

    transcript_json: Optional[str] = None  # full transcript from webhook
    analysis_json: Optional[str] = None    # ElevenLabs analysis (summary, evaluation)
    visual_metrics_json: Optional[str] = None  # aggregated MediaPipe metrics
    report_json: Optional[str] = None      # Claude-generated HR report + candidate letter

    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # ------------------------------------------------------------------
    # CV personalization cluster (cv-adaptive-personalization skill, Phase 1 silent)
    # RGPD: cv_text holds raw CV content under explicit Article 9 consent.
    # Retention: 90 days from cv_received_at, then NULL out cv_text + cv_parsed_json
    #            + personalized_prompt. See backend/app/scripts/purge_expired_cv_text.py.
    # ------------------------------------------------------------------

    # RGPD: raw CV text (PDF extracted / paste / LinkedIn copy). PII. Purge after 90 days.
    cv_text: Optional[str] = Field(default=None)

    # RGPD: structured CVParsedSchema dict serialized as JSON string. PII. Purge after 90 days.
    # Shape: see SKILL.md §3.2. Pydantic schema: app/services/cv_parser_service.CVParsedSchema.
    # Encoding: json.dumps(dict) → stored as TEXT; decode with json.loads().
    cv_parsed_json: Optional[str] = Field(default=None)

    # RGPD: composed Aria system prompt embedding candidate details. PII. Purge after 90 days.
    # Whether this prompt is injected into ElevenLabs is controlled by settings.CV_PERSONALIZATION_INJECT.
    # Phase 1 (silent): computed and stored here, NOT sent to ElevenLabs.
    personalized_prompt: Optional[str] = Field(default=None)

    # Granular Article 9 RGPD consent for AI processing of CV. Default False.
    # MUST be True before cv_text is stored or cv_parsing is triggered.
    # Retained as non-PII audit trail even after 90-day purge.
    cv_consent_processing: bool = Field(default=False, index=True)

    # UTC timestamp when the CV was first received. Anchor for the 90-day retention window.
    # Retained as non-PII audit trail even after 90-day purge.
    cv_received_at: Optional[datetime] = Field(default=None)  # RGPD: retention anchor, UTC

    # ------------------------------------------------------------------
    # Transparency / explainability cluster (transparent-scoring-explainability skill,
    # migration 0004).
    # report_integrity_hash is a SHA-256 over canonical (transcript_json +
    # visual_metrics_json + rubric_version_used_id + evaluator_model from
    # report_json.model_version + report_json with hash field stripped).
    # Used for external audit reproducibility (RGPD Art. 22 / EU AI Act Art. 12).
    # share_with_candidate gates the public candidate-view endpoint; defaults False
    # (HR opts in per interview). Indexed because the candidate-view route filters on it.
    # ------------------------------------------------------------------

    # SHA-256 integrity hash for audit reproducibility. NOT PII — retained indefinitely.
    # Computed by report_service over: transcript_json + visual_metrics_json +
    # str(rubric_version_used_id) + evaluator_model + report_json (hash field stripped).
    # Backend-engineer: see app/services/report_service.py for canonical serialisation.
    report_integrity_hash: Optional[str] = Field(default=None)

    # HR opt-in gate for the public candidate-view endpoint. Default False.
    # When True, GET /api/interviews/{public_token}/candidate-view is accessible to the
    # candidate. RGPD §6 "Mode RH only": prevents accidental data leakage.
    # Indexed: candidate-view route filters WHERE share_with_candidate = TRUE.
    share_with_candidate: bool = Field(default=False, index=True)


class EvaluationOverride(SQLModel, table=True):
    """An HR-initiated correction to a Claude-generated skill score.

    APPEND-ONLY. Once persisted, rows are immutable; a new row supersedes an older
    one for display purposes (latest wins per (interview_id, skill_id)) but the audit
    trail keeps every prior override forever (EU AI Act Art. 12 / RGPD Art. 22).

    The original report_json on the Interview is NEVER mutated — overrides live in
    this sidecar table so the original Claude evaluation remains permanently traceable.

    justification is required and enforced >= 30 chars at the API layer.

    Scores use float (0.0–5.0, one decimal precision) matching the rubric skill scoring
    range. The rubric specifies integer levels 0–5 but Claude returns floats; float is
    the correct storage type for both original and override scores.

    created_by is a free string auth stub ("admin") in Wave 1. Will FK to a User table
    once the Company/User models are introduced (Wave 2 ATS skill).

    Composite index on (interview_id, skill_id): used by the "latest override wins"
    query pattern — ORDER BY created_at DESC LIMIT 1 per (interview_id, skill_id).
    """

    id: Optional[int] = Field(default=None, primary_key=True)

    # FK to the interview being overridden. Indexed explicitly (SQLite FK quirk).
    interview_id: int = Field(foreign_key="interview.id", index=True)

    # Matches rubric.rubric_json["skills"][*]["id"] — snake_case identifier, e.g. "python".
    # Not a DB-level FK because rubric_json is a JSON document; validated at service layer.
    skill_id: str

    # Original Claude-generated score for this skill. 0.0–5.0, one decimal precision.
    # Copied from report_json at override creation time for self-contained audit row.
    original_score: float  # 0.0–5.0, one decimal precision

    # HR-assigned corrected score. 0.0–5.0, one decimal precision.
    override_score: float  # 0.0–5.0, one decimal precision

    # Human justification for the override. Minimum 30 chars enforced at API layer.
    # Required for RGPD Art. 22 right-to-explanation and EU AI Act Art. 12 traceability.
    justification: str

    # Identity of the HR user who created the override. Auth stub returns "admin" for
    # now. Will become a FK to User.id once the User model is introduced (Wave 2).
    created_by: str  # auth stub: "admin"; TODO FK to User.id in Wave 2

    # UTC creation timestamp. Indexed for efficient "latest override" queries.
    # All datetimes UTC per project convention.
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    # Composite index for the "latest override wins" query pattern:
    # SELECT ... WHERE interview_id=? AND skill_id=? ORDER BY created_at DESC LIMIT 1.
    # Declared here; also created explicitly in migration 0004 for SQLite portability.
    __table_args__ = (
        Index("ix_evaluationoverride_interview_skill", "interview_id", "skill_id"),
    )


class PracticeSession(SQLModel, table=True):
    """A free, unauthenticated practice interview. Fully isolated from
    Interview / Role / Rubric — no FK, no score, no hiring decision.

    INVARIANTS:
    - No FK to any HR-side table; HR queries that scan Interview cannot
      surface practice data by construction.
    - No candidate_score / hiring_recommendation columns. Practice is
      formative, never evaluative.
    - candidate_email is OPTIONAL (the candidate can practice anonymously).
    - 30-day retention from session_received_at: transcript_json,
      practice_report_json, candidate_email are NULLed via
      backend/app/scripts/purge_expired_practice_sessions.py. Audit fields
      (session_received_at, started_at, completed_at, role_type, seniority,
      language, duration_choice) are kept for KPI aggregates indefinitely
      after PII removal.

    role_type / seniority / language / duration_choice are STRING ENUMS
    enforced at the API layer (PRACTICE_ROLE_PRESETS / etc. in
    practice_service.py). Do NOT add a FK to Role.

    practice_report_json shape (formative, no score — see SKILL.md §2.3):
    {
      "overall_feedback": str,
      "strengths_with_examples": [
        {
          "strength": str,
          "your_quote": str,
          "why_strong": str
        }
      ],
      "growth_areas_with_actionable_tips": [
        {
          "area": str,
          "what_happened": str,
          "tip": str,
          "example_phrase": str
        }
      ],
      "model_answers": [
        {
          "question_asked": str,
          "your_answer_summary": str,
          "alternative_answer_example": str
        }
      ],
      "next_practice_recommendation": str
    }
    NOTE: no numeric score anywhere in this document (SKILL.md §2.3 invariant).
    Pydantic schema: app/services/practice_service.PracticeReportSchema.

    abuse_flags semantics (for backend-engineer):
    - Stored as a nullable comma-separated string of reason codes, e.g.
      "session_too_short,abnormal_turn_timing". NULL when no flags are present.
    - Reason codes are free-form strings defined in practice_service.py.
    - NEVER causes automatic rejection (CLAUDE.md hard rule #1). Admin KPI
      endpoint reads this column to surface sessions for human review only.
    - Rationale for string-not-JSON: comma-separated is sufficient for a short
      set of enum-like reason codes and avoids a JSON parse on every KPI query.
      If the set of reasons grows to > 5 or needs nested data, convert to JSON.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    public_token: str = Field(default_factory=_token, unique=True, index=True)

    # Synthetic role identifier — NOT a FK. Enforced by app-layer enum.
    # Valid values defined as PRACTICE_ROLE_PRESETS in practice_service.py.
    # Phase 1 MVP: "backend" | "frontend" | "data"
    role_type: str  # e.g. "backend", "frontend", "data"

    # Valid values: "junior" | "mid" | "senior" | "staff"
    seniority: str

    # "fr" | "en" — Phase 2 adds "ar"
    language: str

    # "short" (10 min) | "medium" (25 min)
    # Phase 1 MVP excludes "long" (45 min) per SKILL.md §8 Phase 1 scope.
    duration_choice: str

    # RGPD: optional PII. Captured at end of session only if the candidate
    # opts in to receive the report by email. NULL for anonymous sessions.
    # Retention: 30 days from session_received_at, then NULL out.
    candidate_email: Optional[str] = None  # RGPD: retain 30 days, then nullify

    # Referral tracking: populated from ?ref=<another_session_token> query param.
    # Enables viral growth KPI (SKILL.md §7). Indexed for referral attribution queries.
    # NOT a FK to practicesession.public_token at DB level (avoids self-referential
    # constraint complexity; validated at service layer if needed).
    referrer_token: Optional[str] = Field(default=None, index=True)

    # ElevenLabs conversation ID for this practice session.
    # Populated by the ElevenLabs webhook on session start.
    # Indexed for O(1) webhook lookup (same pattern as Interview).
    elevenlabs_conversation_id: Optional[str] = Field(default=None, index=True)

    # RGPD: full transcript JSON from ElevenLabs webhook. PII.
    # Retention: 30 days from session_received_at, then NULL out.
    transcript_json: Optional[str] = None  # RGPD: retain 30 days, then nullify

    # RGPD: Claude-generated formative practice report. PII (contains verbatim
    # transcript quotes). No numeric score per SKILL.md §2.3 invariant.
    # Shape: PracticeReportSchema (documented in class docstring above).
    # Retention: 30 days from session_received_at, then NULL out.
    practice_report_json: Optional[str] = None  # RGPD: retain 30 days, then nullify

    # Anti-bot heuristic flag. NEVER causes automatic rejection (CLAUDE.md rule #1).
    # NULL when session is clean; comma-separated reason codes when flagged.
    # Example: "session_too_short,abnormal_turn_timing"
    # Set by post-session abuse detector in practice_service.py (backend-engineer scope).
    # Admin KPI endpoint surfaces flagged sessions for human review only.
    abuse_flags: Optional[str] = None

    # Retention anchor — 30-day RGPD retention clock starts from this timestamp.
    # transcript_json, practice_report_json, and candidate_email are NULLed by
    # purge_expired_practice_sessions.py when session_received_at < (now - 30 days).
    # Indexed: purge script and KPI aggregation both filter on this column.
    session_received_at: datetime = Field(  # RGPD: retention anchor, UTC
        default_factory=datetime.utcnow, index=True
    )

    # Session lifecycle timestamps. All UTC per project convention.
    # Retained indefinitely after PII purge for KPI aggregation (completion rate,
    # duration distribution, etc.).
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
