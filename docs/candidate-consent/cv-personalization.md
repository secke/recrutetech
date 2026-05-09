# CV Personalization — Candidate Consent Text

This file is the canonical source for the consent strings shown to candidates
during CV upload. The French and English strings below are taken directly from
`frontend/src/components/shared.jsx` (`STRINGS.fr.cv_*` and `STRINGS.en.cv_*`).

Any change to the legal meaning of these strings must be:
1. Updated here first (this file is the contract).
2. Mirrored in `shared.jsx`.
3. Reviewed by legal before deployment.

Cross-references:
- API reference: [`docs/api/cv.md`](../api/cv.md)
- Retention runbook: [`docs/operations/cv-retention.md`](../operations/cv-retention.md)

---

## FRANÇAIS

### Ce que nous collectons

Lorsque vous téléversez votre CV, nous collectons :

- Le **texte brut de votre CV** (`cv_text`) — le contenu exact tel que vous l'avez
  soumis (fichier PDF, DOCX, TXT ou texte collé).
- Un **document structuré** (`cv_parsed_json`) produit par l'IA à partir de votre CV.
  Ce document contient 12 champs :
  - Nom et prénom (utilisés uniquement pour la salutation d'Aria)
  - Années d'expérience professionnelle
  - Niveau de séniorité inféré (`junior`, `mid`, `senior`, `staff`, `principal`)
  - Stack principal (3 à 5 technologies clés)
  - Stack secondaire (autres technologies mentionnées)
  - Domaines métier (ex. : fintech, data engineering)
  - Projets notables (titre, technos utilisées, signaux de scale, rôle, durée)
  - Signaux d'alerte factuels et neutres (ex. : "3 emplois en 18 mois")
  - Sujets d'approfondissement suggérés pour l'entretien
  - Signaux de langue (`french_only`, `english_only`, `both`, `unknown`)
  - Version du prompt d'extraction (à des fins d'audit)
  - Liste des attributs supprimés par l'IA (`redactions_applied`)
- Un **prompt personnalisé** (`personalized_prompt`) composé à partir du document
  structuré et destiné à adapter les questions d'Aria à votre parcours.

### Pourquoi nous le collectons

Votre CV est analysé pour permettre à Aria de vous poser des questions en lien avec
**votre propre expérience** : vos projets réels, vos technologies, votre niveau de
séniorité. L'objectif est de remplacer des questions génériques par une conversation
calibrée sur ce que vous avez réellement fait.

Votre CV n'est **jamais utilisé pour vous évaluer directement**, ni pour prendre une
décision d'embauche automatisée. Il sert uniquement à personnaliser le déroulé de
l'entretien.

### Ce que nous n'extrayons pas — garanties de non-discrimination

L'IA qui analyse votre CV a pour instruction explicite de **ne jamais extraire ni
inférer** les informations suivantes, même si elles apparaissent dans votre CV :

