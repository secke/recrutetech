# 🚀 Guide de Démarrage Rapide - RecruteTech

## Problème résolu

Les erreurs suivantes ont été corrigées :
- ✅ Erreurs WebSocket de déconnexion (`Cannot call send/receive`)
- ✅ Timeouts de transcription audio répétés
- ✅ Avertissement de dépréciation LangChain
- ✅ **AWS Transcribe Streaming incompatibilité** (voir solution ci-dessous)

## ⚠️ Action requise : Configuration STT

L'application utilise une architecture hybride optimale :

| Service | Provider | Status |
|---------|----------|--------|
| LLM (Intelligence) | AWS Bedrock (Claude) | ✅ Configuré |
| TTS (Text-to-Speech) | AWS Polly | ✅ Configuré |
| STT (Speech-to-Text) | OpenAI Whisper | ⚠️ **Clé API requise** |

### Pourquoi OpenAI pour STT ?

AWS Transcribe Streaming a des problèmes de compatibilité avec asyncio/FastAPI WebSocket. OpenAI Whisper est :
- ✅ Plus rapide pour le temps réel
- ✅ Meilleure intégration avec asyncio
- ✅ Très précis (multilingue)
- ✅ Coût très bas (~$0.006/min)

## 📝 Configuration en 3 étapes

### Étape 1 : Obtenir une clé API OpenAI

1. Allez sur https://platform.openai.com/api-keys
2. Créez un compte (ou connectez-vous)
3. Cliquez sur "Create new secret key"
4. Copiez la clé (commence par `sk-...`)

### Étape 2 : Configurer le fichier `.env`

Éditez `/home/secke/Desktop/seckeZ01/AI/LLM/hugging-face/recrutetech/backend/.env` :

```bash
# Ajoutez votre clé OpenAI ici
OPENAI_API_KEY=sk-...votre-clé-ici...
```

Le fichier `.env` est déjà pré-configuré avec :
- `DEFAULT_LLM_PROVIDER=aws` (AWS Bedrock)
- `DEFAULT_STT_PROVIDER=openai` (OpenAI Whisper)
- `DEFAULT_TTS_PROVIDER=aws` (AWS Polly)

### Étape 3 : Démarrer l'application

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
┌─────────────────────────────────────┐
│         RecruteTech Stack           │
├─────────────────────────────────────┤
│ Frontend:  React/Vue (WebSocket)    │
│ Backend:   FastAPI (Python)         │
│                                     │
│ AI Services:                        │
│  • LLM:  AWS Bedrock (Claude)       │
│  • STT:  OpenAI Whisper             │
│  • TTS:  AWS Polly                  │
└─────────────────────────────────────┘
```

## 🔧 Dépannage

### Erreur : "AWS STT not configured"
➜ Ajoutez `OPENAI_API_KEY` dans `.env`

### Erreur : "Invalid API key"
➜ Vérifiez que la clé commence par `sk-` et est valide

### Erreur : "AWS Transcribe timeout"
➜ Normal si STT provider est toujours `aws` - changez en `openai`

### WebSocket se déconnecte
➜ Vérifiez les logs pour voir si c'est le frontend ou le backend

## 📚 Documentation

- [STT_CONFIGURATION.md](STT_CONFIGURATION.md) - Configuration détaillée STT
- [Architecture du projet](../ARCHITECTURE.md) - Vue d'ensemble
- [Business Plan](../business-plan.md) - Contexte business

## 💰 Coûts estimés

Pour un MVP/prototype avec ~100 interviews de test :

| Service | Coût/mois estimé |
|---------|-----------------|
| AWS Bedrock (Claude) | ~$10-20 |
| OpenAI Whisper (STT) | ~$5-10 |
| AWS Polly (TTS) | ~$5 |
| **Total** | **~$20-35/mois** |

Très abordable pour un prototype/MVP ! 🎉

## ✨ Prochaines étapes

Une fois que tout fonctionne :
1. ✅ Tester différents scénarios d'interview
2. ✅ Affiner les prompts de l'agent IA
3. ✅ Optimiser le frontend pour une meilleure UX
4. 🚀 Déployer sur AWS/Vercel pour la production
