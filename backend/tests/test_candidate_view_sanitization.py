"""Candidate-view sanitization tests — transparent-scoring-explainability skill.

Validates that the GET /api/candidate/interviews/{token} endpoint:
1. Exposes ONLY whitelisted fields (structural whitelist, not blacklist).
2. Never leaks HR-internal fields or values (score, recommendation, skill details).
3. Correctly returns all expected fields when sharing is enabled.
4. Does NOT false-positively flag allowed words (e.g. 'score' in the letter body).

No real network or DB calls beyond the in-memory SQLite test session.
"""
from __future__ import annotations

import json
from datetime import datetime

import pytest
from sqlmodel import Session

from app.models import Interview, Role


# ---------------------------------------------------------------------------
# Helpers — build a comprehensive v3 report with ALL fields populated
# ---------------------------------------------------------------------------

def _make_full_v3_report() -> dict:
    """Build a fully populated v3 report including all sensitive fields.

    This is the 'worst case' report that contains:
    - overall_score: 4.2
    - skill_scores with all skill IDs
    - skill_assessments
    - recommendation: "strong_yes"
    - evidence (verbatim quotes)
    - model_version
    - hiring_recommendation (legacy alias)

    The candidate view must expose NONE of these.
    """
    return {
        "prompt_version": "3.0.0",
        "rubric_version_label": "Backend Senior v3",
        "language": "en",
        "overall_score": 4.2,
        "skill_scores": {
            "python_backend": 4.2,
            "system_design": 4.0,
            "communication": 4.5,
        },
        "skill_assessments": [
            {
                "skill_id": "python_backend",
                "score": 4.2,
                "matched_level": "staff",
                "notes": "Exceptional async patterns. Candidate operates at staff level comfortably.",
            },
            {
                "skill_id": "system_design",
                "score": 4.0,
                "matched_level": "staff",
                "notes": "Comprehensive system design with capacity reasoning.",
            },
            {
                "skill_id": "communication",
                "score": 4.5,
                "matched_level": "staff",
                "notes": "Crystal clear communication at every stage.",
            },
        ],
        "evidence": [
            {
                "claim": "Demonstrated advanced asyncio patterns",
                "supports_skill": "python_backend",
                "score_contribution": 1.5,
                "evidence_type": "transcript",
                "timestamp_seconds": 120,
                "quote": "I implemented a custom event loop policy to handle 50k concurrent connections",
            },
        ],
        "counterfactuals": [
            {
                "skill_id": "system_design",
                "current_level": "senior",
                "target_level": "staff",
                "gap_description": "Could explore multi-region active-active patterns.",
                "actionable_advice": "Study active-active database replication and consistency trade-offs.",
            },
        ],
        "model_version": {
            "evaluator_model": "claude-opus-4-7",
            "rubric_version": "Backend Senior v3",
            "prompt_version": "3.0.0",
            "evaluated_at": "2026-05-05T10:00:00Z",
        },
        "summary": "Exceptional senior-to-staff candidate. Strongest submission this quarter.",
        "strengths": [
            "Expert-level asyncio knowledge with production proof.",
            "Rigorous capacity estimation in system design.",
        ],
        "gaps": [
            "Could deepen multi-region consistency strategy knowledge.",
        ],
        "stage_notes": [
            {"stage_id": "intro", "observation": "Highly confident. Immediately focused."},
            {"stage_id": "technical", "observation": "Answered all deep-dive questions without hints."},
        ],
        "communication": "Exceptional clarity. Adapted explanations fluidly.",
        "engagement": "Highly engaged; asked insightful clarifying questions.",
        "recommendation": "strong_yes",
        "hiring_recommendation": "strong_yes",  # legacy alias — must also be absent from candidate view
        "candidate_letter": {
            "subject": "Your technical interview results",
            "body": (
                "Thank you for participating in our technical interview. "
                "Your understanding of concurrent programming patterns was impressive. "
                "We recommend focusing on multi-region system design as a growth area. "
                "Your communication was excellent — you explained complex concepts clearly. "
                "The score of any engineer is not just about raw knowledge but also about "
                "how they communicate and adapt. Keep developing your architectural thinking. "
                "Best of luck in your career progression."
            ),
        },
    }


