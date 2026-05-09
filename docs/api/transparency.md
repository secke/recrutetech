# Transparent Scoring & Explainability — API Reference

Audience: backend developers, ATS/HRIS integrators, enterprise compliance officers, external auditors.

These endpoints are part of the `transparent-scoring-explainability` skill (Wave 1, P0).
HR-side routes are registered in `backend/app/api/interviews.py`.
Candidate-side routes are registered in `backend/app/api/candidate.py`.

Cross-references:
- HR interpretation guide: [`docs/hr-guides/transparency-handbook.md`](../hr-guides/transparency-handbook.md)
- Candidate-facing copy contract: [`docs/candidate-consent/explanation-page.md`](../candidate-consent/explanation-page.md)
- Rubric schema: [`docs/api/rubrics.md`](rubrics.md)
- CV personalization: [`docs/api/cv.md`](cv.md)

---

## Authentication

**HR endpoints** (`/api/interviews/…`) require an HR API key sent as `X-API-Key: <key>`.
The `audit-trail`, `override`, and `share` endpoints additionally require the caller to
resolve as `admin` or `hiring_manager` via `require_admin_or_hm`. In the current auth stub,
any valid `X-API-Key` resolves as `"admin"`.

**Candidate endpoints** (`/api/candidate/…`) are public. Access control is through the
opaque `public_token` (URL-safe random string, 12 bytes) embedded in the interview link
the candidate received. No `Authorization` header is required or accepted.

---

## HR Endpoints

### GET /api/interviews/{interview_token}/audit-trail

Return the full reproducible audit payload for an external auditor.

**Method:** `GET`
**Path:** `/api/interviews/{interview_token}/audit-trail`
**Auth:** HR API key + admin or hiring_manager role

#### Path parameters

| Parameter          | Type   | Description                                |
|--------------------|--------|--------------------------------------------|
| `interview_token`  | string | Interview `public_token` (opaque URL-safe string). |

#### Response body — `AuditTrailResponse`

```json
{
  "interview_token": "abc123def456",
  "rubric_id": 7,
  "rubric_version": 3,
  "prompt_version": "3.0.0",
  "evaluator_model": "claude-opus-4-7",
  "transcript_json": "[{\"role\":\"agent\",\"text\":\"Bonjour...\",\"time_in_call_secs\":0}]",
  "visual_metrics_json": "{\"eye_contact_ratio\":0.72,\"attention_ratio\":0.88}",
  "report_json": {
    "overall_score": 7.4,
    "skill_scores": {"python": 3.5, "system_design": 3.0},
    "..."
  },
  "overrides": [
    {
      "id": 12,
      "skill_id": "python",
      "original_score": 3.5,
      "override_score": 4.0,
      "justification": "Candidate demonstrated strong asyncio knowledge in follow-up call not captured in transcript.",
      "created_by": "admin",
      "created_at": "2026-05-04T15:10:00"
    }
  ],
  "report_integrity_hash": "a3f5c9e1b2d7…",
  "verification_instructions": "Re-encode each input field (transcript_json, visual_metrics_json, rubric_id, rubric_version, prompt_version, evaluator_model, report_json [with report_integrity_hash key stripped], overrides) independently using json.dumps(value, sort_keys=True, ensure_ascii=False), then join all eight encoded strings with a literal \x00 byte, and compute SHA-256 of the resulting UTF-8 bytes. The digest must equal report_integrity_hash."
}
```

| Field                      | Type            | Description                                                                                       |
|----------------------------|-----------------|---------------------------------------------------------------------------------------------------|
| `interview_token`          | string          | Echo of the path parameter.                                                                        |
| `rubric_id`                | integer or null | Primary key of the `Rubric` row used at interview creation. Null for pre-rubric interviews.        |
| `rubric_version`           | integer or null | `Rubric.version` value (monotonically increasing per role). Null for pre-rubric interviews.        |
| `prompt_version`           | string or null  | Evaluation prompt version extracted from `report_json.prompt_version`. `"3.0.0"` for v3 reports.  |
| `evaluator_model`          | string or null  | Model name extracted from `report_json.model_version.evaluator_model`.                             |
| `transcript_json`          | string or null  | Raw `Interview.transcript_json` string (JSON-encoded array of turns).                              |
| `visual_metrics_json`      | string or null  | Raw `Interview.visual_metrics_json` string.                                                        |
| `report_json`              | object or null  | Parsed report dict with `report_integrity_hash` key stripped (per hash convention).                |
| `overrides`                | array           | All `EvaluationOverride` rows for this interview, ordered by `created_at` ascending.               |
| `report_integrity_hash`    | string or null  | SHA-256 hex digest stored in `Interview.report_integrity_hash`.                                    |
| `verification_instructions`| string          | Literal instructions for re-deriving the hash. Always present in every response.                   |

