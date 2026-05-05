---
name: cv-adaptive-personalization
description: |
  Personnaliser dynamiquement les questions d'Aria à partir du CV/profil du candidat avant et pendant l'entretien.
  Déclencher dès qu'un candidat est invité à un entretien, dès qu'un CV/LinkedIn/profil est uploadé,
  ou quand un recruteur RH veut générer des questions sur-mesure pour un candidat précis. Utiliser ce skill
  pour toute tâche qui mentionne "questions adaptées au CV", "personnaliser l'entretien", "deep-dive sur l'expérience",
  "adapter les questions au profil", "tailored questions", ou pour combler la rigidité d'Aria sur des questions
  génériques. Ce skill répond directement à la critique #1 de Mercor ("rigide, pas de flow naturel, questions
  prédéfinies") et constitue un différenciateur fort de RecruteTech.
---

# CV Adaptive Personalization

## 1. Objectif

Transformer chaque entretien Aria d'un script générique en une conversation **calibrée sur le candidat lui-même** : ses projets, technos, années d'XP, séniorité, gaps possibles. C'est l'antidote direct à la critique principale de Mercor (*"questions chaotiques, rien à voir avec une vraie conversation"*).

## 2. Contexte d'intégration

Stack RecruteTech actuelle :
- `backend/app/api/screenings.py` — gère l'invitation candidat et le démarrage d'entretien
- `Role.system_prompt` et `Role.first_message` — prompts d'Aria stockés en DB
- `ELEVENLABS_AGENT_ID` + `signed_url` + `overrides` — mécanisme d'override déjà utilisé
- Claude Opus 4.7 (`ANTHROPIC_MODEL=claude-opus-4-7`) — déjà disponible côté backend pour le rapport post-entretien

Ce skill ajoute une étape **pré-entretien** qui enrichit le `prompt` envoyé en override à ElevenLabs, et une étape de **mid-interview adaptation** via WebSocket events.

## 3. Étapes d'implémentation

### 3.1 Ingestion du CV

