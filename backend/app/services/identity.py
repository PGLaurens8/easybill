"""Supabase Auth admin helpers, used by operational scripts (e.g. seeding the demo login)."""

import logging
from uuid import UUID

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_PAGE_SIZE = 200
_MAX_PAGES = 25


def _admin_base() -> tuple[str, dict[str, str]]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
        )
    key = settings.supabase_service_role_key
    return (
        f"{str(settings.supabase_url).rstrip('/')}/auth/v1",
        {"Authorization": f"Bearer {key}", "apikey": key},
    )


def find_user_id_by_email(email: str) -> UUID | None:
    base_url, headers = _admin_base()
    target = email.strip().lower()

    with httpx.Client(timeout=10.0) as client:
        for page in range(1, _MAX_PAGES + 1):
            response = client.get(
                f"{base_url}/admin/users",
                headers=headers,
                params={"page": page, "per_page": _PAGE_SIZE},
            )
            response.raise_for_status()
            users = response.json().get("users", [])
            for user in users:
                if (user.get("email") or "").lower() == target:
                    return UUID(user["id"])
            if len(users) < _PAGE_SIZE:
                return None
    return None


def ensure_password_user(email: str, password: str) -> UUID:
    """Create a confirmed email/password user (or reset the password of an existing one)."""
    base_url, headers = _admin_base()
    existing = find_user_id_by_email(email)

    with httpx.Client(timeout=10.0) as client:
        if existing is None:
            response = client.post(
                f"{base_url}/admin/users",
                headers=headers,
                json={"email": email.strip().lower(), "password": password, "email_confirm": True},
            )
        else:
            response = client.put(
                f"{base_url}/admin/users/{existing}",
                headers=headers,
                json={"password": password, "email_confirm": True},
            )
        response.raise_for_status()
        return UUID(response.json()["id"])
