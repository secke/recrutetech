"""
WebSocket handler for real-time AI interviews
Manages bidirectional communication between candidate and AI
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Optional
import json
import asyncio
from datetime import datetime

from app.agents.interview_agent import InterviewAgent
from app.services.speech_service import SpeechToTextService, TextToSpeechService
from app.core.config import settings


class InterviewSession:
    """Manages a single interview session"""
    
    def __init__(
        self,
        session_id: str,
        websocket: WebSocket,
        interview_config: Dict
    ):
        self.session_id = session_id
        self.websocket = websocket
        self.config = interview_config
        
        # Initialize AI agent
        self.agent = InterviewAgent(
            interview_type=interview_config.get("type", "technical"),
            job_role=interview_config.get("job_role", "Software Engineer"),
            required_skills=interview_config.get("skills", []),
            language=interview_config.get("language", "fr"),
            llm_provider=interview_config.get("llm_provider", settings.DEFAULT_LLM_PROVIDER)
        )
        
        # Initialize speech services
        # Initialize speech services
        self.stt = SpeechToTextService(
            language=interview_config.get("language", "fr"),
            provider=interview_config.get("stt_provider", settings.DEFAULT_STT_PROVIDER)
        )
        self.tts = TextToSpeechService(
            provider=interview_config.get("tts_provider", settings.DEFAULT_TTS_PROVIDER),
            voice=interview_config.get("voice", settings.DEFAULT_VOICE)
        )
        
        # Session state
        self.is_active = False
        self.audio_buffer = bytearray()
        self.last_activity = datetime.utcnow()
    
    async def start(self):
        """Start the interview session"""
        self.is_active = True
        
        # Send welcome message from AI
        welcome_text = await self.agent.start_interview()
        
        # Convert to speech
        welcome_audio = await self.tts.synthesize_speech(welcome_text)
        
        # Send to client
        await self.send_message({
            "type": "ai_message",
            "text": welcome_text,
            "audio": welcome_audio.hex(),  # Send as hex string
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def handle_audio_chunk(self, audio_data: bytes):
        """
        Handle incoming audio from candidate
        
        Args:
            audio_data: Raw audio bytes from WebSocket
        """
        # Add to buffer
        self.audio_buffer.extend(audio_data)
        
        # Process when buffer is large enough (e.g., 3 seconds of audio)
        if len(self.audio_buffer) >= 48000:  # ~3 seconds at 16kHz
            await self.process_candidate_speech()
    
    async def process_candidate_speech(self):
        """Process buffered candidate speech"""
        if not self.audio_buffer:
            return
        
        try:
            # Transcribe audio to text
            candidate_text = await self.stt.transcribe_audio(
                bytes(self.audio_buffer),
                audio_format="webm"
            )
            
            if not candidate_text:
                return
            
            # Clear buffer
            self.audio_buffer.clear()
            
            # Send transcription to client (for display)
            await self.send_message({
                "type": "transcription",
                "text": candidate_text,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Process with AI agent
            ai_response = await self.agent.process_candidate_response(candidate_text)
            
            # Convert AI response to speech
            ai_audio = await self.tts.synthesize_speech(ai_response["ai_response"])
            
            # Send AI response to client
            await self.send_message({
                "type": "ai_response",
                "text": ai_response["ai_response"],
                "audio": ai_audio.hex(),
                "evaluation": ai_response["evaluation"],
                "phase": ai_response["current_phase"],
                "should_continue": ai_response["should_continue"],
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Update activity timestamp
            self.last_activity = datetime.utcnow()
            
            # Check if interview should end
            if not ai_response["should_continue"]:
                await self.end_interview()
        
        except Exception as e:
            print(f"Error processing candidate speech: {e}")
            await self.send_error(f"Error processing audio: {str(e)}")
    
    async def handle_text_message(self, text: str):
        """
        Handle text message from candidate (alternative to audio)
        
        Args:
            text: Text message from candidate
        """
        try:
            # Process with AI agent
            ai_response = await self.agent.process_candidate_response(text)
            
            # Convert to speech
            ai_audio = await self.tts.synthesize_speech(ai_response["ai_response"])
            
            # Send response
            await self.send_message({
                "type": "ai_response",
                "text": ai_response["ai_response"],
                "audio": ai_audio.hex(),
                "evaluation": ai_response["evaluation"],
                "timestamp": datetime.utcnow().isoformat()
            })
        
        except Exception as e:
            print(f"Error processing text message: {e}")
            await self.send_error(str(e))
    
    async def end_interview(self):
        """End the interview and generate report"""
        try:
            # Generate final report
            report = await self.agent.end_interview()
            
            # Convert closing message to speech
            closing_audio = await self.tts.synthesize_speech(report["closing_message"])
            
            # Send final report
            await self.send_message({
                "type": "interview_complete",
                "report": report,
                "closing_audio": closing_audio.hex(),
                "timestamp": datetime.utcnow().isoformat()
            })
            
            self.is_active = False
        
        except Exception as e:
            print(f"Error ending interview: {e}")
            await self.send_error(str(e))
    
    async def send_message(self, message: Dict):
        """Send message to client via WebSocket"""
        try:
            await self.websocket.send_json(message)
        except Exception as e:
            print(f"Error sending message: {e}")
    
    async def send_error(self, error_message: str):
        """Send error message to client"""
        await self.send_message({
            "type": "error",
            "message": error_message,
            "timestamp": datetime.utcnow().isoformat()
        })


class InterviewWebSocketManager:
    """Manages multiple interview WebSocket connections"""
    
    def __init__(self):
        self.active_sessions: Dict[str, InterviewSession] = {}
    
    async def handle_connection(
        self,
        websocket: WebSocket,
        session_id: str,
        interview_config: Dict
    ):
        """
        Handle new WebSocket connection for interview
        
        Args:
            websocket: WebSocket connection
            session_id: Unique session identifier
            interview_config: Interview configuration
        """
        await websocket.accept()
        
        # Create new session
        session = InterviewSession(session_id, websocket, interview_config)
        self.active_sessions[session_id] = session
        
        try:
            # Start interview
            await session.start()
            
            # Listen for messages
            while session.is_active:
                data = await websocket.receive()
                
                if "bytes" in data:
                    # Handle audio data
                    await session.handle_audio_chunk(data["bytes"])
                
                elif "text" in data:
                    # Handle text message
                    message = json.loads(data["text"])
                    
                    if message.get("type") == "text_message":
                        await session.handle_text_message(message["content"])
                    
                    elif message.get("type") == "end_interview":
                        await session.end_interview()
                        break
        
        except WebSocketDisconnect:
            print(f"Client disconnected: {session_id}")
        
        except Exception as e:
            print(f"Error in WebSocket connection: {e}")
            await session.send_error(str(e))
        
        finally:
            # Clean up session
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
    
    def get_session(self, session_id: str) -> Optional[InterviewSession]:
        """Get active session by ID"""
        return self.active_sessions.get(session_id)
    
    def get_active_sessions_count(self) -> int:
        """Get number of active sessions"""
        return len(self.active_sessions)


# Global manager instance
interview_manager = InterviewWebSocketManager()
