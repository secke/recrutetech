---
description: Implement the cv-adaptive-personalization skill — CV ingestion, Claude-powered parsing, dynamic Aria prompt personalization. P0, ~2 weeks.
allowed-tools: Read, Grep, Glob, Bash, Task
---

# Implement: cv-adaptive-personalization

Skill spec: `@.claude/skills/cv-adaptive-personalization/SKILL.md`

This is a **P0** skill, the differentiator vs Mercor's "rigid, scripted" feel.

## Phased rollout (current target: Phase 1 — silent)

Phase 1 silent: generate the personalized prompt but don't yet inject into Aria. Validate on 100 interviews, then Phase 2 opt-in.

## Plan

**DB** (delegate to `db-architect`):
- Add columns to `Interview`: `cv_text TEXT`, `cv_parsed_json JSONB`, `personalized_prompt TEXT`, `cv_consent_processing BOOL`
- Migration with backward compat (all nullable)
- Add index on `cv_consent_processing` for analytics queries

**Backend** (delegate to `backend-engineer`):
- New endpoint `POST /api/interviews/{token}/cv` — accepts file (PDF/DOCX/TXT) or pasted text
- New service `cv_parsing_service.py`:
  - `parse_cv(text: str) -> CVParsedSchema` using Claude Opus 4.7
  - `compose_personalized_prompt(role: Role, cv_parsed: CVParsedSchema) -> str`
- Hook into `start_interview` flow: if `cv_parsed_json` exists AND consent given, inject `personalized_prompt` into ElevenLabs `overrides.agent.prompt.prompt`
- Background job for mid-interview adaptation (deferrable to Phase 2; Phase 1 = pre-interview only)

**Prompts** (delegate to `prompt-engineer`):
- Design the CV parsing prompt with a strict JSON schema output
- Schema fields: `candidate_name`, `years_of_experience`, `seniority_inferred`, `primary_stack`, `secondary_stack`, `domains`, `notable_projects[]`, `potential_red_flags`, `suggested_deep_dive_topics`, `language_signals`
- **Critical**: prompt MUST exclude age, school name, city, ethnicity, gender from extraction. Add explicit DO NOT EXTRACT block.
- Design the prompt template that wraps the role's base system prompt with the personalization layer
- Provide 3 worked examples for QA

**Frontend** (delegate to `frontend-engineer`):
- Add CV upload step to candidate pre-interview flow (between consent and mic check)
- Three input modes: file drop, paste, "skip" button
- Consent checkbox: "J'autorise l'analyse de mon CV par l'IA pour personnaliser cet entretien"
- Privacy notice link to RGPD policy
- Loading state while parsing (~5-8s)
- i18n: FR + EN

**Tests** (delegate to `qa-tester`):
- 20 synthetic CVs (juniors/mids/seniors across Python/JS/Go/Data) — assert ≥18/20 produce valid JSON
- Protected-attribute leakage test: 5 CVs with diverse names/schools/ages, assert NONE appear in personalized_prompt
- Latency test: P95 < 8s
- A/B eval (Phase 2 prep): collect 20 personalized vs 20 non-personalized session ratings — defer NPS to pilot

**Security review** (delegate to `security-compliance-auditor`):
- Verify Art. 9 not triggered (no biometric/health data extraction from CV)
- Verify retention: cv_text purged at 90 days
- Verify consent flow (separate, granular)

**Docs** (delegate to `docs-writer`):
- API endpoint docs
- Candidate consent text (FR/EN)
- HR setting "enable CV personalization for this role" (defer UI to Phase 2)

## Success gate

`product-reviewer` must return `READY_FOR_PILOT` (Phase 1 silent shipping is acceptable).

Now execute the plan. Confirm with the user before launching subagents.
