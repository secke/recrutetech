---
description: Implement candidate-practice-mode — free unlimited practice interviews, formative feedback, viral growth loop. P0, ~2 weeks.
allowed-tools: Read, Grep, Glob, Bash, Task
---

# Implement: candidate-practice-mode

Skill spec: `@.claude/skills/candidate-practice-mode/SKILL.md`

**P0** for growth flywheel. Mercor offers 3 retakes; we offer unlimited. Cost per session ~$1, viral value priceless.

## Phased rollout (current target: Phase 1 — MVP)

Phase 1: 3 role types (Backend, Frontend, Data), French language, 2 durations (short/medium). Iterate from there.

## Plan

**DB** (delegate to `db-architect`):
- New table `PracticeSession` — fully isolated from `Interview` table to avoid any leak into HR dashboards
- Fields: public_token, role_type, seniority, language, duration_choice, started_at, completed_at, candidate_email (nullable), transcript, practice_report_json
- **Crucially**: NO candidate_score, NO hiring_recommendation, NO company_id linkage

**Backend** (delegate to `backend-engineer`):
- Public endpoint `POST /api/practice/start` — no auth required, creates session, returns ElevenLabs signed_url
- Endpoint `GET /api/practice/{token}/report` — returns the formative report once generated
- Service `practice_service.py`:
  - `start_practice_session(role_type, seniority, language, duration)`
  - `generate_practice_report(session)` calling Claude Opus 4.7 with the practice-specific prompt
- Rate limiting (delegate the implementation to `integration-engineer`):
  - 3 sessions per IP per 24h
  - 10 sessions per email per 7 days

**Prompts** (delegate to `prompt-engineer`):
- Aria prompt variant for practice mode (more coaching, less pressure, hint button visible)
- Claude practice-report prompt — the *opposite tone* of the HR report:
  - 2-3 strengths with verbatim quotes
  - 2-3 growth areas with actionable tips
  - 1-2 model answer examples
  - Next-practice recommendation
  - **NO numeric score**, **NO hiring framing**, **NO comparison**
  - Match candidate's interview language exactly

**Frontend** (delegate to `frontend-engineer`):
- New public landing page `/practice` — role/seniority/language/duration selection, no signup wall
- Practice interview screen reusing 90% of existing interview components
- Visible watermark: "MODE PRACTICE — aucune entreprise n'a accès à cette session"
- Buttons added vs prod: "Pause/Resume", "Ask for hint", "Restart this question" (3 max)
- Practice report page with actionable feedback layout
- Optional email capture at end (to email the report)
- "Share my journey" social card generator (opt-in only)
- Referral link generation: `/practice?ref=USER_TOKEN`
- i18n: FR (Phase 1)

**Integration** (delegate to `integration-engineer`):
- IP-based rate limiter (Redis or in-memory for MVP)
- Email rate limiter
- Anti-bot detection: flag sessions < 60s or with abnormal turn timing

**Tests** (delegate to `qa-tester`):
- Functional: practice session can be started without auth in <30s
- Cost test: full session (audio + Claude) < $1
- Sanitization: practice sessions never appear in any HR dashboard query (audit SQL)
- Report quality manual eval: 10 internal team members run a session, rate the report 1-10. Median ≥ 8.

**Security review** (delegate to `security-compliance-auditor`):
- Practice data NEVER feeds model training (explicit in privacy notice)
- Retention 30 days, then purge
- Public endpoint hardening: rate limits, captcha consideration if abuse detected

**Docs** (delegate to `docs-writer`):
- Public-facing landing page copy (FR)
- Privacy notice specific to practice mode
- Marketing one-pager for the team to share

## Success gate

- 10 internal users complete a practice session and rate the report ≥8/10 median
- Cost per session verified <$1
- Rate limiter tested under load
- Public landing page copy reviewed by 2 native French speakers

## KPIs to instrument from day 1

Build a basic admin dashboard:
- Sessions/day
- Completion rate (started vs finished)
- 14-day retention
- Email captures
- Referral clicks

Now execute. Confirm before launching subagents.
