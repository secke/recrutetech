---
name: candidate-practice-mode
description: |
  Permettre à n'importe quel candidat de passer un entretien d'entraînement gratuit avec Aria,
  sans entreprise associée et sans impact sur de vraies candidatures. Génère un retour formateur
  immédiat (forces, axes d'amélioration, exemples de réponses possibles) sans aucun score
  partagé avec un recruteur. Déclencher quand un utilisateur s'inscrit sans invitation entreprise,
  quand quelqu'un dit "je veux m'entraîner pour un entretien", "essayer la plateforme",
  "practice interview", "mock interview", "préparation entretien", ou quand un candidat demande
  un retake après un vrai entretien. C'est aussi l'enabler de la croissance virale et du
  funnel d'acquisition. Mercor offre 3 retakes — RecruteTech offre une pratique illimitée.
---

# Candidate Practice Mode

## 1. Objectif

Mercor permet 3 retakes ; HireVue n'en permet aucun ; Sapia n'a pas de mode practice. RecruteTech doit avoir un **mode practice illimité, gratuit, sans inscription requise**, qui sert deux objectifs :

1. **Boucle de croissance virale** — les candidats partagent leur expérience sur X/LinkedIn/Reddit, attirant d'autres candidats puis des entreprises ("nos candidats nous demandent RecruteTech")
2. **Réduction de l'anxiété** — la peur de l'entretien IA est un drop-off massif chez les concurrents. Permettre de pratiquer en amont supprime cette peur.

## 2. UX cible

### 2.1 Page d'accueil practice

Une URL publique `/practice` accessible sans inscription. Le candidat choisit :

- **Type de poste** : Backend, Frontend, Fullstack, Data, DevOps, Mobile, ML
- **Séniorité** : Junior (0-2 ans), Mid (2-5), Senior (5-10), Staff/Principal (10+)
- **Langue** : FR / EN / AR
- **Durée** : 10 min (présentation) / 25 min (présentation + technique) / 45 min (full + code)
- **Accent / mode d'évaluation** : Behavioral / Technical / Mixed

Pas d'email obligatoire pour démarrer. Email demandé seulement à la fin pour recevoir le rapport (mais le rapport est aussi consultable directement dans le navigateur via un token de session).

### 2.2 Pendant l'entretien

Identique à un vrai entretien, sauf :
- Watermark discret "MODE PRACTICE — aucune entreprise n'a accès à cette session"
- Un bouton *"Pause / Reprendre"* (absent en mode prod)
- Un bouton *"Demander un hint"* explicite (Aria coache plutôt qu'évalue)
- Un bouton *"Recommencer la question"* (3 max par session)

### 2.3 Rapport practice (différent du rapport prod)

Le rapport practice est **plus formateur, moins jugeant** :

```json
{
  "overall_feedback": "Tu as un excellent niveau technique en Python et tu structures bien tes réponses. Là où tu peux gagner : verbaliser ton raisonnement à voix haute pendant que tu codes.",
  "strengths_with_examples": [
    {
      "strength": "Clarté de l'explication d'asyncio",
      "your_quote": "asyncio uses an event loop, so when I await...",
      "why_strong": "Tu as donné une définition précise puis un exemple concret. C'est exactement ce que les recruteurs cherchent."
    }
  ],
  "growth_areas_with_actionable_tips": [
    {
      "area": "Verbalization during coding",
      "what_happened": "Tu as codé en silence pendant 4 minutes, puis tu as expliqué après.",
      "tip": "La prochaine fois, raconte ce que tu fais à voix haute pendant que tu tapes : 'je commence par parser l'input...'. Ça aide le recruteur à voir ton processus.",
      "example_phrase": "Ok, donc je vais d'abord vérifier le edge case de l'input vide, puis j'attaque le cas général..."
    }
  ],
  "model_answers": [
    {
      "question_asked": "Tell me about a complex project",
      "your_answer_summary": "...",
      "alternative_answer_example": "Voici comment un Senior typique structurerait : Situation > Tâche > Action > Résultat avec des chiffres mesurables."
    }
  ],
  "next_practice_recommendation": "Réessaye en mode 'Senior Backend' la semaine prochaine, en te concentrant sur la verbalization."
}
```

**Crucial** : aucun score chiffré dans le rapport practice. La logique : un score chiffré démotive ; un retour formaté motive. (Voir littérature sur growth mindset : Carol Dweck.)

### 2.4 Partage social (optionnel)

À la fin du rapport, un bouton *"Partager mon parcours d'entraînement"* qui génère :
- Une image carte (pas le rapport entier — juste un teaser : "J'ai terminé un mock interview Backend Senior avec @RecruteTech_AI 💪")
- Un lien d'invitation pour amis (`/practice?ref=USER_TOKEN`)

Pas de viralité forcée, pas de bouton "humble brag" automatique. Juste un partage propre, opt-in.

## 3. Architecture technique

### 3.1 Réutilisation maximale

Le mode practice **réutilise 95 %** de la stack existante :
- Aria via ElevenLabs (mêmes prompts, mêmes voix, mêmes overrides)
- Backend FastAPI avec un nouveau endpoint `/api/practice/start`
- Tracking et report avec Claude Opus 4.7 (prompt différent — voir 3.3)

### 3.2 Différences clés

```python
class PracticeSession(SQLModel, table=True):
    id: int = Field(primary_key=True)
    public_token: str = Field(unique=True)
    role_type: str  # backend, frontend, ...
    seniority: str
    language: str
    duration_choice: str  # short | medium | long
    started_at: datetime
    completed_at: Optional[datetime]
    candidate_email: Optional[str]  # null jusqu'à la fin si fourni
    transcript: Optional[str] = Field(sa_column=Column(Text))
    practice_report_json: Optional[str] = Field(sa_column=Column(Text))
    # PAS de candidate_score, PAS de hiring_recommendation, PAS de visibilité entreprise
```

**Aucune** session practice n'apparaît dans le dashboard HR d'aucune entreprise. Isolation totale.

### 3.3 Prompt Claude différent

Pour le rapport practice, le `SYSTEM_PROMPT` de `report_service.py` doit être basculé sur une variante :

```
You are a supportive interview coach at RecruteTech. The user just completed a PRACTICE interview
to prepare themselves — there is no company on the receiving end, no hiring decision, no score.

Your job is to be 100% growth-oriented:
- Identify 2-3 concrete strengths with VERBATIM quotes from their transcript ("you said: ...")
- Identify 2-3 growth areas with SPECIFIC, ACTIONABLE tips ("next time, try: ...")
- For 1-2 questions where their answer was OK but could be better, provide a model answer example
- Never assign a numeric score
- Never compare to "what employers want" in a judgmental way — frame as "here's how to be even sharper"
- Match the candidate's interview language exactly (fr/en/ar)
- Tone: encouraging, like a senior peer giving feedback, not like a hiring manager

End with a concrete next-step suggestion: which practice scenario to try next.
```

### 3.4 Throttling et abuse

- IP-based rate limit : max 3 sessions practice par IP par 24h (sinon explosion de coûts ElevenLabs/Claude).
- Email captured (optionnel) pour rate limit additionnel et pour envoyer le rapport.
- Détection des sessions trop courtes (< 60 s) ou trop similaires (anti-bot) — flag, pas blocage automatique.

## 4. Garde-fous

- **Aucune donnée de session practice ne nourrit l'entraînement de modèles**. C'est explicite dans la page de consentement.
- **Conservation 30 jours** par défaut (vs 90 jours en prod), supprimable instantanément à la demande.
- **Pas de personalisation CV** par défaut en practice (sauf si le candidat opt-in et upload son CV).
- **Aucune publicité ou cross-sell vers les entreprises** dans le rapport practice. C'est un cadeau au candidat, pas un funnel forcé.

## 5. Critères d'acceptation

- ✅ Un candidat peut démarrer une session sans créer de compte en moins de 30 secondes (clic → mic check → Aria parle).
- ✅ Sur 100 candidats post-practice, NPS ≥ 9 ("Tu recommanderais RecruteTech Practice à un ami ?").
- ✅ Au moins 30 % des candidats practice reviennent passer une seconde session dans les 14 jours.
- ✅ Le rapport practice est livré en moins de 60 s post-fin d'entretien.
- ✅ Coût marginal par session practice < 1 USD (ElevenLabs + Claude Opus combinés). Vérifier que le rate limit suffit.
- ✅ Au moins 5 % des candidats practice partagent organiquement (lien viral, mention sociale détectée).

## 6. Dépendances

- Aucune dépendance dure. Peut être livré en standalone même avant les autres skills.
- Synergie avec `transparent-scoring-explainability` (philosophie commune : explication formative).
- Synergie avec `accessibility-accommodations` (pratique = bon endroit pour tester les modes adaptés).

## 7. KPIs business à suivre

- **Acquisition** : nb sessions practice / mois
- **Activation** : taux de complétion (entretien démarré vs entretien terminé)
- **Rétention** : taux de retour à 14j et 30j
- **Conversion** : taux de candidats practice qui reçoivent ensuite une invitation entreprise via la plateforme
- **Brand love** : mentions sur LinkedIn/X/Reddit, NPS, partages organiques

## 8. Roadmap

Phase 1 — MVP : 3 types de poste (Backend, Frontend, Data), 1 langue (FR), 2 durées.
Phase 2 — Couverture étendue : tous les types tech, FR/EN/AR.
Phase 3 — Library de scénarios "interview at FAANG / startup / scaleup" avec context spécifique.
Phase 4 — Mode "Coach personnel" : suivi du progrès du candidat dans le temps, plan d'amélioration personnalisé.

## 9. Pourquoi c'est crucial

C'est le **flywheel** de croissance que ni Mercor ni HireVue n'ont. Les candidats deviennent ambassadeurs. Les recruteurs entendent parler de RecruteTech via leurs candidats. Le coût par session est faible mais la valeur de marque est exponentielle. À traiter comme P0 même si ça ne génère pas de revenue direct.
