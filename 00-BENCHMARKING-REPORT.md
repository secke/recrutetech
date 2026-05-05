# 📊 Benchmarking RecruteTech — Analyse concurrentielle & Plan d'action

**Date** : Mai 2026
**Périmètre** : MVP — postes tech uniquement
**Objectif** : Positionner RecruteTech (Aria) en *game winner* du recrutement IA

---

## 1. Synthèse exécutive

Le marché du recrutement IA en 2026 est saturé en surface mais largement défaillant en profondeur. Les grands acteurs (HireVue, Mercor, Crosschq, HackerRank, CodeSignal, Karat) souffrent de douleurs chroniques que la génération actuelle de modèles (Claude Opus 4.7, GPT-4.5o, etc.) et l'infrastructure de RecruteTech permettent d'adresser frontalement.

Trois constats stratégiques émergent :

D'abord, **la fraude par IA a explosé** en 2025-2026. Selon l'étude Fabric portant sur 19 368 entretiens, 79 % des méthodes de triche reposent désormais sur des outils invisibles aux proctoring traditionnels (Cluely, Interview Coder, ChatGPT voice mode). Aucun acteur du marché n'a encore une réponse mature et non-invasive.

Ensuite, **l'expérience candidat est universellement mauvaise**. Mercor est décrit comme "rigide et chaotique", HireVue comme "aliénant", avec en bonus une plainte ACLU pour discrimination contre les sourds et personnes non-blanches. Les candidats abandonnent en masse (drop-off rate élevé) et la marque employeur en pâtit.

Enfin, **les solutions existantes sont opaques**. Le scoring "boîte noire" de HireVue a déclenché une plainte FTC en 2019 (EPIC) et continue de générer une défiance. Aucun acteur n'offre une vraie traçabilité explicable du score, ni un retour formateur au candidat.

RecruteTech possède déjà l'ossature pour exploiter ces failles : Aria (ElevenLabs Conversational AI) est plus naturelle que Mercor ; Claude Opus 4.7 produit déjà une lettre d'amélioration au candidat (différenciateur fort) ; les métriques visuelles MediaPipe sont en place ; le marché francophone africain est sous-servi.

Ce document propose **10 skills prioritaires** à intégrer dans la solution existante, classés par ratio Impact × Faisabilité. Chaque skill est livré dans un fichier `SKILL.md` autonome dans le dossier `skills/`.

---

## 2. Cartographie concurrentielle

### 2.1 Mercor

**Positionnement** : Marketplace de talents AI/tech avec entretien IA obligatoire. Fonds déployés massifs, croissance rapide, mais réputation fragile.

**Forces observées** :
- Volume : connecte rapidement experts et entreprises IA
- Questions de suivi parfois pertinentes ("dive deeper")
- Possibilité de retake jusqu'à 3 fois (point positif candidat)

**Pain points documentés** :
- *"L'IA pose un set de questions prédéfini avec une faible adaptabilité. L'interaction est rigide et manque de flow naturel"* (Glassdoor, 2026)
- *"Les questions étaient chaotiques, rien à voir avec une vraie conversation. Je me suis arrêté en plein entretien"* (jobright.ai review)
- *"Le processus est complètement à sens unique. Vous ne pouvez poser AUCUNE question. Ni sur le rôle, ni sur l'entreprise, ni sur le projet"* (eesel AI)
- Soupçons généralisés que les entretiens servent au data harvesting pour entraîner leurs modèles
- Délai de réponse : 2 à 4 semaines, voire jamais
- "Job offers paused indefinitely" très fréquent — destruction de la confiance candidat
- Pas de feedback formateur

**Leçon RecruteTech** : Aria doit être *réellement* conversationnelle (déjà mieux grâce à ElevenLabs Realtime), accepter les questions du candidat, et clore chaque entretien par un retour utile.

### 2.2 HireVue

**Positionnement** : Pionnier du marché, ~19M+ entretiens, FedRAMP/ISO 27001, ciblage entreprise (Fortune 500).

**Forces observées** :
- ATS deep integration (Workday, Greenhouse, Lever, etc.)
- Conformité réglementaire mature (FedRAMP, GDPR, NYC AEDT Bias Audit Law)
- Game-based assessments + coding challenges
- Volume traité immense (CHOP a économisé 1 695 heures/an)

**Pain points documentés** :
- **Tarification prohibitive** : à partir de ~35 000 $/mois (~420 K$/an) — exclut SMB
- **Plainte ACLU 2024** : l'outil performe moins bien sur les locuteurs sourds et non-blancs (Intuit case)
- **Plainte EPIC 2019** : analyse faciale opaque, "biased, unprovable and not replicable"
- **Black box scoring** : *"Les candidats rejetés algorithmiquement n'ont aucun recours et aucune explication"* (ToolsForHumans)
- **Drop-off candidat** : format one-way produit un abandon massif
- **Évaluation tech faible** : *"Limitée comparée aux plateformes avec infrastructure d'évaluation de code dédiée"* (HackerEarth)
- A retiré l'analyse faciale en 2021 sous pression médiatique mais conserve l'analyse vocale (intonation, accent) — toujours problématique

