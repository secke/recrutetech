# HR Guide — Transparency & Explainability

This guide is for HR, hiring managers, and talent partners. It explains the "Why this score?"
features available on every completed interview report.

---

## Why this skill exists

Before transparent scoring, AI-powered interview tools operated as black boxes: a score
appeared, with no explanation of how it was derived. HireVue faced legal action in 2019 (EPIC)
and 2024 (ACLU) on exactly this basis. The EU AI Act (in force 2025) classifies recruiting
AI as high-risk and mandates substantive explainability. NYC Local Law 144 (AEDT) requires
published bias audits.

RecruteTech meets these requirements by design: every score is traceable to a specific
timestamp in the interview, every weakness comes with a concrete growth path, and every
report carries an integrity hash that proves it was not modified after generation. This
also means your decisions are defensible if a candidate asks why they were not advanced,
as required by RGPD Article 22.

---

## Reading the "Why this score?" panel

The `TransparencyPanel` appears below the existing report summary on the interview detail
page. It has three subsections.

### 1. Evidence timeline (per-skill)

Each skill evaluated in the rubric gets a card showing:

- **Skill name and matched level** (e.g. "Python — mid"). The level reflects how the
  candidate's performance aligned with the rubric's level descriptors for the target
  seniority.
- **Score bar** (0 to 5 scale). Color: green above 3.5, amber 2.0–3.5, red below 2.0.
- **Evidence items** listed in chronological order. Each item shows:
  - The evidence type: "Transcription", "Code", or "Indicateur visuel" / "Visual metric".
  - The `score_contribution` — a numeric impact such as `+1.2` or `-0.5`. Multiple
    items for the same skill aggregate informally; they do not have to sum to the skill score.
  - A timestamp button (e.g. `07:24`). Clicking it logs to the console and is wired as
    a placeholder for the video player. The timestamp-to-video link is scaffolded but
    requires a video replay integration to be fully functional.
  - For transcript evidence: the verbatim quote from the candidate's turn.
  - For code evidence: a code block describing the artifact (function name, line range).
  - For visual evidence: a text description of the observed signal.

**Unverified evidence warning:** if the backend's verification pass detected that one or
more transcript quotes could not be matched verbatim in the stored transcript, a yellow
banner appears inside the affected skill card:

> "Certaines citations n'ont pas pu être retrouvées mot pour mot dans la transcription. Vérifiez avant de partager."

This does not mean the evaluation is wrong. It means the quote as stored could not be
verified against the raw transcript text (for example, due to a transcription encoding
difference). Before sharing the report with the candidate, review the flagged quotes
manually against the transcript.

### 2. Counterfactuals ("Pour progresser d'un niveau" / "To reach the next level")

This section lists, for every skill where the candidate scored below the target seniority,
what they would need to demonstrate to reach the next level. Each item shows:

- The `skill_id` tag and the level progression (e.g. `junior → mid`).
- `gap_description`: what is concretely missing, anchored in the rubric's level descriptors.
- `actionable_advice`: 1-2 sentences of constructive, growth-framed guidance.

**How to use counterfactuals in candidate feedback conversations:** these are the canonical
talking points for a debrief call. They give you specific, rubric-grounded language to use
when explaining why a candidate was not advanced and what they can work on. They are also
the source for the candidate-facing "To grow further" section if you enable sharing.

### 3. HR controls

The controls section contains three areas.

**Override a skill score:** opens a modal with:
- A skill selector (populated from `report.skill_assessments`).
- A score slider (0.0 to 5.0, 0.1 steps).
- A justification textarea (minimum 30 characters, validated both in the UI and at the API).

Overrides are append-only and permanently logged. The justification appears in the audit
trail. Treat it like writing a code review comment: it will be read by compliance reviewers
and potentially by regulators.

**Share toggle:** a switch labeled "Partager avec le candidat" / "Share with candidate".
When on (green), the candidate explanation URL becomes live. When off, the URL returns a
"not available" message to the candidate.

**Previous overrides (expandable):** when overrides have been submitted during the current
session, they appear in an expandable list showing skill, new score, timestamp, and the
first 100 characters of the justification.

**Model version footer:** displays `evaluator_model · rubric version · evaluated_at`. This
confirms which version of Claude and which rubric version produced the report.

---

## When to override

Use overrides to correct a score when you have specific, articulable evidence that the model
got it wrong.

**Legitimate reasons to override:**

- You noticed a transcription error that caused the model to misread a candidate answer.
- A follow-up call with the candidate revealed relevant experience not captured in the Aria
  session (e.g. a live-coding session conducted separately).
- The rubric's level descriptors did not cover a specific technology the candidate used,
  causing an undercount on a skill where you can verify proficiency through another means.

**Reasons that do not justify an override:**

