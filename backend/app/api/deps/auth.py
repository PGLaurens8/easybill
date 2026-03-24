import base64
import binascii
import hashlib
import hmac
import json
import logging
import time
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
logger = logging.getLogger(__name__)


def _decode_jwt_segment(segment: str) -> dict[str, object]:
    padding = '=' * (-len(segment) % 4)
    try:
        decoded = base64.urlsafe_b64decode(f'{segment}{padding}')
        value = json.loads(decoded)
    except (ValueError, binascii.Error, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid Supabase token') from exc

    if not isinstance(value, dict):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid Supabase token')

    return value


def _decode_and_verify_jwt(token: str, secret: str) -> CurrentUser:
    try:
        header_segment, payload_segment, signature_segment = token.split('.')
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid Supabase token') from exc

    header = _decode_jwt_segment(header_segment)
    payload = _decode_jwt_segment(payload_segment)

    if header.get('alg') != 'HS256':
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Unsupported Supabase token algorithm')

    signing_input = f'{header_segment}.{payload_segment}'.encode()
    expected_signature = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
    padding = '=' * (-len(signature_segment) % 4)
    try:
        provided_signature = base64.urlsafe_b64decode(f'{signature_segment}{padding}')
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid Supabase token') from exc

    if not hmac.compare_digest(provided_signature, expected_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid Supabase token')

    expires_at = payload.get('exp')
    if not isinstance(expires_at, (int, float)) or expires_at <= time.time():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Supabase token has expired')

    user_id = payload.get('sub')
    if not isinstance(user_id, str):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid Supabase token')

    email = payload.get('email')
    return CurrentUser(id=UUID(user_id), email=email if isinstance(email, str) else None)


async def _lookup_current_user_via_supabase(token: str) -> CurrentUser:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Supabase auth settings are not configured',
        )

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
        return CurrentUser(id=payload['id'], email=payload.get('email'))
    except (KeyError, ValueError, TypeError) as exc:
        logger.exception('supabase_user_payload_invalid', extra={'user_url': user_url})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Authentication provider returned an invalid response',
        ) from exc


async def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing bearer token')

    token = authorization.split(' ', 1)[1]

    if settings.supabase_jwt_secret:
        return _decode_and_verify_jwt(token, settings.supabase_jwt_secret)

    return await _lookup_current_user_via_supabase(token)


def require_org_membership(allowed_roles: set[MembershipRole] | None = None):
    def dependency(
        header_organization_id: UUID = Header(alias='X-Organization-Id'),
        organization_id: UUID | None = None,
        current_user: CurrentUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> UUID:
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

        if allowed_roles and membership.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient role')

        return header_organization_id

    return dependency
