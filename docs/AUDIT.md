# AUDIT — état réel du repo RecruteTech

**Date** : 2026-08-04
**Branche auditée** : `openclaw-supervisor` (HEAD `1c573ce`)
**Méthode** : lecture du code, exécution de la suite de tests, `alembic upgrade head` sur base vierge, `npm run build`, analyse du graphe d'imports frontend, parcours de l'historique git.

---

## 0. Résumé exécutif

Le repo est **nettement plus avancé** que ce que décrit le brief de mission (§2). Trois lots sur dix sont partiellement ou largement livrés :

| Ce que le brief annonce | Ce qui est réellement là |
|---|---|
| « Pas d'Alembic », `_ensure_columns()` | Alembic présent, 5 migrations, `upgrade head` fonctionne sur base vierge — **mais** `_ensure_columns()` tourne toujours en parallèle |
| « Seulement `Role` et `Interview` » | `Role`, `Rubric`, `Interview`, `EvaluationOverride`, `PracticeSession` |
| « Aucun test » | **174 tests passent** en 1,6 s |
| « `LandingPage.jsx` affiche des chiffres inventés » | Vrai, mais ce fichier **n'est pas routé** — la vraie landing est `screens/Landing.jsx`, qui est propre |
| « `elevenlabs==1.9.0` très en retard » | Vrai, mais le SDK **n'est jamais importé** — tous les appels passent par `httpx` brut |

En contrepartie, **cinq problèmes graves** sont confirmés et non résolus :

1. 🔴 **Clé API ElevenLabs en clair dans l'historique git et poussée sur `origin/master`.**
2. 🔴 **L'analyse émotionnelle est active et alimente le scoring**, de la webcam jusqu'au rapport RH.
3. 🟠 **Aucun multi-tenant** : une seule clé partagée, zéro isolation, deux routes rubriques non authentifiées.
4. 🟠 **Aucune facturation, aucun quota, aucun garde-fou de coût.** Rien ne borne la durée d'un entretien.
5. 🟠 **Aucun Dockerfile, aucune CI, aucun `docker-compose`.**

---

## 1. 🔴 CRITIQUE — Clé API ElevenLabs exposée

**Clé** : `sk_d3196929f411f48e1e8f97ff1929ee0a6c3195e72b09c835`
**Fichier** : `backend/.env.example`

| Élément | Constat |
|---|---|
| Commit d'introduction | `a49c2a2` — « now using 11lab agent and working » |
| Présente dans `HEAD` de la branche courante | Oui |
| Présente sur `origin/master` | **Oui** — poussée sur `github.com/secke/recrutetech` |
| Working tree | Déjà vidée, **mais la modification n'est pas commitée** |
| `backend/.env` local | Ne contient plus cette clé (une autre est en place) |

**Ce que ça implique** : la clé est publiquement lisible par quiconque a accès au dépôt distant. La retirer du working tree ne suffit pas — elle reste dans l'historique.

**Action requise, dans cet ordre :**
1. **Révoquer la clé dans le dashboard ElevenLabs** — maintenant, avant toute manipulation git. C'est la seule étape qui neutralise réellement la fuite.
2. Commiter le `.env.example` déjà nettoyé.
3. Réécrire l'historique (`git filter-repo`) et force-push sur `master` **et** `openclaw-supervisor`.
4. Ajouter un hook pre-commit de détection de secrets.

> ⚠️ L'étape 1 est de ton ressort — je n'ai pas accès au dashboard ElevenLabs. Les étapes 2 à 4, je peux les faire, mais l'étape 3 réécrit l'historique partagé : je ne la lance pas sans ton feu vert explicite.

---

## 2. 🔴 CRITIQUE — L'analyse émotionnelle alimente le scoring

Interdite par l'**AI Act article 5** en contexte d'embauche depuis février 2025. La chaîne est complète et **active** de bout en bout :

