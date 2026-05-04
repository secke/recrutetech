"""Lean SMTP wrapper used to notify candidates after their interview completes.

Stdlib `smtplib` on purpose — no new dependency, runs synchronously in a
worker thread (FastAPI BackgroundTasks). If SMTP is not configured, it
logs and no-ops so dev environments don't blow up.
"""
from __future__ import annotations

import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import settings


def _is_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM_EMAIL)


def send_email(*, to: str, subject: str, body: str) -> bool:
    """Send a plain-text email. Returns False (and logs) when SMTP isn't set up."""
    if not _is_configured():
        print(f"📭 SMTP not configured — would have emailed {to}: {subject!r}")
        return False
    if not to:
        print("📭 send_email skipped: empty recipient")
        return False

    msg = EmailMessage()
    msg["From"] = formataddr((settings.SMTP_FROM_NAME, settings.SMTP_FROM_EMAIL))
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        if settings.SMTP_USE_TLS:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as s:
                s.starttls()
                if settings.SMTP_USERNAME:
                    s.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                s.send_message(msg)
        else:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as s:
                if settings.SMTP_USERNAME:
                    s.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                s.send_message(msg)
        return True
    except Exception as e:
        print(f"❌ send_email to {to} failed: {e}")
        return False


def candidate_completion_email(
    *, candidate_name: str, role_title: str, company: str, language: str
) -> tuple[str, str]:
    """Build (subject, body) for the post-interview thank-you message."""
    name = candidate_name.strip() or ("there" if language == "en" else "")
    if language == "en":
        subject = f"Thanks for interviewing for {role_title} at {company}"
        body = (
            f"Hi {name or 'there'},\n\n"
            f"Thanks for taking the time to talk with Aria today about the "
            f"{role_title} role at {company}.\n\n"
            f"Your interview has been recorded and is now being reviewed. "
            f"You'll hear back from the {company} team within a few days "
            f"with detailed feedback and next steps.\n\n"
            f"Best,\n"
            f"The {company} hiring team"
        )
        return subject, body

    subject = f"Merci pour votre entretien — {role_title} chez {company}"
    body = (
        f"Bonjour {name},\n\n"
        f"Merci d'avoir pris le temps d'échanger avec Aria aujourd'hui pour le poste de "
        f"{role_title} chez {company}.\n\n"
        f"Votre entretien a bien été enregistré et est en cours d'analyse. "
        f"L'équipe {company} reviendra vers vous d'ici quelques jours avec un retour "
        f"détaillé et les prochaines étapes.\n\n"
        f"Cordialement,\n"
        f"L'équipe {company}"
    )
    return subject, body
