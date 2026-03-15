from uuid import UUID

import httpx
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.commercial import Membership, MembershipRole
from app.schemas.auth import CurrentUser

settings = get_settings()


async def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase auth settings are not configured",
        )

    token = authorization.split(" ", 1)[1]
    user_url = f"{str(settings.supabase_url).rstrip('/')}/auth/v1/user"

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            user_url,
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_anon_key,
            },
        )

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Supabase token")

    payload = response.json()
    return CurrentUser(id=payload["id"], email=payload.get("email"))


def require_org_membership(allowed_roles: set[MembershipRole] | None = None):
    def dependency(
        organization_id: UUID = Header(alias="X-Organization-Id"),
        current_user: CurrentUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> UUID:
        membership = db.scalar(
            select(Membership).where(
                Membership.organization_id == organization_id,
                Membership.user_id == current_user.id,
            )
        )

        if membership is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No organization access")

        if allowed_roles and membership.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")

        return organization_id

    return dependency
