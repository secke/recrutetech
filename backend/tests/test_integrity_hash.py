"""Tests for report_service.compute_integrity_hash.

Acceptance criterion: SHA-256 integrity hash over canonical inputs allows
external auditors to verify a report was not altered post-generation
(transparent-scoring-explainability SKILL.md §5.3, §7).

All tests are pure (no DB, no Claude calls). compute_integrity_hash is
deterministic and has no I/O side effects.
"""
from __future__ import annotations

import json


# ---------------------------------------------------------------------------
# Helpers — canonical inputs shared across tests
# ---------------------------------------------------------------------------

_TRANSCRIPT = json.dumps({"turns": [
    {"role": "user", "text": "I used asyncio to handle 10k connections", "time_in_call_secs": 30},
]})
_VISUAL = json.dumps({"eye_contact_ratio": 0.75, "attention_ratio": 0.88})
_REPORT_BASE: dict = {
    "overall_score": 7.4,
    "prompt_version": "3.0.0",
    "model_version": {
        "evaluator_model": "claude-opus-4-7",
        "rubric_version": "tech-backend-mid-v3",
        "prompt_version": "3.0.0",
        "evaluated_at": "2026-05-05T10:00:00Z",
    },
    "summary": "Strong candidate.",
    "recommendation": "yes",
}


def _hash(**kwargs) -> str:
    from app.services.report_service import compute_integrity_hash

    defaults = dict(
        transcript_json=_TRANSCRIPT,
        visual_metrics_json=_VISUAL,
        rubric_id=1,
        rubric_version=3,
        prompt_version="3.0.0",
        evaluator_model="claude-opus-4-7",
        report_json=dict(_REPORT_BASE),
        overrides=None,
    )
    defaults.update(kwargs)
    return compute_integrity_hash(**defaults)


# ---------------------------------------------------------------------------
# Test class
# ---------------------------------------------------------------------------

