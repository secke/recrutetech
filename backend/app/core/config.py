from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import secrets


class Settings(BaseSettings):
    """Application settings with validation"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )
    
    # Database
    DATABASE_URL: str = "sqlite:///./test.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # AI Services
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""

    # AWS Configuration
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-west-2"
    BEDROCK_MODEL_ID: str = "anthropic.claude-3-sonnet-20240229-v1:0"

    # Google Cloud Configuration
    GOOGLE_APPLICATION_CREDENTIALS: str = ""  # Path to Google Cloud credentials JSON
    GOOGLE_PROJECT_ID: str = ""

    # AI Configuration
    DEFAULT_LLM_PROVIDER: str = "aws"  # "openai", "anthropic", "aws"
    DEFAULT_STT_PROVIDER: str = "google"  # "google", "openai", "aws"
    STT_FALLBACK_PROVIDER: str = "openai"  # Fallback if primary STT fails
    DEFAULT_TTS_PROVIDER: str = "aws"  # "openai", "elevenlabs", "aws"
    DEFAULT_VOICE: str = "Lea"  # OpenAI: alloy, echo, fable, onyx, nova, shimmer
    
    # WebRTC / Streaming
    LIVEKIT_API_KEY: str = ""
    LIVEKIT_API_SECRET: str = ""
    LIVEKIT_URL: str = "ws://localhost:7880"
    
    # Storage (for video recordings)
    S3_BUCKET: str = "recrutetech-interviews"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_ENDPOINT: str = ""
    S3_REGION: str = "us-west-2"
    
    # Application
    PROJECT_NAME: str = "RecruteTech AI Interviewer"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    
    # Interview Settings
    MAX_INTERVIEW_DURATION_MINUTES: int = 60
    MAX_CONCURRENT_INTERVIEWS: int = 100
    AUDIO_BUFFER_SIZE: int = 48000  # ~3 seconds at 16kHz
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


settings = Settings()