- The score "feels too low" without a specific, articulable reason.
- You like the candidate personally and want to boost their score.
- The candidate is from a preferred source and you want to ensure they advance.
- You want to match the score to an outcome you have already decided on.

The justification field is auditable by your compliance team and, in the event of a
regulatory inquiry, by external auditors. Write it as if you are writing a note that will
be read aloud in a deposition.

---

## Sharing with candidates

The share toggle is off by default for every interview. This means the candidate explanation
URL is not accessible until you explicitly enable it.

**What the candidate sees when sharing is on:**
- Page heading: "Vos retours d'entretien" / "Your interview feedback".
- A summary of how they performed (2-4 sentences, growth-framed).
- Their 3-5 strengths.
- Their growth areas.
- Actionable advice per skill (from the counterfactuals).
- The candidate letter (subject + body), written by Claude and sanitized by a second-pass
  prompt.
- A "Contest this evaluation" button.

**What the candidate never sees:**
- `overall_score`, `skill_scores`, `recommendation` / `hiring_recommendation`.
- The raw evidence quotes (these are withheld in v1; a full contest-flow UX is planned).
- Any internal label like `strong_yes`, `senior`, `matched_level: below_junior`.
- The report integrity hash or any internal audit field.

**When to share:** share after you have reviewed the report, verified the evidence pointers
if any unverified-warning appeared, and completed any overrides you intend to make. The
candidate URL is not time-limited; once you share, the candidate can bookmark it and return
to it at any time. Toggling the share flag back to off will re-hide the page, but the
candidate may have already downloaded or saved its contents.

**Default-off rationale:** this is the "mode RH only" design. Accidental sharing before a
report has been reviewed can cause friction if the report needs correction.

---

## Handling a contest

When a candidate clicks "Contest this evaluation" and submits their message, the platform
receives it via `POST /api/candidate/interviews/{token}/contest` and returns 202 Accepted.

In v1, the contest is logged with structured fields (interview ID, whether a reason was
provided, whether a contact email was provided). There is no automated routing to your inbox
yet. Set up the following internal process:

1. Check the application logs (search for `candidate.contest_submitted`) daily or set up a
   log-based alert.
2. When a contest is detected, retrieve the audit trail (`GET /api/interviews/{token}/audit-trail`)
   and compare the report against the transcript.
3. Respond to the candidate within 7 days. RGPD Art. 22 gives candidates the right to a
   human review of automated decisions. The 7-day commitment is displayed to the candidate
   in the contest confirmation message.
4. If the review reveals an error, create an override with a justification referencing the
   contest.

Full HR review queue with inbox routing is planned for a future sprint.

**The contest right cannot be revoked.** If you toggle the share flag off after a candidate
has already seen their explanation, they retain the ability to submit a contest if they
previously received the URL. The contest endpoint does not re-check `share_with_candidate`.
This is by design and reflects RGPD Art. 22.

---

## The audit trail endpoint

When an external auditor, compliance officer, or regulatory authority requests evidence
of how an evaluation was produced, fetch the audit trail:

```bash
curl -H "X-API-Key: your-hr-api-key" \
  "https://api.recrutetech.com/api/interviews/{token}/audit-trail"
```

The response contains:
- The raw transcript and visual metrics used as inputs.
- The rubric version and prompt version active at generation time.
- The evaluator model name.
- The full report JSON (with integrity hash key stripped).
- Every override ever made, in chronological order.
- The current integrity hash.
- Step-by-step instructions for re-deriving the hash.

Hand this JSON payload to the auditor. The verification instructions are embedded in the
response itself, so they do not need any internal documentation.

---

## Integrity hash, plain English

Every report has a `report_integrity_hash` — a SHA-256 fingerprint computed over the
transcript, visual metrics, rubric version, prompt version, model name, the report content,
and the override history.

**What it proves:** if the stored hash matches the hash you compute from the raw inputs,
the report has not been modified after it was generated. A one-character change to the report
body produces a completely different hash.

**What it does not prove:** it does not prove the model evaluated correctly. An LLM can
produce a consistent hash over an incorrect evaluation. Correctness is addressed by rubric
differentiation testing, bias audits, and the HR review process.

**When the hash changes:** the hash is recomputed every time an override is added, because
the override list is part of the canonical input. The audit trail always returns the current
hash and the current override list together, so an external verifier can always reproduce
the current hash.

---

## Cross-references

- API details for all endpoints: [`docs/api/transparency.md`](../api/transparency.md)
- How to build and interpret the rubric: [`docs/hr-guides/rubric-builder.fr.md`](rubric-builder.fr.md)
- Candidate-facing copy contract: [`docs/candidate-consent/explanation-page.md`](../candidate-consent/explanation-page.md)