#### Status codes

| Code | Condition                                              |
|------|--------------------------------------------------------|
| 200  | Success.                                               |
| 401  | Missing or invalid `X-API-Key`.                        |
| 404  | `interview_token` not found, or no report exists yet. |

#### Example curl

```bash
curl -H "X-API-Key: your-hr-api-key" \
  "https://api.recrutetech.com/api/interviews/abc123def456/audit-trail"
```

---

### POST /api/interviews/{interview_token}/override

Create an HR override of a Claude-generated skill score.

**Method:** `POST`
**Path:** `/api/interviews/{interview_token}/override`
**Auth:** HR API key + admin or hiring_manager role
**Content-Type:** `application/json`

#### Path parameters

| Parameter         | Type   | Description                  |
|-------------------|--------|------------------------------|
| `interview_token` | string | Interview `public_token`.    |

#### Request body — `OverrideRequest`

```json
{
  "skill_id": "python",
  "override_score": 4.0,
  "justification": "Candidate demonstrated production-grade asyncio knowledge in a follow-up technical call not captured in the Aria transcript."
}
```

| Field           | Type   | Required | Constraints                                                                       |
|-----------------|--------|----------|-----------------------------------------------------------------------------------|
| `skill_id`      | string | yes      | Must exactly match a key in `report_json.skill_scores`. Case-sensitive.           |
| `override_score`| float  | yes      | Range 0.0–5.0. One decimal precision recommended.                                 |
| `justification` | string | yes      | Minimum 30 characters after stripping whitespace. Required for RGPD Art. 22 and EU AI Act Art. 12 traceability. |

**Validation failure (422):** if `justification.strip()` is fewer than 30 characters, the API returns 422 with the message: `"justification must be at least 30 characters — required for RGPD Art. 22 and EU AI Act Art. 12 traceability"`.

#### Response body — `OverrideResponse`

```json
{
  "override_id": 12,
  "interview_token": "abc123def456",
  "skill_id": "python",
  "original_score": 3.5,
  "override_score": 4.0,
  "effective_score": 4.0,
  "justification": "Candidate demonstrated production-grade asyncio knowledge…",
  "created_by": "admin",
  "created_at": "2026-05-04T15:10:00",
  "report_integrity_hash": "b8e2a1d9f3c6…"
}
```

| Field                   | Type     | Description                                                                                              |
|-------------------------|----------|----------------------------------------------------------------------------------------------------------|
| `override_id`           | integer  | Primary key of the new `EvaluationOverride` row.                                                         |
| `interview_token`       | string   | Echo of the path parameter.                                                                               |
| `skill_id`              | string   | Skill that was overridden.                                                                                |
| `original_score`        | float    | Claude's original score, copied from `report_json.skill_scores` at override time.                        |
| `override_score`        | float    | The new HR-assigned score.                                                                                |
| `effective_score`       | float    | Latest override score for this `(interview_id, skill_id)` pair. Equals `override_score` when this is the latest override. |
| `justification`         | string   | Echo of the submitted justification.                                                                      |
| `created_by`            | string   | Identity of the caller (auth stub: `"admin"`; will be a User FK in Wave 2).                              |
| `created_at`            | datetime | UTC timestamp of the override row.                                                                        |
| `report_integrity_hash` | string   | Recomputed SHA-256 hash covering `report_json` + full override history including this new row.            |

#### Status codes

| Code | Condition                                                                         |
|------|-----------------------------------------------------------------------------------|
| 201  | Override created successfully.                                                    |
| 401  | Missing or invalid `X-API-Key`.                                                   |
| 404  | `interview_token` not found.                                                      |
| 404  | `skill_id` not present in `report_json.skill_scores` (response includes available skill IDs). |
| 409  | No report exists yet for this interview.                                          |
| 422  | Validation error (justification too short, score out of range, missing fields).   |

