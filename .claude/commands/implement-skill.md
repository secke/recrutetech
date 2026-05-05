---
description: Implement any RecruteTech skill end-to-end by orchestrating the right subagents. Pass the skill name as argument.
argument-hint: <skill-name>
allowed-tools: Read, Grep, Glob, Bash, Task
---

# Implement Skill: $ARGUMENTS

You are the orchestrator for implementing a RecruteTech skill. The skill specification lives at `.claude/skills/$ARGUMENTS/SKILL.md`.

## Step 1 — Read and understand

Read the skill file completely:

```
@.claude/skills/$ARGUMENTS/SKILL.md
```

Extract:
1. The objective and integration context
2. The implementation steps (these are the *what*, you decide the *how*)
3. Data schemas (DB models, JSON schemas)
4. Guard rails (compliance, security, fairness)
5. Acceptance criteria (these become tests)
6. Dependencies on other skills (read those SKILL.md files too if needed)
7. Rollout phases (you'll only implement what's in the current phase, unless told otherwise)

## Step 2 — Write a plan

Produce a plan with these sections, then ask the user to confirm before execution:

- **Scope**: which rollout phase, what's in / out
- **DB changes**: new tables, new columns, indexes
- **Backend changes**: services, endpoints, background jobs
- **Frontend changes**: components, screens, hooks, i18n keys
- **Prompt changes**: which Aria/Claude prompts are touched
- **Integrations**: external services involved
- **Tests**: what acceptance criteria become which tests
- **Compliance**: what must be reviewed by security-compliance-auditor
- **Estimated effort**: rough sizing (S / M / L / XL)

## Step 3 — Execute via subagents

Once the plan is confirmed, dispatch in this order (skip steps that don't apply):

1. **db-architect** — design schema and produce migration file. Wait for completion.
2. **prompt-engineer** — design any new prompts. Can run in parallel with step 3.
3. **backend-engineer** — implement services, endpoints, jobs. Depends on step 1.
4. **integration-engineer** — implement external integrations (sandbox, ATS, KYC, webhooks). Can run in parallel with step 3 if independent.
5. **frontend-engineer** — implement UI. Depends on step 3 for endpoint contracts.
6. **qa-tester** — write tests covering each acceptance criterion. Depends on steps 3-5.
7. **docs-writer** — write/update docs and `.env.example`. Depends on steps 3-5.
8. **security-compliance-auditor** — review the full change. Depends on all above.
9. **product-reviewer** — final certification against the SKILL.md.

Use the `Task` tool to launch each subagent. Run subagents in parallel only when their work doesn't depend on each other (e.g., prompt-engineer and integration-engineer often can; backend-engineer must wait for db-architect).

## Step 4 — Synthesize and report

After all subagents have reported back, produce a final report:

```
SKILL IMPLEMENTED: $ARGUMENTS
ROLLOUT PHASE: <phase>
FILES CHANGED: <count>
NEW TESTS: <count>
BIAS AUDIT RESULT: <pass/fail/skipped>
COMPLIANCE VERDICT: <APPROVE/REQUEST_CHANGES/BLOCK>
PRODUCT REVIEW VERDICT: <READY_TO_SHIP/READY_FOR_PILOT/NEEDS_WORK>

NEXT STEPS:
- <action 1>
- <action 2>

KNOWN LIMITATIONS:
- <limitation 1>
```

## Hard rules

- **Never skip the security-compliance-auditor step** for skills tagged sensitive: anti-cheating-integrity-layer, identity-verification-deepfake-defense, fairness-bias-audit, accessibility-accommodations, transparent-scoring-explainability, ats-integration-hub.
- **Never declare a skill done if any acceptance criterion is unverified**. Mark partial completion explicitly.
- **If two subagents disagree** (e.g., backend-engineer and security-compliance-auditor), surface the disagreement to the user — don't silently pick a side.
- **Stop and ask the user** if the plan would require new infrastructure costs (new SaaS, new GPU, new container service) — these need product approval.