```
useVideoAnalysis.js  ──►  LiveInterview.jsx  ──►  POST /visual-metrics  ──►  Interview.visual_metrics_json
   (MediaPipe)              (submit à la fin)         (screenings.py:181)
                                                              │
                                                              ▼
                                       report_service.build_evaluation_user_message()
                                       « # Visual engagement metrics (weight LIGHTLY) »
                                                              │
                                                              ▼
                                       EVALUATION_TOOL_SCHEMA  →  champ `engagement` REQUIS
                                                                  evidence_type: "visual" autorisé
                                                              │
                                                              ▼
                                                     HRDetail.jsx (affiché au RH)
```

### Points de contact exacts

| Fichier | Lignes | Ce qu'il fait |
|---|---|---|
| `frontend/src/hooks/useVideoAnalysis.js` | 191–213 | `detectSmile` — score de sourire |
| | 219–237 | `analyzeExpression` — « emotion indicators », `engagementScore` |
| | 480–507 | `calculateConfidenceScore`, `calculateEngagementScore`, `calculateNervousnessScore` |
| | 340–348 | Agrège `smileRatio`, `confidence`, `engagement`, `nervousness` |
| `frontend/src/screens/LiveInterview.jsx` | 148–153, 175–183 | Branche le hook et POST les métriques |
| `backend/app/api/screenings.py` | 173–192 | `VisualMetricsPayload` (dont `smileRatio`) → persiste |
| `backend/app/services/report_service.py` | 187–198, 260, 310 | Injecte les métriques dans le prompt d'évaluation |
| `backend/app/services/prompts/evaluation.py` | 126–128 | Section « ## 5. Visual metrics — weight lightly » |
| | 322–324 | `evidence_type` enum inclut `"visual"` |
| | 505–511, 561 | `engagement` : propriété **requise** du schéma de sortie |
| `backend/app/services/report_service.py` | 57–146 | `LEGACY_SYSTEM_PROMPT` + `LEGACY_REPORT_SCHEMA`, même problème |
| `frontend/src/screens/HRDetail.jsx` | 205–221, 249–256 | Affiche `report.engagement` et `iv.visual_metrics` au RH |

### Nuance importante

`VisualMetricsDisplay.jsx` (qui afficherait « Confiance / Nervosité » **au candidat en direct**) n'est importé que par `InterviewInterface.jsx`, lui-même **non routé**. Le candidat ne voit donc pas ces jauges aujourd'hui. Le composant reste à supprimer, mais le risque immédiat est côté scoring, pas côté affichage candidat.

### Ce qui peut survivre

`faceDetected` (booléen) et la détection de visages multiples — strictement hors scoring, jamais dans le rapport RH. Tout le reste part.

---

## 3. Backend — `backend/`

### 3.1 Ce qui existe et fonctionne

**Migrations** — `alembic upgrade head` sur base vierge produit les 6 tables attendues :
```
alembic_version, evaluationoverride, interview, practicesession, role, rubric
```

**Tests** — `174 passed in 1.57s`. 17 fichiers de test couvrant : versionnement de rubriques, exclusions verrouillées, fuite d'attributs protégés, vérification des citations, hash d'intégrité, sanitisation de la vue candidat, endpoints de transparence.

**Modèles** — `models.py` est remarquablement bien documenté (invariants, politique de rétention RGPD par champ, forme des documents JSON). C'est le meilleur fichier du repo.

**Services** — `rubric_service`, `cv_parsing_service`, `report_service` (avec `verify_evidence_pointers` et `compute_integrity_hash`), `synthetic_runner`, `prompt_builder`, `email_service`, `elevenlabs_service`.

**Prompts versionnés** — `evaluation.py` est en v3.0.0 avec historique de versions documenté, sortie forcée via `tool_use`, liste de 12 attributs protégés. Du bon travail, à un détail près : la section 5 sur les métriques visuelles.

### 3.2 Problèmes

