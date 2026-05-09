"""Tests for report_service.verify_evidence_pointers.

Acceptance criterion: 100 % of evidence_pointers cited are verifiable verbatim
in the transcription source (transparent-scoring-explainability SKILL.md §7).

Conventions:
- All transcript data is synthetic. No real PII.
- No network calls. verify_evidence_pointers is a pure function.
- Determinism tested via the 200-report batch (seeded loops).
"""
from __future__ import annotations

import time

import pytest


# ---------------------------------------------------------------------------
# Helpers — synthetic transcript factory
# ---------------------------------------------------------------------------

def _make_transcript_json(turns: list[dict] | None = None) -> str:
    import json
    if turns is None:
        turns = [
            {
                "role": "agent",
                "text": "Tell me about your experience with asyncio.",
                "time_in_call_secs": 10,
            },
            {
                "role": "user",
                "text": "I built a Python service handling 10k req/s with FastAPI",
                "time_in_call_secs": 30,
            },
            {
                "role": "agent",
                "text": "Can you describe how asyncio event loop works?",
                "time_in_call_secs": 45,
            },
            {
                "role": "user",
                "text": "asyncio uses an event loop, so when I await a coroutine, control returns to the loop and other tasks can run",
                "time_in_call_secs": 60,
            },
            {
                "role": "agent",
                "text": "Good. What about connection pooling?",
                "time_in_call_secs": 90,
            },
            {
                "role": "user",
                "text": "I used SQLAlchemy with async session and a pool size of 20 connections",
                "time_in_call_secs": 105,
            },
        ]
    return json.dumps({"turns": turns})


def _make_report_with_evidence(evidence_items: list[dict]) -> dict:
    return {
        "overall_score": 7.4,
        "evidence": evidence_items,
        "summary": "Solid candidate.",
        "recommendation": "yes",
    }


# ---------------------------------------------------------------------------
# Test 1: 5 verbatim quotes all pass
# ---------------------------------------------------------------------------

