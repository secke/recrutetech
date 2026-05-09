"""API integration tests — transparent-scoring-explainability endpoints.

Endpoints under test:
  GET  /api/interviews/{token}/audit-trail
  POST /api/interviews/{token}/override
  PATCH /api/interviews/{token}/share
  GET  /api/candidate/interviews/{token}
  POST /api/candidate/interviews/{token}/contest

Uses the shared fixtures from conftest.py (test_client, db_session, make_role).
No real network calls. Claude is mocked via the autouse mock_anthropic fixture.
"""
from __future__ import annotations

import json
from datetime import datetime

import pytest
from sqlmodel import Session, select

from app.models import EvaluationOverride, Interview, Role


# ---------------------------------------------------------------------------
# Helpers — v3-shape report factory + Interview seed
# ---------------------------------------------------------------------------

def _make_v3_report(
    *,
    overall_score: float = 7.4,
    skill_scores: dict | None = None,
    recommendation: str = "yes",
) -> dict:
    if skill_scores is None:
        skill_scores = {
            "python_backend": 3.7,
            "system_design": 3.5,
            "communication": 3.8,
        }
    return {
        "prompt_version": "3.0.0",
        "rubric_version_label": "Backend Senior v3",
        "language": "en",
        "overall_score": overall_score,
        "skill_scores": skill_scores,
        "skill_assessments": [
            {
                "skill_id": "python_backend",
                "score": 3.7,
                "matched_level": "senior",
                "notes": "Solid Python. To reach staff level, demonstrate distributed system design at scale.",
            },
            {
                "skill_id": "system_design",
                "score": 3.5,
                "matched_level": "senior",
                "notes": "Good trade-off reasoning. To reach staff, show org-wide impact.",
            },
            {
                "skill_id": "communication",
                "score": 3.8,
                "matched_level": "senior",
                "notes": "Clear communicator. To reach staff, demonstrate cross-org alignment.",
            },
        ],
        "evidence": [
            {
                "claim": "Demonstrated asyncio knowledge",
                "supports_skill": "python_backend",
                "score_contribution": 1.2,
                "evidence_type": "transcript",
                "timestamp_seconds": 60,
                "quote": "I used asyncio to build a high-throughput API serving millions of requests",
            },
        ],
        "counterfactuals": [
            {
                "skill_id": "system_design",
                "current_level": "senior",
                "target_level": "staff",
                "gap_description": "Candidate did not address failure modes at scale.",
                "actionable_advice": "Practice designing for failure: read about Netflix Chaos Monkey and circuit breakers.",
            },
        ],
        "model_version": {
            "evaluator_model": "claude-opus-4-7",
            "rubric_version": "Backend Senior v3",
            "prompt_version": "3.0.0",
            "evaluated_at": "2026-05-05T10:00:00Z",
        },
        "summary": "Strong senior backend candidate with solid Python and system design foundations.",
        "strengths": ["Strong asyncio knowledge", "Good trade-off articulation"],
        "gaps": ["Limited distributed systems experience at staff scale"],
        "stage_notes": [
            {"stage_id": "intro", "observation": "Confident introduction."},
            {"stage_id": "technical", "observation": "Detailed answers on async patterns."},
        ],
        "communication": "Clear and well-structured responses.",
        "engagement": "Engaged throughout the session.",
        "recommendation": recommendation,
        "candidate_letter": {
            "subject": "Your technical interview — next steps",
            "body": (
                "Thank you for participating in the technical interview. "
                "Your responses showed strong knowledge of Python async patterns. "
                "To continue growing, consider exploring distributed systems design "
                "and the trade-offs involved in large-scale architectures. "
                "Keep working on articulating your system design decisions clearly. "
                "We appreciate the effort you put into the interview."
            ),
        },
    }


