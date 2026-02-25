"""
WebSocket handler for real-time AI interviews
Manages bidirectional communication between candidate and AI agent

Enhanced with:
- Support for multiple audio formats (WAV, WebM)
- Improved turn-taking management
- Natural conversation flow with VAD integration
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Optional
from enum import Enum
import json
import asyncio
from datetime import datetime

from app.agents.interview_agent import InterviewAgent
from app.services.speech_service import SpeechToTextService, TextToSpeechService
from app.core.config import settings


class ConversationState(Enum):
    """States for turn-taking management"""
    IDLE = "idle"
    USER_SPEAKING = "user_speaking"
    PROCESSING = "processing"
    AI_SPEAKING = "ai_speaking"


class InterviewSession:
    """
    Manages a single interview session with natural conversation flow.

    Features:
    - Automatic audio format detection (WAV/WebM)
    - Turn-taking state management
    - Immediate processing of complete utterances from VAD
    """

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
        self.stt = SpeechToTextService(
            api_key=settings.OPENAI_API_KEY,
            language=interview_config.get("language", "fr"),
            provider=interview_config.get("stt_provider", settings.DEFAULT_STT_PROVIDER),
            google_credentials=settings.GOOGLE_APPLICATION_CREDENTIALS,
            fallback_provider=settings.STT_FALLBACK_PROVIDER,
            groq_api_key=getattr(settings, 'GROQ_API_KEY', None)
        )
        self.tts = TextToSpeechService(
            provider=interview_config.get("tts_provider", settings.DEFAULT_TTS_PROVIDER),
            api_key=settings.OPENAI_API_KEY,
            voice=interview_config.get("voice", settings.DEFAULT_VOICE)
        )

        # Session state
        self.is_active = False
        self.conversation_state = ConversationState.IDLE
        self.last_activity = datetime.utcnow()

        # Audio buffering for streaming mode (legacy support)
        self.audio_buffer = bytearray()
        self.buffer_threshold = 48000  # ~3 seconds at 16kHz

        # Processing lock to prevent concurrent processing
        self._processing_lock = asyncio.Lock()

        # Visual metrics tracking
        self.visual_metrics_history = []
        self.current_visual_metrics = None

    def _detect_audio_format(self, audio_data: bytes) -> str:
        """
        Detect audio format from file header.

        Returns:
            str: 'wav', 'webm', or 'unknown'
        """
        if len(audio_data) < 12:
            return "unknown"

        # Check for WAV header (RIFF....WAVE)
        if audio_data[:4] == b'RIFF' and audio_data[8:12] == b'WAVE':
            return "wav"

        # Check for WebM header (0x1A 0x45 0xDF 0xA3 = EBML)
        if audio_data[:4] == b'\x1a\x45\xdf\xa3':
            return "webm"

        # Check for Ogg header
        if audio_data[:4] == b'OggS':
            return "ogg"

        return "unknown"

    async def send_welcome_message(self):
        """Send initial welcome message before interview starts"""
        self.conversation_state = ConversationState.AI_SPEAKING

        # Short welcome message asking if candidate is ready
        welcome_messages = {
            "fr": """Bonjour ! Bienvenue sur RecruteTech. Je suis votre interviewer IA.

Avant de commencer, assurez-vous que votre caméra et votre microphone fonctionnent correctement.

Quand vous êtes prêt, cliquez sur le bouton "Commencer l'entretien" et nous pourrons débuter.""",

            "en": """Hello! Welcome to RecruteTech. I'm your AI interviewer.

Before we start, please make sure your camera and microphone are working properly.

