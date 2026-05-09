# Security & Compliance Review — cv-adaptive-personalization

**Date:** 2026-05-07
**Auditor:** security-compliance-auditor (Claude)
**Verdict:** APPROVED_WITH_CONDITIONS

Phase 1 silent rollout is structurally sound. Article 9 RGPD consent is implemented correctly at every layer (UI, wire format, server enforcement, audit trail). The DO-NOT-EXTRACT chain holds end-to-end: prompt redaction list is exhaustive, Pydantic schema has no slots for forbidden fields, the composer (`prompt_builder._aria_personalization_block`) only projects three safe keys (`top_projects[0].name`, `suggested_deep_dive_topics`, `primary_stack`). The silent-rollout invariant is intact: `screenings.py` never injects `interview.personalized_prompt`, even when `CV_PERSONALIZATION_INJECT=True`. 90-day purge logic is correct, idempotent, and dry-run safe. Conditions below are operational gaps and tightenings; none invalidates the architecture.

```
FRAMEWORK_PASSES:
  RGPD: 9/9
  EU_AI_ACT: 5/5 (training-data-quality docs deferred to fairness skill)
  NYC_AEDT: N/A (Phase 1 silent — no AEDT decision applied)
  SECURITY: 7/9 (raw byte cap missing; pypdf CVE posture not pinned)
```

---

## Findings

### [HIGH-1] No raw-bytes size cap on uploaded file before parsing

- File: `backend/app/api/cv.py:220-224`
- Issue: `await file.read()` slurps unconditionally; 5 MB cap is client-side only. Curl bypass + DoS / pypdf attack surface.
- Compliance: OWASP API Top 10 #4; CLAUDE.md security baseline.
- Fix: server-side `MAX_UPLOAD_BYTES = 5 * 1024 * 1024` before `await file.read()`. Return 413/422.
- Owner: backend-engineer.
- **Status: FIXED inline** during this review.

### [HIGH-2] No rate limiting on public CV endpoints

- File: `backend/app/api/cv.py:197-270`
- Issue: Token-as-credential model with no per-token / per-IP rate limit. Token leak → financial DoS via Anthropic budget burn.
- Compliance: OWASP API Top 10 #4.
- Fix: middleware-level rate limit ideal (slowapi). Stop-gap: reject re-uploads when `cv_text IS NOT NULL` already.
- Owner: backend-engineer.
- **Status: STOP-GAP FIXED inline** (re-upload rejection); proper rate-limiter tracked as a follow-up.

### [MEDIUM-1] Purge job not wired to a scheduler — release-condition

- File: `backend/app/scripts/purge_expired_cv_text.py` (script correct; gap is operational)
- Issue: Without daily execution, the 90-day RGPD Art. 5(1)(e) commitment is paper-only.
- Fix: wire `0 3 * * *` UTC cron / k8s CronJob / GitHub Actions BEFORE first real candidate processes a CV.
- Owner: integration-engineer (infra) + product-reviewer (gate).
- **Status: TRACKED, pre-prod release condition.**

### [MEDIUM-2] Encryption-at-rest for cv_text / cv_parsed_json / personalized_prompt

- File: `backend/app/models.py:222-232`
- Issue: Three TEXT columns hold direct candidate PII in cleartext. Phase 1 (low volume, controlled cohort) is acceptable; Phase 2 must add column-level encryption (pgcrypto or app-level Fernet via KMS).
- Fix: roadmap track; explicit pre-Phase-2 gate added to SKILL.md §5.
- Owner: db-architect + security-compliance-auditor (joint, Phase 2 entry).
- **Status: TRACKED, Phase 2 prerequisite.**

### [MEDIUM-3] `pypdf>=5.0` lower bound — pin a known-clean minor

- File: `backend/pyproject.toml:17`
- Issue: Open-ended; pypdf 3.x had CVEs. Future automated bump could drag in regressions.
- Fix: pin to `>=5.1,<6.0`. Add `pip-audit` to CI.
- Owner: backend-engineer.
- **Status: FIXED inline** (pinned to `>=5.1,<6.0`); pip-audit CI tracked.

### [LOW-1] Cross-skill exclusion-list divergence (informational)

- Files: `rubric_service.py:30-46` (12 items) vs `prompts/cv_parsing.py:209-220` (~12, broader: adds dob, university, city, nationality, photo, health, pregnancy, dependents, ethnicity, skin colour).
- Issue: Different layers, divergence is appropriate. A doc note would help future maintainers.
- Fix: docstring reference in cv_parsing.py.
- Owner: docs-writer. **Status: TRACKED.**

### [LOW-2] Cross-skill rubric HIGH-1 alignment check

- File: `backend/app/services/rubric_service.py:30-46`
- Note: Verified during rubric ship-check — frontend MANDATORY_EXCLUSIONS already aligned to the canonical 12-item list. No outstanding rubric-side leak. **Status: VERIFIED CLEAN, no action.**

### [LOW-3] Logging hygiene — verified clean, one minor

- Files: `cv.py:139-181`, `cv_parsing_service.py:191-242`
- Status: All log calls log only structural fields. No raw CV / parsed JSON / personalized_prompt content logged.
- Minor: `text_length` at DEBUG; ensure prod `LOG_LEVEL=INFO`.
- Owner: backend-engineer (deploy config). **Status: TRACKED.**

### [LOW-4] `GET /cv-parsed` returns full parsed PII to anyone with the token

- File: `cv.py:278-302`
- Issue: Token-as-credential model, consistent with rest of architecture. If token leaks, the disclosure is broader than just "interview booked".
- Fix: gate to authenticated session when auth skill ships.
- Owner: tracked, deferred to auth skill.
- **Status: TRACKED, deferred.**

### [INFO-1..4] Verified clean

- **INFO-1** Phase 1 silent invariant: `screenings.py` never reads `interview.personalized_prompt` into ElevenLabs override.
- **INFO-2** Article 9 consent flow: granular, explicit, server-enforced, audited.
- **INFO-3** DO-NOT-EXTRACT defense in depth: prompt enumerates exhaustively, schema has no slots for forbidden fields, composer projects only safe keys.
- **INFO-4** 90-day purge correctness: idempotent, dry-run safe, preserves audit fields, UTC-consistent.

---

## Conditions for ship (Phase 1 silent)

1. ✅ **HIGH-1** Server-side raw-bytes cap — FIXED inline.
2. ✅ **HIGH-2** Rate-limit stop-gap (reject re-uploads when cv_text exists) — FIXED inline.
3. ⏭ **MEDIUM-1** Purge cron wired BEFORE first real candidate. Pre-prod gate.
4. ✅ **MEDIUM-3** pypdf pinned to `>=5.1,<6.0` — FIXED inline.

If MEDIUM-1 is operationally tracked at deploy time, skill is shippable as Phase 1 silent.

---

## Out-of-scope flags

- Encryption at rest (MEDIUM-2): Phase 2 prerequisite.
- Mid-interview adaptation: explicit Phase 2 stub.
- A/B + P95 latency on real CVs: manual pilot gate.
- Real Anthropic-fronted parser tests: manual gate.
- Auth stub for GET /cv-parsed (LOW-4): defers to auth skill.
- Cross-skill exclusion comment polish (LOW-1): docs.
