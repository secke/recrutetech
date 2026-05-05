---
description: Audit the implementation status of a specific skill against its SKILL.md acceptance criteria. Read-only — does not modify code.
argument-hint: <skill-name>
allowed-tools: Read, Grep, Glob, Bash, Task
---

# Audit Skill: $ARGUMENTS

Run the `product-reviewer` subagent on the skill `$ARGUMENTS`.

## Step 1 — Verify the skill exists

Check that `.claude/skills/$ARGUMENTS/SKILL.md` exists. If not, list available skills:

```bash
ls .claude/skills/
```

## Step 2 — Launch product-reviewer

Launch the `product-reviewer` subagent with the task:

> Audit the skill `$ARGUMENTS` against its SKILL.md. Read the spec, then verify implementation against each acceptance criterion, each guard rail, and each rollout phase. Output the structured verdict.

## Step 3 — Display verdict to the user

Format the response cleanly:

```
=== SKILL AUDIT: $ARGUMENTS ===

VERDICT: <READY_TO_SHIP | READY_FOR_PILOT | NEEDS_WORK | BLOCK>

ACCEPTANCE CRITERIA (X/Y met):
  ✅ <criterion 1>
  ❌ <criterion 2>: <gap>
  🟡 <criterion 3>: partial — <details>

GUARD RAILS (X/Y active):
  ✅ <rail 1>
  ❌ <rail 2>: <missing>

CRITICAL GAPS (must fix before ship):
  - <gap 1>
  - <gap 2>

NICE TO HAVE (follow-ups):
  - <item 1>

RECOMMENDED ROLLOUT PHASE: <phase>

=== END AUDIT ===
```

## Step 4 — If gaps exist, suggest next action

If verdict is `NEEDS_WORK` or `BLOCK`, suggest the right command:
- Backend gap → re-run the relevant `/skill-*` command focusing on backend
- Test gap → manually launch `qa-tester`
- Compliance gap → manually launch `security-compliance-auditor`
- Prompt gap → manually launch `prompt-engineer`

If verdict is `READY_FOR_PILOT`, list the specific Phase 2 features to implement next.

If verdict is `READY_TO_SHIP`, suggest running `/ship-check` before merging.
