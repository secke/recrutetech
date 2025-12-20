"""
Speech-to-Text Service using OpenAI Whisper API
Converts audio from candidate to text for processing by AI agent
"""
import io
from typing import Optional
import openai
from openai import AsyncOpenAI
import asyncio
import boto3
from contextlib import closing


class SpeechToTextService:
    """
    Service for converting speech to text in real-time
    Uses OpenAI Whisper API or AWS Transcribe for accurate transcription
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        language: str = "fr",
        provider: str = "google",
        google_credentials: Optional[str] = None,
        fallback_provider: Optional[str] = "openai"
    ):
        """
        Initialize STT service

        Args:
            api_key: OpenAI API key (if using OpenAI as primary or fallback)
            language: Language code for transcription (fr, en, wo)
            provider: STT provider (google, openai, aws)
            google_credentials: Path to Google Cloud credentials JSON file
            fallback_provider: Fallback provider if primary fails
        """
        self.provider = provider
        self.fallback_provider = fallback_provider
        self.language = language

        # Map simple language code to various providers
        self.google_lang_map = {
            "fr": "fr-FR",
            "en": "en-US",
            "wo": "fr-FR"  # Fallback for Wolof
        }

        self.aws_lang_map = {
            "fr": "fr-FR",
            "en": "en-US",
            "wo": "fr-FR"
        }

        # Initialize primary provider
        if provider == "google":
            try:
                from google.cloud import speech_v1
                import os

                # Set credentials if provided
                if google_credentials:
                    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = google_credentials

                self.google_client = speech_v1.SpeechClient()
            except Exception as e:
                print(f"⚠️  Failed to initialize Google STT: {e}")
                print(f"Falling back to {fallback_provider}")
                self.provider = fallback_provider

        if provider == "openai" or fallback_provider == "openai":
            if api_key:
                self.openai_client = AsyncOpenAI(api_key=api_key)
            else:
                self.openai_client = None

        elif provider == "aws":
            from amazon_transcribe.client import TranscribeStreamingClient
            self.aws_client = TranscribeStreamingClient(region="us-east-1")
    
    async def transcribe_audio(
        self,
        audio_data: bytes,
        audio_format: str = "webm",
        prompt: Optional[str] = None
    ) -> str:
        """
        Transcribe audio to text

        Args:
            audio_data: Raw audio bytes
            audio_format: Audio format (webm, mp3, wav)
            prompt: Optional prompt to guide transcription

        Returns:
            Transcribed text
        """
        # Validate audio data
        if not audio_data or len(audio_data) < 1000:  # Minimum size check
            return ""

        try:
            # Try primary provider
            if self.provider == "google":
                try:
                    from google.cloud import speech_v1

                    # Configure audio settings
                    audio = speech_v1.RecognitionAudio(content=audio_data)

                    # Determine encoding from format
                    encoding_map = {
                        "webm": speech_v1.RecognitionConfig.AudioEncoding.WEBM_OPUS,
                        "mp3": speech_v1.RecognitionConfig.AudioEncoding.MP3,
                        "wav": speech_v1.RecognitionConfig.AudioEncoding.LINEAR16,
                        "ogg": speech_v1.RecognitionConfig.AudioEncoding.OGG_OPUS,
                    }

                    # Google Cloud requires explicit sample rate for OPUS
                    # OPUS typically uses 48000 Hz for webm, but can vary
                    # We'll use 48000 as default for WEBM/OGG OPUS
                    encoding = encoding_map.get(audio_format, speech_v1.RecognitionConfig.AudioEncoding.WEBM_OPUS)

                    config_params = {
                        "encoding": encoding,
                        "language_code": self.google_lang_map.get(self.language, "fr-FR"),
                        "enable_automatic_punctuation": True,
                    }

                    # Set appropriate sample rate based on format
                    if audio_format in ["webm", "ogg"]:
                        # OPUS in WebM typically uses 48kHz
                        config_params["sample_rate_hertz"] = 48000
                    else:
                        # WAV, MP3 typically use 16kHz for speech
                        config_params["sample_rate_hertz"] = 16000

                    config = speech_v1.RecognitionConfig(**config_params)

                    # Perform transcription (synchronous call, wrapped in async)
                    response = await asyncio.to_thread(
                        self.google_client.recognize,
                        config=config,
                        audio=audio
                    )

                    # Extract transcript
                    transcript = ""
                    for result in response.results:
                        transcript += result.alternatives[0].transcript

                    if transcript.strip():
                        print(f"✅ Google STT success: '{transcript.strip()[:50]}...'")
                        return transcript.strip()

                    # If empty, try fallback
                    if self.fallback_provider and transcript.strip() == "":
                        print(f"⚠️  Google STT returned empty (audio size: {len(audio_data)} bytes, format: {audio_format})")
                        print(f"Trying {self.fallback_provider} fallback...")
                        return await self._transcribe_with_fallback(audio_data, audio_format, prompt)

                    return transcript.strip()

                except Exception as e:
                    print(f"Google STT error: {e}, trying fallback")
                    if self.fallback_provider:
                        return await self._transcribe_with_fallback(audio_data, audio_format, prompt)
                    return ""

            elif self.provider == "openai":
                return await self._transcribe_openai(audio_data, audio_format, prompt)

            elif self.provider == "aws":
                # AWS Transcribe Streaming has compatibility issues with asyncio
                # For production, either:
                # 1. Use OpenAI Whisper for STT (recommended for real-time)
                # 2. Implement a proper AWS Transcribe Streaming wrapper without wait_for
                # 3. Use AWS Transcribe batch mode with S3 (too slow for real-time)

                # For now, log a warning and return empty to avoid crashes
                print("⚠️  AWS STT not configured - please set DEFAULT_STT_PROVIDER=openai in .env and add OPENAI_API_KEY")
                return ""

            return ""

        except asyncio.TimeoutError:
            print("Transcription timeout - no audio detected")
            return ""
        except Exception as e:
            # Only log non-timeout errors
            error_msg = str(e)
            if "timed out" not in error_msg.lower():
                print(f"Error transcribing audio: {e}")
            return ""

    async def _transcribe_openai(
        self,
        audio_data: bytes,
        audio_format: str = "webm",
        prompt: Optional[str] = None
    ) -> str:
        """Transcribe using OpenAI Whisper"""
        try:
            if not self.openai_client:
                print("⚠️  OpenAI client not initialized")
                return ""

            # Create file-like object from audio data
            audio_file = io.BytesIO(audio_data)
            audio_file.name = f"audio.{audio_format}"

            # Call Whisper API
            transcript = await self.openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=self.language if self.language in ["fr", "en"] else None,
                prompt=prompt,
                response_format="text"
            )
            return transcript.strip()
        except Exception as e:
            print(f"OpenAI STT error: {e}")
            return ""

    async def _transcribe_with_fallback(
        self,
        audio_data: bytes,
        audio_format: str = "webm",
        prompt: Optional[str] = None
    ) -> str:
        """Try fallback provider"""
        if self.fallback_provider == "openai":
            return await self._transcribe_openai(audio_data, audio_format, prompt)
        return ""

    async def transcribe_streaming(
        self,
        audio_stream: asyncio.Queue,
        chunk_duration: float = 3.0
    ):
        """
        Transcribe audio from a streaming source

        Args:
            audio_stream: Async queue of audio chunks
            chunk_duration: Duration of each chunk in seconds

        Yields:
            Transcribed text as it becomes available
        """
        buffer = bytearray()
        consecutive_timeouts = 0
        max_consecutive_timeouts = 5  # Stop after 5 consecutive timeouts

        while consecutive_timeouts < max_consecutive_timeouts:
            try:
                # Get audio chunk from stream
                chunk = await asyncio.wait_for(
                    audio_stream.get(),
                    timeout=chunk_duration
                )

                if chunk is None:  # End of stream signal
                    break

                buffer.extend(chunk)
                consecutive_timeouts = 0  # Reset timeout counter

                # Transcribe when buffer is large enough
                if len(buffer) >= 16000 * chunk_duration:  # Assuming 16kHz sample rate
                    text = await self.transcribe_audio(bytes(buffer))
                    if text:
                        yield text
                    buffer.clear()

            except asyncio.TimeoutError:
                consecutive_timeouts += 1
                # Only transcribe if we have significant audio data
                if buffer and len(buffer) >= 1000:
                    text = await self.transcribe_audio(bytes(buffer))
                    if text:
                        yield text
                        consecutive_timeouts = 0  # Reset on successful transcription
                    buffer.clear()

            except Exception as e:
                error_msg = str(e)
                if "timed out" not in error_msg.lower():
                    print(f"Error in streaming transcription: {e}")
                break


class TextToSpeechService:
    """
    Service for converting text to natural speech
    Uses OpenAI TTS or ElevenLabs for high-quality voice
    """
    
    def __init__(
        self,
        provider: str = "openai",  # "openai" or "elevenlabs"
        api_key: Optional[str] = None,
        voice: str = "alloy"  # OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
    ):
        """
        Initialize TTS service
        
        Args:
            provider: TTS provider to use
            api_key: API key for the provider
            voice: Voice ID to use
        """
        self.provider = provider
        self.voice = voice
        
        if provider == "openai":
            self.client = AsyncOpenAI(api_key=api_key)
        elif provider == "elevenlabs":
            try:
                from elevenlabs import AsyncElevenLabs
                self.client = AsyncElevenLabs(api_key=api_key)
            except ImportError:
                raise ImportError("Install elevenlabs: pip install elevenlabs")
        elif provider == "aws":
            from app.core.config import settings
            self.client = boto3.client(
                'polly',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
    
    async def synthesize_speech(
        self,
        text: str,
        voice: Optional[str] = None,
        speed: float = 1.0
    ) -> bytes:
        """
        Convert text to speech
        
        Args:
            text: Text to convert
            voice: Voice ID (overrides default)
            speed: Speech speed (0.25 - 4.0)
            
        Returns:
            Audio data as bytes (MP3 format)
        """
        voice = voice or self.voice
        
        try:
            if self.provider == "openai":
                response = await self.client.audio.speech.create(
                    model="tts-1",  # or "tts-1-hd" for higher quality
                    voice=voice,
                    input=text,
                    speed=speed
                )
                
                # Return audio bytes
                return response.content
            
            elif self.provider == "elevenlabs":
                # ElevenLabs implementation
                audio = await self.client.generate(
                    text=text,
                    voice=voice,
                    model="eleven_multilingual_v2"
                )
                return audio
            
            elif self.provider == "aws":
                # AWS Polly implementation
                try:
                    response = self.client.synthesize_speech(
                        Text=text,
                        OutputFormat='mp3',
                        VoiceId=voice or 'Joanna',
                        Engine='neural'
                    )
                except self.client.exceptions.EngineNotSupportedException:
                    # Fallback to standard engine if neural is not supported
                    print(f"Neural engine not supported for voice {voice}, falling back to standard.")
                    response = self.client.synthesize_speech(
                        Text=text,
                        OutputFormat='mp3',
                        VoiceId=voice or 'Joanna',
                        Engine='standard'
                    )
                except Exception as e:
                    # Handle other specific AWS errors or generic fallback
                    if "does not support the selected engine" in str(e):
                         response = self.client.synthesize_speech(
                            Text=text,
                            OutputFormat='mp3',
                            VoiceId=voice or 'Joanna',
                            Engine='standard'
                        )
                    else:
                        raise e
                
                if "AudioStream" in response:
                    with closing(response["AudioStream"]) as stream:
                        return stream.read()
        
        except Exception as e:
            print(f"Error synthesizing speech: {e}")
            return b""
    
    async def synthesize_streaming(
        self,
        text: str,
        chunk_size: int = 1024
    ):
        """
        Generate speech in streaming mode for lower latency
        
        Args:
            text: Text to convert
            chunk_size: Size of audio chunks
            
        Yields:
            Audio chunks as they are generated
        """
        try:
            if self.provider == "openai":
                response = await self.client.audio.speech.create(
                    model="tts-1",
                    voice=self.voice,
                    input=text,
                    response_format="mp3"
                )
                
                # Stream audio chunks
                async for chunk in response.iter_bytes(chunk_size):
                    yield chunk
            
            elif self.provider == "elevenlabs":
                # ElevenLabs streaming
                audio_stream = await self.client.generate(
                    text=text,
                    voice=self.voice,
                    model="eleven_multilingual_v2",
                    stream=True
                )
                
                async for chunk in audio_stream:
                    yield chunk
        
        except Exception as e:
            print(f"Error in streaming synthesis: {e}")


# Example usage
async def example_usage():
    """Example of using STT and TTS services"""
    
    # Initialize services
    stt = SpeechToTextService(language="fr")
    tts = TextToSpeechService(provider="openai", voice="nova")
    
    # Example: Transcribe audio
    # audio_data = load_audio_file("candidate_response.mp3")
    # text = await stt.transcribe_audio(audio_data)
    # print(f"Transcribed: {text}")
    
    # Example: Generate speech
    ai_question = "Pouvez-vous me parler de votre expérience avec Python ?"
    audio_response = await tts.synthesize_speech(ai_question)
    # save_audio_file(audio_response, "ai_question.mp3")
    
    print("STT and TTS services ready!")


if __name__ == "__main__":
    asyncio.run(example_usage())
