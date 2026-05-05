---
name: structured-rubric-builder
description: |
  Donner aux RH et hiring managers une interface no-code pour construire, valider, versionner
  et tester des rubriques d'évaluation personnalisées par poste. Chaque rubrique définit les
  compétences évaluées, leur poids, les niveaux attendus par séniorité, les questions par étape,
  et les défense questions associées (cf. anti-cheating-integrity-layer). Déclencher quand un
  recruteur dit "configurer un poste", "créer une rubrique", "personnaliser l'évaluation",
  "ajuster le scoring", "modifier les questions", "scoring rubric", "evaluation criteria",
  ou pendant l'onboarding d'une nouvelle entreprise. Aria utilise la rubrique active pour
  cadrer l'entretien, et Claude utilise la rubrique pour cadrer le rapport. C'est la pierre
  angulaire de la cohérence : sans rubrique structurée, l'évaluation devient subjective.
---

# Structured Rubric Builder

## 1. Objectif

Aujourd'hui RecruteTech a un `Role.system_prompt` mono-bloc édité comme du texte libre. Mercor a une rubrique invisible aux recruteurs. HireVue impose ses I/O psychologists. **Le bon équilibre** : donner aux RH le contrôle structuré, sans qu'ils aient besoin d'être prompt engineers.

Une rubrique = un contrat formel entre :
- Ce qu'Aria doit demander pendant l'entretien
- Ce que Claude doit évaluer dans le rapport
- Ce que le candidat verra dans son retour explicable

## 2. Modèle de données

### 2.1 Schéma de rubrique

```python
class Rubric(SQLModel, table=True):
    id: int = Field(primary_key=True)
    role_id: int = Field(foreign_key="role.id")
    version: int  # incrémenté à chaque modification
    is_active: bool
    name: str
    rubric_json: dict = Field(sa_column=Column(JSON))
    created_by: str  # email RH
    created_at: datetime
    last_tested_at: Optional[datetime]
    test_results_json: Optional[dict] = Field(sa_column=Column(JSON))
```

### 2.2 Schéma JSON de la rubrique

```json
{
  "role_title": "Senior Backend Engineer",
  "seniority": "senior",
  "language_default": "fr",
  "languages_supported": ["fr", "en"],
  "duration_target_minutes": 35,

  "skills": [
    {
      "id": "python_backend",
      "label": "Python backend depth",
      "weight": 0.30,
      "level_descriptors": {
        "junior": "Knows syntax, can write a Flask/FastAPI endpoint with help",
        "mid": "Independently builds REST APIs, handles async patterns, knows ORM trade-offs",
        "senior": "Designs services for scale, debugs production issues, understands framework internals",
        "staff": "Sets technical direction, evaluates frameworks, mentors others on advanced patterns"
      },
      "must_probe": [
        "asyncio mental model",
        "DB connection pooling",
        "deployment / production debugging experience"
      ]
    },
    {
      "id": "system_design",
      "label": "System design",
      "weight": 0.25,
      "level_descriptors": {...},
      "must_probe": ["caching strategies", "database choice rationale", "failure modes"]
    },
    {
      "id": "communication",
      "label": "Technical communication",
      "weight": 0.15,
      "must_probe": ["explains trade-offs", "asks clarifying questions", "structures answers"]
    },
    {
      "id": "code_quality",
      "label": "Code quality (live coding)",
      "weight": 0.20,
      "must_probe": ["edge cases", "naming", "decomposition"]
    },
    {
      "id": "ownership",
      "label": "Ownership & autonomy",
      "weight": 0.10,
      "must_probe": ["past production incidents owned", "decisions made independently"]
    }
  ],

  "stages": [
    {
      "id": "intro",
      "label": "Introduction & background",
      "duration_minutes": 5,
      "skills_evaluated": ["communication", "ownership"],
      "opener": "Hi, I'm Aria. To start, can you walk me through your background and the project you're most proud of?"
    },
    {
      "id": "experience_deep_dive",
      "label": "Deep dive on past experience",
      "duration_minutes": 12,
      "skills_evaluated": ["python_backend", "ownership", "communication"],
      "opener": "Let's talk about {top_project_from_cv}. Walk me through the technical architecture."
    },
    {
      "id": "system_design",
      "label": "System design",
      "duration_minutes": 10,
      "skills_evaluated": ["system_design", "communication"],
      "challenge_pool": ["url_shortener", "rate_limiter", "feed_aggregator"]
    },
    {
      "id": "live_coding",
      "label": "Live coding challenge",
      "duration_minutes": 25,
      "skills_evaluated": ["python_backend", "code_quality", "communication"],
      "challenge_difficulty": "medium",
      "uses_skill": "live-coding-evaluator"
    },
    {
      "id": "candidate_questions",
      "label": "Candidate's questions",
      "duration_minutes": 5,
      "note": "Aria invites questions; not scored"
    }
  ],

  "exclusions": {
    "do_not_ask_about": ["age", "marital_status", "religion", "country_of_origin"],
    "do_not_score_on": ["accent", "facial_expressions", "physical_appearance"]
  },

  "defense_questions": {
    "enabled": true,
    "min_per_session": 2,
    "max_per_session": 4,
    "from_skill": "anti-cheating-integrity-layer"
  },

  "language_handling": {
    "candidate_can_switch_language": true,
    "score_unaffected_by_language_proficiency": true
  }
}
```

