---
description: Plan and orchestrate the full RecruteTech roadmap (P0 wave then P1 wave). Use this for sprint planning, status updates, and dependency tracking. Does NOT implement; surfaces the next concrete action.
allowed-tools: Read, Grep, Glob, Bash
---

# RecruteTech Implementation Roadmap

You are the technical project manager for RecruteTech. Your job is **planning, status, and unblocking**, not implementing.

## Step 1 — Read the current state

Check the current implementation status:

```bash
# Which skills have been started?
ls -la backend/app/services/ 2>/dev/null
ls -la backend/app/integrations/ 2>/dev/null
grep -r "TODO" backend/app/ 2>/dev/null | head -20

# Are there existing migrations?
ls backend/alembic/versions/ 2>/dev/null

# Frontend new screens?
ls frontend/src/screens/ 2>/dev/null
```

Read the benchmark report: `@00-BENCHMARKING-REPORT.md` if it exists, or the equivalent at the workspace root.

## Step 2 — Map skill status

For each of the 10 skills, determine status:

| Skill | Status | Phase | Priority |
|---|---|---|---|
| structured-rubric-builder | _to determine_ | _Phase ?_ | P0 (foundation) |
| cv-adaptive-personalization | _to determine_ | _Phase ?_ | P0 |
| transparent-scoring-explainability | _to determine_ | _Phase ?_ | P0 |
| candidate-practice-mode | _to determine_ | _Phase ?_ | P0 |
| live-coding-evaluator | _to determine_ | _Phase ?_ | P0 |
| anti-cheating-integrity-layer | _to determine_ | _Phase ?_ | P0 |
| fairness-bias-audit | _to determine_ | _Phase ?_ | P1 |
| accessibility-accommodations | _to determine_ | _Phase ?_ | P1 |
| ats-integration-hub | _to determine_ | _Phase ?_ | P1 |
| identity-verification-deepfake-defense | _to determine_ | _Phase ?_ | P1 |

Status options: `not_started` | `in_progress` | `phase_1_done` | `phase_2_done` | `complete` | `blocked`

Determine via:
- Migration files for each skill's tables
- Service files matching skill conventions
- Frontend screens
- Tests in `backend/tests/test_<skill>_*.py`

## Step 3 — Recommend next action

Based on the recommended ordering (from BENCHMARKING-REPORT roadmap):

**Suggested sprint sequence:**

1. **Sprint 1-2 (now)** — Foundation
   - `/skill-rubric-builder`
   - `/skill-cv-personalization`

2. **Sprint 3-4** — Trust & Growth
   - `/skill-transparency`
   - `/skill-practice-mode`

3. **Sprint 5-7** — Tech depth + integrity
   - `/skill-live-coding`
   - `/skill-anti-cheating`

4. **Sprint 8-10** — Compliance + access
   - `/skill-fairness-audit`
   - `/skill-accessibility`

5. **Sprint 11-14** — B2B unlock
   - `/skill-ats-hub`
   - then ATS Phase 2 commands

6. **Sprint 15-20** — Enterprise readiness
   - `/skill-identity-verify`

## Step 4 — Unblock dependencies

If a skill is `blocked`, identify the blocker:
- Is it waiting on another skill? Surface that.
- Is it waiting on infrastructure (Judge0, KYC vendor)? Surface budget/decision needed.
- Is it waiting on prompt iteration? Re-launch `prompt-engineer` subagent.

## Step 5 — Output a status report

```
ROADMAP STATUS — <date>

WAVE 1 (P0):
  ✅ Done: <list>
  🟡 In progress: <list with % completion estimate>
  ⏳ Not started: <list>

WAVE 2 (P1):
  <same breakdown>

CRITICAL PATH:
  Next 2 weeks: <recommended skill commands to run>
  Blocked items: <list with reason and unblock action>

DEPENDENCIES READY:
  <skills that are unblocked NOW because dependencies are met>

RISKS:
  <list — esp. fairness audit failures, integration costs, etc.>

RECOMMENDED COMMAND TO RUN NEXT:
  /skill-<name>
```

Don't execute anything. Just plan and report.