def _seed_interview(session: Session, *, role: Role, report: dict, share: bool) -> Interview:
    iv = Interview(
        role_id=role.id,
        candidate_name="Taylor Candidate",
        candidate_email="taylor@example.com",
        status="completed",
        transcript_json=json.dumps({"turns": [
            {"role": "user", "text": "I implemented a custom event loop policy to handle 50k concurrent connections", "time_in_call_secs": 120},
        ]}),
        visual_metrics_json=json.dumps({"eye_contact_ratio": 0.85}),
        report_json=json.dumps(report),
        report_integrity_hash="placeholder_hash",
        share_with_candidate=share,
        started_at=datetime.utcnow(),
        ended_at=datetime.utcnow(),
    )
    session.add(iv)
    session.commit()
    session.refresh(iv)
    return iv


@pytest.fixture()
def role_and_interview(db_session):
    role = Role(
        title="Backend Engineer",
        seniority="senior",
        duration_minutes=60,
        company="Acme",
        language="en",
    )
    db_session.add(role)
    db_session.commit()
    db_session.refresh(role)

    report = _make_full_v3_report()
    iv = _seed_interview(db_session, role=role, report=report, share=True)
    return role, iv, report


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestCandidateViewSanitization:

    # -----------------------------------------------------------------------
    # HR-internal fields must be absent
    # -----------------------------------------------------------------------

    def test_overall_score_absent(self, test_client, role_and_interview):
        _, iv, _ = role_and_interview
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()
        assert "overall_score" not in data, "overall_score must not be in candidate view"

    def test_skill_scores_absent(self, test_client, role_and_interview):
        _, iv, _ = role_and_interview
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()
        assert "skill_scores" not in data, "skill_scores must not be in candidate view"

    def test_skill_assessments_absent(self, test_client, role_and_interview):
        _, iv, _ = role_and_interview
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()
        assert "skill_assessments" not in data, "skill_assessments must not be in candidate view"

    def test_recommendation_absent(self, test_client, role_and_interview):
        _, iv, _ = role_and_interview
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()
        assert "recommendation" not in data, "recommendation must not be in candidate view"

    def test_hiring_recommendation_absent(self, test_client, role_and_interview):
        _, iv, _ = role_and_interview
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()
        assert "hiring_recommendation" not in data, "hiring_recommendation must not be in candidate view"

    def test_evidence_absent(self, test_client, role_and_interview):
        _, iv, _ = role_and_interview
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()
        assert "evidence" not in data, "evidence must not be in candidate view"
        assert "evidence_pointers" not in data, "evidence_pointers must not be in candidate view"

    def test_model_version_absent(self, test_client, role_and_interview):
        _, iv, _ = role_and_interview
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()
        assert "model_version" not in data, "model_version must not be in candidate view"

    # -----------------------------------------------------------------------
    # Forbidden values must not appear in the response JSON
    # -----------------------------------------------------------------------

    def test_strong_yes_string_absent_from_response(self, test_client, role_and_interview):
        """The value 'strong_yes' must not appear anywhere in the serialized response."""
        _, iv, _ = role_and_interview
        resp = test_client.get(f"/api/candidate/interviews/{iv.public_token}")
        raw = resp.text
        assert "strong_yes" not in raw, (
            f"'strong_yes' leaked into candidate view response. Response: {raw[:300]}"
        )

    def test_numeric_score_42_absent_from_top_level(self, test_client, role_and_interview):
        """overall_score=4.2 must not appear as a top-level key."""
        _, iv, _ = role_and_interview
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()
        assert "overall_score" not in data

    def test_skill_id_keys_absent_from_response(self, test_client, role_and_interview, db_session):
        """Skill IDs (python_backend, system_design, communication) from skill_scores
        must not appear as keys in the candidate response.
        """
        _, iv, report = role_and_interview
        skill_ids = list(report["skill_scores"].keys())

        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()

        # Walk top-level keys only — skill IDs are structural keys, not arbitrary values
        for skill_id in skill_ids:
            assert skill_id not in data, (
                f"Skill ID '{skill_id}' appeared as a top-level key in candidate view"
            )

    def test_recursive_walk_no_sensitive_values(self, test_client, role_and_interview):
        """Recursively walk the full response JSON and verify no HR-internal
        top-level field names appear as keys anywhere in the nested structure.
        """
        _, iv, _ = role_and_interview
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()

        forbidden_field_names = {
            "overall_score", "skill_scores", "skill_assessments",
            "recommendation", "hiring_recommendation", "evidence",
            "evidence_pointers", "model_version", "report_integrity_hash",
            "evidence_verified",
        }

        def _collect_keys(obj, collected=None):
            if collected is None:
                collected = set()
            if isinstance(obj, dict):
                for k, v in obj.items():
                    collected.add(k)
                    _collect_keys(v, collected)
            elif isinstance(obj, list):
                for item in obj:
                    _collect_keys(item, collected)
            return collected

        all_keys = _collect_keys(data)
        leaked = forbidden_field_names & all_keys
        assert not leaked, f"Forbidden field names found in candidate response: {leaked}"

    # -----------------------------------------------------------------------
    # Allowed fields ARE present
    # -----------------------------------------------------------------------

    def test_summary_present(self, test_client, role_and_interview):
        _, iv, _ = role_and_interview
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()
        assert "summary" in data and data["summary"], "summary must be present and non-empty"

    def test_strengths_present(self, test_client, role_and_interview):
        _, iv, _ = role_and_interview
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()
        assert "strengths" in data
        assert isinstance(data["strengths"], list)
        assert len(data["strengths"]) > 0, "strengths list must not be empty"

    def test_gaps_present(self, test_client, role_and_interview):
        _, iv, _ = role_and_interview
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()
        assert "gaps" in data
        assert isinstance(data["gaps"], list)

    def test_candidate_letter_present(self, test_client, role_and_interview):
        _, iv, _ = role_and_interview
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()
        assert "candidate_letter" in data
        letter = data["candidate_letter"]
        assert isinstance(letter, dict)
        assert "subject" in letter and letter["subject"]
        assert "body" in letter and letter["body"]

    # -----------------------------------------------------------------------
    # False-positive safety: the word "score" in the letter body is allowed
    # -----------------------------------------------------------------------

    def test_word_score_in_letter_body_not_false_flagged(self, test_client, db_session):
        """The letter body may legitimately contain the word 'score' as an English word
        (e.g. 'The score of any engineer...'). This must NOT be considered a leak.
        The actual leak check is for the structured field `overall_score` (dict key),
        not for the English word 'score' appearing in a string value.
        """
        role = Role(
            title="Backend Engineer",
            seniority="senior",
            duration_minutes=60,
            company="Acme",
            language="en",
        )
        db_session.add(role)
        db_session.commit()
        db_session.refresh(role)

        report = _make_full_v3_report()
        # Ensure 'score' appears in the letter body
        report["candidate_letter"]["body"] = (
            "Thank you for your participation. The score of any great engineer "
            "is measured by their ability to learn and grow. Keep improving!"
        )

        iv = _seed_interview(db_session, role=role, report=report, share=True)
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()

        # 'score' the WORD is allowed in the body
        letter = data.get("candidate_letter") or {}
        body = letter.get("body") or ""
        assert "score" in body, (
            "Letter body with 'score' word must pass through intact — "
            "check is for the structured field key, not arbitrary string content."
        )

        # But the structured field overall_score must still be absent
        assert "overall_score" not in data

    # -----------------------------------------------------------------------
    # Recourse fields are present (RGPD Art. 22)
    # -----------------------------------------------------------------------

    def test_recourse_available_present(self, test_client, role_and_interview):
        _, iv, _ = role_and_interview
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()
        assert "recourse_available" in data
        assert data["recourse_available"] is True

    def test_recourse_deadline_days_present(self, test_client, role_and_interview):
        _, iv, _ = role_and_interview
        data = test_client.get(f"/api/candidate/interviews/{iv.public_token}").json()
        assert "recourse_deadline_days" in data
        assert data["recourse_deadline_days"] == 7
