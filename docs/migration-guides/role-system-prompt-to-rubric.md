# Migration guide: Role.system_prompt to structured rubric

Audience: HR admin lead and engineering.

This document describes how to migrate existing roles from the legacy free-text `system_prompt` field to the structured `Rubric` model introduced by the `structured-rubric-builder` skill.

---

## Phase 1 (now): coexistence

Both `Role.system_prompt` (legacy) and `Rubric` (structured) are active simultaneously. The interview service checks for an active rubric at interview creation time:

- If `rubric_version_used_id` is set on an `Interview` row, the structured rubric path is used (Aria prompt built from `rubric_json`, Claude evaluation parameterised by the rubric).
- If no active rubric exists for the role, the interview falls back to the legacy `system_prompt` path. The resulting `Interview.report_json` will carry `prompt_version="1.0.0-legacy"` for traceability.

New roles **should** be created with a rubric from the start. Existing roles continue with their `system_prompt` until an active rubric is created and activated for them. There is no deadline in this phase; see Phase 2 below.

The `Role.system_prompt` field is annotated in the model with a comment noting the planned 6-month sunset. Do not remove it during this phase.

---

## Step 0 — apply the schema migration

Production deployments **must** apply Alembic migration `0002_rubric` (`alembic upgrade head`). The inline SQLite shortcut in `backend/app/db.py` adds the `interview.rubric_version_used_id` column on existing dev DBs but does not run for the `rubric` table itself; if you have a pre-rubric SQLite DB locally, either run `alembic upgrade head` or delete the dev DB and let the app recreate it.

---

## The backfill script

The backfill script creates a draft `v1` rubric stub for every existing `Role` that does not yet have any rubric row. It is idempotent: roles that already have a rubric (any version) are skipped.

**Step 1 — Preview without writing.**

From the `backend/` directory:

```bash
python -m app.scripts.backfill_rubrics --dry-run
```

Sample output:

```
  DRY   role id=1 title='Senior Backend Engineer' — would create Rubric(version=1, is_active=False, name='Senior Backend Engineer v1 (draft)')
  DRY   role id=2 title='Frontend Mid' — would create Rubric(version=1, is_active=False, name='Frontend Mid v1 (draft)')
  SKIP  role id=3 title='Data Engineer' — already has rubric v2

DRY RUN — Summary: 2 rubric(s) would be created, 1 skipped (already had a rubric).
Run without --dry-run to commit.
```

**Step 2 — Commit.**

```bash
python -m app.scripts.backfill_rubrics
```

What the script creates per role:

- `version = 1`, `is_active = False` (never auto-activated)
- `name = "{role.title} v1 (draft)"`
- `created_by = "system:backfill"`
- `rubric_json` contains: `role_title`, `seniority`, `language_default`, `duration_target_minutes`, mandatory exclusions pre-populated, and **empty `skills` and `stages` arrays**. The skills and stages must be completed by HR before the rubric can be tested and activated.
- `_stub: true` flag in `rubric_json` — the service layer uses this to detect unparsed stubs.

The script does **not** parse the existing `system_prompt` into skills. That capability (calling Claude to suggest a structured rubric from the free-text prompt) is a planned enhancement in `rubric_service.parse_system_prompt_to_rubric()` and is not yet implemented.

---

## Per-role migration steps

For each role that was backfilled (or for any role where you want to move to the structured path):

**1. Run the backfill** (or create from scratch in the wizard for new roles).

```bash
python -m app.scripts.backfill_rubrics
```

**2. HR opens the draft in the wizard.**

Navigate to **Roles → [role name] → Rubrics**. The v1 draft appears with a "Not tested" badge. Click **View** then re-open in edit mode (or clone it if it already has `is_active=False` and you want to start fresh).

Complete the missing fields:
- Add 1–8 skills with weights summing to 100%.
- Write level descriptors for at least junior, mid, and senior on every skill.
- Add interview stages with durations that fit within the role's `duration_minutes`.
- Review the exclusions (mandatory items are already present).

