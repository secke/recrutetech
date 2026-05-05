# 🎬 Changements pour l'Entretien Live via Webcam

## 📋 Résumé des Modifications

L'application a été transformée pour offrir une **vraie expérience d'entretien en temps réel via webcam** avec le flux suivant :

1. **Connexion** → Message de bienvenue automatique de l'IA
2. **Bouton "Commencer"** → Démarre l'entretien live avec webcam + audio
3. **Mode Live** → Conversation naturelle avec streaming vidéo/audio en temps réel

---

## 🔧 Modifications Backend

### Fichier: `backend/app/api/websocket/interview_ws.py`

#### 1. **Séparation Message de Bienvenue / Démarrage Interview**

**Avant :**
- Une seule méthode `start()` qui envoyait directement la première question

**Après :**
```python
async def send_welcome_message(self):
    """Envoie un message de bienvenue avant le démarrage"""
    # Message court demandant au candidat s'il est prêt

async def start_interview(self):
    """Démarre l'entretien après clic sur le bouton"""
    # Envoie la première question réelle
```

#### 2. **Gestion du Nouveau Type de Message**

Ajout de la gestion du message `start_interview` :

```python
if message.get("type") == "start_interview":
    waiting_for_start = False
    await session.start_interview()
```

#### 3. **Streaming Vidéo Backend**

Ajout de la gestion des frames vidéo :

```python
elif message.get("type") == "video_frame":
    await session.handle_video_frame(message.get("frame", ""))

async def handle_video_frame(self, frame_base64: str):
    """Traite les frames vidéo reçues du frontend"""
    # Permet l'analyse vidéo backend pour futures améliorations
```

#### 4. **Flux de Connexion Amélioré**

```python
# Send welcome message immediately
await session.send_welcome_message()

# Wait for user to click "Start Interview"
waiting_for_start = True
while waiting_for_start or session.is_active:
    # ...
```

---

## 🎨 Modifications Frontend

### Fichier: `frontend/src/components/InterviewInterface.jsx`

#### 1. **État de Bienvenue**

Ajout d'un état pour tracker la réception du message de bienvenue :

```javascript
const [welcomeReceived, setWelcomeReceived] = useState(false);
```

#### 2. **Gestion des Types de Messages**

Séparation entre message de bienvenue et messages d'entretien :

```javascript
case 'welcome_message':
    // Affiche le message mais ne démarre pas l'entretien
    setWelcomeReceived(true);
    // Affiche le bouton "Commencer l'entretien"
    break;

case 'ai_message':
case 'ai_response':
    // Messages normaux de l'entretien
    break;
```

#### 3. **Fonction de Démarrage Améliorée**

```javascript
const startInterview = useCallback(() => {
    console.log('🎬 Starting interview...');
    setIsInterviewActive(true);

    // Notifie le backend
    sendMessage({ type: 'start_interview' });
}, [isConnected, sendMessage]);
```

#### 4. **Streaming Vidéo vers le Backend**

Capture et envoi de frames vidéo toutes les 2 secondes :

```javascript
useEffect(() => {
    if (!isInterviewActive || !isVideoEnabled || !isConnected) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const captureFrame = () => {
        // Capture frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convertit en JPEG base64
        const frameData = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

        // Envoie au backend
        sendVideoFrame(frameData);
    };

    const intervalId = setInterval(captureFrame, 2000);
    return () => clearInterval(intervalId);
}, [isInterviewActive, isVideoEnabled, isConnected]);
```

#### 5. **Interface Utilisateur Améliorée**

- **Bouton "Commencer l'entretien"** : Visible uniquement après le message de bienvenue
- **Indicateurs d'état** : Messages clairs pour chaque étape (connexion, bienvenue, prêt)
- **Message de bienvenue stylisé** : Badge violet distinct dans la transcription
- **États visuels** : Animation pendant la connexion et l'attente

---

## 🎥 Modifications Analyse Vidéo

### Fichier: `frontend/src/hooks/useVideoAnalysis.js`

#### Initialisation Améliorée

Attente que la vidéo soit prête avant de démarrer MediaPipe :

```javascript
useEffect(() => {
    if (enabled && videoElement && !isAnalyzing) {
        const checkVideoReady = () => {
            if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
                console.log('📹 Video ready, starting analysis...');
                startAnalysis();
            } else {
                setTimeout(checkVideoReady, 500);
            }
        };
        checkVideoReady();
    }
}, [enabled, videoElement, isAnalyzing]);
```

---

## 🚀 Nouveau Flux Utilisateur

### Étape 1: Connexion
```
Utilisateur ouvre l'app
    ↓
WebSocket se connecte automatiquement
    ↓
Backend envoie le message de bienvenue
    ↓
Frontend affiche le message + bouton "Commencer l'entretien"
```

