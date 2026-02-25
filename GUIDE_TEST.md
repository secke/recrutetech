# 🧪 Guide de Test - Entretien Live

## 🚀 Démarrage Rapide

### 1. Démarrer le Backend

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Démarrer le Frontend

```bash
cd frontend
npm run dev
```

### 3. Ouvrir l'Application

Navigateur : `http://localhost:5173`

---

## ✅ Checklist de Test Complète

### Phase 1: Connexion Initiale

| Étape | Action | Résultat Attendu | ✓ |
|-------|--------|------------------|---|
| 1 | Ouvrir l'app dans le navigateur | Page se charge correctement | ☐ |
| 2 | Autoriser caméra et micro | Flux vidéo visible (miroir) | ☐ |
| 3 | Observer la connexion | Badge "Connecté" vert apparaît | ☐ |
| 4 | Attendre le message | Message de bienvenue reçu dans ~3s | ☐ |
| 5 | Écouter l'audio | Voix de l'IA audible et claire | ☐ |
| 6 | Vérifier la transcription | Message affiché avec badge violet | ☐ |
| 7 | Observer le bouton | "🎬 Commencer l'entretien" visible | ☐ |

**Console Backend :**
```
📞 New interview session: test-xxxxx
🗣️ Generating speech...
✅ Welcome message sent
```

---

### Phase 2: Démarrage de l'Entretien

| Étape | Action | Résultat Attendu | ✓ |
|-------|--------|------------------|---|
| 8 | Cliquer "Commencer l'entretien" | Bouton change d'état | ☐ |
| 9 | Observer le micro | Micro s'active automatiquement | ☐ |
| 10 | Voir l'indicateur | "Parlez naturellement..." affiché | ☐ |
| 11 | Attendre la première question | IA pose une question d'ouverture | ☐ |
| 12 | Vérifier l'analyse vidéo | Badge "Analyse en cours" visible | ☐ |

**Console Backend :**
```
🎬 Starting interview...
🤖 Processing with AI agent...
✅ Response sent successfully
```

**Console Frontend :**
```
🎬 Starting interview...
🎙️ Voice Activity Detection started
📹 Video ready, starting analysis...
```

---

### Phase 3: Conversation Live

| Étape | Action | Résultat Attendu | ✓ |
|-------|--------|------------------|---|
| 13 | Commencer à parler | Indicateur "Vous parlez..." apparaît | ☐ |
| 14 | Observer les barres audio | Barres vertes en mouvement | ☐ |
| 15 | Finir de parler | Détection automatique de silence | ☐ |
| 16 | Attendre traitement | État "Traitement..." affiché | ☐ |
| 17 | Voir la transcription | Votre texte apparaît à droite (vert) | ☐ |
| 18 | Attendre la réponse IA | État "L'IA répond..." affiché | ☐ |
| 19 | Écouter la réponse | Audio de l'IA joué automatiquement | ☐ |
| 20 | Voir la transcription IA | Réponse IA apparaît à gauche (bleu) | ☐ |
| 21 | Répéter 2-3 fois | Conversation fluide sans blocage | ☐ |

**Console Backend (pour chaque échange) :**
```
📥 Received audio data: XXXXX bytes
🎤 Processing complete utterance (webm, XXXXX bytes)
🔄 Transcribing webm audio...
📝 Transcription: 'Je m'appelle...'
🤖 Processing with AI agent...
🗣️ Generating speech...
✅ Response sent successfully
```

---

### Phase 4: Analyse Vidéo

| Étape | Action | Résultat Attendu | ✓ |
|-------|--------|------------------|---|
| 22 | Regarder la caméra | Eye contact ratio > 0.7 | ☐ |
| 23 | Sourire | Smile ratio > 0.3 | ☐ |
| 24 | Observer les métriques | Affichage mis à jour toutes les 2s | ☐ |
| 25 | Bouger la tête légèrement | Head stability calculé | ☐ |
| 26 | Vérifier les indicateurs | Confiance, engagement affichés | ☐ |

**Console Frontend :**
```
📹 Video analysis started
📊 Metrics updated: {eyeContact: 0.8, smile: 0.4, ...}
```

**Console Backend (toutes les 2s) :**
```
📹 Visual metrics received: eye_contact=0.8
```

---

### Phase 5: Fin de l'Entretien

| Étape | Action | Résultat Attendu | ✓ |
|-------|--------|------------------|---|
| 27 | Cliquer "Terminer" | Message de confirmation | ☐ |
| 28 | Voir le rapport final | Rapport détaillé affiché | ☐ |
| 29 | Vérifier les scores | Évaluation technique + comportementale | ☐ |
| 30 | Télécharger le transcript | Fichier disponible (optionnel) | ☐ |

---

## 🐛 Tests d'Erreurs

### Test A: Micro Refusé

| Étape | Action | Résultat Attendu | ✓ |
|-------|--------|------------------|---|
| A1 | Refuser l'accès au micro | Message d'erreur clair | ☐ |
| A2 | Vérifier le fallback | Option de saisie texte proposée | ☐ |

### Test B: Caméra Refusée

