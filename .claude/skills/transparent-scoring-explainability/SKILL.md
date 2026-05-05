---
name: transparent-scoring-explainability
description: |
  Rendre toutes les décisions d'évaluation entièrement explicables et auditables, à la fois pour
  les recruteurs et pour les candidats. Chaque score (par compétence, par étape, global) doit
  être traçable jusqu'aux moments concrets de l'entretien (timestamps, citations transcrites,
  événements code, signaux visuels) qui l'ont produit. Déclencher dès qu'un rapport d'entretien
  est généré, dès qu'un candidat demande "pourquoi ce score", quand un recruteur veut justifier
  une décision, ou quand on prépare des audits de conformité (NYC AEDT, EU AI Act, RGPD article 22).
  Utiliser ce skill pour toute requête mentionnant "explicabilité", "transparence du score", "black
  box", "comment l'IA a évalué", "justification", "audit AI", "article 22 RGPD", "AEDT", ou pour
  contrer la critique #1 de HireVue ("aucune explication, aucun recours") qui a déclenché la
  plainte EPIC 2019 et la plainte ACLU 2024.
---

# Transparent Scoring & Explainability

## 1. Objectif

HireVue est sous procès depuis 2019 (EPIC) et 2024 (ACLU) précisément parce que son scoring est une boîte noire. EU AI Act (entré en vigueur en 2025) classe les systèmes de recrutement comme "high-risk" et exige une **explicabilité substantive**. NYC AEDT impose un audit de biais publié.

RecruteTech doit transformer ce risque réglementaire en **avantage compétitif marketing** : être la plateforme qui *explique tout*, au candidat comme au recruteur.

## 2. Principe fondateur

Tout score (overall_score, par compétence, par étape) doit être :
- **Décomposable** : on peut zoomer du score global jusqu'aux moments individuels qui l'ont causé
- **Cité** : chaque évaluation pointe vers un timestamp + citation transcrite + (si pertinent) extrait de code
- **Contrefactuel** : on peut indiquer ce qui aurait fait monter le score d'un cran
- **Auditable** : versionnage du modèle d'évaluation utilisé, conservation 5 ans

## 3. Refactor du `report_service.py`

Le service actuel (`backend/app/services/report_service.py`) génère déjà un JSON structuré avec Claude Opus 4.7. Étendre le schéma de sortie pour inclure les **evidence pointers** :

### Schéma actuel (extrait)
```json
{
  "overall_score": 7.4,
  "strengths": ["..."],
  "skill_assessments": [{"name": "Python", "score": 7, "note": "..."}]
}
```

### Schéma cible
```json
{
  "overall_score": 7.4,
  "score_decomposition": {
    "communication": {"score": 8.0, "weight": 0.20},
    "technical_depth": {"score": 7.0, "weight": 0.35},
    "problem_solving": {"score": 7.5, "weight": 0.25},
    "code_quality": {"score": 6.5, "weight": 0.15},
    "integrity": {"score": 9.0, "weight": 0.05}
  },
  "evidence_pointers": [
    {
      "claim": "Strong understanding of asyncio",
      "supports_skill": "Python",
      "score_contribution": +1.2,
      "evidence_type": "transcript",
      "timestamp_seconds": 412,
      "quote": "asyncio uses an event loop, so when I await a coroutine, control returns to the loop and other tasks can run"
    },
    {
      "claim": "Did not handle empty array edge case initially",
      "supports_skill": "code_quality",
      "score_contribution": -0.5,
      "evidence_type": "code_event",
      "timestamp_seconds": 845,
      "code_snapshot_id": "snap_4",
      "details": "First submission failed test 'empty_input', candidate fixed after Aria's question"
    },
    {
      "claim": "Visual engagement remained high throughout",
      "supports_skill": "communication",
      "score_contribution": +0.3,
      "evidence_type": "visual_metric",
      "metric": "eye_contact_ratio",
      "value": 0.78,
      "note": "weighted lightly — varies across cultures and individuals"
    }
  ],
  "counterfactuals": [
    "To reach 'strong_yes', candidate would need to demonstrate hands-on experience with distributed systems at scale, which was absent from both CV and discussion."
  ],
  "model_version": {
    "evaluator_model": "claude-opus-4-7",
    "rubric_version": "tech-backend-mid-v3",
    "evaluated_at": "2026-05-04T14:32:00Z"
  }
}
```

## 4. Vues utilisateur

### 4.1 Dashboard HR (existant — à enrichir)

Sur la page de détail candidat (`screens/HRDashboard.jsx`), ajouter une vue "Pourquoi ce score ?" qui affiche :

- Un **breakdown visuel** (barre par compétence avec poids)
- La **timeline interactive** : chaque evidence est un point cliquable sur la timeline de l'entretien. Clic → joue la vidéo à `timestamp_seconds - 5`, affiche la citation, met en surbrillance le snapshot code si applicable.
- Les **counterfactuals** : "Pour passer en strong_yes, il manquait..."
- Le **modèle utilisé** : "Évaluation par Claude Opus 4.7, rubric v3, le 4 mai 2026 à 14:32"
- Un bouton **"Override l'évaluation"** : le RH peut ajuster le score avec justification, ce qui est tracé pour audit.

### 4.2 Vue candidat (NOUVELLE — différenciateur fort)

Si le recruteur active "Partage avec candidat", le candidat reçoit (en plus de la lettre formative existante) un dashboard explicable :

