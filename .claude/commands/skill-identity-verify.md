---
description: Implement identity-verification-deepfake-defense — liveness detection, voice baseline, deepfake detectors. P1, ~12 weeks across 5 phases. Counters FBI 2024-2025 fraud alerts.
allowed-tools: Read, Grep, Glob, Bash, Task
---

# Implement: identity-verification-deepfake-defense

Skill spec: `@.claude/skills/identity-verification-deepfake-defense/SKILL.md`

**P1**. Counters the FBI 2024-2025 alert on deepfake-assisted job fraud. Required for fintech/defense/public sector deals.

## Phased rollout (current target: Phase 1 — MVP minimal)

Phase 1: ID document capture + selfie liveness + voice baseline (3 weeks). Subsequent phases in separate commands.

## Plan for Phase 1

**DB** (delegate to `db-architect`):
- New table `CandidateIdentity` (candidate_email PK, id_doc_type, id_doc_extracted_json, faceprint_hash, voiceprint_hash, verification_status, last_verified_at)
- **Critical RGPD**: faceprints and voiceprints stored as cryptographic hashes/embeddings, NEVER raw images/audio
- Add to `Interview`: `identity_verification_score`, `identity_checks_json`

**Integration** (delegate to `integration-engineer`) — bulk of the work:
- Selfie liveness: implement challenge-response (follow point with eyes, smile, head turn)
- Use `face-api.js` or MediaPipe Face Mesh on the frontend for landmark tracking
- Use `face_recognition` Python library or AWS Rekognition for face matching (selfie vs ID photo)
- Voice baseline: use `Resemblyzer` (open source) for voiceprint embedding
- ID document OCR: use Tesseract for MVP, plan for upgrade to AWS Textract or Azure Document Intelligence in Phase 5
- All biometric processing happens **on the backend**, never on frontend (control of accuracy + audit)

**Backend** (delegate to `backend-engineer`):
- Endpoint `POST /api/candidates/identity/upload-id` — accepts file, OCR, returns extracted fields for confirmation
- Endpoint `POST /api/candidates/identity/liveness-challenge` — generates challenge sequence
- Endpoint `POST /api/candidates/identity/liveness-result` — receives challenge response frames + audio sample
- Service `identity_service.py`:
  - `extract_id_data(image_bytes) -> IDDocument`
  - `verify_liveness(challenge_response) -> float` (0-1 confidence)
  - `match_face(selfie, id_photo) -> float` (similarity score)
  - `compute_voiceprint(audio) -> bytes` (embedding)
  - `match_voice(audio, baseline_print) -> float`

**Prompts** (delegate to `prompt-engineer`):
- Aria opener variant: when identity_verification is enabled, Aria asks the candidate to "say a sentence to verify your voice" using a randomly-generated phrase (anti-replay)
- Generate phrases that include phonemes that change across deepfakes (sibilants, vowel transitions)

**Frontend** (delegate to `frontend-engineer`):
- New onboarding flow `/candidate/identity` (one-time per candidate):
  1. ID document upload (camera or file)
  2. OCR confirmation: "Is this name correct?" — candidate validates
  3. Selfie liveness: 3 challenges (follow point, smile, head turn)
  4. Voice baseline: read 3 sentences
- Pre-interview re-check screen: 5-second microliveness + 10-second voice match
- Clear consent text for biometric processing (Art. 9 RGPD — separate, granular)
- Accommodation alternatives:
  - Candidate with visual impairment: liveness via voice-only commands
  - Candidate with non-standard ID (refugee, gender transition, etc.): free-text explanation accepted, escalates to human review without auto-flag
- i18n: FR + EN

**Tests** (delegate to `qa-tester`):
- 100 authentic candidates (diverse: 30%+ from minority groups) → false positive rate < 3%
- 100 simulated frauds (deepfake images, printed photos, voice clones via off-the-shelf cloning tool) → detection rate > 85%
- Bias: false positive rate must NOT differ significantly across ethnic groups (chi-square p > 0.05) — this is the critical eval, biometric models are notoriously biased
- Latency: onboarding < 3 minutes, recheck < 30 seconds
- Degraded network test (3G/4G simulated): no false rejection due to latency

**Security review** (delegate to `security-compliance-auditor`) — **most important review of any skill**:
- RGPD Article 9 explicit consent for biometric processing — verified separate checkbox, granular, opt-in
- Biometric data: only embeddings/hashes stored, never raw — verified in DB schema and code
- Retention: 90 days max, auto-purge job in place
- No transmission to third parties (KYC providers are Phase 5, opt-in only)
- No data shared between companies (tenant isolation)
- Recourse: candidate can request human verification within 7 days of any flag
- No automatic rejection — always REVIEW status for HR
- No transmission to authorities, ever

**Docs** (delegate to `docs-writer`):
- Candidate FAQ: what is captured, why, how long it's kept, how to delete it
- Special-case guides: refugees, gender transition, adoption (accept free-text explanation)
- HR runbook: how to handle a flagged identity (always escalate, never auto-reject)
- DPO documentation for Article 9 processing

## Success gate

- All 4 fairness criteria met (FPR < 3%, detection > 85%, no group disparity, no latency-related false rejections)
- `security-compliance-auditor` verdict = APPROVE (lower verdict = BLOCK)
- DPO has signed off on the Article 9 processing record
- Recourse mechanism live and tested

## Phase 2-5 follow-ups (separate commands)

- `/skill-identity-recheck` — Phase 2 (recheck on each interview start)
- `/skill-identity-continuous` — Phase 3 (continuous video/audio consistency monitoring)
- `/skill-deepfake-detection` — Phase 4 (FaceForensics++, Resemble Detect)
- `/skill-identity-kyc-tier` — Phase 5 (Onfido/Veriff for Enterprise tier)

## Hard rule

**This skill BLOCKS deployment if the bias eval shows even one group with >5% FPR**. Biometric bias is a known issue (NIST FRVT) and we will not ship it discriminatory. If models are insufficient, we ship with manual review fallback only and call it Phase 0.5.

Now execute. Confirm before launching subagents.
