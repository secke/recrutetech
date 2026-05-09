# Explanation Page — Candidate-Facing Copy Contract

This document records the canonical copy shown on the candidate explanation page
(`/candidate/explanation/:interviewToken`), as implemented in
`frontend/src/screens/CandidateExplanation.jsx`. String keys reference
`frontend/src/components/shared.jsx` `STRINGS.fr` and `STRINGS.en`.

It serves two purposes:
1. Legal review: verify that every string shown to candidates complies with RGPD Art. 22
   and does not reveal HR-internal information.
2. i18n parity check: confirm FR and EN strings are present and aligned.

Cross-references:
- API reference: [`docs/api/transparency.md`](../api/transparency.md)
- HR guide: [`docs/hr-guides/transparency-handbook.md`](../hr-guides/transparency-handbook.md)

---

## What the candidate sees

When sharing is enabled (`share_with_candidate = true`) and the report is available,
the page renders the following fields in this order:

1. **Page title** — `candidate_explanation_title`
2. **Summary** — `report.summary` (2-4 sentences, growth-framed, no score or decision)
3. **Strengths section** — `candidate_explanation_strengths` heading, then `report.strengths[]`
4. **Growth areas section** — `candidate_explanation_growth` heading, then `report.gaps[]`
5. **Actionable advice section** — `candidate_explanation_actionable` heading, then
   `report.counterfactuals[*].actionable_advice` grouped by `skill_id`
6. **Feedback letter section** — `candidate_explanation_letter` heading, then
   `report.candidate_letter.subject` and `report.candidate_letter.body`
7. **Contest button** — `candidate_explanation_contest`

---

## What the candidate does NOT see

The following fields are structurally absent from the `CandidateViewResponse` Pydantic model
and are never rendered on the explanation page:

- `overall_score` — the numeric 0–10 score
- `skill_scores` — per-skill scores (0–5 scale)
- `skill_assessments` — internal array with `matched_level`, rubric references, growth notes
- `recommendation` — the `strong_yes / yes / maybe / no / strong_no` hiring decision
- `hiring_recommendation` — legacy alias for `recommendation`
- `evidence` / `evidence_pointers` — verbatim transcript quotes with score contributions
- `stage_notes` — HR-internal per-stage observations
- `report_integrity_hash` — internal audit field
- `evidence_verified` — internal quality flag

The frontend (`CandidateExplanation.jsx`) additionally applies a defensive check and does
not render these fields even if they were somehow present in the API response.

---

## SECTION FRANÇAISE

### Titre de la page

**Clé :** `candidate_explanation_title`

> Vos retours d'entretien

---

### Sections et titres

| Clé | Texte |
|-----|-------|
| `candidate_explanation_strengths` | Vos points forts |
| `candidate_explanation_growth` | Axes de progression |
| `candidate_explanation_actionable` | Pour aller plus loin |
| `candidate_explanation_letter` | Lettre de feedback |

---

### Bouton de contestation

**Clé :** `candidate_explanation_contest`

> Contester cette évaluation

---

### Modal de contestation

**Titre — clé :** `candidate_explanation_contest_modal_title`

> Contester l'évaluation

**Placeholder du champ texte — clé :** `candidate_explanation_contest_placeholder`

> Décrivez votre contestation (ex. : une information incorrecte, un contexte manquant)…

**Bouton de soumission — clé :** `candidate_explanation_contest_submit`

> Envoyer ma contestation

**Message de confirmation — clé :** `candidate_explanation_contest_success`

> Votre retour a bien été reçu. Un recruteur pourra en tenir compte.

---

### Cas où le partage n'est pas activé (404)

**Titre — clé :** `candidate_explanation_not_shared`

> Les retours d'entretien ne sont pas encore disponibles.

**Texte d'aide — clé :** `candidate_explanation_not_shared_help`

> Le recruteur n'a pas encore activé le partage pour cet entretien. Vous pouvez contacter l'entreprise si vous avez des questions.

---

### États de chargement et d'erreur

| Clé | Texte |
|-----|-------|
| `candidate_explanation_loading` | Chargement de vos retours… |
| `candidate_explanation_error` | Impossible de charger vos retours. Veuillez réessayer. |
| `candidate_explanation_retry` | Réessayer |

---

## ENGLISH SECTION

### Page title

**Key:** `candidate_explanation_title`

> Your interview feedback

---

### Section headings

