import logging
from collections.abc import Iterable
from uuid import UUID

import httpx
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.commercial import Membership, MembershipRole
from app.schemas.auth import CurrentUser, OrgAccess

settings = get_settings()
logger = logging.getLogger(__name__)


async def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing bearer token')

    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Supabase auth settings are not configured',
        )

    token = authorization.split(' ', 1)[1]
    user_url = f"{str(settings.supabase_url).rstrip('/')}/auth/v1/user"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                user_url,
                headers={
                    'Authorization': f'Bearer {token}',
                    'apikey': settings.supabase_anon_key,
                },
            )
    except httpx.HTTPError as exc:
        logger.exception('supabase_user_lookup_failed', extra={'user_url': user_url})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Authentication provider is temporarily unavailable',
        ) from exc

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid Supabase token')

    try:
        payload = response.json()
        return CurrentUser(
            id=payload['id'],
            email=payload.get('email'),
            email_confirmed=bool(payload.get('email_confirmed_at') or payload.get('confirmed_at')),
        )
    except (KeyError, ValueError, TypeError) as exc:
        logger.exception('supabase_user_payload_invalid', extra={'user_url': user_url})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Authentication provider returned an invalid response',
        ) from exc


def require_org_membership(allowed_roles: Iterable[MembershipRole] | None = None):
    allowed = frozenset(allowed_roles) if allowed_roles else None

    def dependency(
        header_organization_id: UUID = Header(alias='X-Organization-Id'),
        organization_id: UUID | None = None,
        current_user: CurrentUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> OrgAccess:
        if organization_id is not None and organization_id != header_organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Organization path and header must match',
            )

        membership = db.scalar(
            select(Membership).where(
                Membership.organization_id == header_organization_id,
                Membership.user_id == current_user.id,
            )
        )

        if membership is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='No organization access')

        if allowed and membership.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient role')

        return OrgAccess(
            organization_id=header_organization_id,
            user_id=current_user.id,
            role=membership.role,
            email=current_user.email,
        )

    return dependency