class TestVerifyEvidencePointers:
    def test_all_verbatim_quotes_pass(self):
        from app.services.report_service import verify_evidence_pointers

        transcript = _make_transcript_json()
        report = _make_report_with_evidence([
            {
                "claim": "Knows asyncio event loop",
                "supports_skill": "python_backend",
                "score_contribution": 1.2,
                "evidence_type": "transcript",
                "timestamp_seconds": 60,
                "quote": "asyncio uses an event loop, so when I await a coroutine, control returns to the loop and other tasks can run",
            },
            {
                "claim": "High throughput service",
                "supports_skill": "python_backend",
                "score_contribution": 0.8,
                "evidence_type": "transcript",
                "timestamp_seconds": 30,
                "quote": "I built a Python service handling 10k req/s with FastAPI",
            },
            {
                "claim": "Connection pooling knowledge",
                "supports_skill": "python_backend",
                "score_contribution": 0.5,
                "evidence_type": "transcript",
                "timestamp_seconds": 105,
                "quote": "I used SQLAlchemy with async session and a pool size of 20 connections",
            },
            # Two more from the same transcript text (sub-quotes)
            {
                "claim": "Used FastAPI specifically",
                "supports_skill": "python_backend",
                "score_contribution": 0.3,
                "evidence_type": "transcript",
                "timestamp_seconds": 30,
                "quote": "Python service handling 10k req/s with FastAPI",
            },
            {
                "claim": "Mentions pool size",
                "supports_skill": "python_backend",
                "score_contribution": 0.3,
                "evidence_type": "transcript",
                "timestamp_seconds": 105,
                "quote": "pool size of 20 connections",
            },
        ])

        ok, failed = verify_evidence_pointers(report, transcript)
        assert ok is True, f"Expected all 5 quotes to verify. Failed: {failed}"
        assert failed == []
        assert report["evidence_verified"] is True

    # -----------------------------------------------------------------------
    # Test 2: one hallucinated quote fails
    # -----------------------------------------------------------------------

    def test_hallucinated_quote_fails(self):
        from app.services.report_service import verify_evidence_pointers

        transcript = _make_transcript_json()
        hallucinated = "I deployed with Kubernetes using Helm charts in production at scale"
        report = _make_report_with_evidence([
            {
                "claim": "Verbatim claim",
                "supports_skill": "python_backend",
                "score_contribution": 0.5,
                "evidence_type": "transcript",
                "timestamp_seconds": 30,
                "quote": "I built a Python service handling 10k req/s with FastAPI",
            },
            {
                "claim": "This quote was never said",
                "supports_skill": "system_design",
                "score_contribution": 0.8,
                "evidence_type": "transcript",
                "timestamp_seconds": 200,
                "quote": hallucinated,
            },
        ])

        ok, failed = verify_evidence_pointers(report, transcript)
        assert ok is False
        assert hallucinated in failed
        assert report["evidence_verified"] is False

    # -----------------------------------------------------------------------
    # Test 3: code and visual evidence types are skipped (not checked)
    # -----------------------------------------------------------------------

    def test_code_and_visual_evidence_not_checked(self):
        from app.services.report_service import verify_evidence_pointers

        transcript = _make_transcript_json()
        report = _make_report_with_evidence([
            {
                "claim": "Failed edge case on empty input",
                "supports_skill": "code_quality",
                "score_contribution": -0.5,
                "evidence_type": "code",
                "timestamp_seconds": 845,
                "details": "First submission failed test 'empty_input', candidate fixed after Aria's question",
            },
            {
                "claim": "Eye contact strong throughout",
                "supports_skill": "communication",
                "score_contribution": 0.3,
                "evidence_type": "visual",
                "timestamp_seconds": 300,
                "details": "eye_contact_ratio=0.78 across the full session",
            },
        ])

        ok, failed = verify_evidence_pointers(report, transcript)
        assert ok is True, f"Code/visual evidence must not block verification. Failed: {failed}"
        assert failed == []
        assert report["evidence_verified"] is True

    # -----------------------------------------------------------------------
    # Test 4: whitespace tolerance (extra spaces / newlines in transcript)
    # -----------------------------------------------------------------------

    def test_whitespace_tolerant_match(self):
        """A quote with extra whitespace in the stored transcript still verifies."""
        import json
        from app.services.report_service import verify_evidence_pointers

        # Transcript with multi-space / newline around a key phrase
        turns = [
            {
                "role": "user",
                "text": "asyncio  uses   an  event  loop,  so  when  I  await",
                "time_in_call_secs": 60,
            },
        ]
        transcript = json.dumps({"turns": turns})

        # Quote uses single spaces — whitespace collapsed on both sides
        report = _make_report_with_evidence([
            {
                "claim": "Async knowledge",
                "supports_skill": "python_backend",
                "score_contribution": 0.5,
                "evidence_type": "transcript",
                "timestamp_seconds": 60,
                "quote": "asyncio uses an event loop, so when I await",
            },
        ])

        ok, failed = verify_evidence_pointers(report, transcript)
        assert ok is True, f"Whitespace normalisation failed. Failed: {failed}"
        assert report["evidence_verified"] is True

    # -----------------------------------------------------------------------
    # Test 5: empty evidence list always passes
    # -----------------------------------------------------------------------

    def test_empty_evidence_list_passes(self):
        from app.services.report_service import verify_evidence_pointers

        transcript = _make_transcript_json()
        report = _make_report_with_evidence([])

        ok, failed = verify_evidence_pointers(report, transcript)
        assert ok is True
        assert failed == []
        assert report["evidence_verified"] is True

    # -----------------------------------------------------------------------
    # Test 6: transcript_json is None → transcript-typed evidence fails
    # -----------------------------------------------------------------------

    def test_none_transcript_fails_transcript_evidence(self):
        from app.services.report_service import verify_evidence_pointers

        report = _make_report_with_evidence([
            {
                "claim": "Claim from transcript",
                "supports_skill": "python_backend",
                "score_contribution": 0.5,
                "evidence_type": "transcript",
                "timestamp_seconds": 60,
                "quote": "I built a Python service handling 10k req/s with FastAPI",
            },
        ])

        ok, failed = verify_evidence_pointers(report, None)
        assert ok is False, "None transcript must fail transcript-typed evidence"
        assert len(failed) == 1
        assert report["evidence_verified"] is False

    def test_none_transcript_code_evidence_still_passes(self):
        """Code/visual evidence is NOT checked even when transcript is None."""
        from app.services.report_service import verify_evidence_pointers

        report = _make_report_with_evidence([
            {
                "claim": "Code artifact",
                "supports_skill": "code_quality",
                "score_contribution": -0.3,
                "evidence_type": "code",
                "timestamp_seconds": 120,
                "details": "Candidate submitted a two-liner that missed the edge case",
            },
        ])

        ok, failed = verify_evidence_pointers(report, None)
        assert ok is True
        assert failed == []


# ---------------------------------------------------------------------------
# Test 7: 100-report determinism & scaling
# ---------------------------------------------------------------------------