| Étape | Action | Résultat Attendu | ✓ |
|-------|--------|------------------|---|
| B1 | Refuser l'accès caméra | Icône "Caméra désactivée" | ☐ |
| B2 | Continuer l'entretien | Entretien audio seul fonctionne | ☐ |
| B3 | Vérifier analyse | Analyse vidéo désactivée | ☐ |

### Test C: Connexion Perdue

| Étape | Action | Résultat Attendu | ✓ |
|-------|--------|------------------|---|
| C1 | Couper le backend | Badge "Déconnecté" rouge | ☐ |
| C2 | Redémarrer backend | Reconnexion automatique | ☐ |
| C3 | Vérifier l'état | Retour au dernier état connu | ☐ |

### Test D: Audio Trop Court

| Étape | Action | Résultat Attendu | ✓ |
|-------|--------|------------------|---|
| D1 | Dire un mot très court | Ignoré (< 1s minimum) | ☐ |
| D2 | Parler normalement après | Détection correcte | ☐ |

### Test E: Silence Prolongé

| Étape | Action | Résultat Attendu | ✓ |
|-------|--------|------------------|---|
| E1 | Ne rien dire pendant 30s | IA relance la conversation | ☐ |
| E2 | Continuer après | Reprise normale | ☐ |

---

## 📊 Métriques à Observer

### Backend (Terminal)

**✅ Messages de succès attendus :**
```
✅ WebSocket Connected
✅ Welcome message sent
✅ Interview started
✅ Response sent successfully
✅ Visual metrics received
```

**❌ Erreurs à éviter :**
```
❌ Error transcribing audio
❌ Error processing utterance
❌ AWS Bedrock error
❌ Timeout error
```

### Frontend (Console Navigateur)

**✅ Messages de succès attendus :**
```
🔌 Connecting to WebSocket
✅ WebSocket Connected
👋 Welcome message received
🎬 Starting interview...
🎙️ Voice Activity Detection started
📹 Video ready, starting analysis...
🎤 Speech detected
✅ Speech ended - processing
📊 Metrics updated
```

**❌ Erreurs à éviter :**
```
❌ Error accessing camera
❌ WebSocket Error
❌ Error starting audio capture
```

---

## 🎯 Critères de Réussite

### Fonctionnalité de Base

- [ ] **Connexion** : Établie en < 3 secondes
- [ ] **Message bienvenue** : Reçu et audible
- [ ] **Démarrage** : Bouton fonctionne
- [ ] **Audio** : Détection automatique (VAD)
- [ ] **Transcription** : Précise et rapide (< 5s)
- [ ] **Réponse IA** : Pertinente et naturelle
- [ ] **Vidéo** : Streaming toutes les 2s

### Performance

- [ ] **Latence audio** : < 5 secondes (parole → réponse)
- [ ] **Latence vidéo** : < 3 secondes (capture → backend)
- [ ] **Utilisation CPU** : < 80% pendant l'entretien
- [ ] **Mémoire** : Pas de fuite après 10 min d'entretien

### Qualité

- [ ] **Audio** : Clair, sans coupures
- [ ] **Transcription** : > 90% de précision
- [ ] **Analyse vidéo** : Métriques cohérentes
- [ ] **Expérience** : Fluide, sans blocage

---

## 🔧 Debug Rapide

### Problème : "Pas de son de l'IA"

**Solutions :**
```bash
# Vérifier le backend
curl http://localhost:8000/health

# Vérifier le TTS provider dans .env
DEFAULT_TTS_PROVIDER=openai  # ou aws
OPENAI_API_KEY=sk-...
```

### Problème : "VAD ne détecte pas la voix"

**Solutions :**
1. Vérifier le niveau du micro dans les paramètres système
2. Parler plus fort (seuil: 0.15)
3. Réduire le bruit ambiant
4. Vérifier `speechThreshold` dans `NaturalAudioCapture.jsx`

### Problème : "Analyse vidéo ne démarre pas"

**Solutions :**
```bash
# Vérifier MediaPipe
npm list @mediapipe/face_mesh

# Vérifier la console
# Devrait voir: "📹 Video ready, starting analysis..."

# Si pas de log, vérifier readyState de la vidéo
```

### Problème : "Backend ne reçoit pas les frames"

**Solutions :**
1. Ouvrir la console backend → chercher "📹 Video frame"
2. Vérifier que `isInterviewActive = true`
3. Vérifier le WebSocket (should be OPEN)
4. Check `sendVideoFrame` est appelé toutes les 2s

---

## 📞 Support

**En cas de problème persistant :**

1. **Logs Backend** : Copier les dernières 50 lignes du terminal backend
2. **Console Frontend** : Ouvrir DevTools → Console → Copier les erreurs
3. **Network** : DevTools → Network → WS → Vérifier les messages WebSocket
4. **État** : Noter l'étape exacte où ça bloque

---

## ✨ Checklist Finale

Avant de considérer le système prêt :

- [ ] Tous les tests Phase 1-5 passent
- [ ] Au moins 3 tests d'erreurs passent
- [ ] Performance acceptable (< 5s latence)
- [ ] Pas d'erreur dans les consoles
- [ ] Expérience utilisateur fluide
- [ ] Documentation à jour

**🎉 Si tout est ✓ → Le système est prêt pour la production !**
