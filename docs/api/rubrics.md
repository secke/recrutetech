# API Reference — Rubrics

Audience: backend developers, ATS integrators, internal tools team.

Base URL: `/api` (all paths below are relative to it).

Swagger UI: `/api/docs` — ReDoc: `/api/redoc`

---

## Authorization

All write endpoints (`POST`, and technically `PATCH`) require the `require_admin_or_hm` dependency, which currently returns the string `"admin"` unconditionally (stub).

Read endpoints (`GET`) are open, consistent with `GET /api/roles`.

**Note:** This is a stub. A proper JWT/RBAC dependency will replace it once the Company/User models are introduced in Wave 2. The injection interface is stable; callers do not need to change.

---

## Endpoints

### POST /api/roles/{role_id}/rubrics

Create a new rubric version for a role. Always created as inactive (`is_active=false`). The version number is auto-incremented (max existing version + 1, or 1 if no prior rubric exists for this role).

**Auth:** `require_admin_or_hm`

**Path parameters:**

| Name | Type | Description |
|---|---|---|
| `role_id` | integer | Primary key of the target Role. |

**Request body:** `application/json`

```json
{
  "rubric_json": { ... },
  "name": "Senior Backend Engineer v2"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `rubric_json` | object | Yes | Full rubric document. See [Canonical rubric_json shape](#canonical-rubric_json-shape). |
| `name` | string | No | Human-readable name. Auto-generated as `"{role_title} v{version}"` if omitted. |

**Validation applied at creation time:**

- `skills[].weight` must sum to `1.0 ± 0.001`.
- Maximum 8 skills.
- Every skill must have `level_descriptors` for at least `junior`, `mid`, `senior`.
- At least 1 stage must be present.
- Sum of `stages[].duration_minutes` must not exceed `Role.duration_minutes` (if set).
- Mandatory RGPD/anti-bias exclusions are **auto-merged** into `rubric_json.exclusions` — missing exclusions are never rejected; they are silently added. A warning is returned in the server logs.

**Response:** `201 Created` — `RubricOut`

```json
{
  "id": 7,
  "role_id": 3,
  "version": 2,
  "is_active": false,
  "name": "Senior Backend Engineer v2",
  "rubric_json": { ... },
  "created_by": "admin",
  "created_at": "2026-05-05T10:00:00",
  "last_tested_at": null,
  "test_results": null
}
```

**Error responses:**

| Status | Condition |
|---|---|
| `422 Unprocessable Entity` | Validation failed. `detail` contains the list of error messages. |
| `422` | Role not found (`role_id` does not exist). |

**Example request:**

```bash
curl -X POST http://localhost:8000/api/roles/3/rubrics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Senior Backend Engineer v2",
    "rubric_json": {
      "role_title": "Senior Backend Engineer",
      "seniority": "senior",
      "language_default": "fr",
      "languages_supported": ["fr", "en"],
      "duration_target_minutes": 50,
      "skills": [
        {
          "id": "backend_depth",
          "label": "Profondeur backend",
          "weight": 0.40,
          "level_descriptors": {
            "junior": "Écrit des APIs simples avec aide.",
            "mid": "Construit des services complets autonomement.",
            "senior": "Connaît les internals du framework, optimise en production.",
            "staff": "Fixe la direction technique, évalue les frameworks."
          },
          "must_probe": ["async patterns", "production debugging", "framework internals"]
        },
        {
          "id": "system_design",
          "label": "System design",
          "weight": 0.35,
          "level_descriptors": {
            "junior": "Comprend les composants de base.",
            "mid": "Conçoit des systèmes simples avec trade-offs clairs.",
            "senior": "Conçoit des systèmes distribués, gère les failure modes.",
            "staff": "Pilote les choix d'\''architecture à l'\''échelle."
          },
          "must_probe": ["caching strategies", "database choice rationale", "failure modes"]
        },
        {
          "id": "communication",
          "label": "Communication technique",
          "weight": 0.25,
          "level_descriptors": {
            "junior": "Explique son code avec guidance.",
            "mid": "Explique les trade-offs clairement.",
            "senior": "Synthèse claire de problèmes complexes.",
            "staff": "Aligne les équipes techniques."
          },
          "must_probe": ["trade-off articulation", "clarifying questions"]
        }
      ],
      "stages": [
        {
          "id": "intro",
          "label": "Introduction",
          "duration_minutes": 5,
          "skills_evaluated": ["communication"]
        },
        {
          "id": "experience",
          "label": "Expérience passée",
          "duration_minutes": 20,
          "skills_evaluated": ["backend_depth", "communication"]
        },
        {
          "id": "system_design",
          "label": "System design",
          "duration_minutes": 20,
          "skills_evaluated": ["system_design", "communication"]
        },
        {
          "id": "questions",
          "label": "Questions candidat",
          "duration_minutes": 5,
          "skills_evaluated": []
        }
      ],
      "exclusions": {
        "do_not_ask_about": [],
        "do_not_score_on": []
      },
      "defense_questions": {
        "enabled": true,
        "min_per_session": 2,
        "max_per_session": 4,
        "from_skill": "anti-cheating-integrity-layer"
      },
      "language_handling": {
        "candidate_can_switch_language": true,
        "score_unaffected_by_language_proficiency": true
      }
    }
  }'