When you're ready, click the "Start Interview" button and we can begin."""
        }

        welcome_text = welcome_messages.get(self.config.get("language", "fr"), welcome_messages["fr"])

        # Convert to speech
        welcome_audio = await self.tts.synthesize_speech(welcome_text)

        # Send to client
        await self.send_message({
            "type": "welcome_message",
            "text": welcome_text,
            "audio": welcome_audio.hex(),
            "timestamp": datetime.utcnow().isoformat()
        })

        # Transition to idle state after sending
        self.conversation_state = ConversationState.IDLE

    async def start_interview(self):
        """Start the actual interview session after user clicks start button"""
        self.is_active = True
        self.conversation_state = ConversationState.AI_SPEAKING

        # Send opening question from AI agent
        opening_text = await self.agent.start_interview()

        # Convert to speech
        opening_audio = await self.tts.synthesize_speech(opening_text)

        # Send to client
        await self.send_message({
            "type": "ai_message",
            "text": opening_text,
            "audio": opening_audio.hex(),
            "timestamp": datetime.utcnow().isoformat()
        })

        # Transition to idle state after sending
        self.conversation_state = ConversationState.IDLE

    async def handle_audio_chunk(self, audio_data: bytes):
        """
        Handle incoming audio from candidate.

        With VAD enabled on frontend, we receive complete utterances.
        For legacy support, we also handle streaming chunks.

        Args:
            audio_data: Raw audio bytes from WebSocket
        """
        print(f"📥 Received audio data: {len(audio_data)} bytes")

        # Log first bytes for debugging
        if len(audio_data) >= 16:
            first_bytes = ' '.join(f'{b:02x}' for b in audio_data[:16])
            print(f"📥 First 16 bytes: {first_bytes}")

        # Detect if this is a complete utterance or a streaming chunk
        audio_format = self._detect_audio_format(audio_data)
        print(f"📥 Detected format: {audio_format}")

        if audio_format in ["wav", "webm", "ogg"]:
            # Complete utterance from VAD - process immediately
            print(f"🎤 Processing complete utterance ({audio_format}, {len(audio_data)} bytes)")
            await self.process_complete_utterance(audio_data, audio_format)
        else:
            # Unknown format - try to process as webm anyway if size is reasonable
            if len(audio_data) >= 1000:
                print(f"📥 Unknown format but reasonable size, trying as webm")
                await self.process_complete_utterance(audio_data, "webm")
            else:
                # Streaming chunk - buffer and process when threshold reached
                print(f"📥 Small chunk, buffering... (buffer size: {len(self.audio_buffer)} + {len(audio_data)})")
                self.audio_buffer.extend(audio_data)

                if len(self.audio_buffer) >= self.buffer_threshold:
                    print(f"📥 Buffer threshold reached, processing buffered audio")
                    await self.process_buffered_audio()

    async def process_complete_utterance(self, audio_data: bytes, audio_format: str):
        """
        Process a complete speech utterance from VAD.

        This is called when the frontend's VAD detects end of speech
        and sends the complete audio segment.

        Args:
            audio_data: Complete audio data for the utterance
            audio_format: Detected audio format (wav, webm, ogg)
        """
        async with self._processing_lock:
            if self.conversation_state == ConversationState.AI_SPEAKING:
                print("⚠️ Ignoring audio - AI is speaking")
                return

            self.conversation_state = ConversationState.PROCESSING

            try:
                # Transcribe audio to text
                print(f"🔄 Transcribing {audio_format} audio...")
                candidate_text = await self.stt.transcribe_audio(
                    audio_data,
                    audio_format=audio_format
                )

                if not candidate_text or len(candidate_text.strip()) < 2:
                    print("⚠️ Empty or too short transcription, ignoring")
                    self.conversation_state = ConversationState.IDLE
                    return

                print(f"📝 Transcription: '{candidate_text[:100]}...'")

                # Send transcription to client
                await self.send_message({
                    "type": "transcription",
                    "text": candidate_text,
                    "timestamp": datetime.utcnow().isoformat()
                })

                # Process with AI agent
                print("🤖 Processing with AI agent...")
                ai_response = await self.agent.process_candidate_response(candidate_text)

                # Convert AI response to speech
                print("🗣️ Generating speech...")
                self.conversation_state = ConversationState.AI_SPEAKING
                ai_audio = await self.tts.synthesize_speech(ai_response["ai_response"])

                # Send AI response
                await self.send_message({
                    "type": "ai_response",
                    "text": ai_response["ai_response"],
                    "audio": ai_audio.hex(),
                    "evaluation": ai_response["evaluation"],
                    "phase": ai_response["current_phase"],
                    "should_continue": ai_response["should_continue"],
                    "timestamp": datetime.utcnow().isoformat()
                })

                print("✅ Response sent successfully")

                # Update activity timestamp
                self.last_activity = datetime.utcnow()

                # Transition back to idle (frontend will handle AI speaking state)
                self.conversation_state = ConversationState.IDLE

                # Check if interview should end
                if not ai_response["should_continue"]:
                    await self.end_interview()

            except Exception as e:
                print(f"❌ Error processing utterance: {e}")
                import traceback
                traceback.print_exc()
                self.conversation_state = ConversationState.IDLE
                await self.send_error(f"Error processing audio: {str(e)}")

    async def process_buffered_audio(self):
        """
        Process buffered streaming audio (legacy mode).
        Used when VAD is not available on frontend.
        """
        if not self.audio_buffer:
            return

        async with self._processing_lock:
            try:
                audio_data = bytes(self.audio_buffer)
                self.audio_buffer.clear()

                # Detect format or default to webm for streaming
                audio_format = self._detect_audio_format(audio_data)
                if audio_format == "unknown":
                    audio_format = "webm"

                await self.process_complete_utterance(audio_data, audio_format)

            except Exception as e:
                print(f"❌ Error processing buffered audio: {e}")
                self.audio_buffer.clear()
                await self.send_error(str(e))

    async def handle_text_message(self, text: str):
        """
        Handle text message from candidate (alternative to audio).

        Args:
            text: Text message from candidate
        """
        async with self._processing_lock:
            try:
                self.conversation_state = ConversationState.PROCESSING

                # Send transcription acknowledgment
                await self.send_message({
                    "type": "transcription",
                    "text": text,
                    "timestamp": datetime.utcnow().isoformat()
                })

                # Process with AI agent
                ai_response = await self.agent.process_candidate_response(text)

                # Convert to speech
                self.conversation_state = ConversationState.AI_SPEAKING
                ai_audio = await self.tts.synthesize_speech(ai_response["ai_response"])

                # Send response
                await self.send_message({
                    "type": "ai_response",
                    "text": ai_response["ai_response"],
                    "audio": ai_audio.hex(),
                    "evaluation": ai_response["evaluation"],
                    "phase": ai_response["current_phase"],
                    "should_continue": ai_response["should_continue"],
                    "timestamp": datetime.utcnow().isoformat()
                })

                self.conversation_state = ConversationState.IDLE

                if not ai_response["should_continue"]:
                    await self.end_interview()

            except Exception as e:
                print(f"❌ Error processing text message: {e}")
                self.conversation_state = ConversationState.IDLE
                await self.send_error(str(e))

    async def end_interview(self):
        """End the interview and generate comprehensive report"""
        try:
            self.conversation_state = ConversationState.AI_SPEAKING

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
            self.conversation_state = ConversationState.IDLE

        except Exception as e:
            print(f"❌ Error ending interview: {e}")
            await self.send_error(str(e))

    async def send_message(self, message: Dict):
        """Send message to client via WebSocket"""
        try:
            if self.is_active or message.get("type") == "interview_complete":
                await self.websocket.send_json(message)
        except Exception as e:
            print(f"❌ Error sending message: {e}")
            self.is_active = False

    async def send_error(self, error_message: str):
        """Send error message to client"""
        await self.send_message({
            "type": "error",
            "message": error_message,
            "timestamp": datetime.utcnow().isoformat()
        })

    async def handle_visual_metrics(self, metrics: Dict):
        """
        Handle visual metrics from frontend video analysis.

        Stores metrics for inclusion in evaluation and final report.

        Args:
            metrics: Visual analysis metrics including:
                - eyeContactRatio: Percentage of time looking at camera
                - smileRatio: Percentage of time smiling
                - attentionRatio: Percentage of time attentive
                - blinkRate: Blinks per interval
                - headStability: Head movement stability score
                - indicators: Derived behavioral scores (confidence, engagement, nervousness)
        """
        if not metrics:
            return

        # Store current metrics
        self.current_visual_metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            **metrics
        }

        # Add to history (keep last 100 measurements)
        self.visual_metrics_history.append(self.current_visual_metrics)
        if len(self.visual_metrics_history) > 100:
            self.visual_metrics_history = self.visual_metrics_history[-100:]

        # Update agent with current visual context
        await self.agent.update_visual_context(self.current_visual_metrics)

    async def handle_video_frame(self, frame_base64: str):
        """
        Handle video frame from frontend for backend analysis.

        This allows the backend to perform additional video analysis
        beyond what's done in the frontend.

        Args:
            frame_base64: Base64-encoded JPEG image of the current video frame
        """
        if not frame_base64 or not self.is_active:
            return

        try:
            # Decode base64 image
            import base64
            image_data = base64.b64decode(frame_base64)

            # TODO: Perform backend video analysis here
            # For now, we're using frontend MediaPipe analysis
            # Future enhancement: Use backend ML models for emotion detection, etc.

            # Store frame for potential future use (e.g., saving interview recording)
            # self.video_frames.append(image_data)

        except Exception as e:
            print(f"❌ Error processing video frame: {e}")

    def get_aggregated_visual_metrics(self) -> Dict:
        """
        Calculate aggregated visual metrics for the final report.

        Returns:
            Dict with averaged metrics over the interview duration
        """
        if not self.visual_metrics_history:
            return {}

        # Calculate averages
        metrics_count = len(self.visual_metrics_history)

        avg_eye_contact = sum(m.get("eyeContactRatio", 0) for m in self.visual_metrics_history) / metrics_count
        avg_smile = sum(m.get("smileRatio", 0) for m in self.visual_metrics_history) / metrics_count
        avg_attention = sum(m.get("attentionRatio", 0) for m in self.visual_metrics_history) / metrics_count
        avg_stability = sum(m.get("headStability", 0) for m in self.visual_metrics_history) / metrics_count

        # Average indicators
        indicators = {}
        indicator_keys = ["confidence", "engagement", "nervousness"]
        for key in indicator_keys:
            values = [m.get("indicators", {}).get(key, 0) for m in self.visual_metrics_history if m.get("indicators")]
            if values:
                indicators[key] = sum(values) / len(values)

        return {
            "eyeContactRatio": round(avg_eye_contact, 2),
            "smileRatio": round(avg_smile, 2),
            "attentionRatio": round(avg_attention, 2),
            "headStability": round(avg_stability, 2),
            "indicators": {k: round(v, 2) for k, v in indicators.items()},
            "sampleCount": metrics_count
        }


