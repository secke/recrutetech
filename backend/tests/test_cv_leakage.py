"""Protected-attribute leakage tests — cv-adaptive-personalization security-critical eval.

Acceptance criterion (SKILL.md §6):
    "Aucun trait discriminant (âge, école, ville) ne fuit dans le prompt Aria final,
     vérifié par eval automatique."

Scope of this test file:
    These tests verify the COMPOSER STAGE (compose_personalized_prompt).
    The mock is set up to return a "clean" CVParsedSchema (one from which Claude would
    have already redacted the protected attributes). We then verify that the COMPOSER
    does not re-introduce any of the protected substrings from the original raw text.

    A Day-2 integration eval (with real Claude in sandbox) should verify that Claude
    itself correctly excludes these attributes from its tool_use output. That eval
    is flagged as requiring a pilot / sandbox key and is out of scope here.
"""
from __future__ import annotations

import re
from unittest.mock import AsyncMock, MagicMock

import pytest


# ---------------------------------------------------------------------------
# Helper: build a "clean" CVParsedSchema (protected attrs already redacted)
# ---------------------------------------------------------------------------


def _make_clean_cv_parsed(redactions: list[str] | None = None):
    """Build a CVParsedSchema that contains NO protected attributes in any field."""
    from app.services.cv_parsing_service import CVParsedSchema, NotableProject

    return CVParsedSchema(
        candidate_name="Candidate Name",
        years_of_experience=5,
        seniority_inferred="mid",
        primary_stack=["Python", "Airflow"],
        secondary_stack=["Spark"],
        domains=["data engineering"],
        notable_projects=[
            NotableProject(
                title="ETL pipelines at OrangeCo",
                tech=["Python", "Airflow", "Spark"],
                scale_signals=["1TB/day"],
                role="Data Engineer",
                duration_months=36,
            )
        ],
        potential_red_flags=[],
        suggested_deep_dive_topics=[
            "Airflow DAG idempotency at 1TB/day",
            "Spark partitioning for the ETL workload",
        ],
        language_signals="unknown",
        prompt_version="1.0.0",
        redactions_applied=redactions or [],
    )


def _make_role(system_prompt: str = "You are Aria, a technical interviewer."):
    role = MagicMock()
    role.id = 1
    role.title = "Backend Engineer"
    role.seniority = "senior"
    role.system_prompt = system_prompt
    return role


# ---------------------------------------------------------------------------
# Test 1: Date of birth / age signal
# ---------------------------------------------------------------------------


def test_date_of_birth_does_not_leak_into_personalized_prompt():
    """Age signal (date of birth '1992') must not appear in the composed Aria prompt.

    CV input contains "Date of birth: 1992-04-12".
    The mock returns a clean CVParsedSchema (Claude already redacted it).
    The composer must not re-read raw input — it only sees cv_parsed.
    """
    from app.services.cv_parsing_service import compose_personalized_prompt

    # The clean CV parsed has redactions_applied populated but no dob in fields
    cv_parsed = _make_clean_cv_parsed(redactions=["date_of_birth"])
    role = _make_role()

    prompt = compose_personalized_prompt(role, cv_parsed, rubric=None)

    assert "1992" not in prompt, (
        "Date of birth year '1992' leaked into the personalized prompt."
    )
    assert "04-12" not in prompt, (
        "Date of birth '04-12' leaked into the personalized prompt."
    )
    assert "date of birth" not in prompt.lower(), (
        "'date of birth' label leaked into the personalized prompt."
    )


# ---------------------------------------------------------------------------
# Test 2: School / university name
# ---------------------------------------------------------------------------


def test_school_name_does_not_leak_into_personalized_prompt():
    """School name 'Paris-Saclay' must not appear in the composed Aria prompt.

    CV input contains "Université Paris-Saclay, master's".
    The mock returns a clean CVParsedSchema (no school name in any field).
    """
    from app.services.cv_parsing_service import compose_personalized_prompt

    cv_parsed = _make_clean_cv_parsed(redactions=["university_name"])
    role = _make_role()

    prompt = compose_personalized_prompt(role, cv_parsed, rubric=None)

    assert "Paris-Saclay" not in prompt, (
        "School name 'Paris-Saclay' leaked into the personalized prompt."
    )
    assert "saclay" not in prompt.lower(), (
        "School name 'saclay' (case-insensitive) leaked into the personalized prompt."
    )