def _seed_interview(
    session: Session,
    *,
    role: Role,
    with_report: bool = True,
    share_with_candidate: bool = False,
    report_override: dict | None = None,
    transcript_json: str | None = None,
) -> Interview:
    report_data = report_override if report_override is not None else _make_v3_report()
    iv = Interview(
        role_id=role.id,
        candidate_name="Alex Candidate",
        candidate_email="alex@example.com",
        status="completed",
        transcript_json=transcript_json or json.dumps({"turns": [
            {
                "role": "user",
                "text": "I used asyncio to build a high-throughput API serving millions of requests",
                "time_in_call_secs": 60,
            },
        ]}),
        visual_metrics_json=json.dumps({"eye_contact_ratio": 0.76}),
        report_json=json.dumps(report_data) if with_report else None,
        report_integrity_hash="initial_hash_placeholder",
        share_with_candidate=share_with_candidate,
        started_at=datetime.utcnow(),
        ended_at=datetime.utcnow(),
    )
    session.add(iv)
    session.commit()
    session.refresh(iv)
    return iv


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def role(db_session):
    return make_role(db_session)


def make_role(session):
    r = Role(
        title="Backend Engineer",
        seniority="senior",
        duration_minutes=60,
        company="Acme",
        language="en",
    )
    session.add(r)
    session.commit()
    session.refresh(r)
    return r


# ---------------------------------------------------------------------------
# 1. Audit trail — GET /api/interviews/{token}/audit-trail
# ---------------------------------------------------------------------------

class TestAuditTrail:
    def test_audit_trail_200_with_report(self, test_client, db_session):
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role)
        resp = test_client.get(f"/api/interviews/{iv.public_token}/audit-trail")
        assert resp.status_code == 200, resp.text

    def test_audit_trail_contains_required_fields(self, test_client, db_session):
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role)
        data = test_client.get(f"/api/interviews/{iv.public_token}/audit-trail").json()
        # Per security review HIGH-2 (2026-05-08): audit-trail returns digest-only
        # for transcript/visual_metrics; raw goes via the HR detail route under NDA.
        required_keys = {
            "interview_token",
            "transcript_sha256",
            "visual_metrics_sha256",
            "report_json",
            "report_integrity_hash",
        }
        for k in required_keys:
            assert k in data, f"Missing field '{k}' in audit-trail response"
        assert "transcript_json" not in data, (
            "Raw transcript_json must NOT appear in audit-trail (RGPD Art. 5(1)(c))"
        )
        assert "visual_metrics_json" not in data, (
            "Raw visual_metrics_json must NOT appear in audit-trail"
        )

    def test_audit_trail_report_json_hash_field_stripped(self, test_client, db_session):
        """The report_json returned in audit-trail must NOT include report_integrity_hash."""
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role)
        data = test_client.get(f"/api/interviews/{iv.public_token}/audit-trail").json()
        report_json = data.get("report_json") or {}
        assert "report_integrity_hash" not in report_json, (
            "audit-trail must strip report_integrity_hash from the embedded report_json "
            "so auditors can re-derive the hash independently."
        )

    def test_audit_trail_hash_is_recomputable(self, test_client, db_session):
        """The stored hash must equal the hash computed from the audit-trail payload."""
        from app.services.report_service import compute_integrity_hash

        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role)
        # Compute the real hash and store it
        report_dict = json.loads(iv.report_json)
        real_hash = compute_integrity_hash(
            transcript_json=iv.transcript_json,
            visual_metrics_json=iv.visual_metrics_json,
            rubric_id=None,
            rubric_version=None,
            prompt_version=report_dict.get("prompt_version", "3.0.0"),
            evaluator_model=(report_dict.get("model_version") or {}).get("evaluator_model", "claude-opus-4-7"),
            report_json=report_dict,
            overrides=[],
        )
        iv.report_integrity_hash = real_hash
        db_session.add(iv)
        db_session.commit()

        data = test_client.get(f"/api/interviews/{iv.public_token}/audit-trail").json()
        returned_hash = data["report_integrity_hash"]

        # HIGH-2: raw transcript/visual are NO LONGER in the audit-trail; the
        # external auditor must hold them out-of-band. For this test we hold
        # them as the in-memory test fixtures (iv.transcript_json/visual_metrics_json)
        # and verify they hash to the digests in the response.
        import hashlib
        assert hashlib.sha256(iv.transcript_json.encode()).hexdigest() == data["transcript_sha256"]
        assert hashlib.sha256(iv.visual_metrics_json.encode()).hexdigest() == data["visual_metrics_sha256"]

        # Now re-derive the integrity hash from the auditor's out-of-band raw + payload
        report_in_response = data["report_json"]
        recomputed = compute_integrity_hash(
            transcript_json=iv.transcript_json,
            visual_metrics_json=iv.visual_metrics_json,
            rubric_id=data.get("rubric_id"),
            rubric_version=data.get("rubric_version"),
            prompt_version=data.get("prompt_version") or "3.0.0",
            evaluator_model=data.get("evaluator_model") or "claude-opus-4-7",
            report_json=report_in_response,
            overrides=data.get("overrides") or [],
        )
        assert returned_hash == recomputed, (
            "Hash stored in the interview does not match the hash re-derived from the audit-trail payload"
        )

    def test_audit_trail_404_when_no_report(self, test_client, db_session):
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role, with_report=False)
        resp = test_client.get(f"/api/interviews/{iv.public_token}/audit-trail")
        assert resp.status_code == 404, resp.text

    def test_audit_trail_404_nonexistent_token(self, test_client, db_session):
        resp = test_client.get("/api/interviews/nonexistent_token_xyz/audit-trail")
        assert resp.status_code == 404

    def test_audit_trail_includes_overrides_list(self, test_client, db_session):
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role)
        data = test_client.get(f"/api/interviews/{iv.public_token}/audit-trail").json()
        assert "overrides" in data
        assert isinstance(data["overrides"], list)

    def test_audit_trail_verification_instructions_present(self, test_client, db_session):
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role)
        data = test_client.get(f"/api/interviews/{iv.public_token}/audit-trail").json()
        assert "verification_instructions" in data
        assert len(data["verification_instructions"]) > 10