For step-by-step instructions on filling in the wizard, see the [HR rubric builder guide](../hr-guides/rubric-builder.en.md).

**3. Run the synthetic calibration test.**

In the wizard's step 5, click **Run test**. The system simulates junior, mid, and senior candidates.

- If the test passes (`senior_score - junior_score >= 1.5`): proceed to activation.
- If the test fails: go back to step 2 and sharpen the level descriptors. Re-run the test.

**4. Activate the rubric.**

Click **Activate** in step 5 (only available after a passing test). From this point, all new interviews on this role will use the structured rubric path. Interviews created before activation are unaffected.

---

## Verifying the cutover

An interview created **after** rubric activation has `rubric_version_used_id` set to the activated rubric's primary key. An interview created **before** activation has `rubric_version_used_id = NULL`.

To check migration status for a role (replace `42` with the actual role id):

```sql
-- Interviews using structured rubric path
SELECT id, created_at, rubric_version_used_id
FROM interview
WHERE role_id = 42
  AND rubric_version_used_id IS NOT NULL
ORDER BY created_at DESC;

-- Interviews on the legacy path (rubric_version_used_id is NULL)
SELECT id, created_at
FROM interview
WHERE role_id = 42
  AND rubric_version_used_id IS NULL
ORDER BY created_at DESC;
```

To check which roles still have no active rubric:

```sql
SELECT r.id, r.title
FROM role r
WHERE NOT EXISTS (
    SELECT 1 FROM rubric rb
    WHERE rb.role_id = r.id AND rb.is_active = true
);
```

---

## Phase 2 (~3 months): mandatory rubric for new roles

In this planned phase, the UI will block creating a new `Role` without simultaneously starting a rubric. The backend will add a validation check in the role creation endpoint. Legacy roles created before Phase 2 will be unaffected.

This phase is **not yet implemented**. The timeline is approximately 3 months after the `structured-rubric-builder` skill goes to production.

---

## Phase 3 (~6 months): sunset of Role.system_prompt

In this planned phase, `Role.system_prompt` will be deprecated and eventually removed from the schema. All remaining roles using the legacy path will need to have an active rubric before this date.

The 6-month window is deliberately generous to give HR teams time to review and activate rubrics for all existing roles. The specific deprecation date will be communicated with at least 60 days' notice.

This phase is **out of scope for the current implementation**. The `system_prompt` field is kept in `models.py` with a comment marking the planned sunset.

---

## Audit and RGPD note

Every evaluation produced under a structured rubric is reproducible from the triple `(rubric_version_used_id, transcript_json, visual_metrics_json)`. The rubric row is immutable (append-only), so the exact evaluation context is preserved indefinitely.

Legacy evaluations (before the rubric feature) have `prompt_version="1.0.0-legacy"` persisted in `report_json`. This marker satisfies RGPD Article 22 traceability: any automated evaluation can be traced back to the exact prompt version that produced it.

For prompt version constants, see the [Rubrics API reference — Prompt versioning](../api/rubrics.md#prompt-versioning).

---

## Rollback

If activating a rubric causes problems (Aria behaving unexpectedly, Claude scoring inconsistently), deactivating it reverts the role to the legacy `system_prompt` path automatically. No data is lost; the rubric row is immutable and preserved.

To deactivate via direct DB update (emergency use only; prefer using the UI or API):

```sql
UPDATE rubric SET is_active = false WHERE id = <rubric_id>;
```

Verify the rollback:

```sql
SELECT id, version, is_active FROM rubric WHERE role_id = <role_id>;
-- All rows should now have is_active = false for this role.
```

After rollback, the next interview for this role will use `Role.system_prompt` again (the legacy path). The interviews already completed under the rubric are unaffected; their `rubric_version_used_id` is set and their reports remain valid.
