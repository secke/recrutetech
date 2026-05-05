---
description: Implement accessibility-accommodations — text chat mode, subtitles, untimed mode, multilingual verbalization, FALC. P1, ~3 weeks. Legal shield (anti-ACLU/HireVue) + ethical differentiator.
allowed-tools: Read, Grep, Glob, Bash, Task
---

# Implement: accessibility-accommodations

Skill spec: `@.claude/skills/accessibility-accommodations/SKILL.md`

**P1**. Sapia.ai owns the neurodiversity narrative — let's beat them by adding accommodations to a *voice-first* platform. Also: prevents an ACLU-style lawsuit.

## Plan

**DB** (delegate to `db-architect`):
- New table `InterviewAccommodations` (interview_id PK FK, text_chat_mode bool, live_subtitles bool, visual_metrics_disabled bool, untimed bool, multilingual_verbalization bool, falc_mode bool, forced_breaks bool, activated_at, activated_during_session bool)
- **Strict** schema: NO field for "reason", "diagnosis", "medical_proof". Even if HR/admin asks, refuse to add it.

**Backend** (delegate to `backend-engineer`):
- Endpoint `POST /api/interviews/{token}/accommodations` — saves accommodations (idempotent, can be called pre or during session)
- Service hooks into:
  - `report_service.py`: when `visual_metrics_disabled=true`, exclude eyeContactRatio/smileRatio/attentionRatio from Claude prompt
  - `report_service.py`: when `multilingual_verbalization=true`, add prompt instruction "DO NOT score on French/English fluency, candidate may verbalize in mother tongue"
  - Aria orchestration: when `untimed=true`, suppress "we're running short on time" prompts
  - `live-coding-evaluator`: when `untimed=true`, timer is informational only

**Prompts** (delegate to `prompt-engineer`):
- Aria FALC variant: simple French (CECRL B1 max), short sentences, no idioms — wrap each Aria question in a reformulation step
- Multilingual verbalization handling: Aria acknowledges if candidate slips into AR/Wolof/EN, accepts the answer, gently brings them back without penalty
- Subtitle generation: reuse Whisper transcription in real-time

**Integration** (delegate to `integration-engineer`):
- Real-time subtitles via Whisper streaming on Aria's audio output
- Text chat mode: bypasses ElevenLabs voice synthesis, uses Claude Haiku 4.5 for conversation (lower cost, faster) over WebSocket
- Pause/resume mechanism in Aria session (ElevenLabs supports this via `agent.pause`)

**Frontend** (delegate to `frontend-engineer`):
- Pre-interview "Adaptations" section with 7 toggles, respectful intro: *"Vous pouvez personnaliser votre expérience. Aucune adaptation choisie ne sera mentionnée dans votre évaluation et n'affectera votre score."*
- No "reason" field. No "medical proof" field.
- Each toggle has a clear 1-2 line description (no jargon)
- During-session activation: floating accessibility menu always visible
- Text chat mode: full chat UI fallback, voice-toggle to switch back if desired
- Live subtitles overlay on Aria avatar
- WCAG 2.2 AA full compliance: keyboard navigation, focus rings, color contrast 4.5:1 minimum, screen reader friendly
- i18n: FR + EN + AR (Phase 1)

**Tests** (delegate to `qa-tester`):
- Functional: each accommodation toggle produces the expected behavior change
- 30-candidate eval each on text-chat vs voice mode → distributions equivalent (Mann-Whitney p > 0.05)
- 30-candidate eval each on untimed vs timed → distributions equivalent
- Automated WCAG audit via axe-core: 0 violations on candidate-facing pages
- User testing with partner associations (sourds, neurodivergence, PMR visuel) — NPS ≥ 8

**Security review** (delegate to `security-compliance-auditor`):
- Accommodation choices NEVER appear in HR report (only "Accommodations applied" at most)
- No medical/diagnostic data collected
- Verify scoring pipeline disables visual signals when flag is set (code review of report_service.py)

**Docs** (delegate to `docs-writer`):
- Candidate copy for each accommodation (FR/EN/AR)
- HR docs: how RecruteTech treats accommodations + equity policy statement
- Partnership outreach materials for accessibility associations

## Success gate

- WCAG 2.2 AA: 0 violations
- Mann-Whitney equivalence test: pass for each accommodation mode
- 1 partner association tested and gave positive feedback
- `product-reviewer` returns READY_TO_SHIP

## Marketing angle

Once shipped, build a partnership program with:
- 1 association sourds (e.g. ANPSA, FNSF)
- 1 association neurodiversité (e.g. Autisme France, GEM TDAH)
- 1 association PMR visuel
Each partner gets early access + co-branded testimonials.

Now execute. Confirm before launching subagents.