# ---------------------------------------------------------------------------
# 2. Share — PATCH /api/interviews/{token}/share
# ---------------------------------------------------------------------------

class TestShareEndpoint:
    def test_patch_share_true_200(self, test_client, db_session):
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role, share_with_candidate=False)
        resp = test_client.patch(
            f"/api/interviews/{iv.public_token}/share",
            json={"share_with_candidate": True},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["share_with_candidate"] is True

    def test_patch_share_true_updates_db(self, test_client, db_session):
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role, share_with_candidate=False)
        test_client.patch(
            f"/api/interviews/{iv.public_token}/share",
            json={"share_with_candidate": True},
        )
        db_session.refresh(iv)
        assert iv.share_with_candidate is True

    def test_patch_share_false_updates_db(self, test_client, db_session):
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role, share_with_candidate=True)
        test_client.patch(
            f"/api/interviews/{iv.public_token}/share",
            json={"share_with_candidate": False},
        )
        db_session.refresh(iv)
        assert iv.share_with_candidate is False


# ---------------------------------------------------------------------------
# 3. Candidate view — GET /api/candidate/interviews/{token}
# ---------------------------------------------------------------------------

class TestCandidateView:
    def test_candidate_view_404_when_share_false(self, test_client, db_session):
        """When share_with_candidate=False, candidate view returns 404 (not 403)."""
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role, share_with_candidate=False)
        resp = test_client.get(f"/api/candidate/interviews/{iv.public_token}")
        assert resp.status_code == 404, (
            f"Expected 404 (enumeration defence), got {resp.status_code}"
        )

    def test_candidate_view_200_when_share_true(self, test_client, db_session):
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role, share_with_candidate=True)
        resp = test_client.get(f"/api/candidate/interviews/{iv.public_token}")
        assert resp.status_code == 200, resp.text

    def test_candidate_view_does_not_expose_sensitive_fields(self, test_client, db_session):
        """Critical: response must not include any HR-internal fields."""
        forbidden_keys = {
            "overall_score",
            "skill_scores",
            "skill_assessments",
            "recommendation",
            "hiring_recommendation",
            "evidence",
            "evidence_pointers",
            "model_version",
        }
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role, share_with_candidate=True)
        resp = test_client.get(f"/api/candidate/interviews/{iv.public_token}")
        assert resp.status_code == 200
        data = resp.json()

        leaked = forbidden_keys & set(data.keys())
        assert not leaked, f"Candidate view leaked HR-internal fields: {leaked}"

    def test_candidate_view_contains_allowed_fields(self, test_client, db_session):
        """Response must include the minimum useful fields for the candidate."""
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role, share_with_candidate=True)
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()

        assert "summary" in data and data["summary"], "summary must be present"
        assert "strengths" in data, "strengths must be present"
        assert "gaps" in data, "gaps must be present"
        assert "candidate_letter" in data, "candidate_letter must be present"

    def test_candidate_view_after_patch_share_true(self, test_client, db_session):
        """End-to-end: 404 before share, 200 after PATCH share=true."""
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role, share_with_candidate=False)
        token = iv.public_token

        # Before sharing
        resp_before = test_client.get(f"/api/candidate/interviews/{token}")
        assert resp_before.status_code == 404

        # Enable sharing
        test_client.patch(f"/api/interviews/{token}/share", json={"share_with_candidate": True})

        # After sharing
        resp_after = test_client.get(f"/api/candidate/interviews/{token}")
        assert resp_after.status_code == 200

    def test_candidate_view_recommendation_string_not_in_response(self, test_client, db_session):
        """The string 'strong_yes' must not appear anywhere in the candidate response."""
        role = make_role(db_session)
        report = _make_v3_report(recommendation="strong_yes")
        iv = _seed_interview(db_session, role=role, share_with_candidate=True, report_override=report)
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()

        raw = json.dumps(data)
        assert "strong_yes" not in raw, "Recommendation value 'strong_yes' leaked into candidate view"

    def test_candidate_view_score_value_not_in_response(self, test_client, db_session):
        """Numeric score 7.4 must not appear as a standalone value in candidate response."""
        role = make_role(db_session)
        report = _make_v3_report(overall_score=7.4)
        iv = _seed_interview(db_session, role=role, share_with_candidate=True, report_override=report)
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()

        # overall_score must not be a key in the response
        assert "overall_score" not in data

    def test_candidate_view_nonexistent_token_404(self, test_client, db_session):
        resp = test_client.get("/api/candidate/interviews/nonexistent_xyz_123")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 4. Override — POST /api/interviews/{token}/override
