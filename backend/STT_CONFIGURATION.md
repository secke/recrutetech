# Configuration Speech-to-Text (STT)

## Problème actuel

L'application utilise AWS Bedrock pour LLM et AWS Polly pour TTS, mais **AWS Transcribe Streaming** a des problèmes de compatibilité avec asyncio dans le contexte d'une application FastAPI WebSocket temps réel.

### Erreurs observées
```
InvalidStateError: CANCELLED: <Future at 0x... state=cancelled>
Treating Python exception as error 3(AWS_ERROR_UNKNOWN)
```

Ces erreurs se produisent car AWS Transcribe Streaming ne gère pas bien les annulations de futures avec `asyncio.wait_for()`.

## Solutions disponibles

### ✅ Solution recommandée : OpenAI Whisper pour STT

OpenAI Whisper est optimisé pour la transcription en temps réel et s'intègre parfaitement avec asyncio.

**Configuration** :

1. Obtenez une clé API OpenAI sur https://platform.openai.com/api-keys

2. Ajoutez la clé dans `/home/secke/Desktop/seckeZ01/AI/LLM/hugging-face/recrutetech/backend/.env` :
   ```bash
   # Ajoutez cette ligne
   OPENAI_API_KEY=sk-...votre-clé...

   # Modifiez cette ligne
   DEFAULT_STT_PROVIDER=openai
   ```

3. Redémarrez le serveur :
   ```bash
   uvicorn app.main:app --reload
   ```

**Coût** : ~$0.006 par minute d'audio (très abordable pour un MVP/prototype)

### 🔧 Option 2 : Implémenter AWS Transcribe correctement

Pour utiliser AWS Transcribe Streaming sans crashs :

1. Ne pas utiliser `asyncio.wait_for()` avec les streams AWS
2. Implémenter un handler custom qui gère les timeouts différemment
3. Utiliser des queues asyncio pour découpler le streaming

Cette approche nécessite plus de développement et de tests.

### ⏱️ Option 3 : AWS Transcribe Batch mode

Utiliser AWS Transcribe en mode batch avec S3 :
- **Avantage** : Fonctionne de manière stable
- **Inconvénient** : Latence de 10-30 secondes (trop lent pour temps réel)
- Non recommandé pour les interviews en direct

## Architecture actuelle

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ WebSocket
       ▼
┌─────────────┐
│   FastAPI   │
│  WebSocket  │
└──────┬──────┘
       │
       ├─► LLM:  AWS Bedrock (Claude) ✅
       ├─► STT:  OpenAI Whisper        ✅ (recommandé)
       └─► TTS:  AWS Polly             ✅
```

## Configuration hybride recommandée

Utilisez le meilleur de chaque service :

```env
# LLM - AWS Bedrock (Claude Sonnet)
DEFAULT_LLM_PROVIDER=aws
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# STT - OpenAI Whisper (transcription rapide et précise)
DEFAULT_STT_PROVIDER=openai
OPENAI_API_KEY=sk-...

# TTS - AWS Polly (voix naturelles)
DEFAULT_TTS_PROVIDER=aws
DEFAULT_VOICE=Lea
```

## Fichiers modifiés

- [app/services/speech_service.py:82-91](app/services/speech_service.py#L82-L91) - AWS STT désactivé avec message d'avertissement
- [app/core/config.py:40](app/core/config.py#L40) - DEFAULT_STT_PROVIDER changé en `openai`

## Prochaines étapes

1. **Obtenir une clé API OpenAI** (priorité immédiate)
2. Configurer `.env` avec la clé
3. Tester la transcription audio avec OpenAI Whisper
4. (Optionnel) Implémenter AWS Transcribe Streaming proprement si besoin

## Support

Pour toute question sur la configuration, vérifiez :
- Les logs du serveur lors du démarrage
- Le message "⚠️ AWS STT not configured" indique que STT n'est pas disponible
- Tester avec `DEFAULT_STT_PROVIDER=openai` après avoir ajouté `OPENAI_API_KEY`
