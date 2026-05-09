# CV Retention — Ops Runbook

Audience: ops engineers, HR admins, compliance officers.

This runbook covers the 90-day CV data retention policy for the
`cv-adaptive-personalization` skill and the operational steps required to
maintain it.

Cross-references:
- API reference: [`docs/api/cv.md`](../api/cv.md)
- Candidate consent text: [`docs/candidate-consent/cv-personalization.md`](../candidate-consent/cv-personalization.md)

---

## Retention policy

When a candidate uploads a CV, the following PII fields are written to the
`Interview` table:

| Field                 | Content                                              | Retention        |
|-----------------------|------------------------------------------------------|------------------|
| `cv_text`             | Raw CV text as submitted.                            | 90 days from `cv_received_at`, then NULL. |
| `cv_parsed_json`      | Structured `CVParsedSchema` JSON from Claude.        | 90 days from `cv_received_at`, then NULL. |
| `personalized_prompt` | Aria system prompt embedding candidate details.      | 90 days from `cv_received_at`, then NULL. |
| `cv_consent_processing` | Boolean consent record.                           | Kept indefinitely (non-PII audit trail). |
| `cv_received_at`      | Timestamp when the CV was submitted.                 | Kept indefinitely (retention window anchor). |

RGPD basis: Article 5(1)(e) — storage limitation.

The retention period of 90 days is consistent with the existing
`candidate_name` / `candidate_email` 90-day retention policy on `Interview`.

---

## The purge script

**Script:** `backend/app/scripts/purge_expired_cv_text.py`

The script selects Interview rows where:
- `cv_received_at` is not NULL, and
- `cv_received_at` is older than 90 days from the current UTC time.

For each eligible row that has not already been purged (at least one of
`cv_text`, `cv_parsed_json`, or `personalized_prompt` is not NULL), it sets
all three fields to NULL and commits.

**The script is idempotent.** Already-purged rows are counted in
`total_eligible` but not rewritten. Safe to re-run at any frequency.

### Running in dry-run mode (preview only, no writes)

```bash
python -m app.scripts.purge_expired_cv_text --dry-run
```

Output example:

```
  DRY   interview id=42 token='3f7a9c12-…' cv_received_at=datetime.datetime(2025, 1, 15, 9, 3, 7) — would purge cv_text, cv_parsed_json, personalized_prompt
  DRY   interview id=87 token='a1b2c3d4-…' cv_received_at=datetime.datetime(2025, 1, 22, 14, 30, 0) — would purge cv_text, cv_parsed_json, personalized_prompt

DRY RUN — purged=2 skipped=1 total_eligible=3
Run without --dry-run to commit.
```

### Running a live purge

```bash
python -m app.scripts.purge_expired_cv_text
```

Output example:

```
  PURGE interview id=42 token='3f7a9c12-…' cv_received_at=datetime.datetime(2025, 1, 15, 9, 3, 7)
  PURGE interview id=87 token='a1b2c3d4-…' cv_received_at=datetime.datetime(2025, 1, 22, 14, 30, 0)

purged=2 skipped=1 total_eligible=3
```

---

## Scheduling

**A daily scheduled run is REQUIRED before processing real candidates in
production. The script itself is callable; the schedule is an operational
responsibility. Wire this BEFORE your first live candidate session.**

Recommended options:

**cron (Linux/macOS):**
```
0 4 * * * cd /app && python -m app.scripts.purge_expired_cv_text >> /var/log/cv_purge.log 2>&1
```

**Kubernetes CronJob:**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cv-purge
spec:
  schedule: "0 4 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: cv-purge
              image: <your-backend-image>
              command: ["python", "-m", "app.scripts.purge_expired_cv_text"]
          restartPolicy: OnFailure
```

**GitHub Actions (if running on a managed runner with DB access):**
```yaml
on:
  schedule:
    - cron: "0 4 * * *"
jobs:
  cv-purge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: python -m app.scripts.purge_expired_cv_text
