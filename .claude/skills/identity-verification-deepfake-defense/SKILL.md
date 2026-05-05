---
name: identity-verification-deepfake-defense
description: |
  Vérifier que la personne qui passe l'entretien est bien le candidat enregistré, et détecter les
  deepfakes vidéo, les filtres de visage temps réel, et les substitutions de voix. Combine
  liveness detection au démarrage (challenge-response visuel et oral), surveillance continue de
  cohérence biométrique pendant la session, et détection de signatures techniques de deepfakes.
  Déclencher au démarrage de chaque entretien officiel (pas en mode practice), quand un recruteur
  exige "vérification d'identité forte", "KYC candidat", ou quand on parle de "deepfake",
  "impersonation", "proxy interview", "liveness detection", "biométrie", "face swap",
  "voice cloning", "FBI fraud alert", "fraude à l'identité candidat". C'est la réponse à
  l'alerte FBI 2024-2025 sur les candidats remote IT utilisant des deepfakes pour décrocher des
  jobs (notamment opérateurs nord-coréens infiltrant des entreprises tech).
---

# Identity Verification & Deepfake Defense

## 1. Objectif

Le FBI a publié en 2024-2025 plusieurs alertes sur des candidats utilisant des deepfakes pour décrocher des jobs remote (notamment cas d'opérateurs nord-coréens infiltrant des entreprises tech américaines). Gartner prédit que **30 % des entreprises perdront confiance dans la vérification d'identité d'ici 2026** à cause des deepfakes.

Le skill `anti-cheating-integrity-layer` couvre la triche par IA pendant l'entretien. **Ce skill** couvre une menace différente : *la personne au bout de la caméra n'est pas celle qu'elle prétend être*.

Les deux fonctionnent en tandem.

## 2. Architecture en 3 couches

### Couche 1 — Pré-entretien : Identity capture

Avant le tout premier entretien d'un candidat sur la plateforme :

1. **Capture de la pièce d'identité** (CNI, passeport, permis)
   - Upload ou photo via webcam
   - OCR + extraction nom, date de naissance, photo
   - Vérification de l'authenticité du document (template officiel, hologrammes visibles, dates cohérentes)
   - **Optionnel** : intégration avec un service tiers de KYC (Onfido, Veriff, IDnow) — recommandé pour les entreprises Enterprise qui l'exigent.

2. **Selfie liveness** (challenge dynamique)
   - L'utilisateur doit suivre un point sur l'écran avec son regard
   - Puis sourire / tourner la tête lentement gauche-droite
   - Validation que c'est une vraie personne, pas une photo, pas un écran d'écran (anti-replay)
   - Match du selfie avec la photo de la pièce d'identité (similarité de visage > seuil)

3. **Voice baseline**
   - Enregistrement de 2-3 phrases prononcées par le candidat (textes libres ou imposés)
   - Création d'une empreinte vocale (voiceprint) stockée chiffrée
   - Servira de référence pour la couche 2

Cette étape est faite **une seule fois** par candidat. Pour les entretiens suivants, on saute directement à la couche 2.

### Couche 2 — Démarrage de chaque entretien : Recheck

Chaque entretien officiel commence par :

1. **Microliveness rapide** (5 secondes)
   - Aria demande au candidat de tourner la tête à droite, à gauche
   - Match avec le selfie de référence

2. **Voice match** (10 secondes)
   - Aria demande au candidat de prononcer une phrase générée aléatoirement (anti-replay)
   - Match avec le voiceprint de référence (similarité > seuil)

3. **Question de connaissance** (optionnelle, paramétrable)
   - Une question dont seule la vraie personne connaît la réponse, basée sur son CV soumis
   - Exemple : *"Quel est l'intitulé exact du dernier projet listé sur votre CV ?"*
   - Anti-impersonator basique mais efficace

Si une vérification échoue → l'entretien démarre en mode "Identity Flag" et le rapport HR mentionne *"Vérification d'identité non concluante. Review humaine recommandée avant décision."*

**Important** : pas de blocage automatique. Toujours en review humaine. Faux positifs trop dommageables sinon.

### Couche 3 — Surveillance continue pendant l'entretien

Pendant la session, surveiller en arrière-plan :

**Cohérence vidéo** :
- Hash perceptuel du visage toutes les 30 secondes — détection de drift (changement subtil de visage)
- Détection de discontinuités d'éclairage cohérentes avec un filtre temps réel
- Analyse spectrale fréquentielle : les deepfakes ont des artefacts dans les hautes fréquences
- Cohérence des micro-mouvements (un deepfake peut figer trop la peau, ou créer des distortions au mouvement rapide)

**Cohérence audio** :
- Voiceprint match continu (échantillonnage toutes les ~60s)
- Détection de jitter et formants atypiques pour TTS connus
- Détection de re-encoding (signature de passage par un système de voice cloning)

**Cohérence multimodale** :
- Synchronisation lèvres ↔ audio (un deepfake mauvais coût a généralement des micro-décalages)
- Cohérence émotionnelle voix ↔ visage (rire dans la voix mais pas dans les yeux)

Modèles open-source de référence pour MVP :
- **DeepFake-O-Meter** ou **Resemble Detect** pour audio
- **FaceForensics++** ou **DFDC challenge models** pour vidéo

## 3. Score d'authenticité d'identité

```json
{
  "identity_verification_score": 0.0,  // 0=très suspect, 1=très authentique
  "checks_performed": {
    "id_document_validity": "passed",
    "selfie_to_id_match": 0.94,
    "voiceprint_match": 0.91,
    "knowledge_question": "passed",
    "continuous_face_consistency": 0.96,
    "continuous_voice_consistency": 0.89,
    "lip_sync_score": 0.88,
    "deepfake_detector_video": 0.05,    // 0=clean, 1=deepfake
    "deepfake_detector_audio": 0.12
  },
  "flags": [],
  "recommendation": "PASS|REVIEW|REJECT_RECOMMENDED"
}
```

## 4. Étapes d'implémentation

### Phase 1 — MVP minimal (3 sem)
- ID document capture + OCR (sans validation profonde)
- Selfie liveness simple (3 challenges)
- Match selfie ↔ ID via face_recognition (lib Python) ou Azure Face API
- Voiceprint avec Resemblyzer (open source)

### Phase 2 — Recheck entretien (2 sem)
- Microliveness à chaque démarrage
- Voice match à chaque démarrage

### Phase 3 — Surveillance continue (3 sem)
- Échantillonnage périodique vidéo/audio
- Score de cohérence agrégé

### Phase 4 — Detection deepfake avancée (4 sem)
- Intégration d'un détecteur deepfake vidéo (FaceForensics++ inference)
- Intégration d'un détecteur deepfake audio (Resemble Detect ou équivalent)
- Calibration sur données réelles + synthétiques

### Phase 5 — Optionnel Enterprise (4 sem)
- Intégration KYC tiers (Onfido / Veriff) pour les clients Enterprise qui l'exigent
- Vérification document approfondie (hologrammes, MRZ passport, etc.)

## 5. Garde-fous éthiques (CRITIQUES)

- **Consentement explicite** : capture biométrique = consentement RGPD spécifique. Le candidat doit cocher une case dédiée pour la biométrie, distincte du consentement général d'enregistrement.
- **Suppression rapide** : voiceprint et faceprint supprimés sous 90 jours par défaut, ou immédiatement à la demande du candidat.
- **Pas de partage tiers** : les empreintes biométriques ne quittent jamais l'infrastructure RecruteTech. Pas de cloud externe (sauf KYC tiers explicitement opt-in par l'entreprise).
- **Calibration anti-biais** : les modèles de reconnaissance faciale et vocale ont des biais documentés sur les peaux foncées et les femmes (NIST FRVT). Tester explicitement sur datasets diversifiés (ex. Diverse Faces dataset, Mozilla Common Voice multi-genre/age/accent). Audit dans `fairness-bias-audit`.
- **Recours candidat** : un candidat flagué peut demander un entretien humain dans les 7 jours. Garantie écrite.
- **Pas de transmission aux autorités** : les flags d'identité ne sont **jamais** transmis à des autorités automatiquement. Le candidat peut être un fraudeur OU être en situation administrative complexe (réfugié, identité changée légalement, transition de genre, etc.). Toujours review humaine.
- **Pas de "social score"** : aucune persistance des flags d'identité au-delà de l'entretien concerné. Un candidat flagué chez l'entreprise A ne porte pas ce flag chez l'entreprise B.

