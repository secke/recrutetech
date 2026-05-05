---
description: Pre-merge gate check — runs tests, security audit, bias audit, and product review on the current branch. Blocks merge if any step fails. Use before opening a PR.
allowed-tools: Read, Grep, Glob, Bash, Task
---

# Ship Check

You are the gatekeeper. Run all pre-merge verifications and block if anything fails.

## Step 1 — Identify what changed

```bash
# Get the git diff vs main
git diff main --stat
git diff main --name-only
```

Determine which skill(s) the changes touch by matching files to skill scope.

## Step 2 — Run automated tests

Backend:
```bash
cd backend
ruff check . || echo "RUFF FAILED"
pyflakes . 2>&1 | head -20
pytest tests/ -v --tb=short --maxfail=5
```

Frontend (if changed):
```bash
cd frontend
npm run lint
npm run test -- --run
```

Capture pass/fail counts.

## Step 3 — Security & compliance audit

Launch the `security-compliance-auditor` subagent on the diff. Pass it the changed files. Wait for verdict.

If verdict is `BLOCK` → stop here. Output the blocking reasons. Do not proceed.

## Step 4 — Bias audit (if applicable)

If the changes touch any of:
- `backend/app/services/report_service.py`
- Any rubric or evaluation prompt
- `backend/app/services/integrity_service.py`
- `backend/app/services/cv_parsing_service.py`

Then run a small bias audit:

```bash
cd backend
pytest tests/eval/test_bias_audit.py -v --eval-size=50
```

If 4/5 ratio < 0.80 on any group → BLOCK.

## Step 5 — Acceptance criteria coverage

For each skill touched, run the `product-reviewer` subagent. It will check the SKILL.md acceptance criteria against the implementation.

If verdict is `NEEDS_WORK` or `BLOCK` → output gaps and stop.
If verdict is `READY_FOR_PILOT` → OK to merge as a phased rollout.
If verdict is `READY_TO_SHIP` → green light.

## Step 6 — Documentation check

```bash
# .env.example up to date?
grep -c "^[A-Z_]*=" backend/.env.example
# Compare with settings.py fields
python -c "from app.core.config import Settings; print(len(Settings.model_fields))"
```

If new env vars are not documented → BLOCK.

API docs:
```bash
# Verify FastAPI docs generation works
cd backend && python -c "from app.main import app; print(len(app.routes))"
```

## Step 7 — Output verdict

```
SHIP CHECK RESULT — <branch> — <commit hash>

TESTS:
  Backend: <pass>/<total> — <status>
  Frontend: <pass>/<total> — <status>

SECURITY AUDIT: <verdict>
  Issues: <count by severity>

BIAS AUDIT: <pass/fail/skipped>
  4/5 ratios: <list>

PRODUCT REVIEW: <verdict per skill touched>

DOCS: <up to date / gaps>

OVERALL: ✅ READY TO MERGE | 🟡 MERGE WITH CAVEATS | ❌ BLOCKED

If BLOCKED:
  Action items:
  - <action 1>
  - <action 2>
```

## Hard rule

If ANY step returns BLOCK, the overall verdict is BLOCKED. No exceptions, even for "small" changes. Especially do NOT bypass for "I'll fix it after merge" — that's how regressions ship.