```

Recommended schedule: **daily at 04:00 UTC**.

Confirm the schedule is active before going live. After the first scheduled run,
verify by running `--dry-run` and checking that rows older than 90 days show
`cv_text = NULL` in the database.

---

## Phase 1 silent to Phase 2 inject — operational checklist

Phase 1 (current): `CV_PERSONALIZATION_INJECT=False` — the personalized prompt
is computed and stored but NOT sent to ElevenLabs at session start.

Phase 2: `CV_PERSONALIZATION_INJECT=True` — the personalized prompt is injected
into the ElevenLabs agent override, tailoring Aria's questions to the candidate's CV.

Complete this checklist in order before flipping the flag:

1. **Validate Phase 1 parse quality.**
   Review `cv_parsed_json` across at least 100 Phase 1 interviews.
   - Aggregate `redactions_applied` fields. Check that protected attributes
     (date_of_birth, university_name, city, gender, religion, etc.) are being
     consistently redacted and do not appear in `notable_projects`,
     `suggested_deep_dive_topics`, or `potential_red_flags`.
   - Scan `cv_text` values for obvious prompt-injection attempts
     (e.g. "Ignore all previous instructions"). If found, review and harden
     the system prompt in `cv_parsing.py` before proceeding.
   - Check `parsing_status` distribution. If more than 5% of parses return
     `"failed"`, investigate before proceeding.

2. **Run a security re-audit.**
   Use `/audit-skill cv-adaptive-personalization` or engage the
   `security-compliance-auditor` agent. Confirm that no protected attribute
   leaks from `cv_parsed_json` into `personalized_prompt` on any test case.

3. **Confirm the purge schedule is running.**
   Run the following query and confirm that all rows with
   `cv_received_at < now() - interval '90 days'` have `cv_text IS NULL`:

   ```sql
   SELECT id, public_token, cv_received_at, cv_text IS NULL AS purged
   FROM interview
   WHERE cv_received_at < NOW() - INTERVAL '90 days'
   ORDER BY cv_received_at ASC
   LIMIT 50;
   ```

   If any rows show `purged = false`, the scheduled purge is not running.
   Do not proceed until this is resolved.

4. **Flip the flag.**
   In your environment config (`.env` or secrets manager):

   ```
   CV_PERSONALIZATION_INJECT=True
   ```

   Restart the backend. Verify with a test interview that `personalized_prompt`
   content is reflected in the live Aria conversation.

5. **Phase 2 flow restructure — known follow-up (not blocking this checklist).**
   At the time of writing, `screenings.py` `start_screening()` creates the
   Interview row and immediately fetches the ElevenLabs signed URL. The CV is
   uploaded after this step on the pre-interview screen.

   With `CV_PERSONALIZATION_INJECT=True`, the current code logs
   `"Phase 2 flow restructure required"` but does not yet inject the prompt
   because the Interview has no CV at session-start time. A flow restructure is
   required to fully activate Phase 2:
   (1) create a pending Interview row,
   (2) upload CV and generate the personalized prompt,
   (3) only then fetch the signed URL and include the prompt in the ElevenLabs
   overrides.

   This restructure is tracked in `screenings.py` comments. Document it as a
   separate engineering task before announcing Phase 2 to HR users.

---

## Manual erasure — RGPD Art. 17 (right to be forgotten)

When a candidate submits a RGPD Art. 17 erasure request for their CV data,
follow these steps:

1. Locate the interview by candidate email or public token. Example query:

   ```sql
   SELECT id, public_token, candidate_name, candidate_email,
          cv_received_at,
          cv_text IS NOT NULL AS has_cv_text,
          cv_parsed_json IS NOT NULL AS has_parsed,
          personalized_prompt IS NOT NULL AS has_prompt
   FROM interview
   WHERE candidate_email = 'candidate@example.com'
   ORDER BY started_at DESC;
   ```

2. NULL out the four PII fields for the matching row(s):

   ```sql
   UPDATE interview
   SET cv_text             = NULL,
       cv_parsed_json      = NULL,
       personalized_prompt = NULL
   WHERE candidate_email = 'candidate@example.com'
     AND cv_text IS NOT NULL;
   ```

   **Warning:** confirm the `WHERE` clause targets only the intended rows
   before running. Use a transaction if your database client supports it:

   ```sql
   BEGIN;
   UPDATE interview
   SET cv_text             = NULL,
       cv_parsed_json      = NULL,
       personalized_prompt = NULL
   WHERE candidate_email = 'candidate@example.com'
     AND cv_text IS NOT NULL;
   -- Inspect the row count shown, then:
   COMMIT; -- or ROLLBACK; if unexpected
   ```

3. `cv_consent_processing` and `cv_received_at` are retained as a non-PII
   audit record of the consent event. These fields are not erased by an
   Art. 17 request under RGPD recital 65 (legal obligation / legitimate
   interest for compliance documentation).

4. Confirm erasure to the candidate in writing. Send a brief email confirming
   that the CV text and all derived data have been deleted, and that the
   interview record (scores, transcript, evaluation) remains unless a separate
   full erasure of the interview is requested.

5. Log the erasure action in your compliance log with: timestamp, operator ID,
   interview IDs affected, and the Art. 17 request reference.
