from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ElevenLabs
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_AGENT_ID: str = ""
    ELEVENLABS_WEBHOOK_SECRET: str = ""

    # HR API key — gates /api/roles and /api/interviews. Empty = dev bypass.
    HR_API_KEY: str = ""

    # Claude API — used to generate post-interview HR reports + candidate letters.
    # Without this set, the webhook completes but reports / personalized emails are skipped.
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-opus-4-7"

    # SMTP — used to send candidate notifications. Empty host = dev no-op.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "RecruteTech"
    SMTP_USE_TLS: bool = True

    # URLs
    PUBLIC_BACKEND_URL: str = "http://localhost:8000"
    PUBLIC_FRONTEND_URL: str = "http://localhost:5173"

    # CORS
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]

    # Database
    DATABASE_URL: str = "sqlite:///./recrutetech.db"

    # App
    PROJECT_NAME: str = "RecruteTech"
    ENVIRONMENT: str = "development"

    # Feature flags — cv-adaptive-personalization skill
    # Phase 1 silent rollout: when False, the personalized prompt is computed and
    # persisted to Interview.personalized_prompt but NOT injected into the ElevenLabs
    # agent override. Flip to True for Phase 2 opt-in (per skill spec rollout phasing).
    CV_PERSONALIZATION_INJECT: bool = False


settings = Settings()
