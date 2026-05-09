# HR Guide — Rubric Builder

This guide is for HR users, hiring managers, and talent partners. No technical background required.

---

## What is a rubric?

Previously, each RecruteTech role was driven by a free-text block (`system_prompt`) that only an administrator could edit. That text was invisible to HR, impossible to version, and produced inconsistent interviews from one candidate to the next.

A **structured rubric** replaces that text with a formal contract in three parts: what Aria (the voice AI) must ask during the interview, what Claude must evaluate in the report, and what the candidate can read in their explainable feedback. Each rubric defines the skills being evaluated, their weights, the expected performance levels by seniority, and the topics that must be covered. The result: two candidates going through the same role are evaluated on exactly the same criteria, in the same order, with the same weighting. Fairness becomes verifiable, and decisions become auditable.

---

## The 5 wizard steps

Access the wizard via **Roles → [role name] → Rubrics → New rubric**.

### Step 1 — Quick start

Pick a starting template from the six provided models (see the next section) or start with a blank rubric. The template is cloned into your session: all edits are local until you publish.

**Common mistake:** if no template exactly matches your role, pick the closest one and modify it rather than starting from scratch. This avoids having to fill in all the level descriptors manually.

![placeholder: step 1 wizard](./_assets/rubric-step-1.png)

### Step 2 — Skills and weights

Add, remove, or reorder skills by drag-and-drop. For each skill:

- **Weight (%)**: relative importance in the final score. All weights must sum to exactly 100%. The wizard shows a live alert if they do not.
- **Level descriptors**: short text describing what a candidate does at each level (junior, mid, senior, staff). The `senior` level is required. `junior` and `mid` are strongly recommended. These descriptors anchor Aria's and Claude's scores: the more specific they are, the more consistent the grading.
- **Must-probe topics**: a list of topics Aria must cover during the interview for this skill.

**Limits:** maximum 8 skills per rubric. Beyond that, Claude's evaluation quality degrades.

**Common mistake:** overly generic descriptors ("good communication", "knows the basics") do not distinguish a junior from a senior. Use concrete action verbs and reference real tools or situations.

![placeholder: step 2 wizard](./_assets/rubric-step-2.png)

### Step 3 — Interview stages

Arrange interview stages by drag-and-drop. Each stage has:

- **Name and objective**: visible in the final report.
- **Duration (minutes)**: the sum of all stages must not exceed the role's configured duration. The wizard shows the running total in real time.
- **Skills evaluated**: tick the skills that this stage lets you observe.

**Common mistake:** leaving a stage with no skills attached. Aria will still run that stage, but Claude will not be able to use it for scoring.

![placeholder: step 3 wizard](./_assets/rubric-step-3.png)

### Step 4 — Exclusions and settings

This step has two sections.

**Mandatory exclusions**: eight items are pre-checked and locked (see the dedicated section below). You can add your own additional exclusions on top.

**General settings**:
- **Default language**: `fr` or `en`. Candidates can switch if "Candidate can change language" is enabled.
- **Tone**: `warm`, `neutral`, or `rigorous`. Influences Aria's register.
- **Defense questions**: if enabled, Aria asks between N and M integrity-check questions (linked to the `anti-cheating-integrity-layer` skill).

![placeholder: step 4 wizard](./_assets/rubric-step-4.png)

### Step 5 — Test and publish

Before activating a rubric, you must run a calibration test. Click **Run test**. The system simulates three fictional interviews (a junior, a mid, and a senior candidate) and produces scores for each.

The test passes if the senior score is at least **1.5 points** higher than the junior score (on a 0–10 scale). This condition is called `differentiation_ok`.

Once the test passes, the **Activate** button becomes available. Activation makes this version live for all new interviews on the role.

If the test fails (insufficient differentiation), go back to **Step 2** and revise the level descriptors: make sure the junior and senior expectations are clearly distinct.

![placeholder: step 5 wizard](./_assets/rubric-step-5.png)

---

## The 6 starter templates

| Template | Use this when... |
|---|---|
| **Backend Mid** | Hiring a mid-level Python/Node backend developer focused on REST APIs, databases, and testing. 40-min interview. |
| **Backend Senior** | Hiring a senior backend developer. Covers architecture, performance, technical leadership, and system design. 50-min interview. |
| **Frontend Mid** | Hiring a mid-level React/Vue frontend developer. Covers JavaScript/TypeScript, React patterns, CSS, and accessibility. 40-min interview. |
| **Fullstack Mid** | Hiring a generalist fullstack developer covering frontend, backend, databases, and basic DevOps in equal parts. 45-min interview. |
| **Data Engineer Mid** | Hiring a mid-level data engineer. Covers analytical SQL, pipeline orchestration, distributed compute, and data modeling. 45-min interview. |
| **DevOps Mid** | Hiring a mid-level DevOps engineer. Covers Kubernetes, CI/CD, Infrastructure as Code, and observability. 40-min interview. |

