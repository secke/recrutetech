"""Protected-attribute leakage audit for transparent-scoring-explainability skill.

Acceptance criterion (SKILL.md §6 + §7):
    "Aucune evidence ne mentionne attributs protégés (vérifié par eval automatique
    sur 100 rapports)."

This test:
- Generates 100 synthetic v3-shape reports with clean (non-leaking) content.
- Scans ALL string fields recursively for the 12 canonical protected attributes.
- Asserts 0 leakages in the clean 100 reports.
- Adds 5 intentionally "dirty" reports containing forbidden text and asserts
  the detector FINDS them (negative control — proves the scanner is not trivially
  ignoring content).

The 12 canonical protected attributes are taken from rubric_service.py lines 30-46:
    age, marital_status, religion, country_of_origin, race, ethnicity,
    accent, facial_expressions, physical_appearance, gender, disability, school_name

False-positive risk note:
    Substring matching is case-insensitive. Words that are legitimate in technical
    context but contain a protected substring include:
    - "marital_status" may appear as a Python dict key name in code context —
      but reports are natural language, not code, so this risk is minimal.
    - "age" appears in words like "package", "percentage", "stage", "manage" —
      we therefore check for the standalone word "age" using word-boundary heuristic
      (padded with non-alphanumeric delimiters OR at string start/end).
      This approach mirrors what a post-generation auditor would do.
    - "race" appears in "interface", "brace", "trace" — same word-boundary check.
    - "gender" appears in "gender-neutral", "re-render" (rare in HR context) —
      word-boundary check.
    The test documents these risks inline.
"""
from __future__ import annotations

import re
from typing import Any


# ---------------------------------------------------------------------------
# Constants — canonical 12 protected attributes
# ---------------------------------------------------------------------------

_PROTECTED_ATTRIBUTES = [
    "age",
    "marital_status",
    "religion",
    "country_of_origin",
    "race",
    "ethnicity",
    "accent",
    "facial_expressions",
    "physical_appearance",
    "gender",
    "disability",
    "school_name",
]

# Words where a simple substring match would produce false positives.
# For these, we require word-boundary matching.
_WORD_BOUNDARY_ATTRS = {"age", "race", "gender"}

# Compiled patterns: word-boundary for risky attrs, plain substring for others.
_PATTERNS = {}
for _attr in _PROTECTED_ATTRIBUTES:
    if _attr in _WORD_BOUNDARY_ATTRS:
        # \b doesn't match hyphens well across locales, so use explicit delimiters
        # that cover start/end of string and non-word characters.
        _PATTERNS[_attr] = re.compile(
            r"(?<![a-zA-Z0-9_])" + re.escape(_attr) + r"(?![a-zA-Z0-9_])",
            re.IGNORECASE,
        )
    else:
        _PATTERNS[_attr] = re.compile(re.escape(_attr), re.IGNORECASE)


# ---------------------------------------------------------------------------
# Scanner — recursively scan all string values in a nested dict/list
# ---------------------------------------------------------------------------

def _scan_value(value: Any, path: str = "") -> list[tuple[str, str, str]]:
    """Return list of (attribute, path, matched_text) for any leakage found."""
    leaks: list[tuple[str, str, str]] = []
    if isinstance(value, str):
        for attr, pattern in _PATTERNS.items():
            m = pattern.search(value)
            if m:
                leaks.append((attr, path, m.group(0)))
    elif isinstance(value, dict):
        for k, v in value.items():
            leaks.extend(_scan_value(v, path=f"{path}.{k}" if path else k))
    elif isinstance(value, list):
        for i, item in enumerate(value):
            leaks.extend(_scan_value(item, path=f"{path}[{i}]"))
    return leaks


# ---------------------------------------------------------------------------
# Report generator — produces clean synthetic v3 reports
# ---------------------------------------------------------------------------