- Âge, date de naissance, année de naissance
- Nom d'école, d'université ou d'établissement d'enseignement (le niveau de diplôme
  et le domaine général sont acceptables, par exemple "Master en Informatique",
  mais jamais le nom de l'établissement)
- Ville, pays, adresse, nationalité, origine géographique
- Genre, identité de genre, pronoms
- Ethnie, race, couleur de peau
- Religion, appartenance religieuse
- Situation maritale, statut familial, nombre d'enfants, statut parental, grossesse
- Situation de handicap, informations médicales, état de santé
- Description physique ou apparence
- Accent ou proxies de maîtrise linguistique (seul un champ fermé
  `french_only | english_only | both | unknown` est autorisé, jamais inféré
  à partir du nom ou du pays)

Si l'IA rencontre l'un de ces attributs dans votre CV, elle le supprime et consigne
sa suppression dans le champ `redactions_applied` à des fins d'audit.

### Durée de conservation

- **90 jours** à compter de la date de dépôt de votre CV (`cv_received_at`).
- Après ce délai, les trois champs suivants sont **mis à NULL** (effacés) :
  `cv_text`, `cv_parsed_json`, `personalized_prompt`.
- Les champs conservés après 90 jours : le consentement booléen
  (`cv_consent_processing`) et l'horodatage de réception (`cv_received_at`),
  qui servent de traçabilité d'audit non-PII.
- La suppression est effectuée par le script `purge_expired_cv_text.py`
  (voir [`docs/operations/cv-retention.md`](../operations/cv-retention.md)).

### Vos droits (RGPD)

Conformément au RGPD, vous disposez des droits suivants :

- **Art. 15 — Droit d'accès** : vous pouvez demander une copie des données
  vous concernant traitées dans le cadre de cet entretien.
- **Art. 16 — Droit de rectification** : vous pouvez demander la correction
  de données inexactes.
- **Art. 17 — Droit à l'effacement** : vous pouvez demander la suppression
  immédiate de votre CV et des données dérivées, sans attendre les 90 jours.
- **Art. 22 — Droit à l'explication** : vous pouvez demander une explication
  sur la manière dont votre CV a été analysé et sur les données extraites
  (le champ `prompt_version` permet de retracer l'exacte version du système
  d'analyse utilisée).

Pour exercer ces droits, contactez : **[TODO: email DPO à renseigner]**

Vous disposez de **7 jours** après l'entretien pour demander un suivi humain
si vous estimez qu'un aspect de l'analyse est incorrect.

### Phase pilote initiale — transparence

Durant cette phase pilote, votre CV est analysé et un profil structuré est
généré, mais **ce profil ne modifie pas encore les questions posées lors de
l'entretien en direct**. Nous le collectons pour valider la qualité du système
avant de l'activer en production. L'entretien se déroule normalement, comme si
vous n'aviez pas fourni de CV.

Nous vous informerons si et quand cela change.

### Texte de la case à cocher (contrat légal)

> **J'autorise RecruteTech à analyser mon CV avec une IA pour personnaliser cet entretien.**

Texte d'explication affiché à la demande ("Pourquoi ce consentement séparé ?") :

> Votre CV peut contenir des données sensibles (santé, origine, etc.). Le RGPD Art. 9
> exige un consentement explicite et distinct pour ce type de traitement.

---

## ENGLISH

### What we collect

When you upload your CV, we collect:

- The **raw CV text** (`cv_text`) — the exact content as you submitted it
  (PDF, DOCX, TXT file or pasted text).
- A **structured document** (`cv_parsed_json`) produced by the AI from your CV.
  This document contains 12 fields:
  - First and last name (used only for Aria's greeting)
  - Years of professional experience
  - Inferred seniority level (`junior`, `mid`, `senior`, `staff`, `principal`)
  - Primary stack (3–5 key technologies)
  - Secondary stack (other technologies mentioned)
  - Business domains (e.g. fintech, data engineering)
  - Notable projects (title, technologies used, scale signals, role, duration)
  - Factual, neutral observations (e.g. "3 jobs in 18 months")
  - Suggested deep-dive topics for the interview
  - Language signals (`french_only`, `english_only`, `both`, `unknown`)
  - Extraction prompt version (for audit purposes)
  - List of attributes stripped by the AI (`redactions_applied`)
- A **personalized prompt** (`personalized_prompt`) composed from the structured
  document, intended to tailor Aria's questions to your background.

### Why we collect it

Your CV is analyzed to allow Aria to ask questions related to **your own experience**:
your real projects, your technologies, your seniority level. The goal is to replace
generic questions with a conversation calibrated to what you have actually done.

Your CV is **never used to evaluate you directly**, nor to make an automated hiring
decision. It is used solely to personalize the flow of the interview.

### What we explicitly do NOT extract — non-discrimination guarantees

The AI analyzing your CV has explicit instructions to **never extract or infer**
the following, even if they appear in your CV:

- Age, date of birth, year of birth
- School name, university name, or name of any educational institution (degree
  level and general field are acceptable, e.g. "Master's in Computer Science",
  but never the institution name)
- City, country, address, nationality, country of origin
- Gender, gender identity, pronouns
- Ethnicity, race, skin colour
- Religion, religious affiliation
- Marital status, family status, number of children, parental status, pregnancy status
- Disability status, medical conditions, health information
- Physical appearance or descriptors
- Accent or language proficiency proxies (only a closed enum
  `french_only | english_only | both | unknown` is allowed, never inferred
  from name or country)

When the AI encounters any of these attributes in your CV, it strips them and
records the suppression in the `redactions_applied` field for audit purposes.

### How long we keep it

- **90 days** from the date your CV was submitted (`cv_received_at`).
- After that, the following three fields are **set to NULL** (erased):
  `cv_text`, `cv_parsed_json`, `personalized_prompt`.
- Fields kept after 90 days: the boolean consent record (`cv_consent_processing`)
  and the receipt timestamp (`cv_received_at`), which serve as non-PII audit trail.
- Deletion is performed by the `purge_expired_cv_text.py` script
  (see [`docs/operations/cv-retention.md`](../operations/cv-retention.md)).

### Your rights (GDPR)

Under the GDPR, you have the following rights:

- **Art. 15 — Right of access**: you may request a copy of the data about you
  processed in connection with this interview.
- **Art. 16 — Right to rectification**: you may request correction of inaccurate data.
- **Art. 17 — Right to erasure**: you may request immediate deletion of your CV and
  derived data, without waiting for the 90-day window.
- **Art. 22 — Right to explanation**: you may request an explanation of how your CV
  was analyzed and what data was extracted (the `prompt_version` field allows the
  exact version of the analysis system to be traced).

To exercise these rights, contact: **[TODO: DPO email to be filled in]**

You have **7 days** after the interview to request a human follow-up if you believe
any aspect of the analysis was incorrect.

### Initial pilot phase — transparency

During this pilot phase, your CV is analyzed and a structured profile is generated,
but **this profile does not yet shape the live interview questions**. We collect it
to validate the quality of the system before enabling it in production. The interview
runs normally, as if you had not provided a CV.

We will notify you if and when this changes.

### Consent checkbox text (legal contract string)

> **I authorize RecruteTech to analyze my CV with AI to personalize this interview.**

Explanation text displayed on request ("Why is this consent separate?"):

> Your CV may contain sensitive data (health, origin, etc.). GDPR Art. 9 requires
> an explicit and separate consent for this type of processing.