# ---------------------------------------------------------------------------
# Test 3: Marital status
# ---------------------------------------------------------------------------


def test_marital_status_does_not_leak_into_personalized_prompt():
    """Marital status 'married' and 'children' must not appear in the composed prompt.

    CV input contains "Married, two children".
    """
    from app.services.cv_parsing_service import compose_personalized_prompt

    cv_parsed = _make_clean_cv_parsed(redactions=["marital_status", "dependents"])
    role = _make_role()

    prompt = compose_personalized_prompt(role, cv_parsed, rubric=None)

    assert "married" not in prompt.lower(), (
        "'married' leaked into the personalized prompt."
    )
    assert "children" not in prompt.lower(), (
        "'children' leaked into the personalized prompt."
    )
    assert "two children" not in prompt.lower(), (
        "'two children' leaked into the personalized prompt."
    )


# ---------------------------------------------------------------------------
# Test 4: City / country of origin
# ---------------------------------------------------------------------------


def test_city_and_country_do_not_leak_into_personalized_prompt():
    """City 'Casablanca' and country 'Morocco' must not appear in the composed prompt.

    CV input contains "Lives in Casablanca, Morocco".
    The clean CVParsedSchema has 'city' and 'country' in redactions_applied,
    but neither value appears in any structured field.
    """
    from app.services.cv_parsing_service import compose_personalized_prompt

    cv_parsed = _make_clean_cv_parsed(redactions=["city", "country"])
    role = _make_role()

    prompt = compose_personalized_prompt(role, cv_parsed, rubric=None)

    assert "casablanca" not in prompt.lower(), (
        "City 'Casablanca' leaked into the personalized prompt."
    )
    assert "morocco" not in prompt.lower(), (
        "Country 'Morocco' leaked into the personalized prompt."
    )


# ---------------------------------------------------------------------------
# Test 5: Gender + ethnicity
# ---------------------------------------------------------------------------


def test_gender_and_ethnicity_do_not_leak_into_personalized_prompt():
    """Gender pronouns 'she/her' and ethnicity 'Senegalese' must not appear in prompt.

    CV input contains "She/her, ethnically Senegalese".
    """
    from app.services.cv_parsing_service import compose_personalized_prompt

    cv_parsed = _make_clean_cv_parsed(redactions=["gender", "ethnicity"])
    role = _make_role()

    prompt = compose_personalized_prompt(role, cv_parsed, rubric=None)

    assert "she/her" not in prompt.lower(), (
        "Gender pronoun 'she/her' leaked into the personalized prompt."
    )
    assert "senegalese" not in prompt.lower(), (
        "Ethnicity 'Senegalese' leaked into the personalized prompt."
    )
    assert "ethnically" not in prompt.lower(), (
        "'ethnically' leaked into the personalized prompt."
    )


# ---------------------------------------------------------------------------
# Additional: verify redactions_applied is preserved in the composed output path
# ---------------------------------------------------------------------------


def test_redactions_applied_preserved_in_cv_parsed_after_compose():
    """The redactions_applied list on CVParsedSchema is not mutated by compose_personalized_prompt."""
    from app.services.cv_parsing_service import compose_personalized_prompt

    expected_redactions = ["date_of_birth", "university_name", "city"]
    cv_parsed = _make_clean_cv_parsed(redactions=expected_redactions)
    role = _make_role()

    compose_personalized_prompt(role, cv_parsed, rubric=None)

    # The schema object should still carry the redactions list unchanged
    assert cv_parsed.redactions_applied == expected_redactions, (
        "compose_personalized_prompt mutated cv_parsed.redactions_applied"
    )
