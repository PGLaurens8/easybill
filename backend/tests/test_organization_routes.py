import unittest
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps.auth import get_current_user
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.commercial import Membership, MembershipRole, Organization
from app.schemas.auth import CurrentUser


@compiles(JSONB, 'sqlite')
def _compile_jsonb_sqlite(_type, _compiler, **_kw):
    return 'JSON'


@compiles(UUID, 'sqlite')
def _compile_uuid_sqlite(_type, _compiler, **_kw):
    return 'TEXT'


class OrganizationRouteAccessTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            'sqlite+pysqlite:///:memory:',
            connect_args={'check_same_thread': False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine, autoflush=False, autocommit=False, expire_on_commit=False)

        self.current_user_id = uuid4()
        self.primary_org_id = uuid4()
        self.secondary_org_id = uuid4()
        self.viewer_user_id = uuid4()
        self.viewer_membership_id = uuid4()

        with self.SessionLocal() as db:
            db.add_all(
                [
                    Organization(
                        id=self.primary_org_id,
                        name='Primary Org',
                        slug='primary-org',
                    ),
                    Organization(
                        id=self.secondary_org_id,
                        name='Secondary Org',
                        slug='secondary-org',
                    ),
                    Membership(
                        organization_id=self.primary_org_id,
                        user_id=self.current_user_id,
                        role=MembershipRole.org_admin,
                    ),
                    Membership(
                        id=self.viewer_membership_id,
                        organization_id=self.primary_org_id,
                        user_id=self.viewer_user_id,
                        role=MembershipRole.quantity_surveyor,
                    ),
                ]
            )
            db.commit()

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        async def override_get_current_user():
            return CurrentUser(id=self.current_user_id, email='admin@example.com')

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        self.client = TestClient(app, raise_server_exceptions=False)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_list_memberships_allows_matching_header_and_path(self):
        response = self.client.get(
            f'/api/v1/organizations/{self.primary_org_id}/memberships',
            headers={'X-Organization-Id': str(self.primary_org_id)},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)
        self.assertEqual(response.json()[0]['organization_id'], str(self.primary_org_id))

    def test_list_memberships_rejects_mismatched_header_and_path(self):
        response = self.client.get(
            f'/api/v1/organizations/{self.secondary_org_id}/memberships',
            headers={'X-Organization-Id': str(self.primary_org_id)},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()['detail'], 'Organization path and header must match')

    def test_add_membership_rejects_mismatched_header_and_path(self):
        response = self.client.post(
            f'/api/v1/organizations/{self.secondary_org_id}/memberships',
            headers={'X-Organization-Id': str(self.primary_org_id)},
            json={
                'user_id': str(uuid4()),
                'role': MembershipRole.accounts.value,
            },
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()['detail'], 'Organization path and header must match')

    def test_update_membership_rejects_mismatched_header_and_path(self):
        response = self.client.patch(
            f'/api/v1/organizations/{self.secondary_org_id}/memberships/{self.viewer_membership_id}',
            headers={'X-Organization-Id': str(self.primary_org_id)},
            json={'role': MembershipRole.accounts.value},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()['detail'], 'Organization path and header must match')

    def test_add_membership_requires_org_admin_role(self):
        self.current_user_id = self.viewer_user_id

        response = self.client.post(
            f'/api/v1/organizations/{self.primary_org_id}/memberships',
            headers={'X-Organization-Id': str(self.primary_org_id)},
            json={
                'user_id': str(uuid4()),
                'role': MembershipRole.accounts.value,
            },
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()['detail'], 'Insufficient role')

    def test_update_membership_requires_org_admin_role(self):
        self.current_user_id = self.viewer_user_id

        response = self.client.patch(
            f'/api/v1/organizations/{self.primary_org_id}/memberships/{self.viewer_membership_id}',
            headers={'X-Organization-Id': str(self.primary_org_id)},
            json={'role': MembershipRole.accounts.value},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()['detail'], 'Insufficient role')


if __name__ == '__main__':
    unittest.main()
