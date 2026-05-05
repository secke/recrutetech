---
description: Implement fairness-bias-audit — synthetic, real, and individual bias audits for NYC AEDT / EU AI Act compliance. P1, ~2-3 weeks. Legal shield + marketing differentiator.
allowed-tools: Read, Grep, Glob, Bash, Task
---

# Implement: fairness-bias-audit

Skill spec: `@.claude/skills/fairness-bias-audit/SKILL.md`

**P1**. Required for NYC AEDT compliance and EU AI Act high-risk system requirements. Also the marketing inverse of HireVue's lawsuits.

## Plan

**DB** (delegate to `db-architect`):
- New table `BiasAuditRun` (id, type [synthetic|real|individual], triggered_at, model_version, rubric_version, n_candidates, metrics_json, flags, is_blocking, public_report_url)
- Indexes on triggered_at, rubric_version

**Prompts** (delegate to `prompt-engineer`):
- Synthetic candidate generator prompt: given role + seniority + diversity attribute (gender_swap, accent_swap, name_origin_swap, neurodivergent_pattern) → produce a transcript pair where only the attribute differs
- Cover 8 attribute categories:
  - Gender (prénom male/female swap)
  - Origin (FR-natal vs Algerian/Senegalese name swap)
  - Accent (TTS variant: Métropolitain vs accent Wolof/Maghrébin)
  - Neurodivergence (autistic verbalization patterns, ADHD pause patterns)
  - Hearing (slight articulation variation)
  - Vision (eye contact deliberately low)
  - Age (linguistic markers)
  - Mother tongue (slightly non-native French syntax)

**Backend** (delegate to `backend-engineer`):
- Service `bias_audit_service.py`:
  - `run_synthetic_audit(rubric_version, n=500) -> AuditReport`
  - `run_real_audit(since, until) -> AuditReport`
  - `run_individual_audit(interview_token) -> IndividualAuditReport`
  - `four_fifths_test(group_a_scores, group_b_scores) -> bool`
  - `equal_opportunity_difference(...)`
- Endpoints:
  - `POST /api/admin/bias-audit/synthetic` (admin only)
  - `GET /api/admin/bias-audit/runs`
  - `GET /public/bias-audit` — last published audit (no auth)
  - `POST /api/interviews/{token}/request-bias-audit` — candidate-initiated individual audit
- Background scheduler: synthetic audit triggered automatically on every rubric publication (block if fails 4/5)
- Annual cron for public report generation (Markdown + PDF)

**Integration** (delegate to `integration-engineer`):
- Wire into CI: a smaller version (n=50) runs on every PR touching `report_service.py` or rubrics
- If 4/5 ratio < 0.80 → CI fails, PR blocked

**Frontend** (delegate to `frontend-engineer`):
- Admin section: `/hr/admin/bias-audit` — runs list, metrics dashboard, trigger button
- Public page `/bias-audit` — published annual reports, downloadable PDF
- Candidate request form: "Request a bias review of my evaluation"
- i18n: FR + EN (public report bilingual)

**Tests** (delegate to `qa-tester`):
- 500-candidate synthetic eval baseline run on current rubrics — must pass 4/5 on all 8 categories
- Test that audit blocks rubric publication when ratio < 0.80
- Individual audit response time < 7 days (mocked)
- Public report generation produces valid Markdown + PDF

**Security review** (delegate to `security-compliance-auditor`):
- Synthetic candidates contain no real PII
- Public report contains no individual candidate identification
- Audit runs are themselves auditable (immutable log)
- Independent annual external audit budget allocated (vendor: any reputable AI fairness audit firm)

**Docs** (delegate to `docs-writer`):
- Public bias audit page (FR/EN) — explain methodology, limits, results
- HR docs: "Why my rubric was blocked" — how to fix bias issues
- Internal runbook: how to investigate a flagged audit run
- Marketing one-pager: "RecruteTech bias audit policy"

## Success gate

- Current production rubrics pass 4/5 test on all 8 categories
- CI integration tested (a deliberately biased prompt blocks a PR)
- Public bias audit page is live and links to first report
- `product-reviewer` returns READY_TO_SHIP

## Critical: this skill BLOCKS other skills if it fails

If a synthetic audit shows disparate impact during rollout, the skills that produced the bias (typically `cv-adaptive-personalization`, `transparent-scoring-explainability`, or `anti-cheating-integrity-layer`) must revert to a previous safe version. Document this rollback procedure.

Now execute. Confirm before launching subagents.
