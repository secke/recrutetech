# Security & Compliance Review — transparent-scoring-explainability

**Date:** 2026-05-08
**Auditor:** security-compliance-auditor (Claude)
**Verdict:** APPROVED_WITH_CONDITIONS

The skill is structurally sound. The architecture-level invariants the qa-tester flagged for confirmation all hold:

- The candidate-view endpoint uses an EXPLICIT Pydantic whitelist (`CandidateViewResponse`), not a blacklist.
- 404 (not 403) when sharing is off OR when the interview doesn't exist — no enumeration channel.
- `EvaluationOverride` is INSERT-only across the codebase. `Interview.report_json` is never mutated.
- `compute_integrity_hash` strips the `report_integrity_hash` key before encoding, NULL-byte separation, sort_keys, ensure_ascii=False — deterministic.
- 12-item DO-NOT-SCORE list enumerated verbatim in `prompts/evaluation.py:107-120`.
- Audit-trail gated behind `require_admin_or_hm`, ships `verification_instructions`.
- `CandidateExplanation.jsx` derives only from whitelisted fields.

```
FRAMEWORK_PASSES:
  RGPD: 8/9 (Art. 22 OK; Art. 5(1)(c) minimisation note on transcript in audit-trail)
  EU_AI_ACT: 6/6 (Art. 11/12/13/15)
  NYC_AEDT: N/A
  SECURITY: 6/8
```

---

## Findings

### [HIGH-1] Override endpoint — race window between flush() and hash recompute

- File: `backend/app/api/interviews.py:497-548`
- Issue: Two concurrent overrides on the same `(interview_id, skill_id)` can land identical `created_at` values, producing nondeterministic latest-wins. Each transaction sees its own row; the second override's hash is correct relative to itself but the first hash is overwritten — audit chain breaks.
- Compliance: EU AI Act Art. 12; RGPD Art. 22.
- Fix: tiebreaker on `(created_at, id)` (monotonic id ensures determinism). For prod multi-HR, also wrap in `SELECT FOR UPDATE`.
- Owner: backend-engineer.
- **Status: FIXED inline** (tiebreaker applied; SELECT FOR UPDATE deferred to prod-deploy task).

### [HIGH-2] Audit-trail endpoint exposes raw `transcript_json` / `visual_metrics_json`

- File: `backend/app/api/interviews.py:332-411`
- Issue: Response includes raw transcript verbatim — RGPD personal data + potentially special-category. The "external auditor" persona doesn't yet exist as a separate role, but the endpoint is framed for one. Auditors only need a hash of the input, not the input itself; raw inputs must be supplied out-of-band under NDA.
- Compliance: RGPD Art. 5(1)(c) data minimisation; Art. 9 (special category); EU AI Act Art. 12.
- Fix: replace raw strings with SHA-256 digests in the response. Update `verification_instructions` to: hash inputs locally and compare with the digest. Raw transcript stays accessible via the existing HR detail route.
- Owner: backend-engineer.
- **Status: FIXED inline** (digests only; raw transcript route unchanged).

### [MEDIUM-1] No rate limiting on candidate-view + contest endpoints

- File: `backend/app/api/candidate.py:90-179, 193-245`
- Issue: Public-token-only routes; leaked link → log amplification on contest, exfiltration crawling on view.
- Compliance: OWASP API Top 10 #4.
- Fix: per-IP + per-token rate limit (slowapi). Stop-gap on contest: 5/24h per interview.
- Owner: backend-engineer.
- **Status: TRACKED** (paired with cv-personalization rate-limit follow-up).

### [MEDIUM-2] Override-endpoint INFO log will expose `caller` PII once auth ships

- File: `backend/app/api/interviews.py:556-566, 594-630`
- Issue: Currently "admin" stub is harmless. Post-auth-skill, `caller` becomes HR email → PII in INFO log.
- Compliance: RGPD Art. 5(1)(c); CLAUDE.md log hygiene.
- Fix: salted SHA-256 (16 hex). Same recipe as rubric MEDIUM-2.
- Owner: backend-engineer (track for auth-skill).
- **Status: TRACKED.**

### [MEDIUM-3] Contest endpoint is fire-and-forget — no proof of filing

