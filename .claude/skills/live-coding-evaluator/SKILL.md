---
name: live-coding-evaluator
description: |
  Faire passer un challenge de code en live au candidat dans une IDE intégrée, avec Aria qui guide,
  observe le processus de réflexion (pas juste le résultat), détecte le code IA-généré et évalue
  l'approche problem-solving. Déclencher dès que l'entretien atteint l'étape "Code Review" ou
  "Live Coding Challenge", quand un recruteur configure un poste tech avec compétences techniques
  hands-on (backend, frontend, fullstack, data, devops, mobile), ou quand un candidat clique
  "Démarrer le défi de code". Utiliser ce skill pour toute requête mentionnant "live coding", "défi
  de code", "exercice de programmation", "code review", "test technique", "monaco editor", "sandbox",
  "exécuter du code", ou pour combler la faiblesse technique de HireVue/Mercor sur les rôles
  ingénierie. CRITIQUE en 2026 où 76% des développeurs utilisent ChatGPT au quotidien.
---

# Live Coding Evaluator

## 1. Objectif

Donner à RecruteTech la profondeur technique que HireVue et Mercor n'ont pas, et que HackerRank/CodeSignal/Karat ont mais sans la dimension conversationnelle. **Combiner les deux** est notre angle gagnant.

L'évaluation repose sur 4 signaux, pas un seul :

1. **Correctness** — les tests passent
2. **Process** — comment le candidat réfléchit (verbalisation, pauses, retours en arrière)
3. **Conversation** — Aria pose des questions de défense ("Pourquoi cette structure de données ?")
4. **Authenticity** — détection des signaux IA-générés (cf. `anti-cheating-integrity-layer`)

## 2. Contexte d'intégration

Stack RecruteTech actuelle :
- Frontend : React + Monaco Editor déjà mentionné dans le README (`Monaco Editor - Éditeur code pour live coding`)
- Backend : FastAPI + WebSocket déjà en place pour Aria
- Aria (ElevenLabs) : déjà capable de guider conversationnellement

À ajouter :
- **Sandbox d'exécution sécurisée** (Docker container éphémère par session, ou service hébergé type Judge0 / Piston)
- **Question library** stockée en DB
- **Synchronisation Aria ↔ éditeur** : Aria voit le code en quasi-temps réel pour pouvoir commenter

## 3. Étapes d'implémentation

### 3.1 Question library

Créer une table `coding_challenges` :

```python
class CodingChallenge(SQLModel, table=True):
    id: int = Field(primary_key=True)
    title: str
    difficulty: str  # easy | medium | hard
    languages: List[str] = Field(sa_column=Column(JSON))  # ["python","js","go"]
    statement_md: str = Field(sa_column=Column(Text))
    starter_code: dict = Field(sa_column=Column(JSON))  # par langue
    hidden_tests: dict = Field(sa_column=Column(JSON))
    public_tests: dict = Field(sa_column=Column(JSON))
    expected_concepts: List[str] = Field(sa_column=Column(JSON))  # ["recursion","memoization"]
    aria_hints: List[str] = Field(sa_column=Column(JSON))  # graduated hints
    aria_defense_questions: List[str] = Field(sa_column=Column(JSON))
    time_limit_minutes: int = 30
    role_tags: List[str] = Field(sa_column=Column(JSON))  # ["backend","python","mid"]
```

Seed initial : 30-50 challenges couvrant Python, JS, TS, Go, SQL, et System Design "lite" (questions ouvertes sans exécution).

### 3.2 Sélection du challenge

Le challenge est sélectionné automatiquement à partir de :
- `Role.required_skills` + `Role.seniority`
- `Interview.cv_parsed_json.primary_stack` (si disponible via `cv-adaptive-personalization`)

Algorithme :
```python
def select_challenge(role, cv_parsed):
    candidates = filter(role.required_skills, role.seniority)
    if cv_parsed:
        candidates = boost(candidates, cv_parsed.primary_stack)
    return weighted_random(candidates, exclude_recent=True)
```

`exclude_recent` empêche qu'un même challenge soit utilisé deux fois sur 30 jours dans la même entreprise (anti-leak).

### 3.3 Sandbox d'exécution

Recommandation MVP : **Judge0 self-hosted** sur Docker, ou **Piston API**. Pour la prod : sandbox custom avec :
- Container Linux par session (FROM python:3.12-slim ou node:20-alpine)
- Limites : 256 MB RAM, 5 s CPU, pas d'accès réseau
- Filesystem read-only sauf `/tmp`
- Timeout dur 10 s par exécution

Endpoint :

```
POST /api/interviews/{token}/code/run
body: { language: "python", code: "...", stdin: "..." }
→ { stdout, stderr, runtime_ms, exit_code, oom: bool, timeout: bool }
```

### 3.4 Synchronisation éditeur ↔ Aria

Le frontend pousse via WebSocket toutes les **3 à 5 secondes** un snapshot léger :

```json
{
  "type": "code_state",
  "code_diff": "...", // patch depuis le dernier snapshot
  "cursor_line": 42,
  "last_action": "typing|paste|delete|run|tab_switch",
  "elapsed_seconds": 245
}
```