class InterviewWebSocketManager:
    """Manages multiple concurrent interview WebSocket connections"""

    def __init__(self):
        self.active_sessions: Dict[str, InterviewSession] = {}

    async def handle_connection(
        self,
        websocket: WebSocket,
        session_id: str,
        interview_config: Dict
    ):
        """
        Handle new WebSocket connection for interview.

        Args:
            websocket: WebSocket connection
            session_id: Unique session identifier
            interview_config: Interview configuration
        """
        await websocket.accept()

        # Create new session
        session = InterviewSession(session_id, websocket, interview_config)
        self.active_sessions[session_id] = session

        print(f"📞 New interview session: {session_id}")

        try:
            # Send welcome message immediately (before interview starts)
            await session.send_welcome_message()

            # Listen for messages
            waiting_for_start = True
            while waiting_for_start or session.is_active:
                try:
                    data = await websocket.receive()

                    # Check for disconnect message
                    if data.get("type") == "websocket.disconnect":
                        print(f"👋 Client disconnected (disconnect message): {session_id}")
                        session.is_active = False
                        break

                    if "bytes" in data:
                        # Handle audio data (either complete utterance or streaming chunk)
                        await session.handle_audio_chunk(data["bytes"])

                    elif "text" in data:
                        # Handle text/control message
                        try:
                            message = json.loads(data["text"])
                        except json.JSONDecodeError:
                            print(f"⚠️ Invalid JSON received: {data['text'][:100]}")
                            continue

                        if message.get("type") == "start_interview":
                            # User clicked "Start Interview" button
                            print("🎬 Starting interview...")
                            waiting_for_start = False
                            await session.start_interview()

                        elif message.get("type") == "text_message":
                            await session.handle_text_message(message["content"])

                        elif message.get("type") == "end_interview":
                            await session.end_interview()
                            break

                        elif message.get("type") == "ping":
                            # Keep-alive ping
                            await session.send_message({"type": "pong"})

                        elif message.get("type") == "visual_metrics":
                            # Handle visual metrics from frontend
                            await session.handle_visual_metrics(message.get("metrics", {}))

                        elif message.get("type") == "video_frame":
                            # Handle video frame from frontend for backend analysis
                            if session.is_active:
                                await session.handle_video_frame(message.get("frame", ""))

                except WebSocketDisconnect:
                    print(f"👋 Client disconnected: {session_id}")
                    session.is_active = False
                    break
                except RuntimeError as e:
                    if "disconnect" in str(e).lower():
                        print(f"👋 Client disconnected (runtime): {session_id}")
                        session.is_active = False
                        break
                    raise

        except Exception as e:
            print(f"❌ Error in WebSocket connection: {e}")
            import traceback
            traceback.print_exc()
            session.is_active = False
            try:
                await session.send_error(str(e))
            except:
                pass

        finally:
            # Clean up session
            session.is_active = False
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
            print(f"🔚 Session ended: {session_id}")

    def get_session(self, session_id: str) -> Optional[InterviewSession]:
        """Get active session by ID"""
        return self.active_sessions.get(session_id)

    def get_active_sessions_count(self) -> int:
        """Get number of active sessions"""
        return len(self.active_sessions)


# Global manager instance
interview_manager = InterviewWebSocketManager()