**Leçon RecruteTech** : Tarif accessible, scoring transparent et explicable, accommodations actives pour neurodivergence/handicap/non-natifs, et profondeur technique réelle.

### 2.3 Crosschq

**Positionnement** : "Hiring Intelligence" + référencement digital, intégration Workday native.

**Forces observées** :
- Référencement digital automatisé (digital reference checks)
- Predictive analytics (combine pre/post-hire data)
- Intégration ATS-native (Workday Marketplace)
- Authenticity signals (vérification d'identité légère)

**Pain points documentés** :
- Profondeur technique faible : *"Crosschq est plus récent et la profondeur d'évaluation technique est limitée comparée aux outils dédiés au coding"* (HackerEarth)
- Anglais uniquement (un seul language supporté selon GetApp)
- Centré comportemental, pas tech
- Adoption dépend de Workday — friction pour SMB

**Leçon RecruteTech** : Intégrer le référencement digital comme module optionnel, et étendre les langues supportées (FR/EN/AR/Wolof).

### 2.4 HackerRank, CodeSignal, Karat (concurrents tech-spécifiques)

**Forces** :
- Profondeur technique réelle (IDE riche, 30+ langages, pair programming)
- Détection plagiat avancée (HackerRank a réduit les flags plagiat de 10 % à 4 % chez Atlassian)
- Question banks vastes et benchmarks (CodeSignal Coding Score 300-850)

**Pain points** :
- *"Beaucoup de top candidates refusent les tests HackerRank, surtout s'ils sont déjà demandés, parce que l'étape supplémentaire semble inutile et rebutante"* (Capterra)
- Aucune dimension comportementale ni vidéo
- Format pass/fail, sans suivi formateur
- *"La détection de plagiat lève parfois des cas légitimes en faux positifs"* (Capterra)
- Karat : interviews humains externalisés (cher, lent), pas IA conversationnelle

**Leçon RecruteTech** : Combiner profondeur tech (live coding + détection IA-générée) AVEC dimension conversationnelle/comportementale d'Aria — un mix que personne ne réussit aujourd'hui.

### 2.5 Sapia.ai (concurrent éthique)

**Positionnement** : Entretien chat-based text-only, neurodiversité-friendly.

**Forces observées** :
- Aucun signal vidéo/voix → moins de biais ethnique/accent
- Validé sur 6 000 candidats neurodivergents : *"Moins anxiogène que les entretiens vidéo"*
- Blind screening, scientifiquement validé

**Pain points** :
- Pas de live coding, pas d'évaluation tech profonde
- Format text-only frustre certains candidats qui veulent montrer leur soft skills à l'oral
- Coverage métier limitée

**Leçon RecruteTech** : Offrir un mode "text-only / chat" optionnel (accommodation neurodiversité) en complément du mode voix d'Aria.

---

## 3. Pain points transversaux & opportunités

| # | Pain point industrie | Fréquence | Impact RH | Impact candidat | Skill RecruteTech proposé |
|---|---|---|---|---|---|
| 1 | Fraude IA invisible (Cluely, Interview Coder, ChatGPT voice) | 79 % des cas | Très élevé | — | `anti-cheating-integrity-layer` |
| 2 | Évaluation tech superficielle | Universel sur HireVue/Mercor | Élevé | Modéré | `live-coding-evaluator` |
| 3 | Questions génériques non-adaptées au CV | Mercor, HireVue | Modéré | Élevé | `cv-adaptive-personalization` |
| 4 | Deepfakes & impersonation (FBI alerté) | Émergent, en croissance | Très élevé | — | `identity-verification-deepfake-defense` |
| 5 | Black box scoring (plaintes ACLU/EPIC) | HireVue, Mercor | Élevé légal | Élevé | `transparent-scoring-explainability` |
| 6 | Biais algorithmique (sourds, non-blancs, accents) | HireVue (procès) | Très élevé légal | Très élevé | `fairness-bias-audit` |
| 7 | Pas de mode "practice" pour le candidat | Universel | — | Élevé | `candidate-practice-mode` |
| 8 | Intégrations ATS limitées (SMB exclus) | Universel sauf HireVue | Élevé adoption | — | `ats-integration-hub` |
| 9 | Accessibilité (neurodiversité, handicap, non-natifs) | Universel | Élevé légal | Très élevé | `accessibility-accommodations` |
| 10 | Rubriques d'évaluation rigides, non personnalisables | Mercor surtout | Élevé | — | `structured-rubric-builder` |

---

## 4. Bilan de faisabilité

Pour chaque skill, j'ai évalué **Impact**, **Coût d'intégration** sur la stack existante (FastAPI + ElevenLabs + Claude + React + MediaPipe), et le **Risque** technique/légal.

| Skill | Impact business | Coût intégration | Risque | Score ICE | Priorité |
|---|---|---|---|---|---|
| `anti-cheating-integrity-layer` | 10/10 | Moyen — utilise Aria + signaux MediaPipe existants | Faible | **9.0** | P0 |
| `live-coding-evaluator` | 9/10 | Moyen — Monaco Editor déjà prévu, ajouter sandbox | Faible | **8.5** | P0 |
| `cv-adaptive-personalization` | 9/10 | Faible — Claude Opus parse déjà du contenu | Faible | **9.0** | P0 |
| `identity-verification-deepfake-defense` | 8/10 | Élevé — nouvelles dépendances biométriques | Moyen | **6.5** | P1 |
| `transparent-scoring-explainability` | 8/10 | Faible — refactor du report_service | Faible | **8.5** | P0 |
| `fairness-bias-audit` | 9/10 (légal) | Moyen — pipeline d'audit récurrent | Faible | **8.0** | P1 |
| `candidate-practice-mode` | 7/10 (marque) | Faible — réutilise stack existante | Faible | **8.5** | P0 |
| `ats-integration-hub` | 9/10 (revenue) | Élevé — 1 connecteur/ATS | Faible | **7.5** | P1 |
| `accessibility-accommodations` | 8/10 (légal) | Moyen — modes alternatifs UI/UX | Faible | **7.5** | P1 |
| `structured-rubric-builder` | 7/10 | Faible — UI HR + JSON schema | Faible | **8.0** | P0 |

**Légende** : P0 = à intégrer dans le prochain sprint | P1 = sprint +2/+3.

### Vague 1 (P0 — 6 à 8 semaines)
1. `cv-adaptive-personalization` — différenciateur immédiat vs Mercor
2. `live-coding-evaluator` — indispensable pour la promesse "tech"
3. `anti-cheating-integrity-layer` — sans ça, RecruteTech perd toute crédibilité en 2026
4. `transparent-scoring-explainability` — protection légale + différenciateur marketing
5. `candidate-practice-mode` — boucle de croissance virale
6. `structured-rubric-builder` — autonomie HR sans intervention dev

### Vague 2 (P1 — 8 à 12 semaines)
7. `fairness-bias-audit` — conformité NYC AEDT et anticipation EU AI Act
8. `accessibility-accommodations` — étendre le marché et éviter procès type ACLU/HireVue
9. `ats-integration-hub` — débloquer les ventes B2B mid-market
10. `identity-verification-deepfake-defense` — catch-up sur la menace deepfake

---

## 5. Pourquoi RecruteTech peut gagner

Trois angles de différenciation, à exécuter ensemble pour devenir game-winner :

**Profondeur conversationnelle réelle.** Aria via ElevenLabs Realtime + Claude Opus 4.7 dépasse déjà Mercor sur la naturalité. En ajoutant `cv-adaptive-personalization` et `structured-rubric-builder`, l'expérience devient *mieux qu'un humain* : adaptée, structurée, calibrée.

**Intégrité sans surveillance invasive.** Plutôt que copier les proctoring brutaux qui aliènent les candidats, RecruteTech adopte la stratégie "integrity layer" — Aria pose des questions de défense conversationnelle qui font tomber Cluely en 1-2 secondes. C'est l'angle Humanly mais industrialisé sur Aria.

**Transparence radicale + retour formateur.** Personne sur le marché ne livre au candidat *pourquoi* il a obtenu son score. RecruteTech le fait déjà via la lettre Claude — étendons cela en un dashboard explicable ouvert au candidat, certifié par audit de biais publié. C'est le contre-exemple parfait de HireVue/EPIC.

Combiné au tarif aligné sur le marché francophone africain (50K-400K FCFA vs 35 000 $/mois HireVue), à la couverture multilingue (FR/EN/AR/Wolof) et à la compréhension culturelle du marché cible, le positionnement devient défendable.

---

## 6. Livrables (skills/)

Chaque skill est livré au format standard (`SKILL.md` avec frontmatter YAML) dans le dossier `skills/`. Chaque fichier contient :
- Un **objectif** clair et la cible (qui appelle ce skill)
- Le **contexte d'intégration** dans la stack actuelle
- Les **étapes d'implémentation** ordonnées
- Les **schémas de données** (input/output JSON)
- Les **garde-fous** (sécurité, biais, légal)
- Des **critères d'acceptation** mesurables
- Les **dépendances** sur d'autres skills

Les 10 skills sont :

1. `anti-cheating-integrity-layer/SKILL.md`
2. `live-coding-evaluator/SKILL.md`
3. `cv-adaptive-personalization/SKILL.md`
4. `identity-verification-deepfake-defense/SKILL.md`
5. `transparent-scoring-explainability/SKILL.md`
6. `fairness-bias-audit/SKILL.md`
7. `candidate-practice-mode/SKILL.md`
8. `ats-integration-hub/SKILL.md`
9. `accessibility-accommodations/SKILL.md`
10. `structured-rubric-builder/SKILL.md`

---

## 7. Sources de l'analyse

L'analyse repose sur plus de 40 sources publiques consultées en mai 2026 : reviews G2, Capterra, Glassdoor, ToolsForHumans, jobright.ai, eesel AI, plaintes ACLU/EPIC, étude Fabric (19 368 entretiens), rapports HireVue Candidate Experience, blog HackerRank/CodeSignal, retours médias spécialisés (HR Dive, The Conversation), et témoignages directs candidats (Medium, Reddit). Les citations exactes et URLs sont disponibles sur demande pour audit.