#### Example curl

```bash
curl -X POST \
  -H "X-API-Key: your-hr-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "skill_id": "python",
    "override_score": 4.0,
    "justification": "Candidate demonstrated production-grade asyncio knowledge in a follow-up technical call not captured in the Aria transcript."
  }' \
  "https://api.recrutetech.com/api/interviews/abc123def456/override"
```

---

### PATCH /api/interviews/{interview_token}/share

Set or clear the share-with-candidate flag for an interview.

**Method:** `PATCH`
**Path:** `/api/interviews/{interview_token}/share`
**Auth:** HR API key + admin or hiring_manager role
**Content-Type:** `application/json`

#### Path parameters

| Parameter         | Type   | Description               |
|-------------------|--------|---------------------------|
| `interview_token` | string | Interview `public_token`. |

#### Request body — `ShareRequest`

```json
{
  "share_with_candidate": true
}
```

| Field                  | Type    | Required | Description                                                                       |
|------------------------|---------|----------|-----------------------------------------------------------------------------------|
| `share_with_candidate` | boolean | yes      | `true` to enable the candidate view; `false` to disable it.                       |

**State-change implications:** when set to `true`, `GET /api/candidate/interviews/{interview_token}` immediately becomes accessible to anyone with the `interview_token`. When set back to `false`, that endpoint returns 404. The candidate URL does not expire; it just becomes unreachable. Because the candidate may have bookmarked the URL while sharing was on, toggling off does not erase any data they already downloaded.

#### Response body — `ShareResponse`

```json
{
  "interview_token": "abc123def456",
  "share_with_candidate": true,
  "updated_at": "2026-05-04T15:20:00"
}
```

| Field                  | Type     | Description                              |
|------------------------|----------|------------------------------------------|
| `interview_token`      | string   | Echo of the path parameter.              |
| `share_with_candidate` | boolean  | New value of the flag.                   |
| `updated_at`           | datetime | UTC timestamp of the update (server-generated). |

#### Status codes

| Code | Condition                                |
|------|------------------------------------------|
| 200  | Flag updated.                            |
| 401  | Missing or invalid `X-API-Key`.          |
| 404  | `interview_token` not found.             |
| 422  | Malformed request body.                  |

#### Example curl

```bash
# Enable sharing
curl -X PATCH \
  -H "X-API-Key: your-hr-api-key" \
  -H "Content-Type: application/json" \
  -d '{"share_with_candidate": true}' \
  "https://api.recrutetech.com/api/interviews/abc123def456/share"

# Disable sharing
curl -X PATCH \
  -H "X-API-Key: your-hr-api-key" \
  -H "Content-Type: application/json" \
  -d '{"share_with_candidate": false}' \
  "https://api.recrutetech.com/api/interviews/abc123def456/share"
```

---

## Candidate Endpoints

### GET /api/candidate/interviews/{interview_token}

Return a sanitised evaluation view to the candidate.

**Method:** `GET`
**Path:** `/api/candidate/interviews/{interview_token}`
**Auth:** None. The `interview_token` is the access credential.

#### Path parameters

| Parameter         | Type   | Description                                           |
|-------------------|--------|-------------------------------------------------------|
| `interview_token` | string | The `public_token` from the interview link the candidate received. |

#### Response body — `CandidateViewResponse`

```json
{
  "interview_token": "abc123def456",
  "language": "fr",
  "summary": "Vous avez démontré une bonne maîtrise des APIs REST et une approche structurée des problèmes.",
  "strengths": [
    "Maîtrise concrète des patterns asyncio en Python",
    "Approche méthodique lors du débogage du défi de code"
  ],
  "gaps": [
    "Expérience limitée sur les systèmes distribués à grande échelle"
  ],
  "candidate_letter": {
    "subject": "Vos retours suite à l'entretien Backend Senior",
    "body": "Bonjour,\n\nMerci pour le temps que vous avez consacré à cet entretien..."
  },
  "counterfactuals": [
    {
      "description": "Pour progresser en system design, pratiquez la conception de systèmes distribués.",
      "actionable_advice": "Explorez les patterns Saga et les stratégies de consensus distribué (ex. Raft)."
    }
  ],
  "recourse_available": true,
  "recourse_deadline_days": 7
}
```

