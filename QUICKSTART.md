# 🚀 Guide de Démarrage Rapide - RecruteTech AI Interviewer

## 🎯 Vue d'Ensemble

Cette plateforme utilise un **Agent IA conversationnel** pour conduire des entretiens techniques **en temps réel** par vidéoconférence. L'IA écoute, comprend, pose des questions de suivi et évalue automatiquement.

## 📋 Prérequis

### Obligatoire
- Python 3.11+
- **Clé API OpenAI** (pour Whisper STT + GPT-4 + TTS)
- PostgreSQL 16 (optionnel pour MVP)
- Redis (optionnel pour MVP)

### Recommandé
- Clé API Anthropic (pour utiliser Claude au lieu de GPT-4)
- Clé API ElevenLabs (pour voix plus naturelles)
- Node.js 18+ (pour le frontend)

## ⚡ Installation Rapide

### 1. Cloner et Installer

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

### 2. Configuration

```bash
cp .env.example .env
nano .env  # Éditer avec vos clés API
```

**IMPORTANT**: Vous devez au minimum configurer:
```env
OPENAI_API_KEY=sk-votre-cle-openai-ici
```

### 3. Lancer le Serveur

```bash
# Mode développement
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Ou simplement:
python app/main.py
```

Le serveur sera accessible à: **http://localhost:8000**

Documentation API: **http://localhost:8000/docs**

## 🧪 Tester l'Agent IA

### Test 1: Health Check

```bash
curl http://localhost:8000/health
```

Réponse:
```json
{
  "status": "healthy",
  "active_interviews": 0
}
```

### Test 2: Créer un Interview

```bash
curl -X POST "http://localhost:8000/api/v1/interviews/create" \
  -H "Content-Type: application/json" \
  -d '{
    "candidate_email": "candidate@example.com",
    "candidate_name": "Mbabba Diop",
    "job_role": "Backend Developer",
    "interview_type": "technical",
    "required_skills": ["Python", "FastAPI", "PostgreSQL"],
    "language": "fr"
  }'
```

Réponse:
```json
{
  "interview_token": "a1b2c3d4-...",
  "websocket_url": "ws://localhost:8000/ws/interview/a1b2c3d4-...",
  "candidate_url": "http://localhost:3000/interview/a1b2c3d4-...",
  "expires_in_hours": 48
}
```

### Test 3: Connexion WebSocket (avec client web)

Créer un fichier HTML de test:

```html
<!DOCTYPE html>
<html>
<head>
    <title>AI Interview Test</title>
</head>
<body>
    <h1>🤖 AI Interview Test</h1>
    <button id="start">Start Interview</button>
    <button id="stop">Stop</button>
    
    <div id="messages"></div>
    <textarea id="input" placeholder="Type your response..."></textarea>
    <button id="send">Send Text</button>
    
    <audio id="audioPlayer" controls></audio>

    <script>
        let ws;
        const token = "a1b2c3d4-..."; // Remplacer avec votre token
        
        document.getElementById('start').onclick = () => {
            ws = new WebSocket(`ws://localhost:8000/ws/interview/${token}`);
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('Received:', data);
                
                const messagesDiv = document.getElementById('messages');
                messagesDiv.innerHTML += `<p><strong>${data.type}:</strong> ${data.text || JSON.stringify(data)}</p>`;
                
                // Play audio if present
                if (data.audio) {
                    const audioBlob = hexToBlob(data.audio);
                    const audioUrl = URL.createObjectURL(audioBlob);
                    document.getElementById('audioPlayer').src = audioUrl;
                    document.getElementById('audioPlayer').play();
                }
            };
            
            ws.onopen = () => {
                console.log('Connected!');
                document.getElementById('messages').innerHTML = '<p>Connected to AI interviewer!</p>';
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        };
        
        document.getElementById('send').onclick = () => {
            const text = document.getElementById('input').value;
            ws.send(JSON.stringify({
                type: "text_message",
                content: text
            }));
            document.getElementById('input').value = '';
        };
        
        document.getElementById('stop').onclick = () => {
            ws.send(JSON.stringify({type: "end_interview"}));
        };
        
        function hexToBlob(hex) {
            const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            return new Blob([bytes], {type: 'audio/mpeg'});
        }
    </script>
</body>
</html>
```

Ouvrir ce fichier dans le navigateur et cliquer "Start Interview"!

## 🎙️ Flow d'un Interview Typique

### 1. **Introduction** (AI démarre)
```
AI: "Bonjour ! Je suis votre interviewer IA. Pouvez-vous vous présenter ?"
```

### 2. **Candidat répond** (audio ou texte)
```
Candidat: "Bonjour, je m'appelle Mbabba. Je suis développeur backend avec 3 ans d'expérience..."
```

### 3. **AI analyse et pose question de suivi**
```
AI: "Intéressant ! Vous avez mentionné votre expérience backend. 
     Pouvez-vous me parler d'un projet complexe que vous avez réalisé avec FastAPI ?"
