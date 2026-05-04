"""HR-side endpoints: create and list interview templates (Roles)."""
import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.auth import require_hr_api_key
from app.core.config import settings
from app.db import get_session
from app.models import Role, Interview
from app.services.prompt_builder import build_first_message, build_system_prompt

router = APIRouter(
    prefix="/api/roles",
    tags=["roles"],
    dependencies=[Depends(require_hr_api_key)],
)


class RoleCreate(BaseModel):
    title: str
    seniority: str = "senior"
    company: str = "Lumen Labs"
    duration_minutes: int = 45
    language: str = "fr"
    tone: str = "warm"
    stages: List[str] = ["intro", "experience", "technical", "code"]
    skills: List[str] = []


class RoleUpdate(BaseModel):
    title: Optional[str] = None
    seniority: Optional[str] = None
    company: Optional[str] = None
    duration_minutes: Optional[int] = None
    language: Optional[str] = None
    tone: Optional[str] = None
    stages: Optional[List[str]] = None
    skills: Optional[List[str]] = None


class RoleOut(BaseModel):
    id: int
    public_token: str
    title: str
    seniority: str
    company: str
    duration_minutes: int
    language: str
    tone: str
    stages: List[str]
    skills: List[str]
    share_url: str
    created_at: datetime
    interview_count: int = 0


def _to_out(role: Role, interview_count: int = 0) -> RoleOut:
    return RoleOut(
        id=role.id,
        public_token=role.public_token,
        title=role.title,
        seniority=role.seniority,
        company=role.company,
        duration_minutes=role.duration_minutes,
        language=role.language,
        tone=role.tone,
        stages=json.loads(role.stages_json or "[]"),
        skills=json.loads(role.skills_json or "[]"),
        share_url=f"{settings.PUBLIC_FRONTEND_URL}/screening/{role.public_token}",
        created_at=role.created_at,
        interview_count=interview_count,
    )


@router.post("", response_model=RoleOut)
def create_role(payload: RoleCreate, session: Session = Depends(get_session)) -> RoleOut:
    role = Role(
        title=payload.title,
        seniority=payload.seniority,
        company=payload.company,
        duration_minutes=payload.duration_minutes,
        language=payload.language,
        tone=payload.tone,
        stages_json=json.dumps(payload.stages),
        skills_json=json.dumps(payload.skills),
    )
    role.system_prompt = build_system_prompt(
        title=payload.title,
        seniority=payload.seniority,
        company=payload.company,
        duration_minutes=payload.duration_minutes,
        language=payload.language,
        tone=payload.tone,
        stages=payload.stages,
        skills=payload.skills,
    )
    role.first_message = build_first_message(title=payload.title, language=payload.language)

    session.add(role)
    session.commit()
    session.refresh(role)
    return _to_out(role, 0)


@router.get("", response_model=List[RoleOut])
def list_roles(session: Session = Depends(get_session)) -> List[RoleOut]:
    roles = session.exec(select(Role).order_by(Role.created_at.desc())).all()
    out: list[RoleOut] = []
    for r in roles:
        count = len(session.exec(select(Interview).where(Interview.role_id == r.id)).all())
        out.append(_to_out(r, count))
    return out


@router.get("/{role_id}", response_model=RoleOut)
def get_role(role_id: int, session: Session = Depends(get_session)) -> RoleOut:
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    count = len(session.exec(select(Interview).where(Interview.role_id == role.id)).all())
    return _to_out(role, count)


@router.patch("/{role_id}", response_model=RoleOut)
def update_role(
    role_id: int,
    payload: RoleUpdate,
    session: Session = Depends(get_session),
) -> RoleOut:
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(404, "Role not found")

    data = payload.model_dump(exclude_unset=True)
    if "stages" in data:
        role.stages_json = json.dumps(data.pop("stages"))
    if "skills" in data:
        role.skills_json = json.dumps(data.pop("skills"))
    for k, v in data.items():
        setattr(role, k, v)

    prompt_keys = {"title", "seniority", "company", "duration_minutes",
                   "language", "tone", "stages", "skills"}
    if payload.model_fields_set & prompt_keys:
        role.system_prompt = build_system_prompt(
            title=role.title,
            seniority=role.seniority,
            company=role.company,
            duration_minutes=role.duration_minutes,
            language=role.language,
            tone=role.tone,
            stages=json.loads(role.stages_json or "[]"),
            skills=json.loads(role.skills_json or "[]"),
        )
        role.first_message = build_first_message(title=role.title, language=role.language)

    session.add(role)
    session.commit()
    session.refresh(role)
    count = len(session.exec(select(Interview).where(Interview.role_id == role.id)).all())
    return _to_out(role, count)


@router.delete("/{role_id}", status_code=204)
def delete_role(role_id: int, session: Session = Depends(get_session)) -> None:
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    has_iv = session.exec(select(Interview).where(Interview.role_id == role_id)).first()
    if has_iv:
        raise HTTPException(409, "Cannot delete a role with existing interviews")
    session.delete(role)
    session.commit()