| Field                  | Type                   | Description                                                                                                   |
|------------------------|------------------------|---------------------------------------------------------------------------------------------------------------|
| `interview_token`      | string                 | Echo of the path parameter.                                                                                   |
| `language`             | string or null         | `"fr"` or `"en"`. Language the candidate letter is written in.                                                |
| `summary`              | string or null         | 2-4 sentence overview written by Claude. Growth-framed, no score or recommendation.                          |
| `strengths`            | array of strings       | Concrete strengths observed during the interview.                                                             |
| `gaps`                 | array of strings       | Growth areas. No numeric scores or level labels.                                                              |
| `candidate_letter`     | object or null         | `{subject: string, body: string}`. The second-pass sanitized letter. See candidate letter schema below.       |
| `counterfactuals`      | array of objects       | `{description: string, actionable_advice: string \| null}`. Concrete growth suggestions per skill.            |
| `recourse_available`   | boolean                | Always `true`. Indicates the candidate may request human review within 7 days (RGPD Art. 22).                 |
| `recourse_deadline_days`| integer               | Always `7`. The deadline in days for requesting human recourse.                                               |

**Explicit whitelist — fields that are structurally absent from this response:**

- `overall_score` — HR-internal scoring detail
- `skill_scores` — HR-internal
- `skill_assessments` — HR-internal (contains rubric references and growth notes)
- `recommendation` / `hiring_recommendation` — hiring decision, strictly internal
- `evidence` / `evidence_pointers` — verbatim quotes; withheld pending a full contest-flow UX
- `stage_notes` — HR-internal observation log
- `report_integrity_hash` — internal audit field
- `evidence_verified` — internal quality flag

The response is built by an explicit Pydantic whitelist in `candidate.py`. Anything not listed in `CandidateViewResponse` is structurally unreachable, not just filtered at runtime.

#### 404 design: enumeration defense

When `share_with_candidate` is `False`, this endpoint returns **404**, not 403. The candidate
cannot distinguish "this token doesn't exist" from "sharing is disabled for this interview."
This prevents an attacker from using response codes to enumerate which interviews exist on the
platform. This is a deliberate RGPD mode-RH-only design.

#### Status codes

| Code | Condition                                                                              |
|------|----------------------------------------------------------------------------------------|
| 200  | Sharing is on and the report is available.                                             |
| 404  | Token not found, sharing is disabled, or no report generated yet.                      |
| 500  | Report JSON in the database is corrupt (temporary; retrying will not help until fixed). |

#### Example curl

```bash
curl "https://api.recrutetech.com/api/candidate/interviews/abc123def456"
```

---

### POST /api/candidate/interviews/{interview_token}/contest

Accept a candidate contest of their evaluation.

**Method:** `POST`
**Path:** `/api/candidate/interviews/{interview_token}/contest`
**Auth:** None. Gated by `interview_token`.
**Content-Type:** `application/json`

#### Path parameters

| Parameter         | Type   | Description               |
|-------------------|--------|---------------------------|
| `interview_token` | string | Interview `public_token`. |

#### Request body — `ContestRequest`

```json
{
  "reason": "Le résumé mentionne que je n'ai pas expliqué les transactions SQL, mais j'ai clairement abordé ce sujet à la 12ème minute.",
  "contact_email": "candidate@example.com"
}
```

| Field           | Type            | Required | Description                                                       |
|-----------------|-----------------|----------|-------------------------------------------------------------------|
| `reason`        | string          | yes      | The candidate's explanation of their concern.                     |
| `contact_email` | string or null  | no       | Optional. If provided, HR can use it for follow-up.               |

**RGPD note:** `reason` and `contact_email` are not logged above DEBUG level in production.
Structured log at INFO includes only `interview_id`, `has_reason: bool`, and
`has_contact_email: bool`.

**Share-flag gate:** this endpoint does NOT re-check `share_with_candidate`. If the candidate
received access to the explanation page and was previously shown their evaluation, their right
to contest must not be revocable by HR toggling the share flag off afterward. This implements
the RGPD Art. 22 right to contest as a non-revocable right.

