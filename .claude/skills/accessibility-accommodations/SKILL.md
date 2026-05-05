---
name: accessibility-accommodations
description: |
  Adapter dynamiquement l'expérience d'entretien pour les candidats avec handicap, neurodivergents,
  ou non-natifs de la langue de l'entretien — sans pénaliser leur évaluation. Couvre : mode chat
  texte (alternative à la voix), désactivation des métriques visuelles pour malvoyants, durées
  étendues sans pénalité pour TDAH/TSA, sous-titres temps réel pour sourds, support de langue
  maternelle pour la verbalisation, lecture facile (FALC). Déclencher quand un candidat coche
  "demander une accommodation", quand un recruteur configure un poste "accessible par défaut",
  ou quand on parle de "neurodiversité", "handicap", "ACLU", "ADA", "FALC", "easy read",
  "sourds", "malvoyants", "non-natifs", "TDAH", "autisme", "anxiété", "accessibility",
  "WCAG". C'est à la fois un bouclier légal (anti-procès type ACLU/HireVue) et un véritable
  différenciateur éthique.
---

# Accessibility & Accommodations

## 1. Objectif

Le procès ACLU 2024 contre HireVue/Intuit (discrimination contre une employée sourde et autochtone) a démontré que **l'absence d'accommodations n'est pas neutre — c'est de la discrimination active**.

Sapia.ai s'est positionné brillamment sur la neurodiversité avec un format text-only, mais perd sur la profondeur tech. RecruteTech doit faire les **deux** : profondeur tech ET accommodations actives.

Le principe directeur : **une accommodation ne baisse jamais le score**. Au contraire, elle assure que le score reflète la compétence réelle, pas un signal périphérique défaillant.

## 2. Catalogue des accommodations

### 2.1 Mode chat texte (au lieu de voix)

Pour candidats sourds, malentendants, anxieux, neurodivergents, non-natifs.

- L'interview se déroule en chat écrit avec Aria (mêmes rubriques, mêmes questions)
- Aria répond par texte, le candidat tape ses réponses
- Pas de pression de temps de réponse (pas de "silence pénalisant")
- Disponible côté frontend via toggle pré-entretien : *"Préférez-vous un entretien à l'écrit ?"*

Implémentation : adapter le mode `text-only` qui contourne ElevenLabs et appelle directement Claude pour la conversation. Réutilise 90 % de la stack.

### 2.2 Sous-titres temps réel

Pour les sourds qui veulent quand même un mode visuel.

- Activé par toggle pré-entretien
- Whisper API (déjà dans la stack) tourne sur le canal d'Aria → sous-titres affichés en temps réel sous la vidéo d'Aria
- Fallback vers la transcription d'ElevenLabs (déjà disponible côté backend) pour latence < 200 ms
- Bouton "répéter la question" toujours visible pour le candidat

### 2.3 Désactivation sélective des métriques visuelles

Pour candidats malvoyants, aveugles, paralysés faciaux, ou utilisateurs de prothèses oculaires.

- Pré-entretien : toggle *"Je préfère ne pas être évalué sur le contact visuel ou les expressions faciales"*
- Aucune justification médicale demandée (pas de "preuve de handicap" — pratique discriminante)
- Si activé : `eyeContactRatio`, `smileRatio`, `attentionRatio` ne sont pas envoyés à Claude pour le rapport
- Le rapport HR mentionne uniquement *"Métriques visuelles désactivées (accommodation candidat)"* — pas de détail sur la raison

### 2.4 Durée étendue

Pour TDAH, autisme, dyslexie, anxiété sociale, ou simple préférence.

- Toggle pré-entretien : *"Je préfère un format sans timer"*
- Si activé : tous les timers (live coding, étapes) deviennent indicatifs, pas contraignants
- Le candidat peut demander des pauses jusqu'à 15 min cumulées
- Aucun signal "lent" ne pénalise le score (le facteur "vitesse" est retiré du calcul)
- Indication discrète à Aria de ne pas dire *"On va passer à la suivante car on manque de temps"*

### 2.5 Support langue maternelle pour verbalisation

Pour candidats francophones africains ou arabophones interviewés en anglais (ou inverse).

- Pré-entretien : *"Vous pouvez verbaliser votre raisonnement dans votre langue maternelle. Aria vous ré-orientera dans la langue de l'évaluation pour les réponses formelles."*
- Le candidat peut répondre une partie en wolof ou en arabe (par exemple *"Ndeysaan, ce problème me rappelle..."*) tout en revenant à la langue principale ensuite
- La transcription multilingue est traduite par Claude pour le rapport
- **Aucun score "fluency in English"** ne pénalise un candidat qui a opté pour cette accommodation

