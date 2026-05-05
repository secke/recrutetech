# 🚀 Démarrage Rapide - Entretien Live

## ⚡ Commandes de Démarrage

### Terminal 1 - Backend
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

### Navigateur
```
http://localhost:5173
```

---

## 🎯 Flux Utilisateur Attendu

### 1️⃣ Connexion (3-5 secondes)
- WebSocket se connecte automatiquement
- Badge "Connecté" vert apparaît
- Message de bienvenue de l'IA arrive automatiquement
- Audio du message de bienvenue joué automatiquement

### 2️⃣ Message de Bienvenue
```
"Bonjour ! Bienvenue sur RecruteTech. Je suis votre interviewer IA.

Avant de commencer, assurez-vous que votre caméra et votre microphone
fonctionnent correctement.

Quand vous êtes prêt, cliquez sur le bouton 'Commencer l'entretien'
et nous pourrons débuter."
```

### 3️⃣ Démarrage (1 clic)
- Cliquer sur le bouton **"🎬 Commencer l'entretien"**
- Le micro s'active automatiquement
- L'analyse vidéo démarre
- L'IA pose la première vraie question

### 4️⃣ Mode Live
- **Parlez naturellement** → Détection automatique (VAD)
- **Regardez la caméra** → Analyse comportementale
- **L'IA répond** → Conversation fluide
- **Frames vidéo** → Envoyées au backend toutes les 2s

---

## 📊 Ce Que Vous Devez Voir

### Console Backend
```
📞 New interview session: test-xxxxx
🗣️ Generating speech...
✅ Welcome message sent
[Attente du clic utilisateur...]
🎬 Starting interview...
📥 Received audio data: XXXXX bytes
🎤 Processing complete utterance
🔄 Transcribing webm audio...
📝 Transcription: 'Bonjour je m'appelle...'
🤖 Processing with AI agent...
✅ Response sent successfully
📹 Visual metrics received (toutes les 2s)
```

### Console Frontend (DevTools)
```
🔌 Connecting to WebSocket
✅ WebSocket Connected
👋 Welcome message received
[Utilisateur clique "Commencer"]
🎬 Starting interview...
🎙️ Voice Activity Detection started
📹 Video ready, starting analysis...
🎤 Speech detected - user started talking
✅ Speech ended after XXXXms - processing audio
📊 Metrics updated: {eyeContact: 0.8, smile: 0.4, ...}
```

### Interface Utilisateur
- **Connexion** : Badge vert + message de bienvenue
- **Attente** : Gros bouton vert "Commencer l'entretien"
- **En cours** :
  - Indicateur de parole (vert quand vous parlez)
  - État IA (bleu quand l'IA répond)
  - Transcription en direct à droite
  - Métriques comportementales mises à jour

---

## ✅ Checklist Rapide

Avant de tester, vérifiez :

- [ ] Backend démarré sur port 8000
- [ ] Frontend démarré sur port 5173
- [ ] `.env` configuré avec clés API
- [ ] Caméra et micro autorisés dans le navigateur

Pendant le test :

- [ ] Message de bienvenue reçu et audible
- [ ] Bouton "Commencer l'entretien" visible
- [ ] Micro s'active après le clic
- [ ] VAD détecte votre voix automatiquement
- [ ] Transcription correcte et rapide
- [ ] IA répond de manière pertinente
- [ ] Analyse vidéo active (badge bleu)
- [ ] Métriques mises à jour

---

## 🐛 Problèmes Courants

### "Pas de message de bienvenue"
**Solution :** Vérifier que le backend est bien démarré et les clés API configurées

### "Le micro ne s'active pas"
**Solution :** Autoriser l'accès au micro dans le navigateur

### "VAD ne détecte pas ma voix"
**Solution :** Parler plus fort, le seuil est à 0.15 (assez élevé pour éviter le bruit)

### "Analyse vidéo ne démarre pas"
**Solution :** Attendre 2-3 secondes que la vidéo se charge complètement

### "Erreur de transcription"
**Solution :** Vérifier `OPENAI_API_KEY` ou `GROQ_API_KEY` dans `.env`

---

## 📖 Documentation Complète

- **CHANGEMENTS_ENTRETIEN_LIVE.md** : Tous les changements techniques détaillés
- **GUIDE_TEST.md** : Tests complets à effectuer (30 points de vérification)

---

## 🎉 C'est Tout !

Le système est maintenant un **vrai entretien vidéo en direct** avec :
✅ Message de bienvenue automatique
✅ Démarrage contrôlé par l'utilisateur
✅ Streaming vidéo + audio en temps réel
✅ Analyse comportementale live
✅ Conversation naturelle avec l'IA

**Bon entretien ! 🚀**
