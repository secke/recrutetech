---
name: anti-cheating-integrity-layer
description: |
  Détecter et neutraliser la triche par IA pendant un entretien (Cluely, Interview Coder, ChatGPT
  voice mode, deepfakes audio, code généré par LLM) sans recourir à du proctoring invasif. Combine
  signaux comportementaux (latence atypique, paste burst, regard hors-écran), forensique du code
  (perplexité, structure typique LLM, plagiat), et — surtout — questions conversationnelles de
  défense posées par Aria. Déclencher AUTOMATIQUEMENT à chaque entretien tech, dès que le candidat
  démarre la session, et continuer pendant toute la durée. Utiliser ce skill dès qu'on parle de
  "triche IA", "Cluely", "Interview Coder", "détection ChatGPT", "anti-fraude entretien",
  "intégrité d'évaluation", "candidat assisté par IA", "code IA-généré", "deepfake audio",
  "proctoring", ou pour répondre à toute préoccupation RH sur l'authenticité d'un candidat.
  CRITIQUE en 2026 : 79% des méthodes de triche sont invisibles aux proctoring traditionnels.
---

# Anti-Cheating Integrity Layer

## 1. Objectif

En 2026, l'industrie traverse une **crise d'intégrité** : Cluely (45 % des cas selon Fabric), Interview Coder, ChatGPT voice mode (34 %) tournent en overlay invisible et donnent au candidat les réponses en 1-2 s. Les proctoring traditionnels (lockdown browser, eye tracking, second screen) sont contournés par overlay DirectX/Metal au niveau OS et n'attrapent que les amateurs.

Ce skill adopte la stratégie **"integrity layer"** documentée par Humanly et Fabric : plutôt que surveiller le candidat, on lui pose des questions conversationnelles que les copilots IA n'arrivent pas à défendre en temps réel. C'est aligné sur la philosophie RecruteTech : non-invasif, respectueux du candidat, mais redoutable contre les fraudeurs.

## 2. Architecture en 3 couches

### Couche A — Signaux passifs (sans interaction)

Collectés en continu via le frontend et l'éditeur. Aucun ne déclenche une décision seul ; ils alimentent un `cheat_likelihood_score`.