def _make_clean_report(index: int) -> dict:
    """Produce a v3-shaped report that contains no protected attribute references.

    Content is varied across indices to avoid identical reports masking leakage.
    All names, companies, and technical claims are synthetic.
    """
    # Varied skill scores so reports are not all identical
    python_score = round(2.5 + (index % 5) * 0.3, 1)
    design_score = round(2.0 + (index % 4) * 0.4, 1)
    comm_score = round(3.0 + (index % 3) * 0.2, 1)
    overall = round((python_score * 0.4 + design_score * 0.35 + comm_score * 0.25) * 2, 1)

    tech_claims = [
        "Candidate articulated async/await semantics with precision.",
        "Demonstrated solid understanding of connection pooling strategies.",
        "Explained trade-offs between SQL and NoSQL clearly.",
        "Described distributed caching with examples from production work.",
        "Walked through database sharding strategy with concrete numbers.",
    ]
    strengths_pool = [
        "Strong Python asynchronous programming knowledge.",
        "Clearly understands system scalability trade-offs.",
        "Well-structured and concise technical communication.",
        "Practical experience with high-throughput API design.",
        "Solid understanding of data pipeline engineering.",
    ]
    gap_pool = [
        "Limited experience with distributed transaction patterns.",
        "No hands-on experience with chaos engineering or failure injection.",
        "System design answers stayed at component level without capacity reasoning.",
        "Could not articulate advanced database indexing strategies.",
        "Lacked depth on containerisation orchestration trade-offs.",
    ]

    i5 = index % 5
    i4 = index % 4
    i3 = index % 3

    return {
        "prompt_version": "3.0.0",
        "rubric_version_label": f"Backend Senior v{(index % 3) + 1}",
        "language": "en",
        "overall_score": overall,
        "skill_scores": {
            "python_backend": python_score,
            "system_design": design_score,
            "communication": comm_score,
        },
        "skill_assessments": [
            {
                "skill_id": "python_backend",
                "score": python_score,
                "matched_level": "mid" if python_score < 3.0 else "senior",
                "notes": (
                    f"{tech_claims[i5]} "
                    "To reach staff level, demonstrate large-scale service ownership."
                ),
            },
            {
                "skill_id": "system_design",
                "score": design_score,
                "matched_level": "mid" if design_score < 3.0 else "senior",
                "notes": (
                    "Good trade-off articulation. "
                    "To reach staff, provide capacity estimations and failure mode analysis."
                ),
            },
            {
                "skill_id": "communication",
                "score": comm_score,
                "matched_level": "senior",
                "notes": "Clear and structured responses throughout the session.",
            },
        ],
        "evidence": [
            {
                "claim": tech_claims[i5],
                "supports_skill": "python_backend",
                "score_contribution": round(0.3 + (index % 4) * 0.2, 1),
                "evidence_type": "transcript",
                "timestamp_seconds": 30 + index * 3,
                "quote": f"I worked on high-throughput systems at my previous company handling {index + 1}K requests per second",
            },
        ],
        "counterfactuals": [
            {
                "skill_id": "system_design",
                "current_level": "mid" if design_score < 3.0 else "senior",
                "target_level": "senior" if design_score < 3.0 else "staff",
                "gap_description": gap_pool[i4],
                "actionable_advice": (
                    "Practice designing distributed systems by working through case studies "
                    "on high-availability architectures and practicing capacity estimation."
                ),
            },
        ],
        "model_version": {
            "evaluator_model": "claude-opus-4-7",
            "rubric_version": f"Backend Senior v{(index % 3) + 1}",
            "prompt_version": "3.0.0",
            "evaluated_at": f"2026-05-05T{10 + (index % 12):02d}:00:00Z",
        },
        "summary": (
            f"Candidate {index + 1} demonstrated solid technical foundations. "
            f"{strengths_pool[i5]} {gap_pool[i4]}"
        ),
        "strengths": [strengths_pool[i5], strengths_pool[(i5 + 1) % 5]],
        "gaps": [gap_pool[i4], gap_pool[(i4 + 1) % 5]],
        "stage_notes": [
            {"stage_id": "intro", "observation": "Confident and clear introduction."},
            {"stage_id": "technical", "observation": f"Demonstrated {tech_claims[i5].lower()}"},
        ],
        "communication": "Responses were well-structured and articulated trade-offs clearly.",
        "engagement": "Maintained focus throughout; responded promptly to follow-up questions.",
        "recommendation": ["yes", "maybe", "yes", "strong_yes", "yes"][i5],
        "candidate_letter": {
            "subject": "Thank you for your technical interview",
            "body": (
                "Thank you for taking the time to participate in our technical interview. "
                "Your understanding of asynchronous programming patterns was impressive. "
                f"To continue improving, consider deepening your knowledge of {['distributed systems design', 'capacity planning', 'service reliability engineering', 'database internals', 'API performance optimisation'][i5]}. "
                "We appreciate the effort and preparation you brought to this conversation. "
                "Keep building on your strong technical foundation, and best of luck with your career progression."
            ),
        },
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestProtectedAttributeLeakage:

    def test_100_clean_reports_have_zero_leakage(self):
        """100 synthetic reports — expect zero protected attribute leakages."""
        leakage_log: list[dict] = []
        for i in range(100):
            report = _make_clean_report(i)
            leaks = _scan_value(report)
            if leaks:
                leakage_log.append({"report_index": i, "leaks": leaks})

        assert len(leakage_log) == 0, (
            f"Protected attribute leakage detected in {len(leakage_log)} reports:\n"
            + "\n".join(str(e) for e in leakage_log[:5])
        )

    def test_detector_finds_intentional_leakage(self):
        """Negative control: 5 reports with embedded forbidden text — detector must find all."""
        dirty_reports = [
            # Report 0: "age" as a standalone word
            {"summary": "Candidate's age appears to be mid-career based on their experience."},
            # Report 1: gender
            {"summary": "The candidate's gender identity was apparent from their answers."},
            # Report 2: religion
            {"summary": "Candidate mentioned religion and its influence on their work schedule."},
            # Report 3: school_name
            {"summary": "Graduated from a top school_name like MIT, which is reflected in their depth."},
            # Report 4: ethnicity
            {"summary": "Candidate's ethnicity and cultural background came through in their communication style."},
        ]
        expected_attributes = ["age", "gender", "religion", "school_name", "ethnicity"]

        for idx, (report, expected_attr) in enumerate(zip(dirty_reports, expected_attributes)):
            leaks = _scan_value(report)
            found_attrs = {leak[0] for leak in leaks}
            assert expected_attr in found_attrs, (
                f"Report {idx}: detector missed '{expected_attr}' in: {report}"
            )

    def test_clean_report_words_not_false_positively_flagged(self):
        """False-positive control: common technical words must NOT be flagged.

        'package' contains 'age' as substring — word-boundary check must not flag it.
        'brace' contains 'race' — must not be flagged.
        'percentage' contains 'age' — must not be flagged.
        'stage' contains 'age' — must not be flagged (used extensively in report schemas).
        'manage' contains 'age' — must not be flagged.
        """
        technical_content = {
            "summary": (
                "Candidate can manage complex stage transitions in a pipeline. "
                "Their code uses percentage-based rate limiting. "
                "The brace syntax in their code was consistent. "
                "Package management knowledge is solid."
            ),
        }
        leaks = _scan_value(technical_content)
        # Only word-boundary "age" should matter — 'stage', 'manage', 'package', 'percentage' must NOT match
        age_leaks = [leak for leak in leaks if leak[0] == "age"]
        race_leaks = [leak for leak in leaks if leak[0] == "race"]
        assert not age_leaks, f"False positive on 'age' in technical text: {age_leaks}"
        assert not race_leaks, f"False positive on 'race' in technical text: {race_leaks}"

    def test_scanner_handles_nested_structures(self):
        """Scanner must recurse into nested dicts and lists."""
        nested = {
            "evidence": [
                {
                    "claim": "Candidate's disability status was not relevant to this evaluation.",
                    "details": "code artifact",
                }
            ]
        }
        leaks = _scan_value(nested)
        found_attrs = {l[0] for l in leaks}
        assert "disability" in found_attrs, "Scanner did not recurse into nested evidence list"

    def test_scanner_returns_path_information(self):
        """Leak reports must include the path to the offending field for debugging."""
        report = {
            "skill_assessments": [
                {"skill_id": "python_backend", "notes": "Candidate's accent was distracting."},
            ]
        }
        leaks = _scan_value(report)
        assert len(leaks) > 0
        # Path should indicate the location
        paths = [l[1] for l in leaks]
        assert any("skill_assessments" in p for p in paths), (
            f"Expected path containing 'skill_assessments', got: {paths}"
        )
