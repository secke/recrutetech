# 🤖 RecruteTech AI Interviewer

**RecruteTech AI Interviewer** est une plateforme d'entretien technique basée sur l'IA. Elle permet à un agent conversationnel de conduire des entretiens en temps réel, d'adapter ses questions aux réponses du candidat et d'analyser ses compétences techniques.

## ✨ Fonctionnalités

* 🎤 **Entretien conversationnel** avec un agent IA
* 🎥 **Vidéoconférence temps réel** via WebRTC
* 🧠 **Questions adaptatives** selon les réponses du candidat
* 💻 **Live coding & code review** avec partage d'écran
* 📝 **Transcription automatique** des échanges
* 🔊 **Interaction vocale** avec Text-to-Speech
* 👁️ **Analyse vidéo** et contexte visuel
* 📊 **Évaluation automatique** des compétences
* 📄 **Génération de rapports** d'entretien
* 🌍 Support multilingue

## 🏗️ Architecture

```text
Candidate
   │
   │ WebRTC / WebSocket
   ▼
┌──────────────────────────────┐
│        Backend API           │
│          FastAPI             │
├──────────────────────────────┤
│      AI Interview Agent      │
│                              │
│  Speech-to-Text → LLM        │
│                 ↓            │
│        Decision / Follow-up  │
│                 ↓            │
│        Text-to-Speech        │
│                              │
│  Vision Analysis             │
│  Code Analysis               │
└──────────────┬───────────────┘
               │
               ▼
        PostgreSQL / Redis
```

## 🧠 AI Pipeline

1. **Speech-to-Text** — transcription de la réponse du candidat
2. **LLM / Agent** — compréhension, évaluation et génération de questions
3. **Context & Memory** — conservation du contexte de l'entretien
4. **Text-to-Speech** — génération de la réponse vocale
5. **Vision Analysis** — analyse des éléments visuels lorsque nécessaire
6. **Code Analysis** — analyse du code et de l'approche du candidat

## 🎓 Types d'entretiens

### Présentation

Questions générales sur le parcours et l'expérience du candidat.

### Entretien technique

Questions techniques adaptatives avec approfondissement selon les réponses.

### Code Review

Analyse collaborative d'un extrait de code avec l'agent IA.

### Live Coding

Résolution d'un problème de programmation dans un environnement interactif.

## 🛠️ Stack technique

### Backend

* FastAPI
* Python
* WebSocket
* LangChain / CrewAI
* PostgreSQL
* Redis

### IA

* LLM — GPT / Claude ou modèles locaux
* Whisper — Speech-to-Text
* OpenAI TTS / ElevenLabs — Text-to-Speech
* Vision Models — analyse visuelle

### Temps réel

* WebRTC
* LiveKit / MediaSoup
* WebSocket

### Frontend

* React
* TypeScript
* Monaco Editor
* TailwindCSS

### Infrastructure

* Docker
* S3-compatible storage
* Cloud / On-premise deployment

## 🔐 Sécurité & confidentialité

* Chiffrement des communications
* Authentification sécurisée
* Accès aux entretiens via tokens
* Contrôle de la conservation des enregistrements
* Protection des données personnelles
* Déploiement possible en environnement **on-premise**

## 📌 Status

**Version:** `0.1.0-alpha`
**Status:** 🚧 En développement actif