### 2.6 Mode FALC (Facile à lire et à comprendre)

Pour candidats avec déficience cognitive légère, ou simplement qui préfèrent un langage simple.

- Aria reformule ses questions en langage simple (phrases courtes, vocabulaire courant, pas d'idiomes)
- Le `level_descriptors` reste identique — c'est la **forme** qui change, pas le **fond** évalué
- Implémentation : un wrapper qui appelle Claude pour reformuler chaque question d'Aria avant énonciation

### 2.7 Pause obligatoire toutes les 30 min

Pour entretiens longs (45+ min) ou si activé en accommodation.

- Aria propose explicitement une pause de 5 min toutes les 30 min : *"On a fait une bonne moitié, voulez-vous une pause de 5 min ?"*

## 3. UX d'activation

Page pré-entretien (`PreInterview.jsx`) : ajouter une section **"Adaptations"** avec :
- Une phrase d'introduction respectueuse : *"Vous pouvez personnaliser votre expérience. Aucune adaptation choisie ne sera mentionnée dans votre évaluation et n'affectera votre score."*
- 7 toggles correspondant aux accommodations ci-dessus
- Aucun champ "preuve médicale", "diagnostic", "justification"
- Le choix est confidentiel : visible côté backend uniquement aux admins audit, pas aux recruteurs.

## 4. Garde-fous

- **Pas de divulgation au recruteur** : le rapport HR mentionne au max *"Accommodation appliquée"* sans détail. Le candidat n'est jamais traçable individuellement.
- **Pas d'usage des accommodations comme signal de "fragilité"** : les algorithmes ne doivent pas baisser le score parce qu'une accommodation est active. C'est une exclusion stricte dans `report_service.py`.
- **Audit régulier** : `fairness-bias-audit` doit comparer les distributions de scores entre candidats avec/sans accommodation pour vérifier l'absence de pénalisation.
- **Disponibilité en temps réel** : un candidat doit pouvoir activer une accommodation pendant l'entretien (par exemple "trop bruyant ici, je passe en chat").

## 5. Modèle de données

```python
class InterviewAccommodations(SQLModel, table=True):
    interview_id: int = Field(primary_key=True, foreign_key="interview.id")
    text_chat_mode: bool = False
    live_subtitles: bool = False
    visual_metrics_disabled: bool = False
    untimed: bool = False
    multilingual_verbalization: bool = False
    falc_mode: bool = False
    forced_breaks: bool = False
    activated_at: datetime
    activated_during_session: bool = False  # vs avant la session
    # NB: pas de champ "raison" ou "diagnostic" — collecte interdite
```

## 6. Critères d'acceptation

- ✅ Tous les modes peuvent être activés en moins de 2 clics depuis la page pré-entretien.
- ✅ Aucun rapport HR ne révèle quelles accommodations spécifiques ont été activées.
- ✅ Sur 30 candidats utilisant le mode chat texte vs voix : distributions de scores statistiquement équivalentes (test de Mann-Whitney p > 0.05).
- ✅ Sur 30 candidats utilisant le mode untimed vs timed : distributions équivalentes.
- ✅ Tests utilisateurs avec partenaires associatifs (au moins 1 association sourds, 1 neurodiversité, 1 PMR visuel) : feedback positif, NPS ≥ 8.
- ✅ Conformité WCAG 2.2 AA sur les pages frontend (vérifié par axe-core en CI).

## 7. Dépendances

- **Forte** sur `fairness-bias-audit` (validation que les accommodations ne créent pas de biais inverse)
- **Forte** sur `structured-rubric-builder` (les exclusions sont gérées par rubrique)
- **Moyenne** sur `transparent-scoring-explainability` (le candidat doit voir que son score est expliqué sans référence aux accommodations)
- **Légère** sur `anti-cheating-integrity-layer` (certains signaux d'intégrité doivent être désactivés ou recalibrés selon les accommodations)

## 8. Pourquoi c'est un game-changer

C'est **à la fois** une protection légale (anti-procès) **et** un argument marketing. RecruteTech peut afficher *"La première plateforme d'entretien IA conçue avec les communautés neurodivergentes, sourdes et non-natives en partenariat avec [associations]"*. Ça résonne aux ESG, ça résonne aux DRH modernes, ça résonne aux candidats.

C'est l'angle où Sapia.ai brille mais reste limité au text-only. RecruteTech peut faire mieux : voix + chat + tous modes, avec la profondeur tech en plus.
