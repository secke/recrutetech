# 🚀 Guide de Démarrage Rapide - RecruteTech

## Problème résolu

Les erreurs suivantes ont été corrigées :
- ✅ Erreurs WebSocket de déconnexion (`Cannot call send/receive`)
- ✅ Timeouts de transcription audio répétés
- ✅ Avertissement de dépréciation LangChain
- ✅ **AWS Transcribe Streaming incompatibilité** (voir solution ci-dessous)

## ⚠️ Action requise : Configuration STT

L'application utilise une architecture multi-cloud optimale :

| Service | Provider | Status |
|---------|----------|--------|
| LLM (Intelligence) | AWS Bedrock (Claude) | ✅ Configuré |
| TTS (Text-to-Speech) | AWS Polly | ✅ Configuré |
| STT (Speech-to-Text) | **Google Cloud** | ⚠️ **Credentials requises** |
| STT Fallback | OpenAI Whisper | ✅ Configuré |

### Pourquoi Google Cloud pour STT ?

Google Cloud Speech-to-Text est maintenant le provider principal :
- ✅ **60 minutes GRATUITES par mois**
- ✅ **$300 de crédit gratuit** pour 90 jours
- ✅ Plus rapide pour le temps réel
- ✅ Très précis (multilingue)
- ✅ **Fallback automatique sur OpenAI** si problème
- ✅ Coût identique à OpenAI (~$0.006/min) mais avec gratuité

## 📝 Configuration RAPIDE (Option 1 : Google Cloud - RECOMMANDÉ)

### Étape 1 : Configurer Google Cloud STT (GRATUIT)

Suivez le guide détaillé : [GOOGLE_STT_SETUP.md](GOOGLE_STT_SETUP.md)

**Résumé rapide** :
1. Créez un compte Google Cloud (300$ de crédit gratuit)
2. Activez l'API Speech-to-Text
3. Créez un Service Account et téléchargez le JSON
4. Mettez le fichier JSON dans le dossier backend
5. Installez : `pip install google-cloud-speech`

### Étape 2 : Configurer le fichier `.env`

```bash
GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/google-credentials.json
GOOGLE_PROJECT_ID=votre-project-id
```

Le fichier `.env` est pré-configuré avec :
- `DEFAULT_LLM_PROVIDER=aws` (AWS Bedrock)
- `DEFAULT_STT_PROVIDER=google` (Google Cloud STT)
- `STT_FALLBACK_PROVIDER=openai` (OpenAI Whisper en backup)
- `DEFAULT_TTS_PROVIDER=aws` (AWS Polly)

### Étape 3 : Démarrer l'application

## 📝 Configuration ALTERNATIVE (Option 2 : OpenAI uniquement)

Si vous préférez utiliser uniquement OpenAI (sans Google Cloud) :

1. Modifiez `.env` :
   ```bash
   DEFAULT_STT_PROVIDER=openai
   OPENAI_API_KEY=sk-...votre-clé...
   ```

2. Démarrez l'application

```bash
cd /home/secke/Desktop/seckeZ01/AI/LLM/hugging-face/recrutetech/backend
uvicorn app.main:app --reload
```

## ✅ Vérification

Vous devriez voir au démarrage :

```
🚀 RecruteTech AI Interviewer starting...
Environment: development
LLM Provider: aws       ✅
TTS Provider: aws       ✅
```

**Sans** voir le message d'avertissement :
```
⚠️  AWS STT not configured - please set DEFAULT_STT_PROVIDER=openai...
```

## 🧪 Test de l'application

1. Ouvrez le frontend (ou utilisez un client WebSocket)
2. Connectez-vous à `ws://localhost:8000/ws/interview/test-session-id`
3. L'IA devrait :
   - ✅ Vous accueillir avec un message vocal (TTS via AWS Polly)
   - ✅ Transcrire votre audio (STT via OpenAI Whisper)
   - ✅ Répondre intelligemment (LLM via AWS Bedrock Claude)

## 📊 Architecture finale

```
┌──────────────────────────────────────┐
│   RecruteTech Stack (Multi-Cloud)   │
├──────────────────────────────────────┤
│ Frontend:  React/Vue (WebSocket)     │
│ Backend:   FastAPI (Python)          │
│                                      │
│ AI Services:                         │
│  • LLM:  AWS Bedrock (Claude)        │
│  • STT:  Google Cloud (primary)      │
│          OpenAI Whisper (fallback)   │
│  • TTS:  AWS Polly                   │
└──────────────────────────────────────┘
```

## 🔧 Dépannage

### Erreur : "Failed to initialize Google STT"
➜ Vérifiez que `GOOGLE_APPLICATION_CREDENTIALS` pointe vers le bon fichier JSON
➜ Le système basculera automatiquement sur OpenAI (fallback)

### Erreur : "Invalid OpenAI API key" (fallback)
➜ Vérifiez que la clé commence par `sk-` et est valide
➜ Ou configurez uniquement Google Cloud sans fallback

### Message : "Google STT returned empty, trying openai fallback"
➜ Normal - le système bascule automatiquement sur le fallback
➜ Vérifiez le format de l'audio (webm, mp3 recommandés)

### WebSocket se déconnecte
➜ Vérifiez les logs pour voir si c'est le frontend ou le backend

## 📚 Documentation

- [STT_CONFIGURATION.md](STT_CONFIGURATION.md) - Configuration détaillée STT
- [Architecture du projet](../ARCHITECTURE.md) - Vue d'ensemble
- [Business Plan](../business-plan.md) - Contexte business

## 💰 Coûts estimés

Pour un MVP/prototype avec ~100 interviews de test (50h d'audio) :

### Avec Google Cloud (RECOMMANDÉ)
| Service | Coût/mois |
|---------|-----------|
| AWS Bedrock (Claude) | ~$10-20 |
| **Google Cloud STT** | **GRATUIT** (60 min gratuits/mois) |
| AWS Polly (TTS) | ~$5 |
| **Total** | **~$15-25/mois** |

### Avec OpenAI uniquement
| Service | Coût/mois |
|---------|-----------|
| AWS Bedrock (Claude) | ~$10-20 |
| OpenAI Whisper (STT) | ~$18 (3000 min × $0.006) |
| AWS Polly (TTS) | ~$5 |
| **Total** | **~$33-43/mois** |

💡 **Google Cloud économise ~$18/mois** + $300 de crédit gratuit initial ! 🎉

## ✨ Prochaines étapes

Une fois que tout fonctionne :
1. ✅ Tester différents scénarios d'interview
2. ✅ Affiner les prompts de l'agent IA
3. ✅ Optimiser le frontend pour une meilleure UX
4. 🚀 Déployer sur AWS/Vercel pour la production
