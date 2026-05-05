# RecruteTech — Claude Code Configuration

This directory configures **Claude Code** with subagents and slash commands tailored for the RecruteTech AI Interviewer project.

## 📂 Structure

```
.claude/
├── skills/                   ← Specifications (deposited earlier)
│   ├── cv-adaptive-personalization/SKILL.md
│   ├── live-coding-evaluator/SKILL.md
│   └── ... (10 total)
│
├── agents/                   ← Subagent definitions (8 agents)
│   ├── backend-engineer.md
│   ├── frontend-engineer.md
│   ├── db-architect.md
│   ├── prompt-engineer.md
│   ├── integration-engineer.md
│   ├── qa-tester.md
│   ├── security-compliance-auditor.md
│   ├── docs-writer.md
│   └── product-reviewer.md
│
└── commands/                 ← Slash commands (15 commands)
    ├── implement-skill.md             ← Generic, takes any skill name
    ├── implement-roadmap.md           ← Roadmap status & next action
    ├── ship-check.md                  ← Pre-merge gate
    ├── run-bias-audit.md              ← Synthetic bias audit
    ├── audit-skill.md                 ← Audit a single skill
    │
    ├── skill-rubric-builder.md        ← P0
    ├── skill-cv-personalization.md    ← P0
    ├── skill-transparency.md          ← P0
    ├── skill-practice-mode.md         ← P0
    ├── skill-live-coding.md           ← P0
    ├── skill-anti-cheating.md         ← P0
    ├── skill-fairness-audit.md        ← P1
    ├── skill-accessibility.md         ← P1
    ├── skill-ats-hub.md               ← P1
    └── skill-identity-verify.md       ← P1
```

## 🚀 Quick start

### 1. See what to build next

```
/implement-roadmap
```

This audits the current state of the codebase and tells you which skill to start next.

### 2. Implement a skill

For each P0 skill, run its dedicated command. Suggested order:

```
/skill-rubric-builder
/skill-cv-personalization
/skill-transparency
/skill-practice-mode
/skill-live-coding
/skill-anti-cheating
```

Each command:
1. Reads the skill specification
2. Produces a plan
3. **Asks for confirmation** before launching subagents
4. Dispatches subagents in the right order
5. Reports the final verdict

### 3. Pre-merge check

Before opening a PR:

```
/ship-check
```

This runs tests, security audit, bias audit, and product review. **Blocks** if anything fails.

### 4. Audit a single skill

To check whether a skill is truly done:

```
/audit-skill cv-adaptive-personalization
```

### 5. Run a bias audit anytime

```
/run-bias-audit 200
```

(`200` is the sample size per group; default 200, MVP minimum 50)

## 🤖 Subagents — what they do

| Agent | Role | Model | Use when |
|---|---|---|---|
| `backend-engineer` | FastAPI/Python services & endpoints | sonnet | Implementing backend code |
| `frontend-engineer` | React/Tailwind components | sonnet | Implementing UI |
| `db-architect` | SQLModel schema & Alembic migrations | sonnet | Schema design needed |
| `prompt-engineer` | Aria + Claude prompts | opus | Designing prompts (use opus for quality) |
| `integration-engineer` | External APIs, sandboxes, ATS | sonnet | Crossing trust boundary |
| `qa-tester` | Tests, evals, acceptance verification | sonnet | After implementation |
| `security-compliance-auditor` | RGPD, AI Act, AEDT, security | opus | Before merge |
| `docs-writer` | API docs, runbooks, candidate copy | sonnet | After implementation |
| `product-reviewer` | Final certification per skill | opus | End of skill implementation |

Subagents are launched automatically by slash commands but can also be invoked directly via the `Task` tool when needed.

## 🔒 Hard rules built into the workflow

These are enforced by the `security-compliance-auditor` and `product-reviewer` agents:

1. **No automated rejection** — every flagged candidate gets a human review path
2. **No biometric data without Article 9 RGPD consent** — separate, granular checkbox
3. **No protected-attribute scoring** — age, race, gender, disability, etc.
4. **No secrets in code** — gitleaks-style scan
5. **No skill ships without bias audit pass** — 4/5 rule on 8 categories
6. **No PR merges with `BLOCK` verdict** from any reviewer

## 📊 Recommended sprint plan

Based on the benchmarking report ICE scoring:

| Sprint | Commands | Outcome |
|---|---|---|
| 1-2 | `/skill-rubric-builder`, `/skill-cv-personalization` | Foundation + personalization differentiator |
| 3-4 | `/skill-transparency`, `/skill-practice-mode` | Trust + growth flywheel |
| 5-7 | `/skill-live-coding`, `/skill-anti-cheating` | Tech depth + 2026 critical integrity layer |
| 8-10 | `/skill-fairness-audit`, `/skill-accessibility` | Compliance + ACLU-proof |
| 11-14 | `/skill-ats-hub` (Phase 1 then 2) | B2B mid-market unlock |
| 15-20 | `/skill-identity-verify` (Phase 1 then 2-5) | Enterprise readiness |

## 🆘 Troubleshooting

**A command says "skill spec not found"** → make sure the skill files were deposited in `.claude/skills/<name>/SKILL.md`

**A subagent timed out** → try running it in series (one subagent at a time) instead of parallel. Some long-running tasks need it.

**Bias audit blocks a PR I'm sure is fine** → review the flagged categories in the report. The audit is conservative on purpose. If you've validated by hand that the flag is a false positive, document it in the PR description. Do NOT bypass the 4/5 rule blindly.

**Two subagents disagree** (e.g., backend-engineer + security-compliance-auditor) → the orchestrator should surface the disagreement to you. Default to security if it's about Article 9 / biometrics / PII.

## 📞 Maintenance

- **Updating a skill spec**: edit `.claude/skills/<name>/SKILL.md`. Re-run `/audit-skill <name>` to check whether the implementation still matches.
- **Adding a new agent**: drop a new `.md` file in `.claude/agents/` with the YAML frontmatter format used by the existing agents.
- **Adding a new command**: drop a new `.md` file in `.claude/commands/` with the YAML frontmatter and use `$ARGUMENTS` for parameters.