| Key | Text |
|-----|------|
| `candidate_explanation_strengths` | Your strengths |
| `candidate_explanation_growth` | Growth areas |
| `candidate_explanation_actionable` | To grow further |
| `candidate_explanation_letter` | Feedback letter |

---

### Contest button

**Key:** `candidate_explanation_contest`

> Contest this evaluation

---

### Contest modal

**Title — key:** `candidate_explanation_contest_modal_title`

> Contest the evaluation

**Textarea placeholder — key:** `candidate_explanation_contest_placeholder`

> Describe your concern (e.g. incorrect information, missing context)…

**Submit button — key:** `candidate_explanation_contest_submit`

> Submit contest

**Confirmation message — key:** `candidate_explanation_contest_success`

> Your feedback has been received. A recruiter may take it into account.

---

### Not-shared state (404 path)

**Heading — key:** `candidate_explanation_not_shared`

> Interview feedback is not available yet.

**Help text — key:** `candidate_explanation_not_shared_help`

> The recruiter has not yet enabled sharing for this interview. Contact the company if you have questions.

---

### Loading and error states

| Key | Text |
|-----|------|
| `candidate_explanation_loading` | Loading your feedback… |
| `candidate_explanation_error` | Could not load your feedback. Please try again. |
| `candidate_explanation_retry` | Retry |

---

## The 404 path

When a candidate navigates to their explanation URL and sharing is disabled, the backend
returns HTTP 404 (not 403). The frontend catches 404 and renders the `NotSharedState`
component, which shows `candidate_explanation_not_shared` and
`candidate_explanation_not_shared_help`.

The candidate cannot distinguish "this token does not exist" from "the recruiter has not
enabled sharing." This is a deliberate enumeration-defense design: a 403 would confirm
to the candidate (or to a bad actor) that the interview exists but is withheld.

---

## The contest mechanism

### How it works

The "Contest this evaluation" button opens the contest modal. The candidate writes a
description of their concern (free text). On submit, the frontend calls:

```
POST /api/candidate/interviews/{interview_token}/contest
```

with body `{reason: string, contact_email?: string}`. The endpoint returns 202 Accepted.
The confirmation screen shows `candidate_explanation_contest_success`.

### Implementation note: share-flag independence

The contest endpoint does NOT re-gate on `share_with_candidate`. If the candidate was
previously shown their evaluation and the recruiter subsequently toggled sharing off,
the candidate retains the ability to submit a contest if they still have the URL.

This implements the **RGPD Article 22 right to contest** as a non-revocable right. A
recruiter cannot retroactively take away the candidate's ability to challenge the evaluation
by toggling an interface switch.

### v1 persistence

In v1, contests are logged to structured application logs only. There is no
`ContestSubmission` database table. HR must monitor logs for `candidate.contest_submitted`
events and respond within 7 days. Full inbox routing is planned for a future sprint.

---

## Right to explanation under RGPD Art. 22

RGPD Article 22 requires that automated decision-making systems provide meaningful
information about the logic involved, the significance of the decision, and the
envisaged consequences. Candidates also have the right to contest the decision and
to request human review.

The explanation page addresses these requirements as follows:

| Requirement | Implementation |
|-------------|----------------|
| Meaningful information on the criteria used | The `summary`, `strengths`, and `gaps` fields are written by Claude in reference to the rubric skills. The rubric defines the evaluation criteria for the role. |
| Significance and envisaged consequences | The candidate letter explains what the evaluation means for their development, without revealing the hiring decision. |
| Right to contest | The "Contest this evaluation" button is always visible when the page is shared. The contest endpoint does not require sharing to remain active. |
| Right to human review | The `recourse_available: true` and `recourse_deadline_days: 7` fields are returned by the API. The contest confirmation message explicitly states a 7-day response commitment. |
| Growth path (counterfactuals) | The "To grow further" / "Pour aller plus loin" section provides concrete, skill-level guidance on what the candidate would need to demonstrate to perform at the next level. |

The `candidate_letter` is produced by `CANDIDATE_LETTER_PROMPT_VERSION = "1.0.0"` (a
second, independent Claude pass on top of the main evaluation). That pass enforces
additional redaction rules: no numeric scores, no recommendation value, no comparison
to other candidates, no protected attributes, no rubric internals, no verbatim quotes
of the candidate back at themselves. Any content the second pass had to remove is
logged in `report.scrubbed_fields` for the compliance team.