Le candidat (ou le recruteur lors de l'invitation) upload :
- Soit un fichier `.pdf` / `.docx` / `.txt`
- Soit colle un texte (LinkedIn copy/paste)
- Soit une URL LinkedIn publique (si scraping autorisé localement)

Endpoint à créer :

```
POST /api/interviews/{interview_token}/cv
Content-Type: multipart/form-data
body: file | text | url
```

Stockage : champ `Interview.cv_text` (TEXT) + `Interview.cv_parsed_json` (JSON).

### 3.2 Parsing structuré via Claude

Appeler Claude Opus 4.7 pour extraire un schéma structuré :

```json
{
  "candidate_name": "...",
  "years_of_experience": 5,
  "seniority_inferred": "mid|senior|staff|principal",
  "primary_stack": ["Python", "FastAPI", "PostgreSQL"],
  "secondary_stack": ["Redis", "Docker"],
  "domains": ["fintech", "AI/ML"],
  "notable_projects": [
    {
      "title": "Real-time fraud detection at FintechCo",
      "tech": ["Kafka", "Python"],
      "scale_signals": ["10M tx/day", "<200ms latency"],
      "role": "Tech Lead",
      "duration_months": 18
    }
  ],
  "potential_red_flags": ["3-month gap in 2024", "no formal CS degree mentioned"],
  "suggested_deep_dive_topics": [
    "ask about Kafka partitioning strategy",
    "explore the fraud model retraining loop",
    "verify hands-on contribution vs management on FintechCo project"
  ],
  "language_signals": "comfortable_in_french|english|both"
}
```

Le prompt Claude doit explicitement demander des `suggested_deep_dive_topics` réutilisables comme follow-ups.

### 3.3 Génération du prompt système Aria personnalisé

Composer un `personalized_system_prompt` à injecter dans `overrides.agent.prompt.prompt` au démarrage de l'entretien. Format recommandé :

```
[BASE_PROMPT du rôle — inchangé]

# PERSONALIZATION FOR THIS CANDIDATE

Candidate background snapshot:
- Name: {candidate_name}
- Inferred seniority: {seniority_inferred} ({years_of_experience} years)
- Primary stack: {primary_stack}
- Notable project to probe: {top_project_title}

# DEEP DIVE PRIORITIES (use these as follow-ups, not as scripted questions)

1. {deep_dive_topic_1}
2. {deep_dive_topic_2}
3. {deep_dive_topic_3}

# CONVERSATIONAL RULES

- Reference the candidate's own projects naturally ("I saw you worked on X — tell me how you handled Y").
- Adjust difficulty to {seniority_inferred} level. Do NOT ask Staff-level system design questions to a junior.
- If the candidate makes a strong claim (e.g. "I scaled to 10M tx/day"), validate with one concrete probing question.
- Surface the red flags only AFTER rapport is established, never as the opener.
```

### 3.4 Mid-interview adaptation

Pendant l'entretien, le backend reçoit déjà la transcription en temps réel (via WebSocket ElevenLabs ou frontend fallback). Ajouter un **listener léger** qui :

1. Toutes les ~5-10 turns, envoie le transcript partiel + le `cv_parsed_json` à Claude (mode rapide, max_tokens ~500).
2. Claude renvoie soit `null` soit un `next_question_hint` (texte court).
3. Le hint est injecté dans le contexte d'Aria via `agent.update` (ElevenLabs supporte les updates de tool/context en cours de session).

Mode dégradé : si latence trop élevée (>1 s), désactiver l'adaptation mid-interview et n'utiliser que la personnalisation pré-entretien.

### 3.5 Fallback sans CV

Si aucun CV n'est fourni, l'entretien doit fonctionner avec le prompt de base. Aria peut alors poser une question d'ouverture qui sert de mini-CV oral (*"Pour démarrer, parlez-moi de votre parcours et de votre projet le plus marquant."*) et le parser CV est rejoué sur la transcription des 2 premières minutes.

## 4. Schémas de données

### Input (CV upload)

```json
{
  "interview_token": "abc123",
  "source": "file|paste|linkedin_url",
  "content": "raw text or base64 PDF",
  "candidate_consent_processing": true
}
```

### Output (parsed CV)

Schéma `CVParsedSchema` (voir 3.2). Stocké en DB et accessible via :

```
GET /api/interviews/{interview_token}/cv-parsed
```

### Modification du modèle DB

```python
class Interview(SQLModel, table=True):
    # ... champs existants ...
    cv_text: Optional[str] = Field(default=None, sa_column=Column(Text))
    cv_parsed_json: Optional[str] = Field(default=None, sa_column=Column(Text))
    personalized_prompt: Optional[str] = Field(default=None, sa_column=Column(Text))
```

## 5. Garde-fous

- **Consentement explicite** : le candidat doit cocher *"J'autorise l'analyse de mon CV par l'IA pour personnaliser l'entretien"*. Pas de consentement → mode standard.
- **Pas de discrimination** : le prompt système d'extraction Claude doit explicitement IGNORER : âge, photo, nom de famille, école/université, ville de naissance, origine ethnique inférée, statut familial. Tester ces exclusions par eval avec des CVs synthétiques diversifiés.
- **Hallucinations CV** : si Claude infère un fait non présent dans le CV (ex. "Senior" alors que le CV ne le dit pas), Aria ne doit pas l'utiliser comme un fait. Marquer `confidence: low|medium|high` dans le schéma et ne propager au prompt Aria que les éléments `high`.
- **Conservation des données** : suppression du `cv_text` brut 90 jours après l'entretien (RGPD). Le `cv_parsed_json` peut être conservé sous forme anonymisée pour les audits qualité.

## 6. Critères d'acceptation

- ✅ Sur 20 CVs de test, ≥ 18 produisent un `cv_parsed_json` valide JSON-schema-compliant.
- ✅ Sur 20 entretiens A/B (avec personnalisation vs sans), ≥ 80 % des candidats préfèrent l'expérience personnalisée (NPS post-interview).
- ✅ Latence : parsing CV en < 8 s côté serveur, génération du prompt en < 2 s.
- ✅ Aucun trait discriminant (âge, école, ville) ne fuit dans le prompt Aria final, vérifié par eval automatique.
- ✅ Au moins 1 question de l'entretien fait référence explicite à un projet du CV (mesuré sur la transcription a posteriori).

## 7. Dépendances

- Aucune dépendance dure sur d'autres skills.
- Synergie forte avec `structured-rubric-builder` (la rubrique guide ce qu'Aria doit chercher) et `transparent-scoring-explainability` (le rapport final cite les liens CV ↔ réponses).

## 8. Rollout

Phase 1 — silent : génération du `personalized_prompt` mais pas encore injecté en prod. Vérifier la qualité sur 100 entretiens.
Phase 2 — opt-in : recruteur active la fonctionnalité par rôle.
Phase 3 — default-on avec opt-out.