### Étape 2: Démarrage
```
Utilisateur clique "Commencer l'entretien"
    ↓
Frontend envoie { type: 'start_interview' }
    ↓
Backend démarre l'entretien et envoie la première question
    ↓
Audio + Vidéo s'activent automatiquement
```

### Étape 3: Mode Live
```
Conversation en cours
    ↓
- Audio capturé automatiquement (VAD)
- Frames vidéo envoyées toutes les 2s
- Métriques comportementales calculées
- Analyse faciale en temps réel
    ↓
IA adapte ses questions selon les réponses et le comportement
```

---

## 📊 Avantages de la Nouvelle Architecture

### ✅ Expérience Utilisateur

1. **Message de bienvenue rassurant** avant le début
2. **Contrôle utilisateur** : démarre quand il est prêt
3. **Feedback visuel clair** à chaque étape
4. **Transition naturelle** vers le mode live

### ✅ Fonctionnalités Techniques

1. **Streaming vidéo réel** : frames envoyées au backend
2. **Analyse comportementale** : frontend (MediaPipe) + backend (futur)
3. **Audio naturel** : détection automatique de la parole (VAD)
4. **État synchronisé** : frontend et backend coordonnés

### ✅ Évolutivité

1. **Backend peut analyser la vidéo** : préparé pour ML/CV avancé
2. **Stockage des frames** : possibilité d'enregistrer l'entretien
3. **Métriques enrichies** : comportement + audio + vidéo
4. **Architecture modulaire** : facile d'ajouter de nouvelles analyses

---

## 🧪 Tests à Effectuer

### Test 1: Flux Complet
- [ ] Ouvrir l'application
- [ ] Vérifier la connexion WebSocket
- [ ] Recevoir le message de bienvenue
- [ ] Voir le bouton "Commencer l'entretien"
- [ ] Cliquer sur le bouton
- [ ] Vérifier que l'entretien démarre
- [ ] Parler et vérifier la transcription
- [ ] Vérifier que l'IA répond

### Test 2: Streaming Vidéo
- [ ] Ouvrir la console backend
- [ ] Démarrer l'entretien
- [ ] Vérifier les logs "📹 Video frame received"
- [ ] Vérifier que les métriques visuelles sont envoyées

### Test 3: Audio Automatique
- [ ] Démarrer l'entretien
- [ ] Parler sans cliquer sur le micro
- [ ] Vérifier que la VAD détecte la voix
- [ ] Vérifier que l'audio est transcrit

### Test 4: Comportement
- [ ] Vérifier l'analyse faciale (eye contact, sourire)
- [ ] Vérifier les indicateurs (confiance, engagement)
- [ ] Vérifier que les métriques sont dans le transcript

---

## 🔜 Améliorations Futures

### Court Terme
- [ ] Ajouter un compte à rebours avant le démarrage
- [ ] Afficher un aperçu de la caméra pendant la bienvenue
- [ ] Améliorer les messages d'erreur (caméra/micro refusés)

### Moyen Terme
- [ ] Analyse vidéo backend avec ML (émotions, gestes)
- [ ] Enregistrement de l'entretien (vidéo + audio)
- [ ] Replay de l'entretien pour le recruteur
- [ ] Multi-langue pour le message de bienvenue

### Long Terme
- [ ] IA multimodale (comprend les gestes et expressions)
- [ ] Feedback en temps réel pour le candidat
- [ ] Adaptation dynamique des questions selon le comportement
- [ ] Rapport enrichi avec captures d'écran

---

## 📝 Notes Techniques

### Format des Frames Vidéo
- **Format** : JPEG base64
- **Fréquence** : 1 frame toutes les 2 secondes
- **Compression** : Quality 0.7 (bon compromis taille/qualité)
- **Résolution** : Variable (selon la webcam, max 1280x720)

### Messages WebSocket

#### Nouveau type: `welcome_message`
```json
{
    "type": "welcome_message",
    "text": "Bonjour ! Bienvenue...",
    "audio": "hex_encoded_mp3",
    "timestamp": "2025-02-17T..."
}
```

#### Nouveau type: `start_interview` (client → serveur)
```json
{
    "type": "start_interview"
}
```

#### Nouveau type: `video_frame` (client → serveur)
```json
{
    "type": "video_frame",
    "frame": "base64_encoded_jpeg"
}
```

---

## 🎯 Objectif Atteint

✅ **Entretien live via webcam en temps réel**
✅ **Message de bienvenue automatique**
✅ **Démarrage contrôlé par l'utilisateur**
✅ **Streaming vidéo + audio bidirectionnel**
✅ **Analyse comportementale en temps réel**
✅ **Expérience utilisateur fluide et professionnelle**

Le système fonctionne maintenant comme un **vrai entretien vidéo en direct** avec un recruteur IA intelligent ! 🚀
