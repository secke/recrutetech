---
description: Run a synthetic bias audit on the current evaluation pipeline. Outputs disparate impact ratios, flags failures, and writes a Markdown report.
argument-hint: [n=200]
allowed-tools: Read, Grep, Glob, Bash, Task
---

# Run Bias Audit

Trigger a synthetic bias audit on the current RecruteTech evaluation pipeline. The audit generates synthetic candidate pairs that differ only in a single protected-attribute proxy and measures whether scores remain equivalent.

Argument: `$ARGUMENTS` is the sample size per group (default: 200, MVP minimum: 50).

## Step 1 — Verify the bias audit pipeline exists

```bash
ls backend/app/services/bias_audit_service.py
ls backend/tests/eval/test_bias_audit.py
```

If missing → tell the user the `fairness-bias-audit` skill must be implemented first via `/skill-fairness-audit`.

## Step 2 — Run the audit

```bash
cd backend
python -m app.services.bias_audit_service \
  --type synthetic \
  --n ${ARGUMENTS:-200} \
  --output /tmp/bias_audit_$(date +%Y%m%d_%H%M%S).json
```

The audit covers 8 attribute categories (per the skill spec):
- Gender (prénom)
- Origin (nom de famille)
- Accent (TTS variant)
- Neurodivergence (verbalization patterns)
- Hearing (articulation variation)
- Vision (low eye contact)
- Age (linguistic markers)
- Mother tongue (non-native syntax)

Each category produces a `disparate_impact_ratio = score_minority_group / score_majority_group`.

## Step 3 — Interpret results

For each category:
- **>0.95**: 🟢 No detectable bias
- **0.80-0.95**: 🟡 Watch — review the cases, may be sample noise, may be early signal
- **0.70-0.80**: 🟠 Investigate — manual review of 20+ flagged cases needed within 7 days
- **<0.70**: 🔴 BLOCKING — current rubric/pipeline cannot ship to production

## Step 4 — Output report

Write a Markdown report to `bias-audit-reports/<timestamp>.md`:

```markdown
# Bias Audit Report — <date>

**Sample size**: <n> per group (total <n*16> candidates)
**Pipeline version**: <model + rubric versions in scope>

## Summary

| Category | Ratio | Status |
|---|---|---|
| Gender | 0.94 | 🟢 OK |
| Origin | 0.82 | 🟡 Watch |
| ... | ... | ... |

## Flagged categories

For each flagged category, list:
- Sample of 5 candidate pairs with score divergence
- Suspected cause (prompt wording, signal weighting, etc.)
- Recommended action

## Comparison with previous audit

If previous audit exists (`bias-audit-reports/<previous>.md`), produce a delta:
- Improvements (categories that moved toward 1.0)
- Regressions (categories that worsened)

## Verdict

PASS — all categories ≥ 0.85 → safe to deploy
WATCH — one or more in 0.80-0.85 → deploy with monitoring
BLOCK — one or more < 0.80 → fix before deploy
```

## Step 5 — If BLOCK, suggest remediation

Common remediations:
- Re-prompt: tighten the protected-attribute exclusion list in evaluation prompts
- Adjust weights: reduce weight of signals that biased the score
- Add accommodation: if the signal is unfair to a group, allow opt-out (e.g., visual metrics)
- Roll back: revert to previous rubric version

Launch `prompt-engineer` to propose specific prompt changes if the issue is in prompts.

## Step 6 — Public report (annual only)

If the user explicitly asks for a public-facing report (running with `--public-report`):
- Anonymize all per-candidate data
- Include methodology section
- Sign with DPO + date
- Publish to `/public/bias-audit/<year>.md`

This is the NYC AEDT compliance artifact.

## Hard rule

The audit is **read-only**. It must never modify production data or trigger any candidate re-scoring without explicit human approval. If a previous candidate's score is found to be biased, that's a separate process (notify candidate, re-evaluate, communicate).