Le backend agrège ces snapshots en :
- **Trace de frappe** (timeline d'événements)
- **Detection paste** (bloc collé > 30 caractères = signal pour `anti-cheating-integrity-layer`)
- **Mini-résumé toutes les 60 s** envoyé à Aria : *"Le candidat a écrit la fonction de tri, exécuté 2 fois (1 échec test, 1 succès), et est maintenant en train de modifier la complexité"*

Aria reçoit ce résumé via le mécanisme d'override ElevenLabs, ce qui lui permet de :
- Demander une explication ciblée (*"Pourquoi avez-vous choisi un tri par insertion plutôt qu'un quicksort ici ?"*)
- Donner un hint si le candidat est bloqué > 5 minutes sans frappe
- Faire des commentaires temps réel (*"Bien vu, vous avez attrapé le edge case du tableau vide"*)

### 3.5 Hints gradués

Si le candidat clique "Je suis bloqué" (bouton `code_stuck` déjà dans les strings frontend), Aria livre un hint dans l'ordre :
1. Hint 1 : reformulation du problème
2. Hint 2 : suggestion d'approche (sans code)
3. Hint 3 : pseudo-code partiel

Chaque hint utilisé est tracé dans `Interview.code_session_json.hints_used` et impacte le score "autonomie".

### 3.6 Évaluation finale du défi

À la fin du défi (timer ou submission), un job background appelle Claude Opus 4.7 avec :
- Statement
- Code final + historique des versions (toutes les 60 s)
- Trace des exécutions
- Hints utilisés
- Tests passants/échouants
- Snippets de la verbalisation transcrite (Aria a écouté pendant que le candidat codait)

Output Claude (schéma JSON strict) :

```json
{
  "code_correctness": 0.0,         // 0-1, % tests passés pondérés
  "code_quality": 0.0,             // lisibilité, naming, structure
  "problem_solving_approach": 0.0, // décomposition, gestion edge cases
  "verbalization": 0.0,            // a-t-il expliqué son raisonnement ?
  "autonomy": 0.0,                 // hints utilisés, recherches
  "ai_assistance_likelihood": 0.0, // 0=humain, 1=très probable IA (cf. anti-cheating-integrity-layer)
  "concept_coverage": ["recursion ✓", "memoization ✗"],
  "evidence": [
    "Line 12-18: clean recursive solution, well-named",
    "Did NOT handle empty array initially, fixed after Aria's question",
    "Burst paste at t=04:32 of 47 lines flagged"
  ],
  "summary_for_hr": "..."
}
```

## 4. Schémas de données

### Modification DB

```python
class Interview(SQLModel, table=True):
    # ... champs existants ...
    code_challenge_id: Optional[int] = Field(foreign_key="codingchallenge.id")
    code_session_json: Optional[str] = Field(sa_column=Column(Text))
    code_evaluation_json: Optional[str] = Field(sa_column=Column(Text))
```

`code_session_json` contient :

```json
{
  "started_at": "...",
  "ended_at": "...",
  "language": "python",
  "submissions": [
    {"t": 30, "code_hash": "abc...", "tests_passed": 0, "tests_total": 5},
    {"t": 180, "code_hash": "def...", "tests_passed": 3, "tests_total": 5}
  ],
  "events": [
    {"t": 12, "type": "paste", "size": 87},
    {"t": 47, "type": "tab_switch_out", "duration_s": 4},
    {"t": 240, "type": "stuck_click"}
  ],
  "hints_used": ["hint_1", "hint_2"],
  "final_code": "...",
  "final_tests_passed": 4,
  "final_tests_total": 5
}
```

## 5. Garde-fous

- **Pas de stockage du code en clair côté logs** (RGPD + IP candidat). Hash + retention 90 jours, puis purge.
- **Pas de réseau dans la sandbox** : empêche l'exfiltration et l'usage de copilots externes pendant l'exécution.
- **Anti-pattern 0** : ne JAMAIS bloquer le copy-paste au niveau de l'éditeur — c'est anti-candidat. À la place, **logger** les pastes et laisser Aria poser des questions ciblées (cf. `anti-cheating-integrity-layer`).
- **Accommodation** : un mode "untimed" pour les candidats neurodivergents (cf. `accessibility-accommodations`). Le timer n'est pas une métrique de score si l'accommodation est active.
- **Multilingue** : statement disponible en FR/EN/AR. Le candidat code dans la langue de son choix, peu importe la langue d'interface.

## 6. Critères d'acceptation

- ✅ Le candidat peut écrire et exécuter du code en < 1 s d'aller-retour côté UI.
- ✅ Aria pose au moins 2 questions de défense pertinentes par session de coding (vérifié sur 20 sessions de test).
- ✅ La sandbox refuse 100 % des exploits classiques (fork bomb, accès réseau, write hors `/tmp`, timeout > 10 s).
- ✅ Le score `ai_assistance_likelihood` corrèle ≥ 0.7 avec les détections du skill `anti-cheating-integrity-layer`.
- ✅ Sur 30 sessions de test (10 juniors / 10 mid / 10 seniors), la note `problem_solving_approach` corrèle avec la séniorité auto-déclarée à r ≥ 0.6.

## 7. Dépendances

- **Forte** sur `anti-cheating-integrity-layer` pour le score `ai_assistance_likelihood`.
- **Forte** sur `cv-adaptive-personalization` pour la sélection du challenge.
- **Moyenne** sur `transparent-scoring-explainability` (le rapport HR doit citer le code et les events).
- **Moyenne** sur `accessibility-accommodations` (mode untimed + interface alternative).

## 8. Rollout

Phase 1 — 5 challenges Python uniquement (langue la plus demandée). Tester sur des entretiens internes RecruteTech.
Phase 2 — Étendre à JS/TS/Go + 30 challenges totaux.
Phase 3 — System Design "lite" (questions ouvertes notées par Claude sans exécution).
Phase 4 — Permettre aux entreprises Enterprise de uploader leurs propres challenges (avec validation Q/A).