```

### 4. **Conversation continue** (20-30 min)
- AI pose questions techniques
- AI s'adapte selon les réponses
- AI approfondit les points intéressants
- AI évalue en temps réel

### 5. **Conclusion**
```
AI: "Merci pour cet entretien ! Vous avez montré de bonnes compétences.
     Vous recevrez un rapport détaillé dans les prochains jours."
```

## 🏗️ Architecture du System

```
┌─────────────┐
│  CANDIDAT   │ 🎤 Parle au microphone
│ (Navigateur)│ 📹 Vidéo activée  
└──────┬──────┘
       │ WebSocket
       │
┌──────▼──────────────────────────────┐
│   BACKEND (FastAPI + WebSocket)     │
│                                      │
│  1. Audio → Whisper API → Text     │
│  2. Text → GPT-4/Claude → Response  │
│  3. Response → OpenAI TTS → Audio   │
│  4. Audio → Envoyé au candidat      │
└─────────────────────────────────────┘
```

## 📊 Composants Clés

### 1. **InterviewAgent** (`app/agents/interview_agent.py`)
- Cerveau de l'IA
- Conduit la conversation
- Gère la mémoire conversationnelle
- Évalue les réponses
- Génère rapport final

### 2. **SpeechToTextService** (`app/services/speech_service.py`)
- Convertit audio → texte (Whisper)
- Support streaming temps réel
- Multi-langue (fr, en, wo)

### 3. **TextToSpeechService** (`app/services/speech_service.py`)
- Convertit texte → audio naturel
- OpenAI TTS ou ElevenLabs
- Voix personnalisables

### 4. **InterviewWebSocketManager** (`app/api/websocket/interview_ws.py`)
- Gère connexions WebSocket
- Pipeline complet: Audio → STT → Agent → TTS → Audio
- Gestion sessions multiples

## 🔧 Configuration Avancée

### Changer le LLM Provider

Dans `.env`:
```env
DEFAULT_LLM_PROVIDER=anthropic  # Utiliser Claude au lieu de GPT-4
ANTHROPIC_API_KEY=sk-ant-...
```

### Changer la Voix

```env
DEFAULT_VOICE=alloy  # Options: alloy, echo, fable, onyx, nova, shimmer
```

### Utiliser ElevenLabs (voix plus naturelles)

```env
DEFAULT_TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your-key-here
```

## 🎯 Prochaines Étapes

### Pour Développement

1. **Frontend React** avec WebRTC
2. **Code Review Agent** pour analyser le code en live
3. **Vision Analysis** pour analyser posture/confiance
4. **Database persistance** pour sauvegarder interviews

### Pour Production

1. **Déploiement** sur AWS/GCP
2. **Scalabilité** avec Kubernetes
3. **Monitoring** avec Sentry
4. **CDN** pour audio streaming
5. **Rate limiting** et quotas

## 🐛 Troubleshooting

### Erreur: "OpenAI API key not found"
```bash
# Vérifier que .env contient:
OPENAI_API_KEY=sk-...

# Recharger env:
source venv/bin/activate
```

### WebSocket ne connecte pas
```bash
# Vérifier que le serveur tourne:
curl http://localhost:8000/health

# Vérifier le port:
lsof -i :8000
```

### Audio ne fonctionne pas
- Vérifier permissions microphone dans navigateur
- Tester avec fichier HTML fourni
- Vérifier format audio (WebM recommandé)

## 📚 Ressources

- **OpenAI Whisper**: https://platform.openai.com/docs/guides/speech-to-text
- **OpenAI TTS**: https://platform.openai.com/docs/guides/text-to-speech
- **LangChain**: https://python.langchain.com/docs/get_started/introduction
- **FastAPI WebSockets**: https://fastapi.tiangolo.com/advanced/websockets/

## 💡 Tips

1. **Coût API**: 
   - Whisper: ~$0.006/minute
   - GPT-4: ~$0.03/1K tokens
   - TTS: ~$0.015/1K caractères
   - **Total par interview (~30 min)**: ~$2-3

2. **Latence**:
   - Whisper API: ~1-2s
   - GPT-4: ~2-4s
   - TTS: ~1s
   - **Total latence**: ~4-7s (acceptable)

3. **Optimisation**:
   - Utiliser streaming TTS pour réduire latence
   - Cacher questions fréquentes
   - Pré-générer audio pour questions standard

---

**Bon développement! 🚀**

L'agent IA est prêt à interviewer vos candidats! 🤖
