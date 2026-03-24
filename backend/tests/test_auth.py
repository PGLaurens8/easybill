import base64
import hashlib
import hmac
import json
import time
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException, status

from app.api.deps import auth


class DummyResponse:
    def __init__(self, status_code: int, payload: dict[str, object]):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


class DummyAsyncClient:
    def __init__(self, response: DummyResponse):
        self._response = response
        self.calls: list[tuple[str, dict[str, str]]] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get(self, url: str, headers: dict[str, str]):
        self.calls.append((url, headers))
        return self._response


class AuthDependencyTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.original_supabase_url = auth.settings.supabase_url
        self.original_supabase_anon_key = auth.settings.supabase_anon_key
        self.original_supabase_jwt_secret = auth.settings.supabase_jwt_secret

    def tearDown(self):
        auth.settings.supabase_url = self.original_supabase_url
        auth.settings.supabase_anon_key = self.original_supabase_anon_key
        auth.settings.supabase_jwt_secret = self.original_supabase_jwt_secret

    def build_token(self, secret: str, payload_overrides: dict[str, object] | None = None) -> tuple[str, str]:
        user_id = str(uuid4())
        payload = {
            'sub': user_id,
            'email': 'admin@example.com',
            'role': 'authenticated',
            'exp': int(time.time()) + 3600,
        }
        if payload_overrides:
            payload.update(payload_overrides)

        header_segment = base64.urlsafe_b64encode(json.dumps({'alg': 'HS256', 'typ': 'JWT'}).encode()).decode().rstrip('=')
        payload_segment = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
        signing_input = f'{header_segment}.{payload_segment}'.encode()
        signature = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
        signature_segment = base64.urlsafe_b64encode(signature).decode().rstrip('=')
        return f'{header_segment}.{payload_segment}.{signature_segment}', user_id

    async def test_get_current_user_validates_hs256_token_locally(self):
        auth.settings.supabase_jwt_secret = 'test-secret'
        auth.settings.supabase_url = None
        auth.settings.supabase_anon_key = None
        token, user_id = self.build_token(auth.settings.supabase_jwt_secret)

        with patch('app.api.deps.auth.httpx.AsyncClient') as async_client:
            current_user = await auth.get_current_user(f'Bearer {token}')

        async_client.assert_not_called()
        self.assertEqual(str(current_user.id), user_id)
        self.assertEqual(current_user.email, 'admin@example.com')

    async def test_get_current_user_rejects_expired_local_token(self):
        auth.settings.supabase_jwt_secret = 'test-secret'
        token, _ = self.build_token(auth.settings.supabase_jwt_secret, {'exp': int(time.time()) - 1})

        with self.assertRaises(HTTPException) as ctx:
            await auth.get_current_user(f'Bearer {token}')

        self.assertEqual(ctx.exception.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(ctx.exception.detail, 'Supabase token has expired')

    async def test_get_current_user_rejects_invalid_local_signature(self):
        auth.settings.supabase_jwt_secret = 'test-secret'
        token, _ = self.build_token('wrong-secret')

        with self.assertRaises(HTTPException) as ctx:
            await auth.get_current_user(f'Bearer {token}')

        self.assertEqual(ctx.exception.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(ctx.exception.detail, 'Invalid Supabase token')

    async def test_get_current_user_falls_back_to_supabase_lookup_without_jwt_secret(self):
        auth.settings.supabase_jwt_secret = None
        auth.settings.supabase_url = 'https://example.supabase.co'
        auth.settings.supabase_anon_key = 'anon-key'
        response = DummyResponse(200, {'id': str(uuid4()), 'email': 'lookup@example.com'})
        async_client = DummyAsyncClient(response)

        with patch('app.api.deps.auth.httpx.AsyncClient', return_value=async_client):
            current_user = await auth.get_current_user('Bearer fallback-token')

        self.assertEqual(current_user.email, 'lookup@example.com')
        self.assertEqual(len(async_client.calls), 1)
        url, headers = async_client.calls[0]
        self.assertEqual(url, 'https://example.supabase.co/auth/v1/user')
        self.assertEqual(headers['Authorization'], 'Bearer fallback-token')
        self.assertEqual(headers['apikey'], 'anon-key')


if __name__ == '__main__':
    unittest.main()
