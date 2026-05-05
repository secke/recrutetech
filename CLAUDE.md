# RecruteTech — Project Context for Claude Code

## What this project is

**RecruteTech AI Interviewer** is a voice-first AI recruitment platform built around **Aria** (an ElevenLabs Conversational AI agent) that conducts autonomous technical interviews. Currently in MVP for **tech roles only** (backend, frontend, fullstack, data, devops).

Stack snapshot:
- **Backend**: FastAPI, SQLModel, PostgreSQL (prod) / SQLite (dev), Anthropic SDK (Claude Opus 4.7), ElevenLabs API
- **Frontend**: React 18, TailwindCSS, Vite, Monaco Editor, MediaPipe, WebRTC
- **Infrastructure**: Docker, expected on AWS/GCP

Key entities (in `backend/app/models.py`):
- `Role` — a job position with system_prompt for Aria (will migrate to `Rubric` per the structured-rubric-builder skill)
- `Interview` — one candidate session, with public_token, transcript, visual_metrics, evaluation
- `Company` — multi-tenant boundary

## Roadmap

10 skills are specified in `.claude/skills/` and are being implemented in two waves:

**Wave 1 (P0)** — Cœur du différenciateur produit:
1. structured-rubric-builder
2. cv-adaptive-personalization
3. transparent-scoring-explainability
4. candidate-practice-mode
5. live-coding-evaluator
6. anti-cheating-integrity-layer

**Wave 2 (P1)** — Compliance + expansion B2B:
7. fairness-bias-audit
8. accessibility-accommodations
9. ats-integration-hub
10. identity-verification-deepfake-defense

The full benchmark + roadmap is at `00-BENCHMARKING-REPORT.md`.

## How to work in this repo

### To implement a skill end-to-end

Use the dedicated slash command:
```
/skill-<name>
```

(See `.claude/commands/` for the list. Or run `/implement-roadmap` to see what to do next.)

### To check a skill is truly done

```
/audit-skill <name>
```

### Before merging anything

```
/ship-check
```

### To run a bias audit

```
/run-bias-audit
```

## Coding conventions

### Backend (Python)

- **Type hints everywhere**, Pydantic v2 for I/O schemas
- **Async by default** for I/O-bound code
- **No raw SQL** — use SQLModel/SQLAlchemy expressions
- **Settings via** `app.core.config.settings` — never read env directly
- **Logging**: structured (JSON in prod, human in dev), never log raw PII above DEBUG

### Frontend (React)

- **Functional components + hooks only**
- **TailwindCSS core utilities** (no custom config additions)
- **i18n always**: strings in `STRINGS.fr`, `STRINGS.en`, `STRINGS.ar`
- **Accessibility first**: aria-label, keyboard nav, focus rings, contrast 4.5:1+
- **Never** `localStorage`/`sessionStorage` if using artifact-style isolation; use backend storage

### Database

- **Backward compat**: never drop/rename in one migration on live DB; expand-contract pattern
- **All datetimes UTC**, `_at` suffix
- **Indexed FK columns** (SQLite quirk)
- **JSON columns** for read-only documents (rubrics, parsed CVs); relational for queryable

### Prompts

- **Versioned**: bump `prompt_version` on meaningful changes, store with output
- **JSON output enforced** via tool_use or strict instruction
- **Protected attributes excluded** explicitly in every evaluation prompt
- **Aria prompts ≤ 1500 tokens** (ElevenLabs limit)

## Hard rules (non-negotiable)

1. **No automated rejection** of any candidate. All flags → human REVIEW.
2. **Article 9 RGPD consent** required for biometrics — separate, granular checkbox.
3. **No protected-attribute scoring**: age, race, ethnicity, religion, gender, disability, accent, school name.
4. **Bias audit must pass** (4/5 rule on 8 categories) before any rubric ships to prod.
5. **No secrets in code**. Use settings + env. Pre-commit hook verifies.
6. **Right to explanation** (RGPD Art. 22) implemented for every automated evaluation.
7. **Recourse**: every flagged candidate can request a human follow-up within 7 days.

## File layout reference

```
recrutech/
├── backend/
│   ├── app/
│   │   ├── api/             ← FastAPI routes
│   │   ├── services/        ← business logic
│   │   ├── integrations/    ← external systems (ATS, KYC, sandbox)
│   │   ├── models.py        ← SQLModel tables
│   │   ├── core/config.py   ← settings
│   │   └── db.py            ← engine
│   ├── alembic/             ← migrations
│   ├── tests/
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/      ← leaf components + shared.jsx
│   │   ├── screens/         ← full pages
│   │   ├── hooks/
│   │   └── __tests__/
│   └── package.json
│
└── .claude/
    ├── skills/              ← skill specifications
    ├── agents/              ← subagent definitions
    ├── commands/            ← slash commands
    └── README.md            ← how to use this setup
```

## Subagent dispatch policy

When you (Claude) work on this codebase via Claude Code:

- **Backend Python work** → use `backend-engineer`
- **React/UI work** → use `frontend-engineer`
- **DB schema or migration** → use `db-architect` BEFORE backend-engineer
- **Aria/Claude prompts** → use `prompt-engineer` (opus model)
- **External APIs / sandbox / ATS** → use `integration-engineer`
- **Tests + evals** → use `qa-tester`
- **Pre-merge security review** → use `security-compliance-auditor` (opus)
- **Final certification** → use `product-reviewer` (opus)
- **Documentation** → use `docs-writer`

Run them in parallel only when their work is genuinely independent. Most P0 skills require sequential dispatch: db → prompt + backend + integration → frontend → tests → review.