**v1 persistence note:** in v1, the contest is logged only. There is no `ContestSubmission`
database table in this release. Full HR review queue routing is planned for a follow-up sprint.

#### Response body

```json
{
  "status": "received",
  "message": "Your contest has been received. An HR reviewer will respond within 7 days per our RGPD Art. 22 commitment."
}
```

#### Status codes

| Code | Condition                              |
|------|----------------------------------------|
| 202  | Contest accepted.                      |
| 404  | `interview_token` not found.           |
| 422  | Malformed request body.                |

#### Example curl

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Le résumé mentionne que je n'\''ai pas expliqué les transactions SQL, mais j'\''ai clairement abordé ce sujet à la 12ème minute.",
    "contact_email": "candidate@example.com"
  }' \
  "https://api.recrutetech.com/api/candidate/interviews/abc123def456/contest"
```

---

## v3 Evaluation Report Shape

The v3 report is the JSON object stored in `Interview.report_json` and returned inside
`InterviewDetail.report` from `GET /api/interviews/{token}`. The prompt version is
`EVALUATION_PROMPT_VERSION = "3.0.0"` defined in `backend/app/services/prompts/evaluation.py`.

17 top-level required fields:

| Field                 | Type              | Description                                                                                                       |
|-----------------------|-------------------|-------------------------------------------------------------------------------------------------------------------|
| `prompt_version`      | string            | Always `"3.0.0"`. Echoed by the model. Persisted for audit traceability.                                          |
| `rubric_version_label`| string            | Human-readable rubric label (e.g. `"Backend Senior v3"`). Echoed from the user message.                           |
| `language`            | enum `fr\|en`    | Language of the `candidate_letter` and all candidate-facing strings. Must equal `rubric.language_default`.         |
| `overall_score`       | float 0.0–10.0    | Weighted sum: `sum(skill_score * 2 * weight)`. One decimal precision.                                             |
| `skill_scores`        | object            | `{skill_id: float}`. Keys are `rubric.skills[*].id` (snake_case). Values in 0.0–5.0, one decimal.                |
| `skill_assessments`   | array             | One entry per rubric skill. See skill assessment item schema below.                                               |
| `evidence`            | array             | Evidence pointers. See evidence pointer schema below. May be empty only if transcript is genuinely empty.         |
| `counterfactuals`     | array             | Growth suggestions per skill below target seniority. See counterfactuals schema below.                            |
| `model_version`       | object            | Auditability block. See model_version schema below.                                                               |
| `summary`             | string            | 2-4 sentence HR-facing summary. Evidence-anchored. Not softened.                                                  |
| `strengths`           | array of strings  | Concrete strengths with examples from the transcript.                                                             |
| `gaps`                | array of strings  | Concrete weaknesses. Each gap maps to a `counterfactuals` entry.                                                  |
| `stage_notes`         | array             | One entry per stage in `rubric.stages`. `{stage_id: string, observation: string}`.                                |
| `communication`       | string            | Clarity, structure, articulation of trade-offs. Does not score accent or L2 fluency.                              |
| `engagement`          | string            | Soft observation only. Visual signals weighted lightly. Never the dominant evaluation signal.                     |
| `recommendation`      | enum              | `strong_yes \| yes \| maybe \| no \| strong_no`. Maps roughly from `overall_score` bands; see scoring bands below. |
| `candidate_letter`    | object            | `{subject: string, body: string}`. Candidate-facing. See candidate letter constraints below.                       |

**Recommendation scoring bands:**

| overall_score | recommendation  |
|---------------|-----------------|
| >= 8.5        | `strong_yes`    |
| 7.0 – 8.4     | `yes`           |
| 5.5 – 6.9     | `maybe`         |
| 3.5 – 5.4     | `no`            |
| < 3.5         | `strong_no`     |

Note: `strong_no` does not auto-reject. All flags route to a human reviewer per RecruteTech policy.

**Skill assessment item:**

| Field           | Type   | Description                                                                                              |
|-----------------|--------|----------------------------------------------------------------------------------------------------------|
| `skill_id`      | string | Must match a `rubric.skills[*].id`.                                                                      |
| `score`         | float  | 0.0–5.0.                                                                                                 |
| `matched_level` | enum   | `below_junior \| junior \| mid \| senior \| staff`. The rubric level the candidate's performance matched. |
| `notes`         | string | 1-3 sentences. Includes an inline counterfactual growth sentence (backwards-tooling).                    |

---

## Evidence Pointer Schema

Each item in the `evidence` array is a structured pointer tracing a score back to a specific
moment in the interview.

| Field               | Type    | Required | Description                                                                                   |
|---------------------|---------|----------|-----------------------------------------------------------------------------------------------|
| `claim`             | string  | yes      | 1-sentence assertion about the candidate (HR-facing wording). Min 5 chars.                    |
| `supports_skill`    | string  | yes      | Must exactly equal a `rubric.skills[*].id`.                                                   |
| `score_contribution`| float   | yes      | How much this evidence shifts the skill score. Range -2.0 to +2.0. Negative = weak signal.   |
| `evidence_type`     | enum    | yes      | Exactly one of `"transcript"`, `"code"`, `"visual"`.                                          |
| `timestamp_seconds` | integer | yes      | Second offset into the interview where the evidence appears. >= 0.                            |
| `quote`             | string  | cond.    | **Required when `evidence_type == "transcript"`**. Verbatim from the candidate's turns. Min 5 chars. Must be verifiable as a substring of the stored transcript. |
| `details`           | string  | cond.    | **Required when `evidence_type == "code"` or `"visual"`**. Describes the code artifact (function name + line range) or visual signal (e.g. "eye_contact_ratio dropped to 0.31 during stage 3"). |

**XOR rule:** exactly one of `quote` or `details` must be present per item, determined by
`evidence_type`. If `evidence_type == "transcript"`, set `quote` and omit `details`.
Otherwise, set `details` and omit `quote`.

**Verification:** `report_service.verify_evidence_pointers()` checks that every
`evidence_type == "transcript"` item has a `quote` that is a verbatim substring of the stored
transcript (whitespace-collapsed on both sides before comparison). The result is stored as
`report.evidence_verified: bool`. The `audit-trail` response includes the raw `transcript_json`
so auditors can run the same check independently.

**Protected attribute restriction:** the evaluation prompt explicitly forbids using any of 12
protected attributes (age, marital status, religion, country of origin, race, ethnicity, accent,
facial expressions, physical appearance, gender, disability, school name) in `claim`, `quote`,
or `details`. A post-generation audit scan verifies this. See `EVALUATION_SYSTEM_PROMPT` section 4.

---

## Counterfactuals Schema

Each item in the `counterfactuals` array surfaces, for a skill that scored below the target
seniority, what the candidate would need to demonstrate to reach the next level.

| Field               | Type   | Description                                                                                       |
|---------------------|--------|---------------------------------------------------------------------------------------------------|
| `skill_id`          | string | Must match a `rubric.skills[*].id`.                                                               |
| `current_level`     | enum   | `junior \| mid \| senior \| staff`. The level the candidate's performance matched.                |
| `target_level`      | enum   | `junior \| mid \| senior \| staff`. Usually `current_level + 1`. Must not be lower than `current_level`. |
| `gap_description`   | string | What is concretely missing, anchored in the rubric's `level_descriptors`. Min 10 chars.           |
| `actionable_advice` | string | 1-2 sentences. Constructive and growth-mindset. No protected-attribute references. Min 10 chars.  |

Counterfactuals are the canonical source of truth for the candidate-facing "To grow further"
section. The inline growth notes inside `skill_assessments[].notes` duplicate this signal for
backwards tooling but the top-level array takes precedence.

---

## Integrity Hash Verification

The `report_integrity_hash` is a SHA-256 hex digest that allows an external auditor to verify
that a report was not altered after generation.

### Canonical procedure

Reproduced verbatim from `compute_integrity_hash` in `backend/app/services/report_service.py`:

1. Take the eight inputs in this exact order:
   - `transcript_json` — the raw `Interview.transcript_json` string (may be null)
   - `visual_metrics_json` — the raw `Interview.visual_metrics_json` string (may be null)
   - `rubric_id` — integer or null
   - `rubric_version` — integer or null
   - `prompt_version` — string
   - `evaluator_model` — string
   - `report_json` — the report dict **with the `report_integrity_hash` key stripped**
   - `overrides` — list of override dicts (empty list `[]` at initial generation time)

2. Encode each input independently using:
   ```python
   json.dumps(value, sort_keys=True, ensure_ascii=False)
   ```

3. Join the eight encoded strings with a literal null byte (`\x00`, not the string `"\\x00"`).

4. Compute SHA-256 of the resulting UTF-8 bytes:
   ```python
   hashlib.sha256(canonical.encode("utf-8")).hexdigest()
   ```

5. The resulting hex digest must equal `report_integrity_hash`.

### Python reference implementation

```python
import hashlib, json

