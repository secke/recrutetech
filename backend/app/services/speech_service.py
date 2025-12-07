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
    
    def __init__(self, api_key: Optional[str] = None, language: str = "fr", provider: str = "openai"):
        """
        Initialize STT service
        
        Args:
            api_key: OpenAI API key (if using OpenAI)
            language: Language code for transcription (fr, en, wo)
            provider: STT provider (openai, aws)
        """
        self.provider = provider
        self.language = language
        
        # Map simple language code to AWS language code
        self.aws_lang_map = {
            "fr": "fr-FR",
            "en": "en-US",
            "wo": "fr-FR"  # Fallback for Wolof as AWS doesn't support it directly yet
        }
        
        if provider == "openai":
            self.client = AsyncOpenAI(api_key=api_key)
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
        try:
            if self.provider == "openai":
                # Create file-like object from audio data
                audio_file = io.BytesIO(audio_data)
                audio_file.name = f"audio.{audio_format}"
                
                # Call Whisper API
                transcript = await self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=self.language if self.language in ["fr", "en"] else None,
                    prompt=prompt,
                    response_format="text"
                )
                return transcript.strip()
            
            elif self.provider == "aws":
                from amazon_transcribe.handlers import TranscriptResultStreamHandler
                from amazon_transcribe.model import TranscriptEvent
                
                # Create a stream from bytes
                async def audio_stream_generator():
                    chunk_size = 1024 * 4
                    for i in range(0, len(audio_data), chunk_size):
                        yield audio_data[i:i+chunk_size]
                
                # Start stream transcription
                stream = await self.aws_client.start_stream_transcription(
                    language_code=self.aws_lang_map.get(self.language, "fr-FR"),
                    media_sample_rate_hz=16000,
                    media_encoding="ogg-opus" if audio_format == "webm" else "pcm"
                )
                
                # Send audio events
                async for chunk in audio_stream_generator():
                    await stream.input_stream.send_audio_event(audio_chunk=chunk)
                await stream.input_stream.end_stream()
                
                # Process results
                transcript = ""
                async for event in stream.output_stream:
                    if isinstance(event, TranscriptEvent):
                        results = event.transcript.results
                        for result in results:
                            if not result.is_partial:
                                for alt in result.alternatives:
                                    transcript += alt.transcript
                
                return transcript.strip()
                
            return ""
        
        except Exception as e:
            print(f"Error transcribing audio: {e}")
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
        
        while True:
            try:
                # Get audio chunk from stream
                chunk = await asyncio.wait_for(
                    audio_stream.get(),
                    timeout=chunk_duration
                )
                
                if chunk is None:  # End of stream signal
                    break
                
                buffer.extend(chunk)
                
                # Transcribe when buffer is large enough
                # For AWS, we could potentially stream continuously, but for now reuse chunk logic
                if len(buffer) >= 16000 * chunk_duration:  # Assuming 16kHz sample rate
                    text = await self.transcribe_audio(bytes(buffer))
                    if text:
                        yield text
                    buffer.clear()
            
            except asyncio.TimeoutError:
                # Transcribe whatever is in buffer
                if buffer:
                    text = await self.transcribe_audio(bytes(buffer))
                    if text:
                        yield text
                    buffer.clear()
            
            except Exception as e:
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