class TestScalingDeterminism:
    def test_100_verbatim_reports_all_pass(self):
        """100 reports, each with verbatim quotes → 100/100 pass. Under 1 s total."""
        from app.services.report_service import verify_evidence_pointers

        VERBATIM_QUOTE = "I built a Python service handling 10k req/s with FastAPI"
        transcript = _make_transcript_json()

        start = time.monotonic()
        results = []
        for i in range(100):
            report = _make_report_with_evidence([
                {
                    "claim": f"Claim {i}",
                    "supports_skill": "python_backend",
                    "score_contribution": 0.5,
                    "evidence_type": "transcript",
                    "timestamp_seconds": 30,
                    "quote": VERBATIM_QUOTE,
                },
            ])
            ok, failed = verify_evidence_pointers(report, transcript)
            results.append(ok)
        elapsed = time.monotonic() - start

        assert all(results), f"Only {sum(results)}/100 passed."
        assert elapsed < 1.0, f"100 reports took {elapsed:.3f}s — too slow."

    def test_100_hallucinated_reports_all_fail(self):
        """100 reports, each with one hallucinated quote → 100/100 fail. Under 1 s total."""
        from app.services.report_service import verify_evidence_pointers

        transcript = _make_transcript_json()

        start = time.monotonic()
        results = []
        for i in range(100):
            hallucinated = f"I never said this unique string {i} in the interview"
            report = _make_report_with_evidence([
                {
                    "claim": f"Hallucinated claim {i}",
                    "supports_skill": "python_backend",
                    "score_contribution": 0.5,
                    "evidence_type": "transcript",
                    "timestamp_seconds": 30,
                    "quote": hallucinated,
                },
            ])
            ok, _ = verify_evidence_pointers(report, transcript)
            results.append(ok)
        elapsed = time.monotonic() - start

        assert not any(results), f"{sum(results)}/100 incorrectly passed."
        assert elapsed < 1.0, f"100 reports took {elapsed:.3f}s — too slow."

    def test_same_inputs_produce_same_result(self):
        """Determinism: same inputs → same bool output, every time."""
        from app.services.report_service import verify_evidence_pointers

        QUOTE = "I built a Python service handling 10k req/s with FastAPI"
        transcript = _make_transcript_json()

        def _run():
            r = _make_report_with_evidence([
                {
                    "claim": "Same claim",
                    "supports_skill": "python_backend",
                    "score_contribution": 0.5,
                    "evidence_type": "transcript",
                    "timestamp_seconds": 30,
                    "quote": QUOTE,
                }
            ])
            ok, failed = verify_evidence_pointers(r, transcript)
            return ok, failed

        for _ in range(10):
            ok, failed = _run()
            assert ok is True
            assert failed == []

    def test_combined_200_report_batch_timing(self):
        """200-report batch (100 valid + 100 invalid) completes under 1 s."""
        from app.services.report_service import verify_evidence_pointers

        transcript = _make_transcript_json()
        VERBATIM = "I built a Python service handling 10k req/s with FastAPI"

        start = time.monotonic()
        for i in range(200):
            quote = VERBATIM if i < 100 else f"hallucinated quote number {i}"
            report = _make_report_with_evidence([
                {
                    "claim": f"Claim {i}",
                    "supports_skill": "python_backend",
                    "score_contribution": 0.5,
                    "evidence_type": "transcript",
                    "timestamp_seconds": 30,
                    "quote": quote,
                }
            ])
            verify_evidence_pointers(report, transcript)
        elapsed = time.monotonic() - start

        assert elapsed < 1.0, f"200-report batch took {elapsed:.3f}s"

    # -----------------------------------------------------------------------
    # Test: evidence_pointers key (v3 shape) is also checked
    # -----------------------------------------------------------------------

    def test_evidence_pointers_key_is_checked(self):
        """verify_evidence_pointers also handles the v3 'evidence_pointers' key."""
        from app.services.report_service import verify_evidence_pointers

        transcript = _make_transcript_json()
        # Use the v3 key name (evidence_pointers) instead of evidence
        report = {
            "overall_score": 7.0,
            "evidence_pointers": [
                {
                    "claim": "Used FastAPI",
                    "supports_skill": "python_backend",
                    "score_contribution": 0.8,
                    "evidence_type": "transcript",
                    "timestamp_seconds": 30,
                    "quote": "I built a Python service handling 10k req/s with FastAPI",
                },
            ],
        }

        ok, failed = verify_evidence_pointers(report, transcript)
        assert ok is True, f"evidence_pointers key not handled correctly. Failed: {failed}"
