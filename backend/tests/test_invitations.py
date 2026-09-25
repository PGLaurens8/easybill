"""Consent-based joining: an organization invites by email, only that verified user can accept."""

import unittest
from uuid import uuid4

from fastapi.testclient import TestClient

from app.api.deps.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.commercial import MembershipRole
from app.schemas.auth import CurrentUser
from tests.support import add_member, make_session_factory, seed_workspace


class InvitationFlowTests(unittest.TestCase):
    def setUp(self):
        self.engine, self.SessionLocal = make_session_factory()
        with self.SessionLocal() as db:
            self.ws = seed_workspace(db)
            self.qs = add_member(db, self.ws, MembershipRole.quantity_surveyor)
        self.sub_id = uuid4()
        self.user = CurrentUser(id=self.ws.admin_user_id, email="director@acme.co.za", email_confirmed=True)

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        async def override_get_current_user():
            return self.user

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        self.client = TestClient(app, raise_server_exceptions=False)
        self.org_headers = {"X-Organization-Id": str(self.ws.organization_id)}

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def act_as(self, user_id, email, confirmed=True):
        self.user = CurrentUser(id=user_id, email=email, email_confirmed=confirmed)

    def invite(self, email="Sipho@Mthembu.co.za", role="Contractor"):
        return self.client.post(
            f"/api/v1/organizations/{self.ws.organization_id}/invitations",
            headers=self.org_headers,
            json={"email": email, "role": role},
        )

    def test_invited_user_accepts_and_becomes_a_member(self):
        invitation = self.invite()
        self.assertEqual(invitation.status_code, 201, invitation.text)
        self.assertEqual(invitation.json()["email"], "sipho@mthembu.co.za")

        self.act_as(self.sub_id, "sipho@mthembu.co.za")
        mine = self.client.get("/api/v1/invitations").json()
        self.assertEqual([(i["organization_name"], i["role"]) for i in mine], [("Acme Builders", "Contractor")])
        self.assertEqual(self.client.get("/api/v1/organizations").json(), [])

        accepted = self.client.post(f"/api/v1/invitations/{mine[0]['id']}/accept")
        self.assertEqual(accepted.status_code, 200, accepted.text)
        self.assertEqual(accepted.json()["role"], "Contractor")
        self.assertEqual([o["name"] for o in self.client.get("/api/v1/organizations").json()], ["Acme Builders"])
        self.assertEqual(self.client.get("/api/v1/invitations").json(), [])

    def test_someone_else_cannot_accept_or_see_the_invitation(self):
        invitation_id = self.invite().json()["id"]

        self.act_as(uuid4(), "intruder@example.com")
        self.assertEqual(self.client.get("/api/v1/invitations").json(), [])
        self.assertEqual(self.client.post(f"/api/v1/invitations/{invitation_id}/accept").status_code, 404)

    def test_unverified_email_cannot_accept(self):
        invitation_id = self.invite().json()["id"]

        self.act_as(self.sub_id, "sipho@mthembu.co.za", confirmed=False)
        self.assertEqual(self.client.get("/api/v1/invitations").json(), [])
        self.assertEqual(self.client.post(f"/api/v1/invitations/{invitation_id}/accept").status_code, 403)

    def test_declined_and_revoked_invitations_cannot_be_used(self):
        declined_id = self.invite().json()["id"]
        self.act_as(self.sub_id, "sipho@mthembu.co.za")
        self.assertEqual(self.client.post(f"/api/v1/invitations/{declined_id}/decline").status_code, 204)
        self.assertEqual(self.client.post(f"/api/v1/invitations/{declined_id}/accept").status_code, 404)

        self.act_as(self.ws.admin_user_id, "director@acme.co.za")
        revoked_id = self.invite().json()["id"]
        revoke = self.client.delete(
            f"/api/v1/organizations/{self.ws.organization_id}/invitations/{revoked_id}", headers=self.org_headers
        )
        self.assertEqual(revoke.status_code, 204)
        self.act_as(self.sub_id, "sipho@mthembu.co.za")
        self.assertEqual(self.client.post(f"/api/v1/invitations/{revoked_id}/accept").status_code, 404)

    def test_duplicate_pending_invitation_is_rejected(self):
        self.assertEqual(self.invite().status_code, 201)
        self.assertEqual(self.invite("sipho@mthembu.co.za").status_code, 409)

    def test_only_admins_can_invite_or_list_invitations(self):
        self.act_as(self.qs, "qs@acme.co.za")
        self.assertEqual(self.invite().status_code, 403)
        listing = self.client.get(
            f"/api/v1/organizations/{self.ws.organization_id}/invitations", headers=self.org_headers
        )
        self.assertEqual(listing.status_code, 403)

    def test_invitation_cannot_target_another_organization(self):
        other_org = uuid4()
        response = self.client.post(
            f"/api/v1/organizations/{other_org}/invitations",
            headers={"X-Organization-Id": str(other_org)},
            json={"email": "x@example.com", "role": "Contractor"},
        )
        self.assertEqual(response.status_code, 403)


if __name__ == "__main__":
    unittest.main()
