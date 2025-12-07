import asyncio
import os
from dotenv import load_dotenv
import boto3

# Load environment variables
load_dotenv()

from app.agents.interview_agent import InterviewAgent
from app.services.speech_service import TextToSpeechService

async def test_aws_services():
    print("☁️  Testing AWS Services Integration\n")
    
    # Check credentials
    if not os.getenv("AWS_ACCESS_KEY_ID"):
        print("⚠️  AWS credentials not found in .env")
        print("Please ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set.")
        return

    # 1. Test Bedrock (LLM)
    print("1️⃣  Testing AWS Bedrock (Claude via LangChain)...")
    try:
        agent = InterviewAgent(
            interview_type="technical",
            job_role="Cloud Architect",
            llm_provider="aws"
        )
        
        response = await agent.process_candidate_response(
            "Bonjour, je suis un expert AWS avec 5 ans d'expérience."
        )
        print(f"✅ Bedrock Response: {response['ai_response'][:100]}...")
        
    except Exception as e:
        print(f"❌ Bedrock Error: {e}")

    # 2. Test Polly (TTS)
    print("\n2️⃣  Testing AWS Polly (TTS)...")
    try:
        tts = TextToSpeechService(provider="aws", voice="Lea")
        audio_data = await tts.synthesize_speech("Bonjour, ceci est un test de la voix AWS Polly.")
        
        if len(audio_data) > 0:
            print(f"✅ Polly Audio Generated: {len(audio_data)} bytes")
            # Optional: save to file
            # with open("test_polly.mp3", "wb") as f:
            #     f.write(audio_data)
        else:
            print("❌ Polly returned empty audio")
            
    except Exception as e:
        print(f"❌ Polly Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_aws_services())