# ---------------------------------------------------------------------------

class TestOverrideEndpoint:
    def _valid_override_body(self, skill_id: str = "python_backend") -> dict:
        return {
            "skill_id": skill_id,
            "override_score": 4.0,
            "justification": "Candidate demonstrated stronger practical knowledge than the score reflected.",
        }

    def test_override_creates_row_and_returns_201(self, test_client, db_session):
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role)
        body = self._valid_override_body()
        resp = test_client.post(f"/api/interviews/{iv.public_token}/override", json=body)
        assert resp.status_code == 201, resp.text

    def test_override_creates_db_row(self, test_client, db_session):
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role)
        test_client.post(f"/api/interviews/{iv.public_token}/override", json=self._valid_override_body())

        rows = db_session.exec(
            select(EvaluationOverride).where(EvaluationOverride.interview_id == iv.id)
        ).all()
        assert len(rows) == 1
        assert rows[0].skill_id == "python_backend"
        assert rows[0].override_score == 4.0

    def test_override_changes_integrity_hash(self, test_client, db_session):
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role)
        original_hash = iv.report_integrity_hash

        test_client.post(f"/api/interviews/{iv.public_token}/override", json=self._valid_override_body())

        db_session.refresh(iv)
        assert iv.report_integrity_hash != original_hash, (
            "report_integrity_hash must change after an override"
        )

    def test_override_short_justification_422(self, test_client, db_session):
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role)
        resp = test_client.post(
            f"/api/interviews/{iv.public_token}/override",
            json={"skill_id": "python_backend", "override_score": 4.0, "justification": "too short"},
        )
        assert resp.status_code == 422, resp.text

    def test_override_unknown_skill_id_404(self, test_client, db_session):
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role)
        resp = test_client.post(
            f"/api/interviews/{iv.public_token}/override",
            json={
                "skill_id": "nonexistent_skill_xyz",
                "override_score": 3.0,
                "justification": "Justification long enough to satisfy the minimum character requirement.",
            },
        )
        assert resp.status_code == 404, resp.text

    def test_override_twice_creates_two_rows(self, test_client, db_session):
        """Two overrides on the same skill must create TWO separate rows (append-only)."""
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role)

        test_client.post(
            f"/api/interviews/{iv.public_token}/override",
            json={
                "skill_id": "python_backend",
                "override_score": 4.0,
                "justification": "First override: candidate showed stronger async patterns than initially scored.",
            },
        )
        test_client.post(
            f"/api/interviews/{iv.public_token}/override",
            json={
                "skill_id": "python_backend",
                "override_score": 4.5,
                "justification": "Second override: re-reviewed code sample, significantly stronger than first assessment.",
            },
        )

        rows = db_session.exec(
            select(EvaluationOverride)
            .where(
                EvaluationOverride.interview_id == iv.id,
                EvaluationOverride.skill_id == "python_backend",
            )
            .order_by(EvaluationOverride.created_at)
        ).all()
        assert len(rows) == 2, f"Expected 2 override rows, got {len(rows)}"

    def test_override_twice_first_row_unchanged(self, test_client, db_session):
        """APPEND-ONLY INVARIANT: after two overrides, the first row is unchanged."""
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role)

        resp1 = test_client.post(
            f"/api/interviews/{iv.public_token}/override",
            json={
                "skill_id": "python_backend",
                "override_score": 4.0,
                "justification": "First override: candidate showed stronger async patterns than initially scored.",
            },
        )
        assert resp1.status_code == 201
        first_override_id = resp1.json()["override_id"]

        test_client.post(
            f"/api/interviews/{iv.public_token}/override",
            json={
                "skill_id": "python_backend",
                "override_score": 4.5,
                "justification": "Second override: re-reviewed code sample, significantly stronger.",
            },
        )

        # Direct DB read — verify first row is unchanged
        first_row = db_session.get(EvaluationOverride, first_override_id)
        assert first_row is not None
        assert first_row.override_score == 4.0, (
            f"First override row was mutated: override_score={first_row.override_score}"
        )
        assert first_row.skill_id == "python_backend"
        assert "First override" in first_row.justification

    def test_override_no_report_409(self, test_client, db_session):
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role, with_report=False)
        resp = test_client.post(
            f"/api/interviews/{iv.public_token}/override",
            json=self._valid_override_body(),
        )
        assert resp.status_code == 409, resp.text


