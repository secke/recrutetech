# 🔍 Debug Logging Ajouté

## Problème à résoudre
Google Cloud STT fonctionne parfaitement (✅ transcriptions réussies), mais AWS Bedrock ne répond pas aux messages du candidat.

## Modifications apportées

### 1. `/home/secke/Desktop/seckeZ01/AI/LLM/hugging-face/recrutetech/backend/app/agents/interview_agent.py`

**Lignes 219-241** : Ajout de debug logging détaillé pour AWS Bedrock:

```python
print(f"🤖 AWS Bedrock: Processing candidate message")
print(f"   Total messages in history: {len(self.chat_history.messages)}")
print(f"   Filtered history length: {len(history_for_bedrock)}")
print(f"   Candidate input: '{candidate_response[:100]}...'")
print(f"   Calling Bedrock with input size: {len(candidate_response)} chars")

# ... appel à Bedrock ...

print(f"✅ AWS Bedrock response received: {len(response.content)} chars")
print(f"   Response preview: '{response.content[:100]}...'")
```

**Lignes 238-241** : Ajout de traceback complet en cas d'erreur:

```python
except Exception as e:
    print(f"❌ AWS Bedrock error: {e}")
    import traceback
    traceback.print_exc()
    raise
```

### 2. `/home/secke/Desktop/seckeZ01/AI/LLM/hugging-face/recrutetech/backend/app/api/websocket/interview_ws.py`

**Lignes 114-138** : Ajout de logging à chaque étape du traitement:

```python
print(f"📝 Transcription sent to client, now calling AI agent...")

ai_response = await self.agent.process_candidate_response(candidate_text)

print(f"🤖 AI agent returned response: {ai_response.get('ai_response', '')[:100]}...")

print(f"🗣️  Converting AI response to speech...")
ai_audio = await self.tts.synthesize_speech(ai_response["ai_response"])

print(f"✅ Audio generated ({len(ai_audio)} bytes), sending to client...")

# ... envoi au client ...

print(f"✅ AI response sent to client successfully!")
```

## 🚀 Comment tester

1. **Redémarrez le serveur backend** :
   ```bash
   cd /home/secke/Desktop/seckeZ01/AI/LLM/hugging-face/recrutetech/backend
   uvicorn app.main:app --reload
   ```

2. **Connectez-vous avec le frontend** et parlez dans le micro

3. **Observez les logs** dans le terminal backend. Vous devriez voir maintenant:

### Logs attendus (succès) :
```
✅ Google STT success: 'Bonjour comment allez-vous...'
📝 Transcription sent to client, now calling AI agent...
🤖 AWS Bedrock: Processing candidate message
   Total messages in history: 2
   Filtered history length: 0
   Candidate input: 'Bonjour comment allez-vous...'
   Calling Bedrock with input size: 32 chars
✅ AWS Bedrock response received: 245 chars
   Response preview: 'Bonjour ! Je vais très bien, merci...'
🤖 AI agent returned response: Bonjour ! Je vais très bien, merci...
🗣️  Converting AI response to speech...
✅ Audio generated (15234 bytes), sending to client...
✅ AI response sent to client successfully!
```

### Logs possibles (erreur) :
```
✅ Google STT success: 'Bonjour comment allez-vous...'
📝 Transcription sent to client, now calling AI agent...
🤖 AWS Bedrock: Processing candidate message
   Total messages in history: 2
   Filtered history length: 0
   Candidate input: 'Bonjour comment allez-vous...'
   Calling Bedrock with input size: 32 chars
❌ AWS Bedrock error: [détails de l'erreur]
Traceback (most recent call last):
  [traceback complet]
Error processing candidate speech: [erreur]
```

## 🔍 Diagnostic selon les logs

| Log observé | Diagnostic | Action |
|-------------|-----------|--------|
| ✅ Google STT mais pas "📝 Transcription sent..." | L'audio est transcrit mais le WebSocket ne traite pas | Vérifier la connexion WebSocket |
| 📝 Transcription mais pas "🤖 AWS Bedrock: Processing..." | L'agent n'est pas appelé | Problème dans `process_candidate_response` |
| 🤖 Processing mais pas "✅ AWS Bedrock response received" | Bedrock ne répond pas ou erreur | Voir le traceback pour détails |
| ✅ Response received mais pas "🤖 AI agent returned..." | Erreur après Bedrock mais avant retour | Problème dans le traitement de la réponse |
| 🗣️ Converting mais pas "✅ Audio generated" | Erreur TTS (AWS Polly) | Vérifier les credentials AWS Polly |

## 📊 Points de vérification

1. **History length = 0** lors du premier message est NORMAL (car on skip le message d'accueil de l'IA)
2. Si **AWS Bedrock error** apparaît, lire le traceback complet
3. Si **Response received** mais vide, vérifier le système prompt dans model_kwargs
4. Si **TTS error**, vérifier les credentials AWS dans `.env`

## 🔧 Prochaines étapes après les tests

Une fois que vous partagez les nouveaux logs, on pourra :
1. Identifier exactement où le flux s'arrête
2. Corriger le problème spécifique (Bedrock, TTS, ou autre)
3. Finaliser l'intégration Google STT + AWS Bedrock + AWS Polly