## 6. Cas particuliers à gérer

- **Candidat avec transition de genre** : son ID peut différer de son apparence actuelle. Le système doit accepter une explication libre du candidat sans la traiter comme un flag.
- **Candidat avec handicap visuel** : ne peut pas suivre un point sur l'écran. Alternative liveness audio uniquement (suivre des consignes vocales).
- **Connexion instable** (Afrique francophone, latence élevée) : seuils de match moins stricts pendant les 30 premières secondes pour éviter les faux positifs liés à la qualité réseau.
- **Réfugiés et IDs non-standards** : possibilité d'utiliser un titre de séjour ou attestation au lieu d'une CNI nationale.

## 7. Critères d'acceptation

- ✅ Sur 100 candidats authentiques diversifiés (incluant ≥ 30 % minorités) : taux de faux positif < 3 %.
- ✅ Sur 100 tentatives de fraude simulées (deepfakes générés, photos imprimées, voice clones) : taux de détection > 85 %.
- ✅ Sur 30 candidats avec connexion 3G/4G dégradée : pas de blocage abusif.
- ✅ Délai d'onboarding (couche 1) < 3 minutes.
- ✅ Délai du recheck (couche 2) < 30 secondes.
- ✅ Aucun écart statistiquement significatif des taux de faux positifs entre groupes ethniques (test du χ² p > 0.05).

## 8. Dépendances

- **Forte** sur `fairness-bias-audit` (calibration anti-biais des modèles biométriques)
- **Forte** sur `accessibility-accommodations` (alternatives liveness pour PMR)
- **Moyenne** sur `anti-cheating-integrity-layer` (les deux fonctionnent en tandem mais sont distincts)
- **Légère** sur `transparent-scoring-explainability` (le rapport mentionne si une vérif a échoué, sans détail biométrique)

## 9. Pourquoi P1 et pas P0

Coût d'intégration élevé (modèles biométriques, gestion KYC, conformité spécifique RGPD biométrie article 9), et le besoin n'est pas encore catastrophique sur le marché francophone africain (moins exposé aux deepfakes nord-coréens que l'US tech). Mais à intégrer absolument avant fin 2026 pour rester crédible enterprise.

C'est le **bouclier** qui permet à RecruteTech de prétendre à des contrats fintech, défense, secteur public — où la vérification d'identité forte est non-négociable.
