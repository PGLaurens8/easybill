import unittest
from uuid import uuid4

from fastapi import HTTPException

from app.models.commercial import MembershipRole
from app.schemas.organization import OrganizationMembershipCreate, OrganizationMembershipUpdate
from app.services.organizations import (
    add_organization_membership,
    list_organization_memberships,
    remove_organization_membership,
    update_organization_membership_role,
)
from tests.support import add_member, make_session_factory, seed_workspace


class MembershipManagementTests(unittest.TestCase):
    def setUp(self):
        self.engine, self.SessionLocal = make_session_factory()
        with self.SessionLocal() as db:
            self.ws = seed_workspace(db)

    def tearDown(self):
        self.engine.dispose()

    def membership_with_role(self, db, role):
        return next(m for m in list_organization_memberships(db, self.ws.organization_id) if m.role == role)

    def test_adds_member_by_email_using_the_resolver(self):
        resolved_id = uuid4()
        seen = []

        def resolver(email):
            seen.append(email)
            return resolved_id

        with self.SessionLocal() as db:
            membership = add_organization_membership(
                db,
                self.ws.organization_id,
                OrganizationMembershipCreate(email="Site.Sub@Example.com", role=MembershipRole.contractor),
                self.ws.admin_user_id,
                resolve_email=resolver,
            )

        self.assertEqual(seen, ["site.sub@example.com"])
        self.assertEqual(membership.user_id, resolved_id)
        self.assertEqual(membership.email, "site.sub@example.com")

    def test_requires_email_or_user_id(self):
        with self.assertRaises(ValueError):
            OrganizationMembershipCreate(role=MembershipRole.contractor)

    def test_removes_member(self):
        with self.SessionLocal() as db:
            add_member(db, self.ws, MembershipRole.contractor)
            contractor = self.membership_with_role(db, MembershipRole.contractor)
            remove_organization_membership(db, self.ws.organization_id, contractor.id)
            self.assertEqual(len(list_organization_memberships(db, self.ws.organization_id)), 1)

    def test_cannot_remove_or_demote_the_last_admin(self):
        with self.SessionLocal() as db:
            admin = self.membership_with_role(db, MembershipRole.org_admin)
            with self.assertRaises(HTTPException) as removal:
                remove_organization_membership(db, self.ws.organization_id, admin.id)
            self.assertEqual(removal.exception.status_code, 409)

            with self.assertRaises(HTTPException) as demotion:
                update_organization_membership_role(
                    db,
                    self.ws.organization_id,
                    admin.id,
                    OrganizationMembershipUpdate(role=MembershipRole.accounts),
                    uuid4(),  # another admin acting on them must not bypass the guard either
                )
            self.assertEqual(demotion.exception.status_code, 409)


if __name__ == "__main__":
    unittest.main()