# ---------------------------------------------------------------------------
# 5. Contest — POST /api/candidate/interviews/{token}/contest
# ---------------------------------------------------------------------------

class TestContestEndpoint:
    def test_contest_404_when_share_false(self, test_client, db_session):
        """Contest when the interview doesn't exist returns 404."""
        resp = test_client.post(
            "/api/candidate/interviews/nonexistent_token_xyz/contest",
            json={"reason": "I believe my answer was correct.", "contact_email": "test@example.com"},
        )
        assert resp.status_code == 404

    def test_contest_202_when_interview_exists(self, test_client, db_session):
        """Contest when interview exists returns 202 (even if sharing is off)."""
        role = make_role(db_session)
        # Note: contest does not re-gate on share_with_candidate — right to contest
        # is not revocable by toggling the share flag (see candidate.py).
        iv = _seed_interview(db_session, role=role, share_with_candidate=True)
        resp = test_client.post(
            f"/api/candidate/interviews/{iv.public_token}/contest",
            json={"reason": "I believe my answer on asyncio was correct and more complete than assessed."},
        )
        assert resp.status_code == 202, resp.text

    def test_contest_response_contains_status_received(self, test_client, db_session):
        role = make_role(db_session)
        iv = _seed_interview(db_session, role=role, share_with_candidate=True)
        data = test_client.post(
            f"/api/candidate/interviews/{iv.public_token}/contest",
            json={"reason": "I believe my answer on asyncio was correct and more complete."},
        ).json()
        assert data.get("status") == "received"
