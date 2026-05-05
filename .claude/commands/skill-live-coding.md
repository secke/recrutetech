---
description: Implement the live-coding-evaluator skill — Monaco editor, secure sandbox execution, Aria-supervised coding sessions. P0, ~3-4 weeks.
allowed-tools: Read, Grep, Glob, Bash, Task
---

# Implement: live-coding-evaluator

Skill spec: `@.claude/skills/live-coding-evaluator/SKILL.md`

P0 skill. The differentiator that gives RecruteTech depth HireVue and Mercor lack.

## Phased rollout (current target: Phase 1)

Phase 1 = Python only, 5-10 challenges, sandbox via Judge0 self-hosted. Validate on internal interviews before opening to clients.

## Plan

**DB** (delegate to `db-architect`):
- New table `CodingChallenge` (statement_md, starter_code JSON per language, hidden_tests JSON, public_tests JSON, expected_concepts, aria_hints, aria_defense_questions, time_limit_minutes, role_tags)
- Add to `Interview`: `code_challenge_id FK`, `code_session_json TEXT`, `code_evaluation_json TEXT`
- Seed migration with 5-10 Python challenges of varied difficulty

**Integrations** (delegate to `integration-engineer`):
- Spin up Judge0 self-hosted via Docker Compose, network-isolated
- Or sign up for Piston API as fallback / dev simplicity
- New endpoint `POST /api/interviews/{token}/code/run` — proxies to sandbox with hard limits (256MB RAM, 5s CPU, 10s timeout, no network)
- New endpoint `POST /api/interviews/{token}/code/snapshot` — receives keystroke/event snapshots from frontend every 3-5s
- Operational runbook for Judge0 monitoring + restart

**Backend** (delegate to `backend-engineer`):
- Service `coding_session_service.py`:
  - `select_challenge(role, cv_parsed) -> CodingChallenge` — uses role tags + CV stack signals
  - `record_event(token, event)` — appends to `code_session_json.events`
  - `evaluate_session(token) -> dict` — calls Claude Opus 4.7 with code history, events, tests, hints used
- Background job triggered at session end → runs evaluation → stores in `code_evaluation_json`
- Aria context update: every 60s, push a coding-state summary to ElevenLabs agent for Aria to comment on

**Prompts** (delegate to `prompt-engineer`):
- Aria coding-supervisor prompt fragment: how to ask defense questions, how to give graduated hints, how to comment on test failures
- Claude code-evaluation prompt with strict JSON schema:
  - `code_correctness`, `code_quality`, `problem_solving_approach`, `verbalization`, `autonomy`, `ai_assistance_likelihood`, `concept_coverage`, `evidence[]`, `summary_for_hr`

**Frontend** (delegate to `frontend-engineer`):
- New screen `LiveCodingChallenge.jsx` with Monaco editor, problem statement panel, test results panel, timer, "Run", "Submit", "I'm stuck" buttons
- WebSocket integration: push code snapshots every 3-5s, receive Aria messages
- Keyboard event tracking (paste detection, tab-switch via `document.visibilitychange`)
- Mobile-friendly (collapsible panels for narrow viewports)
- Accommodation: "untimed" mode disables timer countdown
- i18n: FR + EN

**Tests** (delegate to `qa-tester`):
- Sandbox security tests: fork bomb, network access attempt, FS write outside `/tmp`, infinite loop — all must fail safely
- Roundtrip latency test: code change → run result < 1s P95
- 30-session synthetic eval: 10 juniors / 10 mids / 10 seniors → assert correlation `problem_solving_approach` ↔ seniority r ≥ 0.6
- AI-likelihood detection cross-check with `anti-cheating-integrity-layer`: r ≥ 0.7

**Security review** (delegate to `security-compliance-auditor`):
- Sandbox isolation verified
- No PII in code logs above DEBUG
- Retention: code 90 days then purge

**Docs** (delegate to `docs-writer`):
- HR docs: how to add custom challenges
- Candidate-facing: timer + accommodations explained
- Operational runbook: Judge0 restart, capacity planning

## Success gate

- Sandbox passes all security tests (no exception)
- `product-reviewer` returns `READY_FOR_PILOT`
- Phase 2 (JS/TS/Go) is a follow-up command, not part of this run

Now execute. Confirm with the user before launching subagents.