**Signaux audio/voix (via Aria + WebRTC)** :
- Latence anormale entre fin de question d'Aria et début de réponse candidat (médiane humaine = 0.8-2.5 s ; réponses pré-générées par LLM voice = souvent < 0.4 s ou > 4 s)
- Variation de la qualité audio (compression différente quand un agent vocal IA répond à la place du candidat)
- Inconsistance prosodique : voix très naturelle, mais structure de phrase robotique ("First, ... Second, ... In conclusion, ...")
- Détection de TTS connus (signatures spectrales d'ElevenLabs, OpenAI TTS, Bark, etc.) — utiliser un classifieur audio open-source

**Signaux visuels (via MediaPipe déjà en place)** :
- Eye contact ratio + direction du regard : regard fréquent en bas-droite peut indiquer un téléphone hors-caméra
- Movements de bouche désynchronisés avec l'audio (deepfake video)
- Tête trop stable + clignements trop réguliers (indicateurs de filtre vidéo IA)
- Présence d'une seconde personne dans le champ ou son détecté

**Signaux clavier/code (via le tracker `live-coding-evaluator`)** :
- Burst paste > 30 caractères qui correspond à un pattern LLM
- Délai > 30 s sans frappe, puis bloc complet apparaît d'un coup
- Tab-switch out du navigateur > 3 s pendant la phase de code
- Vitesse de frappe non humaine (trop régulière, sans backspace)

### Couche B — Forensique du contenu

Analyse a posteriori (ou en streaming) :

**Code IA-généré** (sur le code écrit dans la sandbox) :
- Perplexité du code via un petit modèle (CodeLlama 7B ou similaire) — code humain a une variance de perplexité plus élevée
- Patterns typiques LLM : nommage parfait, commentaires verbeux, gestion exhaustive d'edge cases dès la 1re version, absence totale de code "essai-erreur"
- Comparaison avec l'historique de frappe : un humain qui produit du code parfait du premier coup est suspect
- Détection de boilerplate ChatGPT (`# Here's a clean implementation...`, `def solution():`)

**Réponses verbales générées par IA** :
- Structure trop "présentation PowerPoint" : "There are three main aspects. First... Second... Third..."
- Densité lexicale anormalement élevée (LLMs sur-utilisent jargon)
- Absence d'hésitation, de reformulation, de "euh" naturels
- Réponses qui répondent à la lettre de la question mais ratent le contexte conversationnel

### Couche C — **Defense Questions** (la vraie arme)

C'est le cœur du skill. Aria pose, **à intervalles aléatoires**, des questions que les copilots IA ne peuvent pas défendre en temps réel :

**Type 1 — Justification a posteriori** :
- *"Vous avez utilisé un dictionnaire ici plutôt qu'un set. Pourquoi ?"*
- *"Vous avez parlé de Kafka tout à l'heure ; concrètement, quel partitioning vous aviez utilisé sur ce projet ?"*

**Type 2 — Trade-off ouvert (les LLMs donnent des réponses génériques)** :
- *"Si vous deviez réduire la latence de moitié sur cette fonction, quel premier compromis seriez-vous prêt à faire ?"*
- *"Quelle est la pire bug que vous ayez introduit en prod cette année et comment vous l'avez détecté ?"*

**Type 3 — Recall sur ce qui a été dit 2-3 minutes plus tôt** :
- *"Tout à l'heure vous avez mentionné le cache Redis sur l'architecture. À quel niveau il était positionné ?"*
- Un copilot IA n'a souvent pas le contexte des 5 dernières minutes en mémoire continue.

**Type 4 — Demande de modification du code mentionnée à l'oral** :
- *"Sans regarder l'éditeur, dites-moi quelle ligne il faudrait modifier pour gérer un input null, et pourquoi."*
- Force le candidat à raisonner sans pouvoir consulter une overlay.

**Type 5 — Question de cohérence personnelle** :
- *"Vous m'avez dit que vous avez quitté votre dernier poste pour faire plus de data engineering. Concrètement, qu'est-ce qui vous a manqué le plus dans votre poste précédent ?"*
- Très difficile à fabriquer en temps réel avec une IA.

Les defense questions sont **stockées dans une banque** par catégorie de rôle/séniorité, et Aria en pioche 2 à 4 par entretien à des moments aléatoires (pas en début, pas en fin — au milieu, idéalement après une affirmation forte du candidat).

## 3. Score d'intégrité agrégé

À la fin de l'entretien, un job calcule :

```json
{
  "integrity_score": 0.0,        // 0=très suspect, 1=très authentique
  "confidence": "low|medium|high",
  "signals": {
    "audio_naturalness": 0.85,
    "video_authenticity": 0.92,
    "keystroke_humanness": 0.40,
    "code_perplexity": 0.55,
    "defense_question_coherence": 0.30,
    "verbal_consistency": 0.70
  },
  "flags": [
    {"type": "burst_paste", "t": 247, "evidence": "47 lines pasted at once after 35s pause"},
    {"type": "defense_failure", "t": 612, "evidence": "Could not justify dictionary choice when asked"},
    {"type": "tab_switch", "t": 198, "duration_s": 6}
  ],
  "ai_assistance_likelihood": 0.74,
  "recommendation_for_hr": "REVIEW — multiple high-confidence signals of AI assistance during coding portion. Verbal portion appears authentic. Consider a follow-up live conversation."
}
```

## 4. Étapes d'implémentation

### Phase 1 — Defense questions (1-2 semaines)
- Créer table `defense_questions` avec les 5 types ci-dessus
- Modifier le prompt système d'Aria pour qu'elle insère 2-4 defense questions par session, à des moments choisis aléatoirement
- Tracker les réponses dans `Interview.defense_responses_json`
- Évaluation post-call par Claude Opus 4.7 : *"Le candidat a-t-il défendu sa réponse de manière cohérente avec ses propos précédents et le code écrit ?"*

### Phase 2 — Signaux passifs (2-3 semaines)
- Étendre le frontend pour pousser les events clavier (déjà fait pour le code via `live-coding-evaluator`)
- Ajouter classifieur audio TTS-detection côté backend (modèle léger sur CPU)
- Étendre MediaPipe pour gaze direction et désynchronisation lèvres-audio

### Phase 3 — Forensique de code (2 semaines)
- Intégrer un modèle de perplexité de code (CodeLlama 7B sur GPU partagé, ou API hébergée)
- Comparer l'historique de frappe vs code final pour détecter "code parachute"
- Générer un score `code_authenticity` séparé

### Phase 4 — Score agrégé + UX HR (1 semaine)
- Pondération configurable par entreprise/rôle
- Affichage dashboard HR : timeline des flags avec t=, évidence cliquable (replay vidéo/code)
- Pas de décision automatique de rejet — toujours en "REVIEW" pour validation humaine

## 5. Garde-fous éthiques (TRÈS IMPORTANT)

- **Aucun rejet automatique** sur la base du score d'intégrité. Le score est un signal pour la RH, jamais une décision.
- **Transparence candidat** : informer dès la page pré-entretien (`pre_consent`) qu'une couche d'intégrité est active, sans détailler les signaux (sinon Cluely s'adapte). Texte type : *"Cet entretien utilise une analyse d'intégrité conversationnelle pour assurer l'équité de l'évaluation. Aucune surveillance invasive (capture d'écran continue, lockdown navigateur) n'est utilisée."*
- **Recours** : un candidat flagué peut demander un entretien humain en visio dans les 7 jours suivants. C'est un droit affiché.
- **Pas de surveillance hors-fenêtre** : RecruteTech ne capte AUCUN signal hors de l'onglet de l'entretien. Pas de monitoring système, pas de keylogger, pas de capture d'écran complète.
- **Calibration anti-biais** : tester le pipeline sur 100 candidats authentiques de profils variés (locuteurs non-natifs, neurodivergents, candidats malvoyants utilisant des assistants vocaux légitimes) pour garantir que les faux positifs ne ciblent pas des minorités. Audit publié dans le cadre du skill `fairness-bias-audit`.
- **Distinction fondamentale** : utiliser ChatGPT pour réfléchir AVANT l'entretien est légitime ; l'utiliser PENDANT l'entretien comme oracle ne l'est pas. Le système ne doit pas pénaliser la première situation (ex. structure de raisonnement appris ≠ triche).

## 6. Schémas de données

```python
class Interview(SQLModel, table=True):
    # ... existing ...
    integrity_score: Optional[float] = None
    integrity_signals_json: Optional[str] = Field(sa_column=Column(Text))
    integrity_flags_json: Optional[str] = Field(sa_column=Column(Text))
    defense_responses_json: Optional[str] = Field(sa_column=Column(Text))


class DefenseQuestion(SQLModel, table=True):
    id: int = Field(primary_key=True)
    type: str  # "justification" | "tradeoff" | "recall" | "modify" | "consistency"
    template: str  # avec placeholders {previous_claim}, {code_choice}
    role_tags: List[str] = Field(sa_column=Column(JSON))
    seniority_min: str
    languages: List[str] = Field(sa_column=Column(JSON))  # ["fr","en","ar"]
```

## 7. Critères d'acceptation

- ✅ Sur 50 sessions de test où on instruit la moitié des candidats à utiliser Cluely/ChatGPT voice : taux de détection ≥ 80 %, faux positifs ≤ 10 %.
- ✅ Aucun candidat authentique de groupe minoritaire n'est faussement flagué à un taux supérieur à la baseline (test sur ≥ 30 candidats par groupe).
- ✅ Aria insère 2-4 defense questions par session, sans casser la fluidité conversationnelle (validé par 20 candidats en blind test, NPS ≥ 7).
- ✅ Le rapport HR fournit une timeline cliquable des flags avec évidence consultable.
- ✅ La page consentement candidat est claire et lue (taux de check-box ≥ 95 %, sans coercion).

## 8. Dépendances

- **Forte** sur `live-coding-evaluator` (signaux clavier, paste detection)
- **Forte** sur les métriques visuelles MediaPipe existantes
- **Forte** sur `fairness-bias-audit` (validation absence de biais des signaux)
- **Moyenne** sur `transparent-scoring-explainability` (intégrité expliquée au candidat si flag haut)

## 9. Notes finales

C'est **le skill différenciateur le plus important** de RecruteTech en 2026. Personne sur le marché ne combine encore : conversationnel + integrity layer + non-invasif + transparence. C'est notre angle gagnant. À traiter comme P0 absolu.