- **Son score global** affiché de manière non-anxiogène (pas de classement vs autres candidats)
- **Ses 3 forces principales** avec citations exactes de ce qu'il a dit
- **Ses 3 axes d'amélioration** avec citations + suggestion d'angle de progrès
- **Aucune mention** de la recommandation de hiring (`strong_yes`/`no`) — c'est interne RH
- **Aucune comparaison** avec d'autres candidats
- Bouton *"Contester cette évaluation"* qui ouvre un formulaire de feedback envoyé au recruteur + Anthropic side pour amélioration du modèle

C'est un **différenciateur de marque** : aucun concurrent ne fait ça. Mercor, HireVue rejettent en silence.

### 4.3 API publique d'audit

Endpoint pour les autorités de régulation et les enterprises avec exigences de conformité :

```
GET /api/interviews/{token}/audit-trail
Authorization: Bearer <audit_token>
```

Retourne le rapport complet + tous les modèles versionnés + les inputs (transcript, code, métriques) hashés pour vérification d'intégrité.

## 5. Implémentation backend

### 5.1 Modifier le `SYSTEM_PROMPT` du `report_service.py`

Ajouter explicitement à la fin du prompt actuel :

```
For EACH score you assign (overall, per-skill, per-stage), you MUST also provide an evidence_pointers
array. Each pointer cites a specific moment with:
- timestamp_seconds (when in the interview the moment occurred)
- evidence_type ("transcript" | "code_event" | "visual_metric" | "defense_response")
- quote (verbatim from transcript) OR details (for non-transcript evidence)
- score_contribution (positive or negative numeric impact, e.g. +0.5 or -1.0)

Also produce a counterfactuals array: for each major weakness, state concretely what the candidate
would need to demonstrate to move up one level (e.g., from "maybe" to "yes").

NEVER fabricate quotes. If you cannot cite verbatim, do not include the evidence pointer.
NEVER use facial expression analysis or accent as evidence — these are excluded for fairness.
```

### 5.2 Versioning

Ajouter une table `EvaluationRubric` :

```python
class EvaluationRubric(SQLModel, table=True):
    id: int = Field(primary_key=True)
    role_id: int = Field(foreign_key="role.id")
    version: str  # "v1", "v2", "v3"
    rubric_json: dict = Field(sa_column=Column(JSON))
    created_at: datetime
    is_active: bool
```

À chaque entretien, on snapshot la version active dans `Interview.evaluation_rubric_version` (string). Modifier la rubric ne change PAS rétroactivement les scores.

### 5.3 Vérification d'intégrité

Pour chaque rapport, calculer un hash :

```python
report_hash = sha256(
    transcript_hash + code_session_hash + visual_metrics_hash +
    rubric_version + model_version + report_json
)
```

Stocké dans `Interview.report_integrity_hash`. Permet de prouver qu'un rapport n'a pas été altéré post-génération (utile pour les audits).

## 6. Garde-fous

- **Pas de leakage entre candidats** : un candidat ne peut JAMAIS voir le rapport d'un autre, même anonymisé.
- **Pas de scoring sur attributs protégés** : âge, genre, origine, religion, handicap. Le prompt Claude doit l'interdire explicitement, et un audit automatique post-génération doit vérifier l'absence de mention de ces attributs dans les `evidence_pointers`.
- **Citations vérifiables** : chaque `quote` doit être trouvable verbatim dans la transcription. Un job de validation automatique compare avant publication.
- **Mode "RH only"** : par défaut, la vue candidat est désactivée et le recruteur doit l'activer explicitement pour ce candidat. Pas de leak accidentel.
- **Right to explanation** (RGPD art. 22) : le candidat a le droit de demander l'explication. Si la vue candidat est désactivée, un formulaire de demande doit être disponible avec réponse obligatoire sous 30 jours.

## 7. Critères d'acceptation

- ✅ 100 % des `evidence_pointers` cités sont vérifiables verbatim dans la transcription source.
- ✅ Aucune evidence ne mentionne attributs protégés (vérifié par eval automatique sur 100 rapports).
- ✅ Sur 20 candidats à qui on partage la vue candidat, NPS ≥ 8 ("Cette explication m'aide à m'améliorer").
- ✅ Audit timestamp → vidéo → citation fonctionne pour 100 % des evidence_pointers (clic = replay au bon moment).
- ✅ Le hash d'intégrité du rapport est vérifiable (changement d'1 byte du rapport → hash invalide).
- ✅ Conformité NYC AEDT : audit de biais publié annuellement, accessible via `GET /public/bias-audit`.

## 8. Dépendances

- **Lecture seule** sur `cv-adaptive-personalization` (les références CV peuvent apparaître dans les evidence)
- **Lecture seule** sur `live-coding-evaluator` (code_events alimentent les evidence)
- **Lecture seule** sur `anti-cheating-integrity-layer` (intégrité = une dimension du score)
- **Synergie forte** avec `fairness-bias-audit` (l'audit publié vient en partie de ce skill)

## 9. Pourquoi c'est un game-winner

C'est **l'angle marketing parfait** : RecruteTech peut afficher *"Le seul recruteur IA qui vous explique pourquoi"*. Combiné à la lettre formative déjà générée par Claude, l'expérience candidat passe d'un trou noir à un coaching gratuit. Effet viral garanti chez les développeurs (audience tech qui partage facilement sur X/Reddit/HN).