class TestComputeIntegrityHash:

    # -----------------------------------------------------------------------
    # Determinism
    # -----------------------------------------------------------------------

    def test_same_inputs_produce_same_hash(self):
        h1 = _hash()
        h2 = _hash()
        assert h1 == h2, "compute_integrity_hash is not deterministic"

    def test_hash_is_hex_string_64_chars(self):
        h = _hash()
        assert isinstance(h, str)
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)

    # -----------------------------------------------------------------------
    # Sensitivity to inputs
    # -----------------------------------------------------------------------

    def test_different_report_content_yields_different_hash(self):
        h1 = _hash(report_json={**_REPORT_BASE, "overall_score": 7.4})
        h2 = _hash(report_json={**_REPORT_BASE, "overall_score": 5.0})
        assert h1 != h2

    def test_different_transcript_yields_different_hash(self):
        t2 = json.dumps({"turns": [
            {"role": "user", "text": "I prefer React over Vue", "time_in_call_secs": 15},
        ]})
        h1 = _hash()
        h2 = _hash(transcript_json=t2)
        assert h1 != h2

    def test_different_prompt_version_yields_different_hash(self):
        h1 = _hash(prompt_version="3.0.0")
        h2 = _hash(prompt_version="3.1.0")
        assert h1 != h2

    def test_different_rubric_version_yields_different_hash(self):
        h1 = _hash(rubric_version=3)
        h2 = _hash(rubric_version=4)
        assert h1 != h2

    def test_different_rubric_id_yields_different_hash(self):
        h1 = _hash(rubric_id=1)
        h2 = _hash(rubric_id=2)
        assert h1 != h2

    def test_different_evaluator_model_yields_different_hash(self):
        h1 = _hash(evaluator_model="claude-opus-4-7")
        h2 = _hash(evaluator_model="claude-sonnet-4-5")
        assert h1 != h2

    # -----------------------------------------------------------------------
    # Self-consistency: stripping the hash key
    # -----------------------------------------------------------------------

    def test_report_integrity_hash_field_stripped_before_hashing(self):
        """report_json containing report_integrity_hash must produce the same
        hash as the same report without that key. Critical invariant: we can
        persist the hash into the report dict and still verify it later.
        """
        report_without = dict(_REPORT_BASE)
        report_with_prior_hash = {**_REPORT_BASE, "report_integrity_hash": "abc123deadbeef"}

        h_without = _hash(report_json=report_without)
        h_with = _hash(report_json=report_with_prior_hash)

        assert h_without == h_with, (
            "Hash changed when report_integrity_hash key was present — "
            "stripping must be applied before encoding."
        )

    def test_self_consistent_embed_and_reverify(self):
        """Simulate the full generation cycle:
        1. Compute hash from clean report.
        2. Embed hash into report.
        3. Recompute from the report-with-embedded-hash.
        4. Assert same result.
        """
        report_clean = dict(_REPORT_BASE)
        h_original = _hash(report_json=report_clean)

        # Embed the hash (as report_service does)
        report_with_hash = {**report_clean, "report_integrity_hash": h_original}

        # Recompute with embedded hash present
        h_reverified = _hash(report_json=report_with_hash)

        assert h_original == h_reverified, (
            "Hash is not self-consistent after embedding — "
            "report_integrity_hash must be stripped before hashing."
        )

    # -----------------------------------------------------------------------
    # Tamper detection
    # -----------------------------------------------------------------------

    def test_one_byte_change_in_transcript_invalidates_hash(self):
        """Changing a single character in transcript_json must change the hash."""
        original_hash = _hash(transcript_json=_TRANSCRIPT)

        # Flip one character
        tampered = _TRANSCRIPT[:-1] + ("X" if _TRANSCRIPT[-1] != "X" else "Y")
        tampered_hash = _hash(transcript_json=tampered)

        assert original_hash != tampered_hash

    def test_null_transcript_produces_different_hash_than_empty_transcript(self):
        h_none = _hash(transcript_json=None)
        h_empty = _hash(transcript_json="")
        assert h_none != h_empty

    # -----------------------------------------------------------------------
    # Override-awareness
    # -----------------------------------------------------------------------

    def test_adding_override_changes_hash(self):
        """Adding an override must produce a different hash (override included in input)."""
        h_no_overrides = _hash(overrides=None)
        h_no_overrides_explicit = _hash(overrides=[])
        # None and [] should produce the same hash (both coerce to [])
        assert h_no_overrides == h_no_overrides_explicit

        h_with_override = _hash(overrides=[{
            "id": 1,
            "skill_id": "python_backend",
            "original_score": 3.5,
            "override_score": 4.0,
            "created_by": "admin",
            "created_at": "2026-05-05T11:00:00",
        }])

        assert h_no_overrides != h_with_override, (
            "Adding an override must change the hash"
        )

    def test_different_override_values_produce_different_hashes(self):
        override_a = [{
            "id": 1,
            "skill_id": "python_backend",
            "original_score": 3.5,
            "override_score": 4.0,
            "created_by": "admin",
            "created_at": "2026-05-05T11:00:00",
        }]
        override_b = [{
            "id": 1,
            "skill_id": "python_backend",
            "original_score": 3.5,
            "override_score": 4.5,  # different score
            "created_by": "admin",
            "created_at": "2026-05-05T11:00:00",
        }]
        assert _hash(overrides=override_a) != _hash(overrides=override_b)

    def test_two_overrides_different_from_one_override(self):
        one = [{
            "id": 1, "skill_id": "python_backend",
            "original_score": 3.5, "override_score": 4.0,
            "created_by": "admin", "created_at": "2026-05-05T11:00:00",
        }]
        two = [
            {
                "id": 1, "skill_id": "python_backend",
                "original_score": 3.5, "override_score": 4.0,
                "created_by": "admin", "created_at": "2026-05-05T11:00:00",
            },
            {
                "id": 2, "skill_id": "system_design",
                "original_score": 2.5, "override_score": 3.0,
                "created_by": "admin", "created_at": "2026-05-05T12:00:00",
            },
        ]
        assert _hash(overrides=one) != _hash(overrides=two)

    # -----------------------------------------------------------------------
    # Design documentation: overrides not a direct input to report_json
    # -----------------------------------------------------------------------

    def test_design_note_overrides_separate_from_report_json(self):
        """DESIGN DOC: overrides are a SEPARATE input parameter, not embedded in
        report_json. This means report_json is immutable post-generation; the
        integrity chain captures both the original report and the override log
        independently. An auditor must pass both the report_json (hash-stripped)
        AND the overrides list to compute_integrity_hash to reproduce the stored hash.
        This test documents the design choice by verifying the two paths are NOT equivalent.
        """
        override = {
            "id": 1, "skill_id": "python_backend",
            "original_score": 3.5, "override_score": 4.0,
            "created_by": "admin", "created_at": "2026-05-05T11:00:00",
        }

        # Hash with override as a separate parameter
        h_separate = _hash(overrides=[override])

        # Hash with override embedded into report_json (incorrect usage)
        report_with_override_embedded = {**_REPORT_BASE, "overrides": [override]}
        h_embedded = _hash(report_json=report_with_override_embedded, overrides=[])

        assert h_separate != h_embedded, (
            "Overrides embedded in report_json must NOT produce the same hash as "
            "the canonical (overrides passed separately) encoding. This difference "
            "is intentional: report_json is immutable, overrides are a separate audit log."
        )
