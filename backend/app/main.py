from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import candidate, cv, interviews, roles, rubrics, screenings, webhooks
from app.core.config import settings
from app.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print(f"🚀 {settings.PROJECT_NAME} ready")
    if not settings.ELEVENLABS_AGENT_ID:
        print("⚠️  ELEVENLABS_AGENT_ID not set — run `python -m app.scripts.bootstrap_agent`")
    yield


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "ok",
        "agent_configured": bool(settings.ELEVENLABS_AGENT_ID),
    }


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(roles.router)
app.include_router(rubrics.router)
app.include_router(screenings.router)
app.include_router(interviews.router)
app.include_router(cv.router)
app.include_router(webhooks.router)
app.include_router(candidate.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