If none of the templates fit, use the blank rubric ("Start from scratch" at step 1).

---

## Mandatory exclusions

The following exclusions are **always active** in every rubric and cannot be disabled:

**Do not ask about:** age (`age`), marital status (`marital_status`), religion (`religion`), country of origin (`country_of_origin`), race (`race`), ethnicity (`ethnicity`).

**Do not score on:** accent (`accent`), facial expressions (`facial_expressions`), physical appearance (`physical_appearance`), gender (`gender`), disability (`disability`), school name (`school_name`).

These categories correspond to the protected attributes under GDPR Article 9, French anti-discrimination law, and hard rule #3 of the RecruteTech platform. The system enforces this server-side: even if a checkbox were unchecked in the UI, the backend automatically re-injects these exclusions into the rubric before persisting it. There is no override, including for administrators.

Why the lock? Evaluating or asking about these attributes exposes your company to significant legal risk (CNIL, EEOC) and introduces systemic bias in hiring. The platform handles this guardrail so your team does not have to think about it.

---

## Versioning and immutability

Every published rubric is **immutable**. Once created in the database, it cannot be modified. Editing a rubric creates a new version (v2, v3, etc.). Past interviews remain linked to the exact version used when they were created. This ensures that reports are reproducible and auditable over time.

The rubric list for a role displays a **vertical timeline**: each version is a node, and the active version is highlighted. The **Compare** button (available when there are at least two versions) opens a side-by-side visual diff, section by section: skills added/removed/changed, weight changes, stage modifications.

To edit an active rubric: click **Clone** from the list, modify the copy, run the calibration test, then activate it. The old version is automatically deactivated.

---

## The synthetic calibration test

The test simulates three fictional interviews by calling Claude with standardised candidate profiles (junior, mid, senior). Each simulation produces per-skill scores and an overall score.

The test automatically passes if `senior_score - junior_score >= 1.5` (out of 10). A typical passing result looks like: "Simulated junior → 3.5; Simulated mid → 5.5; Simulated senior → 7.5. Differentiation OK."

The test can take between 30 and 120 seconds depending on model load. Do not close the tab while the test is running.

Test results are stored in the rubric and visible at any time from the list (green "Differentiation OK" badge or red "Insufficient differentiation" badge).

---

## Activation gates

A rubric can only be activated if:
1. It has been tested at least once (`last_tested_at` is set).
2. The last test passed differentiation (`differentiation_ok = true`).

If you attempt to activate without testing, or after a failed test, you will receive a 409 error. The message states the reason and what to do next.

---

## What happens during an interview

When a candidate starts an interview for a role with an active rubric, the backend automatically builds Aria's prompt from the rubric (skills, stages, exclusions, language) and the parsed CV if available. At the end of the interview, Claude evaluates the transcript using exactly the same criteria, weights, and descriptors. The report is therefore directly tied to the choices made in the rubric.

For technical details, see the [Rubrics API reference](../api/rubrics.md).

---

## FAQ

**I want to edit a published rubric.**
An activated rubric cannot be edited directly (rubrics are immutable). Click "Clone" from the version list, modify the copy, run the calibration test, then activate the new version. The old version is automatically deactivated.

**Why can't I uncheck "age" in the exclusions?**
Age is a protected attribute under GDPR Article 9 and the platform's non-negotiable hard rule #3. The backend re-injects this exclusion automatically even if it is absent from your payload. There is no workaround by design.

**My role doesn't match any template. How do I start?**
Choose "Start from scratch" at step 1. You will get a blank rubric with the mandatory exclusions pre-populated. Add your skills manually in step 2.

**What if no rubric is active for a role?**
The interview falls back to the legacy path (`Role.system_prompt`). This path remains functional during the coexistence phase (see the [migration guide](../migration-guides/role-system-prompt-to-rubric.md)), but it is less structured and does not produce equally precise reports. It is recommended to create and activate a rubric for all roles.

**How long should an interview be?**
It depends on the role and the number of stages. In practice: 40 min for a mid-level role, 50 min for a senior role. The sum of stage durations must not exceed the duration configured on the role. The wizard shows this in real time at step 3.

**Who can create or edit a rubric?**
Only users with the `Admin` or `Hiring Manager` role can create, test, and activate rubrics. The `Reviewer` role can only view.

**Can I have two active rubrics simultaneously for the same role?**
No, in the current version. Only one rubric can be active per role at a time. A/B testing on two versions is planned for a later phase.

**How long are rubrics retained?**
Rubrics are retained for the lifetime of the role. Modification logs are kept for 5 years (audit obligation). A deactivated rubric remains readable from the version list.
