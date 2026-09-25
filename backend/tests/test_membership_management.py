import unittest
from uuid import uuid4

from fastapi import HTTPException

from app.models.commercial import MembershipRole
from app.schemas.organization import OrganizationMembershipUpdate
from app.services.organizations import (
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