| Sévérité | Problème | Détail |
|---|---|---|
| 🔴 | Analyse émotionnelle dans le scoring | Cf. §2 |
| 🟠 | Double gestion du schéma | `_ensure_columns()` (`db.py:15`) tourne encore au démarrage **en plus** d'Alembic. Deux sources de vérité, la seconde silencieuse. |
| 🟠 | Zéro multi-tenant | `auth.py` : une clé partagée `X-HR-API-Key`, **bypass total si `HR_API_KEY` est vide**. Pas d'`Organization`, `User`, `ApiKey`, `Consent`, `AuditLog`. Aucun filtrage par tenant nulle part. |
| 🟠 | Routes rubriques non authentifiées | `rubrics.py` déclare `APIRouter(tags=["rubrics"])` **sans dépendance globale**. `list_rubrics` (l. 151) et `get_rubric` (l. 173) n'ont aucun `Depends(require_*)` → lecture publique du contenu des rubriques RH. |
| 🟠 | Aucun garde-fou de coût | Pas de `max_billable_minutes`, pas d'auto-hangup, pas de `UsageRecord`, pas de quota. Un entretien peut durer indéfiniment. |
| 🟡 | Deux manifestes de dépendances divergents | `requirements.txt` : `anthropic>=0.50.0`, **sans** alembic/pypdf/python-docx. `pyproject.toml` : `anthropic>=0.98.0` + les trois. `requirements.txt` ne permet pas de faire tourner l'app. |
| 🟡 | `elevenlabs==1.9.0` épinglé mais jamais importé | `grep` sur `app/` et `tests/` : zéro import. `elevenlabs_service.py` fait tout en `httpx` brut. La dépendance est morte. |
| 🟡 | `datetime.utcnow()` déprécié | 279 warnings à l'exécution des tests. Cassera sur une future version de Python. |
| 🟡 | Practice mode à moitié implémenté | `PracticeSession` (modèle) + migration `0005` + `prompts/practice_aria.py` + `purge_expired_practice_sessions.py` existent. **Mais `practice_service.py` et `api/practice.py` n'existent pas** — alors que `models.py:423` référence `PRACTICE_ROLE_PRESETS in practice_service.py`. Table morte, aucun endpoint. |
| 🟡 | `SQLModel` sur `ANTHROPIC_MODEL="claude-opus-4-7"` | Modèle daté. À revalider (cf. `docs/COSTS.md` à produire au LOT 0). |
| 🔵 | Agent ElevenLabs sur `gemini-2.0-flash-001` | `bootstrap_agent.py:44`. Choix non documenté, coût non chiffré. |

---

## 4. Frontend — `frontend/`

`npm run build` : **OK**, 122 modules, 2,6 s. Un warning de taille de bundle (1,08 Mo — MediaPipe pèse lourd).

### 4.1 Routes actives (`App.jsx`)

```
/                                       Landing
/screening/:roleToken                   ScreeningEntry
/interviews/:t/setup | /cv | /live | /done
/candidate/explanation/:t               CandidateExplanation
/hr, /hr/candidates/:t, /hr/templates/new
/hr/roles/:roleId/rubrics[/new|/:id]    RubricList, RubricWizard
```

Plus riche que ce que décrit le brief : l'upload de CV, les écrans rubriques et la page d'explication candidat sont routés.

### 4.2 Code mort confirmé

Vérifié par analyse du graphe d'imports — **aucun de ces fichiers n'est atteignable depuis `App.jsx`** :

