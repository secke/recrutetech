---
description: Implement the anti-cheating-integrity-layer skill — defense questions, behavioral signals, code forensics. P0 critical for 2026 (Cluely et al.). ~3-4 weeks.
allowed-tools: Read, Grep, Glob, Bash, Task
---

# Implement: anti-cheating-integrity-layer

Skill spec: `@.claude/skills/anti-cheating-integrity-layer/SKILL.md`

**The most important differentiator skill of 2026.** 79% of cheating uses invisible overlay tools. Our angle: integrity LAYER, not invasive proctoring.

## Phased rollout (current target: Phase 1)

Phase 1: Defense questions only. The conversational layer is the highest-ROI, lowest-cost defense. Add passive signals and code forensics in Phase 2.

## Plan for Phase 1

**DB** (delegate to `db-architect`):
- New table `DefenseQuestion` (id, type, template, role_tags, seniority_min, languages)
- Add to `Interview`: `integrity_score FLOAT`, `integrity_signals_json TEXT`, `integrity_flags_json TEXT`, `defense_responses_json TEXT`
- Seed migration with 50+ defense questions across 5 types (justification, tradeoff, recall, modify, consistency) for Python/JS/Go backend roles in FR + EN

**Prompts** (delegate to `prompt-engineer`) — this is THE critical part of Phase 1:
- Aria system prompt extension: when to insert defense questions (mid-session, after candidate makes a strong claim, never in opener/closer)
- Defense question selection logic prompt: given current transcript context, pick the 2-4 best defense questions
- Claude post-call evaluation prompt: given transcript + defense responses + code events → output integrity_score, flags, recommendation_for_hr
- Output schema strict: `{integrity_score, confidence, signals, flags[], ai_assistance_likelihood, recommendation_for_hr}`

**Backend** (delegate to `backend-engineer`):
- Service `integrity_service.py`:
  - `select_defense_questions(rubric, cv_parsed, language) -> list[DefenseQuestion]`
  - `evaluate_integrity(interview) -> IntegrityResult` calling Claude Opus 4.7 post-call
- Hook into existing `report_service.py`: integrity evaluation runs in parallel with HR report, both feed into final report
- Endpoint `GET /api/interviews/{token}/integrity` for HR dashboard

**Frontend** (delegate to `frontend-engineer`):
- HR dashboard: add integrity panel on candidate detail page — score, flags timeline (clickable to replay video at timestamp), evidence excerpts
- Pre-interview consent text update: "Cet entretien utilise une analyse d'intégrité conversationnelle. Aucune surveillance invasive n'est utilisée."
- "Request human follow-up" button visible to flagged candidates (recourse mechanism)
- i18n: FR + EN

**Tests** (delegate to `qa-tester`):
- 50-session synthetic eval:
  - 25 authentic candidates (varied profiles, including non-native speakers, neurodivergent patterns simulated)
  - 25 simulated cheaters (Cluely-like patterns: burst paste, robotic phrasing, defense question failures)
  - Assert detection rate ≥ 80%, false positive rate ≤ 10%
- Cross-group fairness: false positive rate must NOT differ significantly by simulated minority group (chi-square p > 0.05)
- This eval becomes the gate — if FPR is too high on minorities, BLOCK and revise prompts

**Security review** (delegate to `security-compliance-auditor`):
- Verify NO automatic rejection (always REVIEW status)
- Verify recourse mechanism (human follow-up within 7 days)
- Verify candidate transparency (consent text visible, no hidden surveillance)
- Verify no monitoring outside the interview tab (no keylogger, no full-screen capture)

**Docs** (delegate to `docs-writer`):
- HR runbook: how to read the integrity report, how to handle a flagged candidate fairly
- Candidate FAQ: "Why was I flagged?" with reassurance + recourse process
- Runbook for adding new defense questions

## Success gate

- 80% detection / ≤10% FPR met on synthetic eval
- Zero disparate impact on simulated minority candidates
- `security-compliance-auditor` verdict ≥ APPROVE_WITH_NOTES
- Recourse mechanism live and documented

## Phase 2 follow-up (separate command)

Passive signals (audio TTS detection, visual deepfake flags, keystroke patterns) + code forensics (perplexity, paste burst analysis). Run `/skill-anti-cheating-phase2` later.

Now execute. Confirm before launching subagents.