## 3. UI du builder

### 3.1 Wizard en 5 étapes (page HR `/hr/rubrics/new`)

**Étape 1 — Quick start** : choisir un template parmi : `Backend Mid`, `Backend Senior`, `Frontend Mid`, `Frontend Senior`, `Data Engineer Mid`, `Mobile iOS Mid`, etc. Le template est cloné, modifiable.

**Étape 2 — Skills & weights** : drag-drop des skills disponibles, slider pour les poids (vérification automatique : somme = 1.0, alerte sinon). Édition inline des `level_descriptors` et `must_probe`.

**Étape 3 — Stages** : timeline drag-drop des étapes. Chaque étape liée aux skills qu'elle évalue. Aperçu de la durée totale.

**Étape 4 — Exclusions & langue** : checkboxes pour les exclusions standard (déjà cochées par défaut, dur de les décocher), choix de langue par défaut.

**Étape 5 — Test & publish** : voir section 3.2.

### 3.2 Test automatique avant publication

Avant de publier une rubrique, le RH **doit** lancer un test :

- 3 simulations d'entretien synthétiques (candidat junior / mid / senior simulés par Claude)
- Chaque simulation produit un rapport via la rubrique
- Le builder affiche : *"Junior simulé → score 4.2 ; Mid simulé → 6.5 ; Senior simulé → 8.1. Différentiation OK."*
- Si scores trop tassés (< 1 point d'écart) : warning *"Cette rubrique ne distingue pas les niveaux ; revisitez les level_descriptors"*
- Tests stockés dans `Rubric.test_results_json`

Cette étape évite les rubriques cassées en prod.

### 3.3 Versioning

Modifier une rubrique active n'écrase **jamais** la version précédente : crée une v+1. Les entretiens en cours et passés restent rattachés à leur version au moment de la création.

UI : timeline des versions avec diff visuel (`v3 vs v4 : poids "system_design" 0.20 → 0.25, ajout du skill "ownership"`).

### 3.4 A/B testing (Phase 2)

Permettre à l'entreprise d'avoir 2 rubriques actives simultanément (`v3-A` et `v4-B`) et de comparer les résultats sur 50/50 des candidats. Utile pour calibrer.

## 4. Intégration avec Aria

Au démarrage de l'entretien, le backend compose le `system_prompt` final à partir de :
- La rubrique active (`Rubric.rubric_json`)
- Le CV parsed (si `cv-adaptive-personalization` actif)
- La langue du candidat

Le prompt construit explicitement chaque étape, les skills à observer, et les exclusions. Aria suit la timeline.

## 5. Intégration avec le rapport Claude

Le `SYSTEM_PROMPT` de `report_service.py` est paramétré : la rubrique est passée en input. Claude doit :
- Évaluer **chaque skill** définie dans la rubrique (pas plus, pas moins)
- Utiliser les `level_descriptors` pour ancrer ses scores
- Respecter les `exclusions.do_not_score_on`
- Pondérer le score global selon les `weights`

Le rapport est ainsi 100 % cohérent avec ce que le RH a paramétré.

## 6. Garde-fous

- **Validation côté serveur** : refuser une rubrique dont la somme des poids ≠ 1.0 ± 0.001.
- **Exclusions inviolables** : certaines exclusions (âge, religion, origine) sont **toujours actives** et non décochables, même par admin.
- **Limite max** : 8 skills par rubrique (sinon dilution + complexité Claude). Dépassement → erreur UI.
- **Audit log** : chaque modification de rubrique loggée avec utilisateur, timestamp, diff. Conservation 5 ans.
- **Rôles** : seuls les RH avec rôle `Admin` ou `Hiring Manager` peuvent créer/modifier. Les RH `Reviewer` peuvent uniquement consulter.

## 7. Critères d'acceptation

- ✅ Un RH non-technique peut créer une rubrique fonctionnelle en < 15 min en partant d'un template.
- ✅ Aucune rubrique ne peut être publiée sans test automatique réussi (différenciation des niveaux ≥ 1.5 points).
- ✅ Les rapports d'entretien produits par 2 rubriques différentes pour le même candidat fictif diffèrent significativement (validation que la rubrique a vraiment un impact).
- ✅ 100 % des entretiens sont rattachés à une version de rubrique précise (pas de drift).
- ✅ Les exclusions sont respectées : aucun rapport ne contient de mention d'attribut protégé (audit automatique).

## 8. Dépendances

- **Bidirectionnelle forte** avec `transparent-scoring-explainability` (la rubrique = la base de l'explicabilité)
- **Forte** avec `cv-adaptive-personalization` (les `must_probe` se combinent avec les `suggested_deep_dive_topics` du CV)
- **Forte** avec `live-coding-evaluator` (la stage `live_coding` pointe vers ce skill)
- **Moyenne** avec `anti-cheating-integrity-layer` (les defense questions sont activées via la rubrique)

## 9. Migration de l'existant

L'actuel `Role.system_prompt` (texte libre) doit être migré vers une rubrique structurée. Migration progressive :

1. Outil de migration auto : parser le `system_prompt` actuel via Claude → suggérer une rubrique structurée → RH valide.
2. Garder backward compatibility 6 mois (les rôles avec rubrique structurée et ceux sans coexistent).
3. Sunset des `system_prompt` libres après 6 mois.
