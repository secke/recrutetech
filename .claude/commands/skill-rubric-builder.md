---
description: Implement structured-rubric-builder — no-code wizard for HR to build versioned evaluation rubrics. P0, foundation for all other evaluation skills. ~2-3 weeks.
allowed-tools: Read, Grep, Glob, Bash, Task
---

# Implement: structured-rubric-builder

Skill spec: `@.claude/skills/structured-rubric-builder/SKILL.md`

**P0**. Foundation skill — `transparent-scoring-explainability` and `cv-adaptive-personalization` both depend on having structured rubrics. Build this early.

## Plan

**DB** (delegate to `db-architect`):
- New table `Rubric` (id, role_id FK, version int, is_active bool, name, rubric_json, created_by, created_at, last_tested_at, test_results_json)
- Migration to backfill existing roles: parse current `Role.system_prompt` via Claude → suggest a rubric → store as v1 (do NOT auto-activate; leave as draft)
- Add `Interview.rubric_version_used FK` for audit trail (which rubric version was used for each interview)

**Backend** (delegate to `backend-engineer`):
- CRUD endpoints for Rubric: `POST /api/roles/{id}/rubrics`, `GET`, `PATCH` (creates new version), `POST /api/roles/{id}/rubrics/{rubric_id}/activate`
- Service `rubric_service.py`:
  - `validate_rubric(rubric_json)` — sum of weights = 1.0 ± 0.001, mandatory exclusions present, etc.
  - `compose_aria_prompt(rubric, cv_parsed)` — combines rubric + CV personalization into final ElevenLabs prompt
  - `compose_evaluation_prompt(rubric)` — used by `report_service` to anchor scoring on level descriptors
- `POST /api/rubrics/{id}/test` — runs 3 synthetic candidate simulations (junior/mid/senior) and stores results in `test_results_json`
- Hook all interview creation to snapshot the active rubric version

**Prompts** (delegate to `prompt-engineer`):
- Synthetic candidate simulator prompt: given rubric + target level → simulate a candidate's responses to the rubric's stages
- Updated `report_service.py SYSTEM_PROMPT` to receive rubric as input and respect skill list, weights, level_descriptors, exclusions
- Aria prompt template that takes a rubric and emits stage-by-stage instructions

**Frontend** (delegate to `frontend-engineer`):
- New HR section: `/hr/roles/{id}/rubrics`
- Wizard with 5 steps:
  1. Quick start — pick template (Backend Mid, Frontend Senior, Data, etc.)
  2. Skills & weights — drag/drop, slider, level_descriptors editor, validation (sum = 1.0)
  3. Stages — timeline drag/drop, link skills evaluated per stage
  4. Exclusions & language — checkboxes (mandatory exclusions are pre-checked + locked)
  5. Test & publish — runs synthetic test, shows differentiation chart, publish gates on test result
- Versions list: timeline of past versions with diff view
- Rubric library page: 6+ starter templates pre-seeded
- i18n: FR + EN

**Tests** (delegate to `qa-tester`):
- Unit: weight sum validation
- Unit: locked exclusions cannot be unchecked even via API
- Integration: synthetic test simulation produces differentiated scores (junior < mid < senior with ≥1.5 spread)
- Integration: 2 different rubrics on same fictional candidate produce significantly different scores
- E2E: HR user can create a rubric in <15 minutes (manual UX test with 3 internal users)

**Security review** (delegate to `security-compliance-auditor`):
- Mandatory exclusions cannot be bypassed (server-side enforced)
- Rubric versioning is immutable (no destructive updates)
- Audit log of rubric changes
- Authorization: only Admin/Hiring Manager can edit; Reviewer can only read

**Docs** (delegate to `docs-writer`):
- HR guide: how to build a rubric, what each field means, examples
- Migration guide: from free-text Role.system_prompt to structured rubric
- Template descriptions

## Success gate

- 3 internal HR users build a working rubric in <15 minutes each
- Synthetic differentiation test passes (≥1.5 score spread between juniors and seniors)
- All existing roles successfully migrated to v1 draft rubrics
- `product-reviewer` returns READY_TO_SHIP

## Migration plan

- Phase 1: rubric created as opt-in alongside existing free-text prompts (coexistence)
- Phase 2 (3 months later): mandate rubric for new roles
- Phase 3 (6 months later): sunset free-text prompts entirely

Now execute. Confirm before launching subagents.
