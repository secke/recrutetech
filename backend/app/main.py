from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uuid

from app.core.config import settings
from app.api.websocket.interview_ws import interview_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events for startup and shutdown"""
    # Startup
    print(f"🚀 {settings.PROJECT_NAME} starting...")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"LLM Provider: {settings.DEFAULT_LLM_PROVIDER}")
    print(f"TTS Provider: {settings.DEFAULT_TTS_PROVIDER}")
    
    yield
    
    # Shutdown
    print("👋 Shutting down gracefully...")


# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - health check"""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "version": "0.1.0",
        "status": "healthy",
        "features": [
            "Real-time AI interviews",
            "Speech-to-Text",
            "Text-to-Speech", 
            "Adaptive questioning",
            "Automated evaluation"
        ],
        "docs": f"{settings.API_V1_STR}/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "active_interviews": interview_manager.get_active_sessions_count()
    }


# WebSocket endpoint for AI interviews
@app.websocket("/ws/interview/{interview_token}")
async def interview_websocket(websocket: WebSocket, interview_token: str):
    """
    WebSocket endpoint for real-time AI interviews
    
    Args:
        websocket: WebSocket connection
        interview_token: Unique token for interview access
    
    Protocol:
        Client sends:
        - Audio chunks (binary): Real-time audio from candidate
        - Text messages (JSON): {"type": "text_message", "content": "..."}
        - Control (JSON): {"type": "end_interview"}
        
        Server sends (JSON):
        - {"type": "ai_message", "text": "...", "audio": "hex_data"}
        - {"type": "transcription", "text": "..."}
        - {"type": "ai_response", "text": "...", "audio": "...", "evaluation": {...}}
        - {"type": "interview_complete", "report": {...}}
        - {"type": "error", "message": "..."}
    """
    # TODO: Validate interview_token from database
    # For now, accept any token
    
    session_id = str(uuid.uuid4())
    
    # Default interview configuration
    # In production, load from database based on interview_token
    interview_config = {
        "type": "technical",
        "job_role": "Software Engineer",
        "skills": ["Python", "FastAPI", "React", "PostgreSQL"],
        "language": "fr",
        "company_name": "Example Corp"
    }
    
    await interview_manager.handle_connection(
        websocket=websocket,
        session_id=session_id,
        interview_config=interview_config
    )


# REST API endpoints (for dashboard, etc.)
from fastapi import APIRouter

api_router = APIRouter()


@api_router.get("/interviews/active")
async def get_active_interviews():
    """Get count of currently active interviews"""
    return {
        "active_count": interview_manager.get_active_sessions_count(),
        "max_concurrent": settings.MAX_CONCURRENT_INTERVIEWS
    }


@api_router.post("/interviews/create")
async def create_interview(interview_data: dict):
    """
    Create a new interview session
    
    Request body:
    {
        "candidate_email": "candidate@example.com",
        "candidate_name": "John Doe",
        "job_role": "Backend Developer",
        "interview_type": "technical",
        "required_skills": ["Python", "FastAPI"],
        "language": "fr"
    }
    
    Returns:
        Interview token and WebSocket URL
    """
    # Generate unique interview token
    interview_token = str(uuid.uuid4())
    
    # TODO: Save to database
    # interview = Interview(
    #     token=interview_token,
    #     candidate_email=interview_data["candidate_email"],
    #     ...
    # )
    
    # Return WebSocket connection URL
    ws_url = f"ws://localhost:8000/ws/interview/{interview_token}"
    
    return {
        "interview_token": interview_token,
        "websocket_url": ws_url,
        "candidate_url": f"http://localhost:3000/interview/{interview_token}",
        "expires_in_hours": 48
    }


# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR, tags=["Interviews"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
