import unittest
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.commercial import MembershipRole
from app.schemas.organization import OrganizationCreate
from app.services.commercial import create_organization, list_organizations_for_user


@compiles(UUID, 'sqlite')
def _compile_uuid_sqlite(_type, _compiler, **_kw):
    return 'TEXT'


class OrganizationDatabaseIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            'sqlite+pysqlite:///:memory:',
            connect_args={'check_same_thread': False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine, autoflush=False, autocommit=False, expire_on_commit=False)

    def tearDown(self):
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_create_organization_creates_membership_for_creator(self):
        actor_user_id = uuid4()

        with self.SessionLocal() as db:
            organization = create_organization(
                db,
                OrganizationCreate(name='PGQS', slug='pgqs'),
                actor_user_id,
            )

            memberships = list(organization.memberships)
            visible_organizations = list_organizations_for_user(db, actor_user_id)

            self.assertEqual(organization.name, 'PGQS')
            self.assertEqual(organization.slug, 'pgqs')
            self.assertEqual(len(memberships), 1)
            self.assertEqual(memberships[0].user_id, actor_user_id)
            self.assertEqual(memberships[0].role, MembershipRole.org_admin)
            self.assertEqual(len(visible_organizations), 1)
            self.assertEqual(visible_organizations[0].id, organization.id)


if __name__ == '__main__':
    unittest.main()
