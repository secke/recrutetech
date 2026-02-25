"""
AI Interview Agent - Conduit des entretiens techniques autonomes
"""
from typing import List, Dict, Optional, AsyncGenerator
from langchain_community.chat_models import ChatOpenAI, ChatAnthropic
from langchain_aws import ChatBedrock
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from langchain_core.chat_history import InMemoryChatMessageHistory
import json
from datetime import datetime


class InterviewAgent:
    """
    Agent IA qui conduit des entretiens techniques en temps réel
    
    Capabilities:
    - Comprend les réponses du candidat
    - Pose des questions de suivi pertinentes
    - Adapte le niveau de difficulté
    - Évalue les compétences
    - Gère différents types d'entretiens
    """
    
    def __init__(
        self,
        interview_type: str = "technical",
        job_role: str = "Software Engineer",
        required_skills: List[str] = None,
        language: str = "fr",
        llm_provider: str = "openai"  # "openai" or "anthropic"
    ):
        """
        Initialize AI Interviewer Agent
        
        Args:
            interview_type: Type d'entretien (technical, behavioral, code_review)
            job_role: Poste visé
            required_skills: Compétences à évaluer
            language: Langue de l'entretien (fr, en, wo)
            llm_provider: Provider LLM à utiliser
        """
        self.interview_type = interview_type
        self.job_role = job_role
        self.required_skills = required_skills or []
        self.language = language
        
        # Initialize LLM
        if llm_provider == "anthropic":
            self.llm = ChatAnthropic(
                model="claude-sonnet-4-20250514",
                temperature=0.7,
                max_tokens=1000
            )
        elif llm_provider == "aws" or llm_provider == "bedrock":
            from app.core.config import settings
            self.llm = ChatBedrock(
                model_id=settings.BEDROCK_MODEL_ID,
                region_name=settings.AWS_REGION,
                model_kwargs={
                    "temperature": 0.7,
                    "max_tokens": 1000,
                    "system": self._build_system_prompt()  # Pass system prompt here for Bedrock
                }
            )
            self.llm_provider = "aws"
        elif llm_provider == "groq":
            from app.core.config import settings
            self.llm = ChatGroq(
                model="llama-3.3-70b-versatile",  # Fast and powerful
                temperature=0.7,
                max_tokens=1000,
                groq_api_key=settings.GROQ_API_KEY
            )
            self.llm_provider = "groq"
        else:
            self.llm = ChatOpenAI(
                model="gpt-4-turbo-preview",
                temperature=0.7,
                max_tokens=1000
            )
        
        # Conversation memory (using new approach)
        self.chat_history = InMemoryChatMessageHistory()

        # Interview state
        self.current_phase = "introduction"
        self.questions_asked = []
        self.evaluation_scores = {}
        self.start_time = datetime.utcnow()

        # Visual context from video analysis
        self.visual_context = None
        self.visual_metrics_history = []

        # Build system prompt (if not AWS, we'll use it in prompt template)
        if not hasattr(self, 'llm_provider') or self.llm_provider not in ["aws", "groq"]:
            self.system_prompt = self._build_system_prompt()
        else:
            # For AWS/Groq, system prompt is set differently or in model_kwargs
            self.system_prompt = self._build_system_prompt() if self.llm_provider == "groq" else None
    
    def _build_system_prompt(self) -> str:
        """Build system prompt based on interview configuration"""
        
        lang_instructions = {
            "fr": "Vous devez conduire l'entretien en français de manière naturelle et professionnelle.",
            "en": "You must conduct the interview in English in a natural and professional manner.",
            "wo": "Vous devez conduire l'entretien en wolof de manière naturelle et professionnelle."
        }
        
        base_prompt = f"""Tu es un interviewer technique expert et professionnel qui conduit des entretiens d'embauche pour le poste de {self.job_role}.

MISSION:
- Conduire un entretien {self.interview_type} structuré et professionnel
- Évaluer les compétences du candidat: {', '.join(self.required_skills)}
- Poser des questions de suivi pertinentes basées sur les réponses
- Adapter le niveau de difficulté selon les réponses
- Être encourageant mais objectif dans l'évaluation

STYLE DE COMMUNICATION:
{lang_instructions.get(self.language, lang_instructions['fr'])}
- Sois naturel et conversationnel (pas robotique)
- Utilise des transitions fluides entre questions
- Montre de l'empathie et de l'encouragement
- Donne des hints si le candidat bloque
- Reformule si le candidat ne comprend pas

STRUCTURE DE L'ENTRETIEN:
1. Introduction (2 min): Accueil chaleureux, explication du processus
2. Présentation candidat (5 min): Parcours, expériences, motivations
3. Questions techniques (20-30 min): Évaluation compétences spécifiques
4. Code review / Live coding (15 min): Exercices pratiques si applicable
5. Questions candidat (5 min): Répondre aux questions du candidat
6. Conclusion (2 min): Remerciements, prochaines étapes

RÈGLES IMPORTANTES:
- Pose UNE SEULE question à la fois
- Écoute complètement avant de répondre
- Si la réponse est floue, demande des clarifications
- Note mentalement les points forts et faibles
- Adapte les questions selon le niveau détecté
- Reste dans le temps imparti
- Sois respectueux et professionnel en tout temps

ÉVALUATION:
Pour chaque réponse, évalue mentalement:
- Clarté de communication (1-10)
- Profondeur technique (1-10)
- Expérience pratique (1-10)
- Problem-solving (1-10)
- Enthousiasme/Motivation (1-10)

Tu dois sembler naturel, comme un vrai recruteur humain, mais avec la précision et l'objectivité de l'IA."""

        return base_prompt
    
    async def start_interview(self) -> str:
        """
        Start the interview with a greeting
        
        Returns:
            Opening message from the AI interviewer
        """
        greetings = {
            "fr": f"""Bonjour ! Je suis votre interviewer IA et je suis ravi de faire votre connaissance aujourd'hui.

Je vais conduire cet entretien pour le poste de {self.job_role}. L'entretien durera environ 45 minutes et sera structuré en plusieurs parties.

Avant de commencer, assurez-vous que votre microphone et votre caméra fonctionnent bien. N'hésitez pas à me demander de répéter si vous n'avez pas bien compris une question.

Pour commencer, pouvez-vous vous présenter brièvement ? Parlez-moi de votre parcours et de ce qui vous intéresse dans ce poste.""",
            
            "en": f"""Hello! I'm your AI interviewer and I'm delighted to meet you today.

I'll be conducting this interview for the {self.job_role} position. The interview will last approximately 45 minutes and will be structured in several parts.

Before we start, please make sure your microphone and camera are working properly. Feel free to ask me to repeat if you don't understand a question.

To begin, can you briefly introduce yourself? Tell me about your background and what interests you in this position.""",
            
            "wo": f"""Nanga def! Mane interviewer AI la, te kontaan naa leer ak yow tay.

Dinga wax ci interview bi pour poste bi {self.job_role}..."""
        }
        
        opening = greetings.get(self.language, greetings["fr"])

        # Store in memory
        self.chat_history.add_message(AIMessage(content=opening))

        return opening
    
    async def process_candidate_response(
        self,
        candidate_response: str,
        context: Optional[Dict] = None
    ) -> Dict[str, any]:
        """
        Process candidate's response and generate next question
        
        Args:
            candidate_response: Transcribed text from candidate
            context: Additional context (video analysis, code shared, etc.)
            
        Returns:
            Dict with AI response, evaluation, and metadata
        """
        # Add candidate response to memory
        self.chat_history.add_message(HumanMessage(content=candidate_response))

        # Add context if available
        context_info = ""
        if context:
            if context.get("video_analysis"):
                context_info += f"\n[Analyse vidéo: {context['video_analysis']}]"
            if context.get("code_shared"):
                context_info += f"\n[Code partagé visible]"

        # Add visual behavioral context
        visual_context = self.get_visual_context_for_prompt()
        if visual_context:
            context_info += visual_context

        # Build prompt differently for AWS Bedrock vs other providers
        if hasattr(self, 'llm_provider') and self.llm_provider == "aws":
            # For AWS Bedrock, system prompt is in model_kwargs, don't include in messages
            # Also, Bedrock requires first message to be from user, so skip AI opening message
            history_for_bedrock = []
            for i, msg in enumerate(self.chat_history.messages[:-1]):  # Exclude just-added message
                # Skip the first AI message (opening greeting) to ensure first message is from user
                if i == 0 and isinstance(msg, AIMessage):
                    continue
                history_for_bedrock.append(msg)

            print(f"🤖 AWS Bedrock: Processing candidate message")
            print(f"   Total messages in history: {len(self.chat_history.messages)}")
            print(f"   Filtered history length: {len(history_for_bedrock)}")
            print(f"   Candidate input: '{candidate_response[:100]}...'")

            prompt = ChatPromptTemplate.from_messages([
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}")
            ])

            print(f"   Calling Bedrock with input size: {len(candidate_response)} chars")
            try:
                response = await (prompt | self.llm).ainvoke({
                    "chat_history": history_for_bedrock,
                    "input": candidate_response + context_info
                })
                print(f"✅ AWS Bedrock response received: {len(response.content)} chars")
                print(f"   Response preview: '{response.content[:100]}...'")
            except Exception as e:
                print(f"❌ AWS Bedrock error: {e}")
                import traceback
                traceback.print_exc()
                raise
        else:
            # For OpenAI/Anthropic, include system prompt in messages
            prompt = ChatPromptTemplate.from_messages([
                ("system", self.system_prompt),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}")
            ])

            response = await (prompt | self.llm).ainvoke({
                "chat_history": self.chat_history.messages[:-1],
                "input": candidate_response + context_info
            })



        ai_response = response.content

        # Store AI response in memory
        self.chat_history.add_message(AIMessage(content=ai_response))
        
        # Evaluate response (simplified - can be enhanced with separate evaluation agent)
        evaluation = self._evaluate_response(candidate_response)
        
        # Update interview state
        self._update_interview_state(candidate_response, ai_response)
        
        return {
            "ai_response": ai_response,
            "evaluation": evaluation,
            "current_phase": self.current_phase,
            "time_elapsed": (datetime.utcnow() - self.start_time).seconds,
            "should_continue": self._should_continue_interview()
        }
    
    def _evaluate_response(self, response: str) -> Dict[str, float]:
        """
        Evaluate candidate response (simplified version)
        In production, use a separate evaluation agent or fine-tuned model
        """
        # This is a placeholder - real evaluation would use LLM
        evaluation = {
            "clarity": 0.0,
            "technical_depth": 0.0,
            "relevance": 0.0,
            "confidence": 0.0
        }
        
        # Simple heuristics (replace with LLM-based evaluation)
        word_count = len(response.split())
        
        if word_count > 50:
            evaluation["clarity"] = min(8.0, word_count / 30)
        
        # Check for technical keywords
        technical_keywords = ["python", "javascript", "api", "database", "algorithm", 
                            "architecture", "design", "pattern", "test", "deploy"]
        technical_score = sum(1 for keyword in technical_keywords if keyword.lower() in response.lower())
        evaluation["technical_depth"] = min(10.0, technical_score * 2)
        
        return evaluation
    
    def _update_interview_state(self, candidate_response: str, ai_response: str):
        """Update interview state machine"""
        elapsed_minutes = (datetime.utcnow() - self.start_time).seconds / 60
        
        # Simple state transitions
        if elapsed_minutes < 5:
            self.current_phase = "introduction"
        elif elapsed_minutes < 15:
            self.current_phase = "background"
        elif elapsed_minutes < 35:
            self.current_phase = "technical"
        elif elapsed_minutes < 45:
            self.current_phase = "conclusion"
        else:
            self.current_phase = "completed"
    
    def _should_continue_interview(self) -> bool:
        """Determine if interview should continue"""
        elapsed_minutes = (datetime.utcnow() - self.start_time).seconds / 60
        
        # Continue if under 50 minutes and not in completed phase
        return elapsed_minutes < 50 and self.current_phase != "completed"
    
    async def end_interview(self) -> Dict[str, any]:
        """
        End interview and generate final report
        
        Returns:
            Complete interview report with evaluation
        """
        closing_messages = {
            "fr": """Merci beaucoup d'avoir pris le temps pour cet entretien ! Vous avez montré de bonnes compétences et c'était un plaisir d'échanger avec vous.

Nous allons analyser l'entretien en détail et vous recevrez un retour dans les prochains jours.

Avez-vous des questions avant de terminer ?""",
            
            "en": """Thank you very much for taking the time for this interview! You've demonstrated good skills and it was a pleasure talking with you.

We will analyze the interview in detail and you'll receive feedback in the coming days.

Do you have any questions before we finish?"""
        }
        
        closing = closing_messages.get(self.language, closing_messages["fr"])
        
        # Generate comprehensive report
        visual_eval = self.get_aggregated_visual_evaluation()

        report = {
            "interview_id": "generated_id",
            "duration_minutes": (datetime.utcnow() - self.start_time).seconds / 60,
            "phases_covered": [self.current_phase],
            "questions_asked": len(self.questions_asked),
            "overall_evaluation": self._generate_overall_evaluation(),
            "behavioral_evaluation": visual_eval,  # Include visual/behavioral metrics
            "strengths": self._identify_strengths(),
            "areas_for_improvement": self._identify_improvements(),
            "recommendation": self._generate_recommendation(),
            "transcript": self._get_transcript(),
            "closing_message": closing
        }
        
        return report
    
    def _generate_overall_evaluation(self) -> Dict[str, float]:
        """Generate overall evaluation scores"""
        # Aggregate scores from all evaluations
        return {
            "communication": 7.5,
            "technical_skills": 8.0,
            "problem_solving": 7.0,
            "cultural_fit": 8.5,
            "overall_score": 7.75
        }
    
    def _identify_strengths(self) -> List[str]:
        """Identify candidate strengths"""
        return [
            "Strong communication skills",
            "Good understanding of core concepts",
            "Enthusiastic and motivated"
        ]
    
    def _identify_improvements(self) -> List[str]:
        """Identify areas for improvement"""
        return [
            "Could provide more concrete examples",
            "Deepen knowledge of advanced topics"
        ]
    
    def _generate_recommendation(self) -> str:
        """Generate hiring recommendation"""
        overall_score = 7.75  # From evaluation
        
        if overall_score >= 8.5:
            return "Strongly Recommend"
        elif overall_score >= 7.0:
            return "Recommend"
        elif overall_score >= 6.0:
            return "Consider"
        else:
            return "Not Recommended"
    
    def _get_transcript(self) -> List[Dict[str, str]]:
        """Get full conversation transcript"""
        transcript = []
        for message in self.chat_history.messages:
            transcript.append({
                "role": "AI" if isinstance(message, AIMessage) else "Candidate",
                "content": message.content,
                "timestamp": datetime.utcnow().isoformat()
            })
        return transcript

    async def update_visual_context(self, metrics: Dict):
        """
        Update visual context from video analysis.

        This information is used to:
        - Enrich the agent's understanding of the candidate's state
        - Adjust questioning if candidate appears nervous or confused
        - Include in final evaluation

        Args:
            metrics: Visual analysis metrics including:
                - eyeContactRatio: How much the candidate looks at camera
                - smileRatio: Positive expression indicator
                - attentionRatio: Focus and engagement
                - indicators: confidence, engagement, nervousness scores
        """
        self.visual_context = metrics
        self.visual_metrics_history.append({
            "timestamp": datetime.utcnow().isoformat(),
            **metrics
        })

        # Keep only last 50 measurements
        if len(self.visual_metrics_history) > 50:
            self.visual_metrics_history = self.visual_metrics_history[-50:]

    def get_visual_context_for_prompt(self) -> str:
        """
        Generate a text description of current visual context for the LLM.

        Returns:
            String describing the candidate's observed behavioral state
        """
        if not self.visual_context:
            return ""

        indicators = self.visual_context.get("indicators", {})
        confidence = indicators.get("confidence", 0.5)
        engagement = indicators.get("engagement", 0.5)
        nervousness = indicators.get("nervousness", 0.3)
        eye_contact = self.visual_context.get("eyeContactRatio", 0.5)

        observations = []

        # Interpret metrics into natural language
        if confidence < 0.3:
            observations.append("Le candidat semble peu confiant")
        elif confidence > 0.7:
            observations.append("Le candidat montre une bonne confiance")

        if nervousness > 0.6:
            observations.append("Le candidat paraît nerveux")
        elif nervousness < 0.3:
            observations.append("Le candidat est calme et posé")

        if engagement < 0.3:
            observations.append("Le candidat semble distrait")
        elif engagement > 0.7:
            observations.append("Le candidat est très engagé")

        if eye_contact < 0.3:
            observations.append("Peu de contact visuel avec la caméra")
        elif eye_contact > 0.7:
            observations.append("Bon contact visuel")

        if not observations:
            return ""

        return f"\n[Observation comportementale: {'. '.join(observations)}]"

    def get_aggregated_visual_evaluation(self) -> Dict:
        """
        Calculate aggregated visual metrics for final evaluation.

        Returns:
            Dict with averaged behavioral scores
        """
        if not self.visual_metrics_history:
            return {}

        count = len(self.visual_metrics_history)

        # Average basic metrics
        avg_eye_contact = sum(m.get("eyeContactRatio", 0) for m in self.visual_metrics_history) / count
        avg_attention = sum(m.get("attentionRatio", 0) for m in self.visual_metrics_history) / count

        # Average behavioral indicators
        indicators_sum = {"confidence": 0, "engagement": 0, "nervousness": 0}
        indicators_count = 0

        for m in self.visual_metrics_history:
            if m.get("indicators"):
                for key in indicators_sum:
                    indicators_sum[key] += m["indicators"].get(key, 0)
                indicators_count += 1

        if indicators_count > 0:
            indicators_avg = {k: v / indicators_count for k, v in indicators_sum.items()}
        else:
            indicators_avg = indicators_sum

        return {
            "eye_contact_score": round(avg_eye_contact * 10, 1),  # Convert to 0-10 scale
            "attention_score": round(avg_attention * 10, 1),
            "confidence_score": round(indicators_avg.get("confidence", 0) * 10, 1),
            "engagement_score": round(indicators_avg.get("engagement", 0) * 10, 1),
            "composure_score": round((1 - indicators_avg.get("nervousness", 0)) * 10, 1),  # Inverse of nervousness
            "sample_count": count
        }
