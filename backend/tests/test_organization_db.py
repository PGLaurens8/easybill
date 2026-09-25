import unittest
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.commercial import MembershipRole
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationMembershipCreate,
    OrganizationMembershipUpdate,
)
from app.services.organizations import (
    add_organization_membership,
    create_organization,
    list_organization_memberships,
    list_organizations_for_user,
    update_organization_membership_role,
)


@compiles(JSONB, 'sqlite')
def _compile_jsonb_sqlite(_type, _compiler, **_kw):
    return 'JSON'


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

    def test_add_and_list_organization_memberships(self):
        actor_user_id = uuid4()
        invited_user_id = uuid4()

        with self.SessionLocal() as db:
            organization = create_organization(
                db,
                OrganizationCreate(name='PGQS', slug='pgqs'),
                actor_user_id,
            )

            membership = add_organization_membership(
                db,
                organization.id,
                OrganizationMembershipCreate(
                    user_id=invited_user_id,
                    role=MembershipRole.quantity_surveyor,
                ),
                actor_user_id,
            )

            memberships = list_organization_memberships(db, organization.id)
            invited_organizations = list_organizations_for_user(db, invited_user_id)

            self.assertEqual(membership.user_id, invited_user_id)
            self.assertEqual(membership.role, MembershipRole.quantity_surveyor)
            self.assertEqual(len(memberships), 2)
            self.assertEqual({item.user_id for item in memberships}, {actor_user_id, invited_user_id})
            self.assertEqual(len(invited_organizations), 1)
            self.assertEqual(invited_organizations[0].id, organization.id)

    def test_add_membership_rejects_duplicate_user(self):
        actor_user_id = uuid4()
        invited_user_id = uuid4()

        with self.SessionLocal() as db:
            organization = create_organization(
                db,
                OrganizationCreate(name='PGQS', slug='pgqs'),
                actor_user_id,
            )
            add_organization_membership(
                db,
                organization.id,
                OrganizationMembershipCreate(
                    user_id=invited_user_id,
                    role=MembershipRole.quantity_surveyor,
                ),
                actor_user_id,
            )

            with self.assertRaises(HTTPException) as context:
                add_organization_membership(
                    db,
                    organization.id,
                    OrganizationMembershipCreate(
                        user_id=invited_user_id,
                        role=MembershipRole.accounts,
                    ),
                    actor_user_id,
                )

            self.assertEqual(context.exception.status_code, 409)
            self.assertEqual(context.exception.detail, 'User is already a member of this organization')

    def test_add_membership_requires_existing_organization(self):
        actor_user_id = uuid4()

        with self.SessionLocal() as db:
            with self.assertRaises(HTTPException) as context:
                add_organization_membership(
                    db,
                    uuid4(),
                    OrganizationMembershipCreate(
                        user_id=uuid4(),
                        role=MembershipRole.quantity_surveyor,
                    ),
                    actor_user_id,
                )

            self.assertEqual(context.exception.status_code, 404)
            self.assertEqual(context.exception.detail, 'Organization not found')

    def test_update_membership_role(self):
        actor_user_id = uuid4()
        invited_user_id = uuid4()

        with self.SessionLocal() as db:
            organization = create_organization(
                db,
                OrganizationCreate(name='PGQS', slug='pgqs'),
                actor_user_id,
            )
            membership = add_organization_membership(
                db,
                organization.id,
                OrganizationMembershipCreate(
                    user_id=invited_user_id,
                    role=MembershipRole.contractor,
                ),
                actor_user_id,
            )

            updated_membership = update_organization_membership_role(
                db,
                organization.id,
                membership.id,
                OrganizationMembershipUpdate(role=MembershipRole.accounts),
                actor_user_id,
            )

            self.assertEqual(updated_membership.role, MembershipRole.accounts)

    def test_update_membership_requires_existing_membership(self):
        actor_user_id = uuid4()

        with self.SessionLocal() as db:
            organization = create_organization(
                db,
                OrganizationCreate(name='PGQS', slug='pgqs'),
                actor_user_id,
            )

            with self.assertRaises(HTTPException) as context:
                update_organization_membership_role(
                    db,
                    organization.id,
                    uuid4(),
                    OrganizationMembershipUpdate(role=MembershipRole.accounts),
                    actor_user_id,
                )

            self.assertEqual(context.exception.status_code, 404)
            self.assertEqual(context.exception.detail, 'Membership not found')

    def test_last_org_admin_cannot_demote_self(self):
        actor_user_id = uuid4()

        with self.SessionLocal() as db:
            organization = create_organization(
                db,
                OrganizationCreate(name='PGQS', slug='pgqs'),
                actor_user_id,
            )
            admin_membership = list_organization_memberships(db, organization.id)[0]

            with self.assertRaises(HTTPException) as context:
                update_organization_membership_role(
                    db,
                    organization.id,
                    admin_membership.id,
                    OrganizationMembershipUpdate(role=MembershipRole.accounts),
                    actor_user_id,
                )

            self.assertEqual(context.exception.status_code, 409)
            self.assertEqual(context.exception.detail, 'At least one organization admin is required')


if __name__ == '__main__':
    unittest.main()
