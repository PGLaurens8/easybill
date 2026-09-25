"""Look up Supabase Auth users by email so admins can add members without copying UUIDs."""

import logging
from uuid import UUID

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_PAGE_SIZE = 200
_MAX_PAGES = 25


def _admin_headers(service_role_key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {service_role_key}", "apikey": service_role_key}


def resolve_user_id_by_email(email: str) -> UUID:
    """Return the Supabase user id for ``email``, inviting the user if they have no account yet."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Adding members by email needs SUPABASE_SERVICE_ROLE_KEY on the API. Add them by user id instead.",
        )

    base_url = f"{str(settings.supabase_url).rstrip('/')}/auth/v1"
    headers = _admin_headers(settings.supabase_service_role_key)
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
                break

        invite = client.post(f"{base_url}/invite", headers=headers, json={"email": target})

    if invite.status_code >= 400:
        logger.warning("supabase_invite_failed", extra={"status_code": invite.status_code})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not invite that email address. Check the address and try again.",
        )
    return UUID(invite.json()["id"])