| Fichier | Statut |
|---|---|
| `components/InterviewInterface.jsx` | Racine de l'arbre mort (stack WebSocket abandonné) |
| `hooks/useInterviewWebSocket.js` | Importé uniquement par `InterviewInterface` |
| `components/NaturalAudioCapture.jsx` | idem |
| `components/AIAvatar.jsx` | idem |
| `components/VisualMetricsDisplay.jsx` | idem — **et à supprimer au titre du §3.1** |
| `components/pages/LandingPage.jsx` | Non routé — c'est **ici** que sont les faux chiffres |
| `components/pages/ResultsPage.jsx` | Non routé |
| `components/pages/DashboardPage.jsx` | Non routé |
| `components/pages/JobsPage.jsx` | Non routé |
| `components/layout/Navbar.jsx`, `Footer.jsx` | Non routés |
| `components/AudioRecorder.jsx` | Non importé |
| `components/DesignCanvas.jsx` | Non importé |
| `screens/LiveCoding.jsx` | Maquette statique, non routée |

`useVideoAnalysis.js` est le seul du lot à être **encore vivant** (`LiveInterview.jsx:9`) — d'où sa place au §2 et non ici.

### 4.3 Landing — divergence avec le brief

Le §3.3 du brief demande de réécrire `components/pages/LandingPage.jsx`. Constat :