def verify_hash(audit_trail: dict) -> bool:
    NULL = "\x00"

    def enc(obj):
        return json.dumps(obj, sort_keys=True, ensure_ascii=False)

    # Strip the hash key from report_json before encoding
    report_clean = {k: v for k, v in (audit_trail["report_json"] or {}).items()
                    if k != "report_integrity_hash"}

    components = [
        enc(audit_trail["transcript_json"]),
        enc(audit_trail["visual_metrics_json"]),
        enc(audit_trail["rubric_id"]),
        enc(audit_trail["rubric_version"]),
        enc(audit_trail["prompt_version"]),
        enc(audit_trail["evaluator_model"]),
        enc(report_clean),
        enc(audit_trail["overrides"]),
    ]

    canonical = NULL.join(components)
    computed = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return computed == audit_trail["report_integrity_hash"]
```

### What the hash covers and does not cover

**Covers:** the report body, the transcript, the visual metrics, the rubric version, the prompt
version, the evaluator model, and the full override history at the time of hashing. Any change
to any of these after the hash was written will produce a different digest.

**Does not cover:** the correctness of the model's evaluation (the hash certifies the report
was not tampered with after generation, not that the model evaluated correctly). Bias audits
and rubric differentiation tests address evaluation quality separately.

**Re-hashing on override:** each call to `POST /override` recomputes the hash over the full
override history (including the new row) and writes the updated hash back to
`Interview.report_integrity_hash`. The audit-trail endpoint always returns the current hash
and the current override list, so an auditor verifying the hash must use the override list
from the audit-trail response, not a snapshot from an earlier point.

---

## Override Audit Semantics

Overrides are stored in the `EvaluationOverride` table with the following guarantees:

- **Append-only:** rows are never updated or deleted. A second override of the same
  `(interview_id, skill_id)` pair creates a new row rather than modifying the first.
- **Latest wins for display:** when the HR dashboard or integrators want the "current"
  effective score for a skill, they use the most recent `EvaluationOverride` row for that
  `(interview_id, skill_id)` pair ordered by `created_at DESC`.
- **Full history retained:** the audit-trail endpoint returns all override rows in
  chronological order. External auditors see every correction ever made.
- **Original report immutable:** `Interview.report_json` is never mutated by an override.
  Claude's original evaluation is permanently traceable at the DB level.
- **Composite index:** `ix_evaluationoverride_interview_skill` on `(interview_id, skill_id)`
  supports the "latest override wins" query pattern efficiently.

---

## Prompt Versioning

| Constant                       | Value     | File                                                |
|--------------------------------|-----------|-----------------------------------------------------|
| `EVALUATION_PROMPT_VERSION`    | `"3.0.0"` | `backend/app/services/prompts/evaluation.py`        |
| `CANDIDATE_LETTER_PROMPT_VERSION` | `"1.0.0"` | `backend/app/services/prompts/candidate_letter.py` |

Both version strings are echoed inside the report JSON at generation time
(`report_json.prompt_version` for the evaluation; `report_json.scrubbed_fields` carries the
letter version context). Prompt version is included in the integrity hash computation via the
`prompt_version` field, so a prompt upgrade produces a different hash.

The `model_version` block in every v3 report:

```json
{
  "model_version": {
    "evaluator_model": "claude-opus-4-7",
    "rubric_version": "Backend Senior v3",
    "prompt_version": "3.0.0",
    "evaluated_at": "2026-05-04T14:32:00Z"
  }
}
```

This block is also visible to HR in the `TransparencyPanel` ("Evaluation model version" footer).
