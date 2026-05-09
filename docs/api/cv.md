# CV Adaptive Personalization — API Reference

Audience: backend developers, ATS integrators, internal tools.

These endpoints are part of the `cv-adaptive-personalization` skill (Wave 1, P0).
They are registered under `backend/app/api/cv.py` and mounted at the `/api/interviews` prefix.

Cross-references:
- Candidate consent copy: [`docs/candidate-consent/cv-personalization.md`](../candidate-consent/cv-personalization.md)
- Retention runbook: [`docs/operations/cv-retention.md`](../operations/cv-retention.md)

---

## Authentication

All three endpoints are **unauthenticated**. They use the opaque `interview public_token`
(a UUID issued by `POST /api/screenings/{role_token}/start`) as the access credential.
This is consistent with the rest of the candidate-facing screening flow.

---

## Endpoints

### POST /api/interviews/{token}/cv

Upload a CV file (multipart/form-data).

**Method:** `POST`
**Path:** `/api/interviews/{token}/cv`
**Content-Type:** `multipart/form-data`

#### Path parameters

| Parameter | Type   | Description                          |
|-----------|--------|--------------------------------------|
| `token`   | string | Interview `public_token` (UUID).     |

#### Form fields

| Field                  | Type    | Required | Description                                              |
|------------------------|---------|----------|----------------------------------------------------------|
| `file`                 | file    | yes      | The CV file. Accepted extensions: `.pdf`, `.docx`, `.txt`. Max 5 MB at the frontend layer; backend caps extracted text at 50,000 chars. |
| `consent_processing`   | boolean | yes      | Must be `true`. Article 9 RGPD explicit consent for AI processing of the CV. |

#### Response body — `CVUploadResponse`

```json
{
  "ok": true,
  "redactions_applied": ["date_of_birth", "city"],
  "preview": "# Candidate context\nName: Marc Diallo\nInferred seniority: senior (7 yrs)\n...",
  "parsing_status": "ok",
  "error_summary": null
}
```

| Field                | Type             | Description                                                                                       |
|----------------------|------------------|---------------------------------------------------------------------------------------------------|
| `ok`                 | boolean          | Always `true` on a 200 response.                                                                  |
| `redactions_applied` | array of strings | Protected attributes the Claude parser encountered and stripped (e.g. `"date_of_birth"`, `"city"`). Empty list if nothing was redacted. |
| `preview`            | string or null   | First 200 characters of the composed personalized prompt. `null` if parsing failed or produced no result. |
| `parsing_status`     | string           | `"ok"` if Claude parsing succeeded, `"failed"` if it did not. A `"failed"` status is still a 200 — the CV text is stored and the candidate proceeds normally. |
| `error_summary`      | string or null   | Short human-readable error detail when `parsing_status` is `"failed"`. `null` otherwise.         |

#### Status codes

| Code | Condition                                                                 |
|------|---------------------------------------------------------------------------|
| 200  | Success (including best-effort failures where `parsing_status: "failed"`). |
| 404  | `token` does not match any interview.                                     |
| 409  | Interview status is `"completed"` — CV upload is no longer accepted.     |
| 422  | `consent_processing` is `false` or missing; or the uploaded file has an unsupported extension; or the extracted text exceeds 50,000 chars. |
| 5xx  | Unhandled server error. Note: Claude API errors are caught and returned as 200 with `parsing_status: "failed"`, not as 5xx. |

#### Example curl

```bash
curl -X POST "https://api.recrutetech.com/api/interviews/3f7a9c12-…/cv" \
  -F "file=@marc_diallo_cv.pdf" \
  -F "consent_processing=true"
```

---

### POST /api/interviews/{token}/cv/text

Upload CV as pasted plain text (application/json).

**Method:** `POST`
**Path:** `/api/interviews/{token}/cv/text`
**Content-Type:** `application/json`

#### Path parameters

| Parameter | Type   | Description                      |
|-----------|--------|----------------------------------|
| `token`   | string | Interview `public_token` (UUID). |

#### Request body — `CVTextRequest`

```json
{
  "text": "Marc Diallo - Senior Backend Engineer\n7 years Python/FastAPI...",
  "consent_processing": true
}
```

| Field                | Type    | Required | Constraints                                     |
|----------------------|---------|----------|-------------------------------------------------|
| `text`               | string  | yes      | Raw CV text (LinkedIn paste, manual entry). Must be non-empty after trimming. Max 50,000 chars. |
| `consent_processing` | boolean | yes      | Must be `true`. Article 9 RGPD explicit consent. |

#### Response body

Same `CVUploadResponse` shape as the file upload endpoint above.

#### Status codes

| Code | Condition                                                              |
|------|------------------------------------------------------------------------|
| 200  | Success (including best-effort failures).                              |
| 404  | `token` does not match any interview.                                  |
| 409  | Interview already completed.                                           |
| 422  | `consent_processing` is `false`; or `text` is empty after trimming; or `text` exceeds 50,000 chars. |

#### Example curl

```bash
curl -X POST "https://api.recrutetech.com/api/interviews/3f7a9c12-…/cv/text" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Marc Diallo - Senior Backend Engineer\n7 years Python/FastAPI at fintech scale...",
    "consent_processing": true
  }'
```

---

### GET /api/interviews/{token}/cv-parsed

Return the structured parsed CV for an interview.

**Method:** `GET`
**Path:** `/api/interviews/{token}/cv-parsed`

#### Path parameters

| Parameter | Type   | Description                      |
|-----------|--------|----------------------------------|
| `token`   | string | Interview `public_token` (UUID). |