- File: `backend/app/api/candidate.py:193-245`
- Issue: 202 with no ref id, no persisted record. Candidate has no proof their RGPD Art. 22 challenge was filed.
- Compliance: RGPD Art. 22(3) "right to obtain human intervention".
- Fix (floor): generate contest ref id, return in response, structured log. (Preferred: Contest table — deferred.)
- Owner: backend-engineer.
- **Status: FIXED inline** (ref id + structured log; full Contest table deferred).

### [MEDIUM-4] Contest does NOT re-gate on `share_with_candidate` — RGPD-correct, doc-only ask

- File: `backend/app/api/candidate.py:200-218`
- Ruling: design is correct. Right to contest is a data-subject right, not revocable by HR toggling sharing off.
- Compliance: RGPD Art. 22(3).
- Fix: promote the half-comment to a paragraph citing Art. 22(3) explicitly.
- Owner: docs / backend-engineer. **Status: TRACKED for docs-writer.**

### [LOW-1] `verification_instructions` doesn't spell out override sub-shape

- File: `backend/app/services/report_service.py:850-873`; `interviews.py:322-329`
- Fix: extend instructions to enumerate override field order in the canonical input.
- Owner: backend-engineer / docs. **Status: FIXED inline** (along with HIGH-2 doc update).

### [LOW-2] Candidate view doesn't expose `evaluated_at` / framework version

- File: `backend/app/api/candidate.py:61-87`
- Issue: Art. 22(3) requires "meaningful information about the logic". Candidate has no path to know "which framework version, when".
- Fix: add `evaluated_at` and `evaluation_framework_version` (e.g. `"v3.0.0"`) to `CandidateViewResponse`. Don't disclose `evaluator_model` (vendor info, not strictly needed).
- Owner: backend-engineer.
- **Status: FIXED inline.**

### [LOW-3] `verify_evidence_pointers` doesn't verify code/visual evidence

- File: `backend/app/services/report_service.py:628-679`
- Issue: Function only checks transcript-type quotes. Code/visual `details` will pass through unverified once live-coding-evaluator skill lands.
- Fix: TODO comment scoping the gap to live-coding-evaluator skill.
- Owner: backend-engineer (TODO); product-reviewer (acceptance scoping).
- **Status: FIXED inline** (TODO comment).

### [LOW-4] No size cap on override justification / contest reason

- File: `backend/app/api/interviews.py:419-429`; `candidate.py:189`
- Fix: `max_length=4000` on both Pydantic fields.
- Owner: backend-engineer.
- **Status: FIXED inline.**

### [LOW-5] Audit-trail doesn't bundle rubric_json

- File: `backend/app/api/interviews.py:310-329, 363-371`
- Issue: External auditor needs rubric_json for fairness review. Currently retrievable via separate rubrics API.
- Fix: cross-reference in `verification_instructions`; bundling itself deferred.
- Owner: docs.
- **Status: TRACKED.**

### [INFO-1..6] Verified clean

- Append-only invariant on `EvaluationOverride`: confirmed.
- 404 (not 403) on candidate-view: confirmed.
- Explicit Pydantic whitelist on `CandidateViewResponse`: confirmed.
- 12-item DO-NOT-SCORE list: confirmed.
- Hash determinism: confirmed.
- Frontend defensive rendering: confirmed.

---

## Conditions for ship

1. ✅ **HIGH-1** Tiebreaker `(created_at, id)` — FIXED inline.
2. ✅ **HIGH-2** Audit-trail digests-only — FIXED inline.
3. ✅ **MEDIUM-3** Contest ref id + structured log — FIXED inline.

If those three land, the skill is shippable. SELECT FOR UPDATE for prod-multi-HR is operationally tracked.

---

## Out-of-scope flags

- Auth stub: same gap as rubric/CV.
- At-rest encryption for `report_json`/`transcript_json`: same Phase 2 gate.
- Live-coding code-artifact verification (LOW-3): defers to live-coding-evaluator skill.
- Real ElevenLabs end-to-end test: manual gate.
- Marketing screenshot: manual deliverable.
- Multi-tenant Company scoping on audit-trail: resolves with Company/User model.
