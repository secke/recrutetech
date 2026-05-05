---
description: Implement ats-integration-hub — Greenhouse + Lever + webhook generic in Phase 1, then Teamtailor/Recruitee/Ashby/Workday. P1, ~6-10 weeks total. Unlocks B2B mid-market.
allowed-tools: Read, Grep, Glob, Bash, Task
---

# Implement: ats-integration-hub

Skill spec: `@.claude/skills/ats-integration-hub/SKILL.md`

**P1**. Without ATS integrations, RecruteTech stays SMB-only. Each connector unlocks a market segment.

## Phased rollout (current target: Phase 1)

Phase 1 = Greenhouse + Lever + Generic Webhook (3 weeks). Phase 2-4 follow in subsequent commands.

## Plan for Phase 1

**DB** (delegate to `db-architect`):
- New table `ATSCredential` (company_id, ats_name, encrypted_token, encrypted_refresh_token, expires_at, last_sync_at, last_error)
- New table `ATSWebhookLog` (id, company_id, ats_name, direction [in/out], idempotency_key, payload_hash, status, attempt_count, response_code)
- Add `Company.webhook_url` and `Company.webhook_secret` (encrypted) for outbound webhooks

**Integration** (delegate to `integration-engineer`) — bulk of the work:
- Module structure `backend/app/integrations/`:
  - `base.py` — `ATSConnector` abstract class
  - `greenhouse.py` — full implementation
  - `lever.py` — full implementation
  - `generic_webhook.py` — inbound + outbound with HMAC-SHA256
- OAuth 2.0 flows for Greenhouse and Lever:
  - Authorization URL generation
  - Callback endpoint
  - Token storage (encrypted with Fernet, key from `settings.ATS_ENCRYPTION_KEY`)
  - Refresh token rotation
- Event mapping:
  - Inbound: candidate_created → create RecruteTech Interview + email invite
  - Outbound: status changes (in_progress, completed, shortlisted, declined) → push to ATS
  - Outbound: report_ready → push report (PDF + JSON) to candidate's ATS profile
- Idempotency: every inbound webhook keys on header X-Idempotency-Key (or generate from payload hash)
- Retry: exponential backoff, max 5 attempts, dead letter logging
- HMAC signature verification on all inbound (constant-time comparison)
- Rate limiting: 100 req/min per company

**Backend** (delegate to `backend-engineer`):
- Webhook handler endpoints:
  - `POST /api/integrations/greenhouse/webhook`
  - `POST /api/integrations/lever/webhook`
  - `POST /api/integrations/webhook/generic` (HMAC-secured)
- OAuth callbacks:
  - `GET /api/integrations/greenhouse/oauth/callback`
  - `GET /api/integrations/lever/oauth/callback`
- Status push job: triggered on `Interview.status` change, queues an outbound sync via the connector
- Report push job: triggered on report generation, queues a multipart upload

**Frontend** (delegate to `frontend-engineer`):
- New HR page `/hr/integrations` — App Store style cards: Greenhouse, Lever, Generic Webhook, "more coming soon" placeholders for Teamtailor, Recruitee, Workday, Ashby
- Each card: Connect button (kicks off OAuth) | Status (Connected / Error / Not connected) | Last sync time | Disconnect
- Webhook config UI: paste webhook URL, generate signing secret, test webhook button
- i18n: FR + EN

**Tests** (delegate to `qa-tester`):
- Webhook idempotency: same payload twice → only one Interview created
- HMAC verification: invalid signature rejected
- OAuth roundtrip: mock Greenhouse, full flow works
- Token refresh on expiration
- Rate limit triggered at 101st request in a minute
- Cross-tenant isolation: company A's webhook cannot create data for company B (audit SQL queries)

**Security review** (delegate to `security-compliance-auditor`):
- Token encryption verified
- HMAC implementation uses constant-time comparison
- Cross-tenant isolation pen-tested
- Audit log of all syncs (in/out)
- RGPD: candidate consent for cross-system data sharing verified

**Docs** (delegate to `docs-writer`):
- Per-ATS setup guide:
  - `docs/integrations/greenhouse.md` — step-by-step OAuth setup, troubleshooting
  - `docs/integrations/lever.md` — same
  - `docs/integrations/generic-webhook.md` — payload schema, HMAC algorithm, example curl
- Public OpenAPI doc at `/api/docs` for the generic webhook
- Operational runbook: how to revoke a leaked token, how to rotate signing secret

## Success gate

- Greenhouse end-to-end: candidate created in Greenhouse → Interview auto-created → invite sent → report pushed back to Greenhouse profile
- Lever same
- Generic webhook: external partner can integrate using only the public docs in <1 hour
- 99.9% webhook delivery in load test (1000 webhooks)
- `security-compliance-auditor` returns APPROVE

## Phase 2 follow-ups (separate commands)

- `/skill-ats-teamtailor` (2 weeks)
- `/skill-ats-recruitee` (2 weeks)
- `/skill-ats-ashby` (2 weeks)
- `/skill-ats-workday` (4 weeks — most complex)

Now execute. Confirm before launching subagents.