#### Response body — `CVParsedResponse`

When a parsed CV is available:

```json
{
  "available": true,
  "parsed": {
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
}
```

When no CV has been parsed yet (or JSON is corrupt in the DB):

```json
{
  "available": false,
  "parsed": null
}
```

#### Status codes

| Code | Condition                                    |
|------|----------------------------------------------|
| 200  | Always returned (even when `available: false`). |
| 404  | `token` does not match any interview.        |

#### Example curl

```bash
curl "https://api.recrutetech.com/api/interviews/3f7a9c12-…/cv-parsed"
```

---

## CVParsedSchema — field reference

`CVParsedSchema` is the structured document produced by Claude Opus 4.7 via tool_use
and persisted as JSON in `Interview.cv_parsed_json`. It has 12 required fields.

| Field                       | Type                                                                 | Description                                                                                                  |
|-----------------------------|----------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| `candidate_name`            | string (max 100)                                                     | First + last name only. Used by Aria for the interview greeting. Never used for evaluation.                 |
| `years_of_experience`       | integer (0–60)                                                       | Total years across all professional roles (intern + full-time + contract). Conservative if ambiguous.       |
| `seniority_inferred`        | enum: `"junior"`, `"mid"`, `"senior"`, `"staff"`, `"principal"`     | Inferred from years + scope signals + role titles. Never from age or graduation year.                        |
| `primary_stack`             | array of strings (max 5 items)                                       | Top 3–5 technologies the candidate is fluent in, used in their main projects. Canonical capitalization.     |
| `secondary_stack`           | array of strings (max 15 items)                                      | Additional technologies mentioned but not central. Empty list if none.                                       |
| `domains`                   | array of strings (max 8 items)                                       | Business/problem domains (e.g. `"fintech"`, `"fraud detection"`, `"real-time data"`).                       |
| `notable_projects`          | array of `NotableProject` (max 5 items)                              | Up to 5 most personalization-relevant projects. See sub-fields below.                                        |
| `potential_red_flags`       | array of strings (max 6 items)                                       | Factual, neutral observations: gaps, frequent job changes, inflated claims. Protected attributes never appear here. Empty list is preferred when nothing notable. |
| `suggested_deep_dive_topics`| array of strings (max 5 items)                                       | 3–5 specific, grounded follow-up topics for Aria to use as follow-ups. Grounded in actual projects.         |
| `language_signals`          | enum: `"french_only"`, `"english_only"`, `"both"`, `"unknown"`      | Inferred from the CV language and explicit "Languages" section. Never inferred from name or country.         |
| `prompt_version`            | string                                                               | Echoed from `PROMPT_VERSION` in `cv_parsing.py`. Enables audit traceability — see section below.            |
| `redactions_applied`        | array of strings (max 30 items)                                      | Snake_case keys of protected attributes the parser encountered and stripped (e.g. `"date_of_birth"`, `"university_name"`, `"religion"`). Empty list if the CV had nothing to redact. Used by the bias audit. |

**`NotableProject` sub-fields:**

| Field             | Type                           | Description                                                               |
|-------------------|--------------------------------|---------------------------------------------------------------------------|
| `title`           | string (max 200)               | Short descriptive project title. Never includes the employer's location or candidate's school. |
| `tech`            | array of strings (max 10)      | Technologies actually used in this project.                               |
| `scale_signals`   | array of strings (max 6)       | Concrete numbers: throughput, latency, ARR, team size, data volume. Empty if the CV has no numbers — never invented. |
| `role`            | string (max 200)               | Candidate's role on the project.                                          |
| `duration_months` | integer (0–600)                | Project duration in months. 0 if unclear.                                 |

---

## Phase 1 silent rollout

The `CV_PERSONALIZATION_INJECT` feature flag in `app/core/config.py` controls whether the
composed personalized prompt is actually injected into the ElevenLabs agent override.

| Flag value | Behavior                                                                                               |
|------------|--------------------------------------------------------------------------------------------------------|
| `False` (default) | `personalized_prompt` is **computed and persisted** to `Interview.personalized_prompt`, but is **NOT** injected into the ElevenLabs `overrides.agent.prompt.prompt` at session start. This is Phase 1. |
| `True`     | Phase 2. Intended injection point is in `screenings.py` `start_screening()`. The `CV_PERSONALIZATION_INJECT` branch is scaffolded there but requires a flow restructure (see note). |

**Phase 2 flow restructure note:** The current `start_screening` flow creates the Interview
row and immediately fetches a signed URL. The CV upload happens after this step (the candidate
submits their CV on the pre-interview screen). For the personalized prompt to be injected at
session start, Phase 2 will require splitting the flow into: (1) create-pending interview,
(2) upload CV and generate personalized prompt, (3) fetch signed URL with overrides.
This restructure is not blocking Phase 1 and is tracked in `screenings.py` comments.

---

## Prompt versioning

`CV_PARSING_PROMPT_VERSION = "1.0.0"` is defined in `backend/app/services/prompts/cv_parsing.py`
and echoed as the `prompt_version` field inside every `cv_parsed_json` document stored in the DB.

This means every CV parse is auditable: you can determine exactly which prompt produced a given
`cv_parsed_json` row. This supports RGPD Art. 22 (right to explanation) — an auditor can
reproduce the exact extraction context for any interview.

To introduce a new prompt version, bump `PROMPT_VERSION` in `cv_parsing.py`. Existing rows
retain their original `prompt_version` value — no migration needed.
