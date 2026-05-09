# Security & Compliance Review — structured-rubric-builder

**Date:** 2026-05-06
**Auditor:** security-compliance-auditor (Claude)
**Verdict:** APPROVED_WITH_CONDITIONS

The skill is structurally sound. Defense-in-depth on the protected-attribute exclusion chain holds at every layer (DB shape, service, API, prompts, frontend). Append-only / immutability invariants are correctly implemented. Audit logging is in place. No secrets, no auto-rejection paths, no Article 9 special-category data. Two HIGH conditions and a handful of MEDIUM/LOW notes need to land before product-reviewer flips to READY_TO_SHIP, but none of them invalidates the architecture — they are inline tightenings.

---

## Findings

### [HIGH-1] Mandatory-exclusions list diverges across 3 sources of truth

- Files: `frontend/src/screens/RubricWizard.jsx:628`, `backend/app/services/rubric_service.py:30-46`, `backend/app/scripts/backfill_rubrics.py:55-56`
- Issue: Three lists, three shapes:
  - rubric_service.py (canonical, server-enforced): 12 items, snake_case.
  - RubricWizard.jsx: 8 items, mixed snake_case + space (`'school name'`).
  - backfill_rubrics.py: 7 items, snake_case (subset).
- Concrete consequences: HR sees only 8 locked items but the rubric stored in DB carries 12; `'school name'` (space) and `school_name` collide as separate strings; backfilled rubrics are missing 5 of the canonical exclusions until first re-save.
- Compliance frame: CLAUDE.md hard rule #3, EU AI Act Art. 13 (transparency to deployers), RGPD Art. 5(1)(a).
- Fix: align frontend + backfill to the rubric_service.py canonical list (12 items, snake_case). Add a fr/en label map in the wizard so the UI shows human-readable names, not raw snake_case.
- Owner: backend + frontend (coordinate).
- **Status: FIXED inline** during this review (see commit log).

### [HIGH-2] Non-dict `rubric_json["exclusions"]` (or skills/stages) crashes 500 instead of 422

- File: `backend/app/services/rubric_service.py:170-172`
- Issue: `validate_rubric` does `exclusions: dict = normalized.setdefault("exclusions", {})`. If HR posts `{"exclusions": null}` or `[]` or `"foo"`, `setdefault` returns the existing non-dict value, the next line crashes with `AttributeError`, FastAPI returns 500.
- Fix: defensive type-normalization at the top of `validate_rubric` (cast to dict/list before iterating).
- Owner: backend.
- **Status: FIXED inline** during this review.

### [LOW-1] Stub-mode synthetic test passes the activation gate

- File: `backend/app/services/rubric_service.py:440-448, 482-498`
- Issue: When prompt-engineer's module isn't importable, the service substitutes hard-coded scores (3.5/5.5/7.5) with `differentiation_ok=True`. Activation only checks `differentiation_ok`, not `stub_mode`, so a stub-tested rubric can be activated.
- Fix: write `stub_mode: True` into `test_results_json` in stub branch; reject in `activate_rubric` when an Anthropic key is configured.
- Owner: backend.
- **Status: FIXED inline** during this review.

### [MEDIUM-1] `Rubric.created_by` plaintext in DB; only the log is hashed

- File: `backend/app/models.py:146`, `rubric_service.py:316-323, 335`
- Issue: Audit log hashes `created_by`, DB column stores it raw (likely an HR email). Until `User` FK migration, treat as RGPD personal data.
- Fix: docstring note flagging RGPD PII status (no functional change). Drop column once `User` FK lands.
- Owner: docs.
- **Status: TRACKED, not blocking.**

### [MEDIUM-2] `hash(actor)` in logs is non-cryptographic and process-local

- File: `rubric_service.py:335`, `api/rubrics.py:247`
- Issue: Python's built-in `hash()` is randomized per process (PYTHONHASHSEED). Same actor → different log values across restarts → audit traceability broken.
- Fix: `hashlib.sha256((settings.LOG_PII_SALT + actor).encode()).hexdigest()[:16]`. Add `LOG_PII_SALT` to `core/config.py`.
- Owner: backend.
- **Status: TRACKED, not blocking.**

### [MEDIUM-3] `RubricCreateRequest.rubric_json: dict` accepts arbitrary nested content

- File: `api/rubrics.py:58-62`
- Issue: Wire schema is `dict`. Validation is downstream and only checks specific keys. A caller can post megabytes of unrelated keys → persisted into prompts. Widens prompt-injection surface.
- Fix: tighter Pydantic model OR size cap (e.g. `len(json.dumps(rubric_json)) <= 64 * 1024`).
- Owner: backend.
- **Status: TRACKED, not blocking.**

### [LOW-2] Warnings list logged at INFO can carry attacker-controlled HR text

- File: `rubric_service.py:336, 181-184`
- Fix: drop `warnings` from the INFO log line, or move to DEBUG.
- Owner: backend. **Status: TRACKED.**

### [LOW-3] `_to_out` swallows JSON-decode errors silently

- File: `api/rubrics.py:78-103`
- Fix: log `rubric.json_corrupt` warning in except branches.
- Owner: backend. **Status: TRACKED.**

---

## Out-of-scope flags (NOT blocking this skill)

- Multi-tenancy / Company model: GET endpoints not tenant-scoped. Resolve in auth skill.
- `require_admin_or_hm` auth stub: TODO in `api/rubrics.py:14-15`. Resolve in auth skill.
- `fairness-bias-audit`, `transparent-scoring-explainability`, `anti-cheating-integrity-layer`: separate skills; this one provides the data shape they need.
- `datetime.utcnow()` deprecation warnings: pre-existing project-wide.

---

## Files referenced (absolute paths)

- `/home/secke/Documents/recrutetech/backend/app/services/rubric_service.py`
- `/home/secke/Documents/recrutetech/backend/app/api/rubrics.py`
- `/home/secke/Documents/recrutetech/backend/app/models.py`
- `/home/secke/Documents/recrutetech/backend/app/services/prompts/evaluation.py`
- `/home/secke/Documents/recrutetech/backend/app/services/prompt_builder.py`
- `/home/secke/Documents/recrutetech/backend/app/services/report_service.py`
- `/home/secke/Documents/recrutetech/backend/app/scripts/backfill_rubrics.py`
- `/home/secke/Documents/recrutetech/backend/alembic/versions/0002_rubric.py`
- `/home/secke/Documents/recrutetech/frontend/src/screens/RubricWizard.jsx`
