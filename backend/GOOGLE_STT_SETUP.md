# 🎤 Configuration Google Cloud Speech-to-Text

## Pourquoi Google Cloud STT ?

Google Cloud Speech-to-Text est maintenant le **provider principal** pour la transcription audio, avec OpenAI Whisper en **fallback** :

| Avantage | Description |
|----------|-------------|
| ✅ **Gratuit au début** | 60 minutes GRATUITES par mois |
| ✅ **Multilingue** | Support excellent du français, anglais, wolof* |
| ✅ **Temps réel** | Latence très faible |
| ✅ **Précision** | Très précis avec ponctuation automatique |
| ✅ **Fallback intelligent** | Bascule sur OpenAI si problème |

## 📋 Configuration en 5 étapes

### Étape 1 : Créer un compte Google Cloud

1. Allez sur https://console.cloud.google.com/
2. Créez un compte (vous aurez **$300 de crédit gratuit** pour 90 jours)
3. Créez un nouveau projet (ex: "recrutetech-ai")

### Étape 2 : Activer l'API Speech-to-Text

1. Dans le menu, allez dans **APIs & Services** > **Library**
2. Recherchez "Cloud Speech-to-Text API"
3. Cliquez sur **Enable** (Activer)

### Étape 3 : Créer les credentials

1. Allez dans **APIs & Services** > **Credentials**
2. Cliquez sur **Create Credentials** > **Service Account**
3. Nommez-le "recrutetech-stt" et cliquez sur **Create**
4. Rôle : Sélectionnez **Cloud Speech Administrator** (ou Speech Client)
5. Cliquez sur **Done**

### Étape 4 : Télécharger le fichier JSON

1. Dans la liste des Service Accounts, cliquez sur celui que vous venez de créer
2. Allez dans l'onglet **Keys**
3. Cliquez sur **Add Key** > **Create new key**
4. Choisissez **JSON** et cliquez sur **Create**
5. Le fichier JSON est téléchargé automatiquement

### Étape 5 : Configurer l'application

1. **Déplacez le fichier JSON** dans votre projet :
   ```bash
   mv ~/Downloads/recrutetech-*.json /home/secke/Desktop/seckeZ01/AI/LLM/hugging-face/recrutetech/backend/google-credentials.json
   ```

2. **Mettez à jour `.env`** :
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/home/secke/Desktop/seckeZ01/AI/LLM/hugging-face/recrutetech/backend/google-credentials.json
   GOOGLE_PROJECT_ID=recrutetech-ai  # Votre ID de projet
   ```

3. **Installez la bibliothèque Google Cloud** :
   ```bash
   pip install google-cloud-speech
   ```

4. **Redémarrez le serveur** :
   ```bash
   uvicorn app.main:app --reload
   ```

## ✅ Vérification

Au démarrage, vous devriez voir :

```
🚀 RecruteTech AI Interviewer starting...
Environment: development
LLM Provider: aws       ✅
STT Provider: google    ✅ (fallback: openai)
TTS Provider: aws       ✅
```

## 🔄 Système de fallback automatique

Le système bascule automatiquement sur OpenAI Whisper si :
- Les credentials Google ne sont pas configurés
- Une erreur se produit avec Google STT
- Google STT retourne une transcription vide

```
┌─────────────────────────────────────┐
│     STRATÉGIE DE TRANSCRIPTION      │
└─────────────────────────────────────┘

1️⃣  Essai PRIMARY : Google Cloud STT
    ├─ ✅ Succès → Retourne transcription
    └─ ❌ Échec → Passe au fallback

2️⃣  Essai FALLBACK : OpenAI Whisper
    ├─ ✅ Succès → Retourne transcription
    └─ ❌ Échec → Retourne vide
```

## 💰 Coûts comparés (par minute d'audio)

| Provider | Coût/min | Gratuit |
|----------|----------|---------|
| **Google Cloud** | $0.006 | 60 min/mois |
| OpenAI Whisper | $0.006 | Non |
| AWS Transcribe | $0.024 | Limité |

**Pour 1000 minutes de test** :
- Google Cloud : **GRATUIT** (60 min/mois) + $5.64 pour le reste
- OpenAI : $6.00
- AWS : $24.00

👉 **Google Cloud est le plus économique !**

## 🧪 Test rapide (sans frontend)

Testez la transcription avec ce script Python :

```python
# test_google_stt.py
import asyncio
from app.services.speech_service import SpeechToTextService

async def test():
    stt = SpeechToTextService(
        provider="google",
        language="fr",
        google_credentials="./google-credentials.json",
        fallback_provider="openai"
    )

    # Testez avec un fichier audio
    with open("test_audio.webm", "rb") as f:
        audio_data = f.read()

    text = await stt.transcribe_audio(audio_data, audio_format="webm")
    print(f"Transcription: {text}")

asyncio.run(test())
```

## 🔧 Dépannage

### Erreur : "Failed to initialize Google STT"

➜ Vérifiez que le fichier JSON existe au chemin spécifié
➜ Vérifiez que l'API Speech-to-Text est activée
➜ Le système basculera automatiquement sur OpenAI

### Erreur : "google.auth.exceptions.DefaultCredentialsError"

➜ La variable `GOOGLE_APPLICATION_CREDENTIALS` n'est pas définie ou incorrecte
➜ Redémarrez le serveur après modification du `.env`

### Google STT retourne vide

➜ Le format audio n'est peut-être pas supporté (essayez webm ou mp3)
➜ L'audio est peut-être trop court (< 1 seconde)
➜ Le fallback OpenAI prendra le relais automatiquement

## 📊 Architecture finale

```
┌──────────────────────────────────────┐
│   STACK IA OPTIMALE (Multi-Cloud)   │
├──────────────────────────────────────┤
│                                      │
│  🧠 Intelligence (LLM)               │
│     AWS Bedrock Claude Sonnet        │
│                                      │
│  👂 Transcription (STT)               │
│     PRIMARY:  Google Cloud STT       │
│     FALLBACK: OpenAI Whisper         │
│                                      │
│  🗣️ Synthèse vocale (TTS)            │
│     AWS Polly (voix Léa)             │
│                                      │
└──────────────────────────────────────┘
```

## 🎯 Prochaines étapes

1. ✅ Configurez Google Cloud (gratuit avec crédit)
2. 🧪 Testez la transcription
3. 🚀 Lancez votre premier entretien IA
4. 📊 Surveillez l'utilisation dans la console Google Cloud

## 📚 Ressources

- [Google Cloud Console](https://console.cloud.google.com/)
- [Documentation Speech-to-Text](https://cloud.google.com/speech-to-text/docs)
- [Tarification](https://cloud.google.com/speech-to-text/pricing)
- [Langues supportées](https://cloud.google.com/speech-to-text/docs/languages)
