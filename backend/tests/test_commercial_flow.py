"""End-to-end API flows: subcontractor claims, QS certifies, accounts pays."""

import unittest
from decimal import Decimal
from uuid import uuid4

from fastapi.testclient import TestClient

from app.api.deps.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.commercial import MembershipRole
from app.schemas.auth import CurrentUser
from tests.support import add_contract, add_member, add_revision, make_session_factory, seed_workspace


class CommercialFlowTests(unittest.TestCase):
    def setUp(self):
        self.engine, self.SessionLocal = make_session_factory()
        with self.SessionLocal() as db:
            self.ws = seed_workspace(db)
            self.sub_a = add_member(db, self.ws, MembershipRole.contractor)
            self.sub_b = add_member(db, self.ws, MembershipRole.contractor)
            self.qs = add_member(db, self.ws, MembershipRole.quantity_surveyor)
            self.accounts = add_member(db, self.ws, MembershipRole.accounts)
            add_contract(
                db, self.ws, "BRICK", [("B1", "100", "200"), ("P1", "100", "50")], subcontractor_user_id=self.sub_a
            )
            add_contract(db, self.ws, "ROOF", [("R1", "10", "1000")], subcontractor_user_id=self.sub_b)

        self.acting_user = self.ws.admin_user_id

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        async def override_get_current_user():
            return CurrentUser(id=self.acting_user, email=None)

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        self.client = TestClient(app, raise_server_exceptions=False)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    # helpers -----------------------------------------------------------------

    def as_user(self, user_id):
        self.acting_user = user_id

    def request(self, method, path, **kwargs):
        headers = {"X-Organization-Id": str(self.ws.organization_id)}
        return self.client.request(method, f"/api/v1{path}", headers=headers, **kwargs)

    def claim(self, contract_code, lines, **extra):
        return self.request(
            "POST",
            "/claims",
            json={
                "organization_id": str(self.ws.organization_id),
                "project_id": str(self.ws.project_id),
                "contract_id": str(self.ws.contracts[contract_code]),
                "lines": [
                    {"boq_item_id": str(self.ws.items[contract_code][code]), "claimed_quantity_this_period": qty}
                    for code, qty in lines
                ],
                **extra,
            },
        )

    def set_status(self, claim_id, status, remarks=None):
        return self.request("PATCH", f"/claims/{claim_id}/status", json={"status": status, "remarks": remarks})

    def certify(self, claim, adjustments=None, **extra):
        return self.request(
            "POST",
            "/certificates",
            json={
                "organization_id": str(self.ws.organization_id),
                "project_id": claim["project_id"],
                "contract_id": claim["contract_id"],
                "claim_batch_id": claim["id"],
                "issue_date": "2026-09-25",
                "adjustments": adjustments or [],
                **extra,
            },
        )

    def submitted_and_approved(self, contract_code, lines):
        self.as_user(self.ws.contracts and self.sub_a if contract_code == "BRICK" else self.sub_b)
        created = self.claim(contract_code, lines)
        self.assertEqual(created.status_code, 201, created.text)
        claim_id = created.json()["id"]
        self.assertEqual(self.set_status(claim_id, "Submitted").status_code, 200)
        self.as_user(self.qs)
        approved = self.set_status(claim_id, "Approved")
        self.assertEqual(approved.status_code, 200, approved.text)
        return approved.json()

    # tests -------------------------------------------------------------------

    def test_full_cycle_claim_approve_certify_pay(self):
        claim = self.submitted_and_approved("BRICK", [("B1", "40")])
        self.assertEqual(claim["period_number"], 1)

        issued = self.certify(claim)
        self.assertEqual(issued.status_code, 201, issued.text)
        certificate = issued.json()
        self.assertEqual(certificate["certificate_number"], "CERT-001")
        self.assertEqual(Decimal(certificate["gross_value_to_date"]), Decimal("8000.00"))
        self.assertEqual(Decimal(certificate["amount_due_this_certificate_incl_tax"]), Decimal("8280.00"))
        self.assertEqual(certificate["lines"][0]["item_code"], "B1")

        self.as_user(self.accounts)
        paid = self.request("PATCH", f"/certificates/{certificate['id']}/status", json={"status": "Paid"})
        self.assertEqual(paid.status_code, 200, paid.text)
        self.assertEqual(paid.json()["status"], "Paid")

        claims = self.request("GET", "/claims").json()
        self.assertEqual(claims[0]["status"], "Paid")

    def test_second_period_keeps_value_of_items_not_claimed_again(self):
        first = self.submitted_and_approved("BRICK", [("B1", "40")])
        self.assertEqual(self.certify(first).status_code, 201)

        second = self.submitted_and_approved("BRICK", [("P1", "20")])
        self.assertEqual(second["period_number"], 2)
        certificate = self.certify(second).json()

        self.assertEqual(certificate["certificate_number"], "CERT-002")
        self.assertEqual(Decimal(certificate["gross_value_to_date"]), Decimal("9000.00"))
        self.assertEqual(Decimal(certificate["previous_net_certified_excl_tax"]), Decimal("7200.00"))
        self.assertEqual(Decimal(certificate["amount_due_this_certificate_excl_tax"]), Decimal("900.00"))
        self.assertEqual({line["item_code"] for line in certificate["lines"]}, {"B1", "P1"})

    def test_preview_matches_issue_and_saves_nothing(self):
        claim = self.submitted_and_approved("BRICK", [("B1", "40")])
        body = {
            "organization_id": str(self.ws.organization_id),
            "claim_batch_id": claim["id"],
            "adjustments": [
                {"boq_item_id": str(self.ws.items["BRICK"]["B1"]), "certified_quantity_this_period": "35"}
            ],
        }

        preview = self.request("POST", "/certificates/preview", json=body)
        self.assertEqual(preview.status_code, 200, preview.text)
        self.assertEqual(Decimal(preview.json()["gross_value_to_date"]), Decimal("7000.00"))
        self.assertEqual(self.request("GET", "/certificates").json(), [])

        issued = self.certify(claim, adjustments=body["adjustments"]).json()
        self.assertEqual(issued["gross_value_to_date"], preview.json()["gross_value_to_date"])
        self.assertEqual(Decimal(issued["lines"][0]["claimed_quantity_this_period"]), Decimal("40"))
        self.assertEqual(Decimal(issued["lines"][0]["certified_quantity_this_period"]), Decimal("35"))

    def test_void_latest_certificate_reopens_claim_for_recertification(self):
        claim = self.submitted_and_approved("BRICK", [("B1", "40")])
        certificate = self.certify(claim).json()

        voided = self.request("PATCH", f"/certificates/{certificate['id']}/status", json={"status": "Voided"})
        self.assertEqual(voided.status_code, 200, voided.text)
        self.assertEqual(self.request("GET", "/claims").json()[0]["status"], "Approved")

        reissued = self.certify(claim)
        self.assertEqual(reissued.status_code, 201, reissued.text)
        self.assertEqual(reissued.json()["certificate_number"], "CERT-002")
        self.assertEqual(Decimal(reissued.json()["previous_net_certified_excl_tax"]), Decimal("0.00"))

    def test_only_latest_certificate_can_be_voided(self):
        first = self.certify(self.submitted_and_approved("BRICK", [("B1", "10")])).json()
        self.certify(self.submitted_and_approved("BRICK", [("B1", "10")]))

        response = self.request("PATCH", f"/certificates/{first['id']}/status", json={"status": "Voided"})
        self.assertEqual(response.status_code, 409)

    def test_new_boq_revision_carries_certified_quantities_by_item_code(self):
        self.certify(self.submitted_and_approved("BRICK", [("B1", "90")]))
        with self.SessionLocal() as db:
            add_revision(db, self.ws, "BRICK", [("B1", "100", "200"), ("P1", "100", "50")], revision_number=2)

        self.as_user(self.sub_a)
        response = self.claim("BRICK", [("B1", "20")])
        self.assertEqual(response.status_code, 400)
        self.assertIn("remaining 10", response.json()["detail"])

    def test_rejection_needs_reason_and_claim_can_be_fixed_and_resubmitted(self):
        self.as_user(self.sub_a)
        claim_id = self.claim("BRICK", [("B1", "50")]).json()["id"]
        self.set_status(claim_id, "Submitted")

        self.as_user(self.qs)
        self.assertEqual(self.set_status(claim_id, "Rejected").status_code, 400)
        self.assertEqual(self.set_status(claim_id, "Rejected", "Only 30 m2 built").status_code, 200)

        self.as_user(self.sub_a)
        self.assertEqual(self.set_status(claim_id, "Draft").status_code, 200)
        edited = self.request(
            "PUT",
            f"/claims/{claim_id}",
            json={"lines": [{"boq_item_id": str(self.ws.items["BRICK"]["B1"]), "claimed_quantity_this_period": "30"}]},
        )
        self.assertEqual(edited.status_code, 200, edited.text)
        self.assertEqual(Decimal(edited.json()["total_claimed_amount"]), Decimal("6000.00"))
        self.assertEqual(self.set_status(claim_id, "Submitted").status_code, 200)

    def test_subcontractor_only_sees_their_own_contract(self):
        self.as_user(self.sub_a)
        self.assertEqual([c["code"] for c in self.request("GET", "/contracts").json()], ["BRICK"])
        revisions = self.request("GET", "/boq-revisions").json()
        self.assertEqual({r["contract_id"] for r in revisions}, {str(self.ws.contracts["BRICK"])})
        self.assertEqual(len(self.request("GET", "/projects").json()), 1)

        self.as_user(self.sub_b)
        self.claim("ROOF", [("R1", "1")])
        self.as_user(self.sub_a)
        self.assertEqual(self.request("GET", "/claims").json(), [])

        members = self.request("GET", f"/organizations/{self.ws.organization_id}/memberships").json()
        self.assertEqual([m["user_id"] for m in members], [str(self.sub_a)])

    def test_subcontractor_cannot_claim_on_or_touch_another_package(self):
        self.as_user(self.sub_a)
        self.assertEqual(self.claim("ROOF", [("R1", "1")]).status_code, 404)

        self.as_user(self.sub_b)
        roof_claim = self.claim("ROOF", [("R1", "1")]).json()
        self.as_user(self.sub_a)
        self.assertEqual(self.set_status(roof_claim["id"], "Submitted").status_code, 404)

    def test_subcontractor_cannot_approve_or_certify(self):
        self.as_user(self.sub_a)
        claim = self.claim("BRICK", [("B1", "10")]).json()
        self.set_status(claim["id"], "Submitted")
        self.assertEqual(self.set_status(claim["id"], "Approved").status_code, 403)

        self.as_user(self.qs)
        approved = self.set_status(claim["id"], "Approved").json()
        self.as_user(self.sub_a)
        self.assertEqual(self.certify(approved).status_code, 403)

    def test_subcontractor_cannot_create_boq_or_contracts(self):
        self.as_user(self.sub_a)
        response = self.request(
            "POST",
            "/contracts",
            json={
                "organization_id": str(self.ws.organization_id),
                "project_id": str(self.ws.project_id),
                "code": "X",
                "title": "Sneaky",
            },
        )
        self.assertEqual(response.status_code, 403)

    def test_contract_can_be_assigned_to_a_subcontractor_later(self):
        new_sub = None
        with self.SessionLocal() as db:
            new_sub = add_member(db, self.ws, MembershipRole.contractor)

        contract_id = self.ws.contracts["ROOF"]
        response = self.request(
            "PATCH",
            f"/contracts/{contract_id}",
            json={"subcontractor_user_id": str(new_sub), "subcontractor_name": "Top Roofing (Pty) Ltd"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["subcontractor_name"], "Top Roofing (Pty) Ltd")

        self.as_user(new_sub)
        self.assertEqual([c["code"] for c in self.request("GET", "/contracts").json()], ["ROOF"])

    def test_contract_assignment_rejects_non_members(self):
        response = self.request(
            "PATCH",
            f"/contracts/{self.ws.contracts['ROOF']}",
            json={"subcontractor_user_id": str(uuid4())},
        )
        self.assertEqual(response.status_code, 400)

    def test_boq_revision_publishes_and_numbers_itself(self):
        self.as_user(self.qs)
        response = self.request(
            "POST",
            "/boq-revisions",
            json={
                "organization_id": str(self.ws.organization_id),
                "project_id": str(self.ws.project_id),
                "contract_id": str(self.ws.contracts["ROOF"]),
                "items": [
                    {
                        "item_code": "R1",
                        "description": "Roof sheeting",
                        "unit": "m2",
                        "contract_quantity": "12",
                        "rate": "1000",
                        "order_index": 0,
                    }
                ],
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["revision_number"], 2)
        self.assertEqual(response.json()["status"], "Published")

        statuses = {r["revision_number"]: r["status"] for r in self.request("GET", "/boq-revisions").json()
                    if r["contract_id"] == str(self.ws.contracts["ROOF"])}
        self.assertEqual(statuses, {1: "Superseded", 2: "Published"})


if __name__ == "__main__":
    unittest.main()