```

---

### GET /api/roles/{role_id}/rubrics

List all rubric versions for a role, sorted descending by version number.

**Auth:** Open (no auth required).

**Path parameters:**

| Name | Type | Description |
|---|---|---|
| `role_id` | integer | Primary key of the Role. |

**Response:** `200 OK` — array of `RubricOut`

```json
[
  {
    "id": 7,
    "role_id": 3,
    "version": 2,
    "is_active": true,
    "name": "Senior Backend Engineer v2",
    "rubric_json": { ... },
    "created_by": "admin",
    "created_at": "2026-05-05T10:00:00",
    "last_tested_at": "2026-05-05T10:05:00",
    "test_results": {
      "tested_at": "2026-05-05T10:05:00Z",
      "simulations": [
        { "candidate_level": "junior", "overall_score": 3.5, "skill_scores": { "backend_depth": 3.5, "system_design": 3.5, "communication": 3.5 } },
        { "candidate_level": "mid",    "overall_score": 5.5, "skill_scores": { "backend_depth": 5.5, "system_design": 5.5, "communication": 5.5 } },
        { "candidate_level": "senior", "overall_score": 7.5, "skill_scores": { "backend_depth": 7.5, "system_design": 7.5, "communication": 7.5 } }
      ],
      "differentiation_ok": true,
      "warnings": []
    }
  },
  {
    "id": 4,
    "role_id": 3,
    "version": 1,
    "is_active": false,
    "name": "Senior Backend Engineer v1",
    "rubric_json": { ... },
    "created_by": "admin",
    "created_at": "2026-04-10T09:00:00",
    "last_tested_at": "2026-04-10T09:10:00",
    "test_results": { "differentiation_ok": false, "warnings": ["Insufficient differentiation: senior(5.2) - junior(4.8) = 0.4 (need >= 1.5)."] }
  }
]
```

---

### GET /api/rubrics/{rubric_id}

Fetch a single rubric by its primary-key id.

**Auth:** Open.

**Path parameters:**

| Name | Type | Description |
|---|---|---|
| `rubric_id` | integer | Primary key of the Rubric. |

**Response:** `200 OK` — `RubricOut`

**Error responses:**

| Status | Condition |
|---|---|
| `404 Not Found` | Rubric does not exist. |

**Example request:**

```bash
curl http://localhost:8000/api/rubrics/7
```

---

### PATCH /api/rubrics/{rubric_id}

Always returns `405 Method Not Allowed`. Rubrics are immutable once created.

**Reason:** Every `Rubric` row is append-only. Mutating a row would corrupt the evaluation context for any `Interview` that references it via `rubric_version_used_id`. This is a schema invariant enforced at both the application layer and documented in `models.py`.

**To change a rubric:** create a new version via `POST /api/roles/{role_id}/rubrics`, test it, and activate it. The old version is automatically deactivated.

**Response:** `405 Method Not Allowed`

```json
{
  "error": "Rubrics are immutable. Create a new version via POST /api/roles/{role_id}/rubrics."
}
```

---

### POST /api/rubrics/{rubric_id}/activate

Activate a rubric version. Atomically deactivates all other versions for the same role.

**Auth:** `require_admin_or_hm`

**Path parameters:**

| Name | Type | Description |
|---|---|---|
| `rubric_id` | integer | Primary key of the Rubric to activate. |

**Preconditions (enforced; raises 409 if not met):**

1. `rubric.test_results_json` is non-null (rubric has been tested at least once via the `/test` endpoint).
2. The parsed test result has `differentiation_ok == true` (senior score minus junior score >= 1.5 on a 0–10 scale).

**On success:** Sets `is_active=true` on the target rubric and `is_active=false` on all sibling rubrics for the same role, within a single transaction. Emits an audit log at INFO level with `rubric_id`, `role_id`, `version`.

**Response:** `200 OK` — `RubricOut` (the now-active rubric)

**Error responses:**

| Status | Condition |
|---|---|
| `404 Not Found` | Rubric does not exist. |
| `409 Conflict` | Test not run, or `differentiation_ok=false`. `detail` contains the reason and instructions. |

**Example 409 response body:**

```json
{
  "detail": "Rubric cannot be activated: synthetic test did not achieve sufficient differentiation (senior_overall - junior_overall < 1.5). Test warnings: ['Insufficient differentiation: senior(5.2) - junior(4.8) = 0.4 (need >= 1.5). Revisit level_descriptors.']. Revise level_descriptors and re-test."
}
```

**Example request:**

```bash
curl -X POST http://localhost:8000/api/rubrics/7/activate
```

---

### POST /api/rubrics/{rubric_id}/test

Run the synthetic-candidate calibration test: 3 simulations (junior, mid, senior) scored by Claude. Writes results to `rubric.test_results_json` and `rubric.last_tested_at`.

**Auth:** `require_admin_or_hm`

**Path parameters:**

| Name | Type | Description |
|---|---|---|
| `rubric_id` | integer | Primary key of the Rubric to test. |

**Behaviour:**

- The test is run synchronously (awaited inline). It may take 30–120 seconds depending on Anthropic model latency. Configure your reverse proxy timeout accordingly (recommended: 180 s).
- If `ANTHROPIC_API_KEY` is not set (dev/CI environment), the service uses hard-coded stub scores (3.5 / 5.5 / 7.5) so the endpoint remains exercisable. The `test_results.warnings` array will contain a `STUB:` prefix message in this case.
- The test can be re-run at any time on any rubric version (including already-active ones, for diagnostic purposes).

**Response:** `200 OK` — `TestResponse`

```json
{
  "status": "completed",
  "rubric_id": 7,
  "test_results": {
    "tested_at": "2026-05-05T10:05:00+00:00",
    "simulations": [
      {
        "candidate_level": "junior",
        "overall_score": 3.5,
        "skill_scores": { "backend_depth": 3.2, "system_design": 3.5, "communication": 4.0 }
      },
      {
        "candidate_level": "mid",
        "overall_score": 5.8,
        "skill_scores": { "backend_depth": 5.5, "system_design": 6.0, "communication": 5.8 }
      },
      {
        "candidate_level": "senior",
        "overall_score": 8.1,
        "skill_scores": { "backend_depth": 8.5, "system_design": 8.2, "communication": 7.6 }
      }
    ],
    "differentiation_ok": true,
    "warnings": []
  }
}
```

**Error responses:**

| Status | Condition |
|---|---|
| `404 Not Found` | Rubric does not exist. |
| `409 Conflict` | Service-layer validation error (currently not triggered in normal usage). |
| `502 Bad Gateway` | Anthropic API call failed or timed out. `detail` contains the upstream error message. |

**Example request:**

```bash
curl -X POST http://localhost:8000/api/rubrics/7/test
```

---

## RubricOut schema

All rubric endpoints return this shape:

| Field | Type | Description |
|---|---|---|
| `id` | integer | Primary key. |
| `role_id` | integer | FK to the parent Role. |
| `version` | integer | Monotonically increasing per role. |
| `is_active` | boolean | Only one rubric per role can be `true` at a time. |
| `name` | string | Human-readable label, e.g. "Backend Senior v3". |
| `rubric_json` | object | Full decoded rubric document. See next section. |
| `created_by` | string | Actor who created the rubric (HR email or `"system:backfill"`). |
| `created_at` | datetime | UTC creation timestamp. |
| `last_tested_at` | datetime or null | UTC timestamp of the last synthetic test run. Null if never tested. |
| `test_results` | object or null | Decoded test results document. Null if never tested. See `test_results_json` shape below. |

---

## Canonical rubric_json shape

Stored as a JSON text column in `Rubric.rubric_json`. Decoded to a dict in API responses. All fields:

```json
{
  "role_title": "Senior Backend Engineer",
  "seniority": "senior",
  "language_default": "fr",
  "languages_supported": ["fr", "en"],
  "duration_target_minutes": 50,

  "skills": [
    {
      "id": "backend_depth",
      "label": "Profondeur backend",
      "weight": 0.40,
      "level_descriptors": {
        "junior": "...",
        "mid": "...",
        "senior": "...",
        "staff": "..."
      },
      "must_probe": ["async patterns", "production debugging"]
    }
  ],

  "stages": [
    {
      "id": "intro",
      "label": "Introduction",
      "duration_minutes": 5,
      "skills_evaluated": ["communication"],
      "opener": "Hi, I'm Aria. Walk me through your background.",
      "challenge_pool": null,
      "challenge_difficulty": null
    }
  ],

  "exclusions": {
    "do_not_ask_about": ["age", "country_of_origin", "ethnicity", "marital_status", "race", "religion"],
    "do_not_score_on": ["accent", "disability", "facial_expressions", "gender", "physical_appearance", "school_name"]
  },

  "defense_questions": {
    "enabled": true,
    "min_per_session": 2,
    "max_per_session": 4,
    "from_skill": "anti-cheating-integrity-layer"
  },

  "language_handling": {
    "candidate_can_switch_language": true,
    "score_unaffected_by_language_proficiency": true
  }
}
```

### Field notes

**`skills`**
- Array of 1–8 objects. Enforced at creation time; returns 422 if more than 8.
- `weight` values must sum to `1.0 ± 0.001`.
- `level_descriptors` must include at least `junior`, `mid`, `senior`. `staff` is optional but recommended.
- `must_probe` is a list of topic strings Aria is instructed to cover for this skill.

**`stages`**
- At least 1 stage required.
- `skills_evaluated` contains skill `id` values. Referenced skills must exist in `skills`; mismatches produce a warning but are not rejected.
- `opener` is a verbatim opening question for Aria. Optional.
- `challenge_pool` is used for system-design stages (list of challenge identifiers). Optional.
- `challenge_difficulty` is used for live-coding stages (`"easy"`, `"medium"`, `"hard"`). Optional.

**`exclusions`**
- The `do_not_ask_about` and `do_not_score_on` lists are auto-merged with mandatory items server-side. You will always receive the full merged list in responses, regardless of what was submitted.
- Mandatory `do_not_ask_about`: `age`, `country_of_origin`, `ethnicity`, `marital_status`, `race`, `religion`.
- Mandatory `do_not_score_on`: `accent`, `disability`, `facial_expressions`, `gender`, `physical_appearance`, `school_name`.

**`defense_questions`**
- `from_skill` must be `"anti-cheating-integrity-layer"`. This field is informational; the actual question generation is handled by that skill once implemented.

---

## test_results_json shape

Stored in `Rubric.test_results_json`. Returned as `test_results` in `RubricOut`.

```json
{
  "tested_at": "2026-05-05T10:05:00+00:00",
  "simulations": [
    {
      "candidate_level": "junior",
      "overall_score": 3.5,
      "skill_scores": { "backend_depth": 3.2, "system_design": 3.5, "communication": 4.0 }
    },
    {
      "candidate_level": "mid",
      "overall_score": 5.8,
      "skill_scores": { "backend_depth": 5.5, "system_design": 6.0, "communication": 5.8 }
    },
    {
      "candidate_level": "senior",
      "overall_score": 8.1,
      "skill_scores": { "backend_depth": 8.5, "system_design": 8.2, "communication": 7.6 }
    }
  ],
  "differentiation_ok": true,
  "warnings": []
}
```

| Field | Type | Description |
|---|---|---|
| `tested_at` | ISO-8601 string | UTC timestamp of when the test was run. |
| `simulations` | array | One entry per simulated candidate level. |
| `simulations[].candidate_level` | string | `"junior"`, `"mid"`, or `"senior"`. |
| `simulations[].overall_score` | float | Weighted overall score, 0.0–10.0, one decimal. |
| `simulations[].skill_scores` | object | `{ skill_id: score }` for each skill in the rubric. |
| `differentiation_ok` | boolean | `true` if `senior_overall - junior_overall >= 1.5`. Required for activation. |
| `warnings` | array of strings | Non-blocking notices. A `"STUB:"` prefix indicates the Anthropic API was unavailable and scores are hard-coded placeholders. |

---

## Prompt versioning

Every evaluation persists a `prompt_version` field in its output JSON. This satisfies RGPD Article 22 traceability: any automated evaluation can be traced back to the exact prompt version that produced it.

Active versions:

| Constant | Value | Scope |
|---|---|---|
| `EVALUATION_PROMPT_VERSION` | `"2.0.0"` | Claude report generation prompt (used when `rubric_version_used_id` is set). |
| `LEGACY_PROMPT_VERSION` | `"1.0.0-legacy"` | Claude report generation prompt for interviews without a structured rubric. Persisted in `report_json.prompt_version` for legacy traceability. |
| `ARIA_PROMPT_VERSION` | `"1.0.0"` | ElevenLabs Aria system prompt built from the rubric. |
| `SYNTHETIC_PROMPT_VERSION` | `"1.0.0"` | Synthetic candidate simulation prompt used during rubric testing. |

When the evaluation prompts are updated, bump the version before shipping. The version must be included in the output stored in `Interview.report_json` so that any future audit can reproduce the evaluation context.

---

## Related documentation

- HR guide (French): [docs/hr-guides/rubric-builder.fr.md](../hr-guides/rubric-builder.fr.md)
- HR guide (English): [docs/hr-guides/rubric-builder.en.md](../hr-guides/rubric-builder.en.md)
- Migration guide: [docs/migration-guides/role-system-prompt-to-rubric.md](../migration-guides/role-system-prompt-to-rubric.md)
