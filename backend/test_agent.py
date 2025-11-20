"""
Simple test script to verify AI Interview Agent works locally
Run: python test_agent.py
"""
import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set OpenAI API key
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY", "")

from app.agents.interview_agent import InterviewAgent


async def test_interview_agent():
    """Test the AI interview agent with simulated conversation"""
    
    print("🤖 Testing RecruteTech AI Interview Agent\n")
    print("=" * 60)
    
    # Initialize agent
    agent = InterviewAgent(
        interview_type="technical",
        job_role="Backend Developer",
        required_skills=["Python", "FastAPI", "PostgreSQL"],
        language="fr"
    )
    
    print("\n1️⃣  Starting interview...\n")
    
    # Start interview
    opening = await agent.start_interview()
    print(f"🤖 AI: {opening}\n")
    
    # Simulate candidate responses
    candidate_responses = [
        """Bonjour ! Je m'appelle Mbabba. Je suis développeur backend avec 3 ans d'expérience. 
        J'ai travaillé principalement avec Python et FastAPI pour créer des APIs REST. 
        Ce qui m'intéresse dans ce poste, c'est l'opportunité de travailler sur des systèmes à grande échelle.""",
        
        """J'ai récemment développé une plateforme de recrutement avec FastAPI. 
        Le défi principal était de gérer les connexions WebSocket en temps réel pour les entretiens vidéo.
        J'ai utilisé SQLAlchemy async pour la base de données et Redis pour le cache.""",
        
        """Pour optimiser les performances, j'ai utilisé plusieurs techniques:
        - Indexation des colonnes fréquemment requêtées
        - Mise en cache avec Redis des données statiques
        - Connection pooling pour PostgreSQL
        - Async/await partout pour éviter les blocages
        Ça nous a permis de passer de 100ms à 20ms en moyenne par requête."""
    ]
    
    # Process each response
    for i, response in enumerate(candidate_responses, 1):
        print(f"\n{i + 1}️⃣  Candidate response:\n")
        print(f"👤 Candidat: {response}\n")
        print("⏳ AI processing...\n")
        
        # Process with agent
        result = await agent.process_candidate_response(response)
        
        print(f"🤖 AI: {result['ai_response']}\n")
        print(f"📊 Evaluation: {result['evaluation']}")
        print(f"📍 Phase: {result['current_phase']}")
        print(f"⏱️  Time elapsed: {result['time_elapsed']}s")
        print(f"▶️  Continue: {result['should_continue']}")
        print("\n" + "-" * 60)
    
    # End interview
    print("\n🏁 Ending interview...\n")
    report = await agent.end_interview()
    
    print("📄 FINAL REPORT")
    print("=" * 60)
    print(f"Duration: {report['duration_minutes']:.1f} minutes")
    print(f"Questions asked: {report['questions_asked']}")
    print(f"\n🎯 Overall Evaluation:")
    for metric, score in report['overall_evaluation'].items():
        print(f"  - {metric}: {score}/10")
    
    print(f"\n💪 Strengths:")
    for strength in report['strengths']:
        print(f"  - {strength}")
    
    print(f"\n📈 Areas for Improvement:")
    for area in report['areas_for_improvement']:
        print(f"  - {area}")
    
    print(f"\n✅ Recommendation: {report['recommendation']}")
    print("\n" + "=" * 60)
    print("\n✅ Test completed successfully!")


if __name__ == "__main__":
    # Check if API key is set
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ Error: OPENAI_API_KEY not set in .env file")
        print("Please add: OPENAI_API_KEY=sk-your-key-here")
        exit(1)
    
    # Run test
    asyncio.run(test_interview_agent())