- Ce fichier **contient bien** les mensonges (`1 200+ Entreprises`, `85K+ Entretiens menés`, `95% Satisfaction RH`, « Analyse comportementale », « Détection d'engagement, contact visuel, ton de voix et confiance »).
- Mais il **n'est pas servi**. La landing réellement affichée est `screens/Landing.jsx`, qui ne contient **aucun chiffre inventé, aucun témoignage, aucun logo client**.

**Conséquence** : la bonne action n'est pas de réécrire `LandingPage.jsx`, c'est de le **supprimer**. Reste à traiter dans `screens/Landing.jsx` : le stat `∞ entretiens / jour`, qui devient un mensonge dès qu'un plafond de quota existe (LOT 6), et l'absence de mention du statut alpha. Cette divergence est consignée dans `DECISIONS.md`.

### 4.4 Autres manques

- Aucun test frontend (pas de `vitest`, pas de Testing Library).
- Aucune i18n `ar` — `shared.jsx` ne porte que `fr`/`en`. Conforme au périmètre (§4 : arabe hors scope), mais `CLAUDE.md` exige `STRINGS.ar` : contradiction à trancher dans `DECISIONS.md`.
- Styles inline massifs plutôt que Tailwind, contrairement aux conventions de `CLAUDE.md`.

---

## 5. Infrastructure et hygiène du dépôt

| Manque | Impact |
|---|---|
| Aucun `Dockerfile` (back ni front) | LOT 9 |
| Aucun `docker-compose.yml` | Pas de Postgres, dev sur SQLite uniquement |
| Aucune CI (`.github/workflows/` absent) | Rien ne garde les 174 tests verts |
| Aucun `Makefile` | `make test` / `make eval` du LOT 8 à créer |
| Aucun `CHANGELOG.md`, `DECISIONS.md`, `ROADMAP.md` | Exigés par le brief |
| Aucun `docs/COSTS.md`, `docs/COMPLIANCE.md` | LOT 0 |
| Aucun harnais `evals/` | LOT 8 |

**Pollution du dépôt** — commités à la racine et sans usage :
`recrutech-claude-code(1).zip` (60 ko), `recrutech-design.zip` (49 ko), `recrutetech-benchmark.zip` (58 ko), `RecruteTech.html` (134 ko), `recrutech-design/` (duplicata des écrans), `utils-docs/` (notes de dev en vrac, dont un PNG de crash).

`backend/recrutetech.db` et `backend/.env` sont bien non suivis (`.gitignore` correct). `backend/.venv-test/` (pip vendorisé complet) est non suivi mais traîne sur disque.

---

## 6. Réévaluation de l'effort par lot

L'avance réelle change sensiblement la répartition. Estimations révisées :

| Lot | Estimation | Écart vs brief | Commentaire |
|---|---|---|---|
| **0** — Nettoyage + conformité | **2–3 j** | ≈ | Le gros du travail est le §3.1 (chaîne complète à démonter, prompts + schémas à réécrire, tests à réaligner). Le code mort part en une passe. |
| **1** — Fondations données | **6–8 j** | −30 % | Alembic est déjà là et marche. Reste : 5 modèles, isolation tenant, Postgres, purge, endpoints RGPD. |
| **2** — Rubrique structurée | **2–3 j** | −70 % | **Largement fait.** Modèles, versionnement, immuabilité, service, wizard UI, tests. Reste : rattacher à `Organization`, retirer le chemin `LEGACY_SYSTEM_PROMPT`, purger le résidu `engagement` du schéma. |
| **3** — Aria adaptative + coûts | **5–7 j** | −20 % | Upload + parsing CV + filtrage d'attributs protégés **faits et testés**. Reste : passer le flag `CV_PERSONALIZATION_INJECT` en phase 2, et **tout** le volet garde-fous de coût (`max_billable_minutes`, auto-hangup, `UsageRecord`, quotas) qui est à zéro. |
| **4** — Scoring traçable | **4–5 j** | −40 % | `evidence[]`, `counterfactuals`, `verify_evidence_pointers`, `compute_integrity_hash`, `TransparencyPanel`, page candidat : **faits**. Reste : rejet strict + régénération, `needs_human_review` après 2 échecs, et **tout le mécanisme de recours sous 7 jours** (absent). |
| **5** — Intégrité conversationnelle | **8–10 j** | ≈ | Rien n'existe. `defense_questions` n'est qu'un bloc de config dans `rubric_json`. |
| **6** — Facturation et quotas | **6–8 j** | ≈ | Terrain vierge. Dépend du LOT 1 (`Organization`). |
| **7** — Audit de biais | **5–7 j** | ≈ | `synthetic_runner.py` et `test_rubric_synthetic_diff.py` donnent une amorce réutilisable. |
| **8** — Tests + harnais d'éval | **10–12 j** | −15 % | 174 tests backend acquis. Reste : couverture 80 %, tests frontend (à partir de zéro), E2E Playwright, et le corpus doré de 25 transcripts annotés — c'est le vrai coût du lot. |
| **9** — Shipping | **6–8 j** | ≈ | Docker, CI, observabilité, runbook. Plus la purge de la clé de l'historique. |

**Total révisé : ≈ 54–71 jours** contre ≈ 70–85 sur la base du brief. Les lots 2, 3 et 4 sont les gagnants.

---

## 7. Divergences brief ↔ réalité à acter dans `DECISIONS.md`

1. **§3.3 vise le mauvais fichier** — `LandingPage.jsx` n'est pas routé. Action retenue : suppression, plus retouche ciblée de `screens/Landing.jsx`.
2. **§2 « Aucun test »** — faux, 174 tests passent. Le LOT 8 part d'une base, pas de zéro.
3. **§2 « Pas d'Alembic »** — faux. Le LOT 1 conserve les migrations existantes et supprime `_ensure_columns()`.
4. **LOT 0 point 4 « mettre à jour `elevenlabs` »** — le SDK n'est jamais importé. Action retenue : **le retirer** de `pyproject.toml` et `requirements.txt` plutôt que le mettre à jour. Mise à jour proposée si un besoin réel apparaît.
5. **`CLAUDE.md` exige `STRINGS.ar`** alors que le brief met l'arabe hors périmètre. Le brief gagne (règle §2 du brief) : pas d'arabe, `CLAUDE.md` à corriger.
6. **`CLAUDE.md` exige TailwindCSS** alors que le frontend est en styles inline. Non bloquant, mais la convention est fausse telle qu'écrite.
7. **Practice mode fantôme** — table + migration + prompt livrés sans service ni API. Soit on complète, soit on retire la table. Hors périmètre des 10 lots : à trancher.

---

## 8. Ce que je recommande de faire immédiatement

1. **Révoquer la clé ElevenLabs.** Rien d'autre ne compte tant que ce n'est pas fait.
2. Exécuter le LOT 0 (plan détaillé fourni séparément).
3. Trancher les 7 divergences du §7 avant d'attaquer le LOT 1.
