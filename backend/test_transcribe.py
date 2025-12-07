import asyncio
import os
from dotenv import load_dotenv
from amazon_transcribe.client import TranscribeStreamingClient
from amazon_transcribe.handlers import TranscriptResultStreamHandler
from amazon_transcribe.model import TranscriptEvent

# Load environment variables
load_dotenv()

class MyEventHandler(TranscriptResultStreamHandler):
    async def handle_transcript_event(self, transcript_event: TranscriptEvent):
        results = transcript_event.transcript.results
        for result in results:
            if not result.is_partial:
                for alt in result.alternatives:
                    print(f"Transcript: {alt.transcript}")

async def basic_transcribe():
    print("☁️  Testing AWS Transcribe Streaming\n")
    
    region = os.getenv("AWS_REGION", "us-east-1")
    print(f"Region: {region}")
    
    try:
        client = TranscribeStreamingClient(region=region)
        
        stream = await client.start_stream_transcription(
            language_code="fr-FR",
            media_sample_rate_hz=16000,
            media_encoding="pcm"
        )
        
        print("✅ Connection established. Sending silence...")
        
        # Send 1 second of silence (PCM 16kHz, 16-bit, mono)
        silence = b'\x00' * 32000
        
        await stream.input_stream.send_audio_event(audio_chunk=silence)
        await stream.input_stream.end_stream()
        
        handler = MyEventHandler(stream.output_stream)
        await handler.handle_events()
        
        print("✅ Transcription completed successfully (even if empty).")
        
    except Exception as e:
        print(f"❌ Transcribe Error: {e}")

if __name__ == "__main__":
    asyncio.run(basic_transcribe())
