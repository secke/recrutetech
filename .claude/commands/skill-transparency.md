---
description: Implement transparent-scoring-explainability — evidence pointers, candidate-facing explanation dashboard, audit trail. P0, ~2 weeks. The "anti-HireVue-black-box" angle.
allowed-tools: Read, Grep, Glob, Bash, Task
---

# Implement: transparent-scoring-explainability

Skill spec: `@.claude/skills/transparent-scoring-explainability/SKILL.md`

**P0** — directly counters the EPIC 2019 / ACLU 2024 attacks on HireVue. Marketing angle: *"The only AI recruiter that explains itself."*

## Plan

**DB** (delegate to `db-architect`):
- New table `EvaluationRubric` (versioned per role)
- Add to `Interview`: `evaluation_rubric_version`, `report_integrity_hash`
- Add `share_with_candidate BOOL` flag (default false, HR opts in per candidate)

**Prompts** (delegate to `prompt-engineer`) — most of the work happens here:
- Refactor the existing `report_service.py` SYSTEM_PROMPT to require `evidence_pointers[]` for every score
- Each evidence pointer schema: `{claim, supports_skill, score_contribution, evidence_type, timestamp_seconds, quote OR details}`
- Add explicit "DO NOT score on" exclusion list (accent, facial expressions, school name, age, etc.)
- Add `counterfactuals[]` array: "to reach next level, candidate would need to..."
- Add `model_version` block (evaluator_model, rubric_version, evaluated_at)
- Design candidate-facing letter prompt as a separate variant — encouraging tone, no hiring recommendation, no comparison to other candidates

**Backend** (delegate to `backend-engineer`):
- Service `report_service.py` extended:
  - `generate_report_v2(interview, rubric)` — returns the new schema
  - `verify_evidence_pointers(report, transcript)` — automated check that every quote is verbatim in source. If not → re-prompt or flag
  - `compute_integrity_hash(report) -> str` — SHA-256 of (transcript + code + metrics + rubric_version + model_version + report_json)
- Endpoint `GET /api/interviews/{token}/audit-trail` — full report + inputs hashed for external audit
- Endpoint `GET /api/interviews/{token}/candidate-view` — only available if `share_with_candidate=true`, returns sanitized version (no hiring_recommendation)

**Frontend** (delegate to `frontend-engineer`):
- HR dashboard: "Why this score?" panel with breakdown, evidence timeline (clickable, jumps video to t-5s), counterfactuals
- HR control: toggle `Share explanation with candidate` per interview
- Override mechanism: HR can adjust score with mandatory justification text (logged for audit)
- New candidate-side route `/candidate/explanation/{token}` — read-only dashboard with strengths, growth areas, no scores or hiring recommendation
- "Contest this evaluation" form (sends to recruiter)
- i18n: FR + EN

**Tests** (delegate to `qa-tester`):
- 100-report eval: 100% of quoted evidence is verbatim in source transcript (zero hallucinations)
- Protected-attribute leakage scan: 0 mentions of age/school/origin in evidence_pointers across 100 reports
- Hash integrity: change 1 byte in report → hash invalid
- Candidate view sanitization: hiring_recommendation field never appears in candidate API response

**Security review** (delegate to `security-compliance-auditor`):
- RGPD Art. 22 compliance: right to explanation mechanism in place
- No leakage of other candidates' data in any view
- Audit log of HR overrides

**Docs** (delegate to `docs-writer`):
- HR docs: how to interpret the report, when to override, how to handle a contest
- Candidate-facing copy: explanation page intro text (FR/EN)
- Audit endpoint API docs (for enterprise compliance buyers)

## Success gate

- 0 hallucinated quotes in the verification eval
- 0 protected-attribute leakage
- `product-reviewer` returns READY_TO_SHIP
- Marketing-ready: a screenshot of the candidate explanation dashboard for the website

Now execute. Confirm before launching subagents.
