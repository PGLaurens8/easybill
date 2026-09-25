"""The acceptance scenario from docs/plan-month-end-ready.md, through the HTTP API.

Brickwork BOQ: B1 1000 m2 @ R420, P1 2400 m2 @ R85.50 (R625 200). Retention 10% capped at 5%, VAT 15%.
"""

import unittest
from datetime import date, timedelta
from decimal import Decimal

from fastapi.testclient import TestClient

from app.api.deps.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.commercial import MembershipRole
from app.schemas.auth import CurrentUser
from tests.support import add_contract, add_member, make_session_factory, seed_workspace


def money(value) -> Decimal:
    return Decimal(str(value))


class MonthEndScenarioTests(unittest.TestCase):
    def setUp(self):
        self.engine, self.SessionLocal = make_session_factory()
        with self.SessionLocal() as db:
            self.ws = seed_workspace(db)
            self.sub = add_member(db, self.ws, MembershipRole.contractor)
            self.other_sub = add_member(db, self.ws, MembershipRole.contractor)
            self.qs = add_member(db, self.ws, MembershipRole.quantity_surveyor)
            self.accounts = add_member(db, self.ws, MembershipRole.accounts)
            add_contract(
                db,
                self.ws,
                "BRICK",
                [("B1", "1000", "420"), ("P1", "2400", "85.50")],
                subcontractor_user_id=self.sub,
                retention_cap_percent="5",
            )
            add_contract(db, self.ws, "ROOF", [("R1", "10", "1000")], subcontractor_user_id=self.other_sub)
        self.acting = self.qs

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        async def override_get_current_user():
            return CurrentUser(id=self.acting, email=None)

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        self.client = TestClient(app, raise_server_exceptions=False)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def call(self, method, path, expected=200, **kwargs):
        response = self.client.request(
            method, f"/api/v1{path}", headers={"X-Organization-Id": str(self.ws.organization_id)}, **kwargs
        )
        self.assertEqual(response.status_code, expected, response.text)
        return response.json() if response.content else None

    def latest_items(self, code):
        revisions = [r for r in self.call("GET", "/boq-revisions") if r["contract_id"] == str(self.ws.contracts[code])]
        latest = max(revisions, key=lambda r: r["revision_number"])
        return {item["item_code"]: item for item in latest["items"]}

    def claim_and_approve(self, lines):
        self.acting = self.sub
        items = self.latest_items("BRICK")
        claim = self.call(
            "POST",
            "/claims",
            201,
            json={
                "organization_id": str(self.ws.organization_id),
                "project_id": str(self.ws.project_id),
                "contract_id": str(self.ws.contracts["BRICK"]),
                "lines": [{"boq_item_id": items[c]["id"], "claimed_quantity_this_period": q} for c, q in lines],
            },
        )
        self.call("PATCH", f"/claims/{claim['id']}/status", json={"status": "Submitted"})
        self.acting = self.qs
        return self.call("PATCH", f"/claims/{claim['id']}/status", json={"status": "Approved"})

    def certify(self, claim=None, issue_date=None):
        body = {
            "organization_id": str(self.ws.organization_id),
            "project_id": str(self.ws.project_id),
            "contract_id": str(self.ws.contracts["BRICK"]),
            "issue_date": (issue_date or date.today()).isoformat(),
        }
        if claim:
            body["claim_batch_id"] = claim["id"]
        return self.call("POST", "/certificates", 201, json=body)

    def test_month_end_scenario(self):
        brick = str(self.ws.contracts["BRICK"])

        # Month 1: claim 40% of face brick, subcontractor submits a variation, QS approves it.
        month1 = self.claim_and_approve([("B1", "400")])
        self.assertIsNotNone(month1["valuation_date"])

        self.acting = self.sub
        vo = self.call(
            "POST",
            "/variations",
            201,
            json={
                "organization_id": str(self.ws.organization_id),
                "contract_id": brick,
                "title": "Extra boundary wall",
                "items": [
                    {
                        "item_code": "VO-001.1",
                        "description": "Boundary wall",
                        "unit": "m2",
                        "quantity": "60",
                        "rate": "450",
                    }
                ],
            },
        )
        self.assertEqual((vo["number"], vo["status"], money(vo["value"])), ("VO-001", "Submitted", Decimal("27000.00")))
        self.call("POST", f"/variations/{vo['id']}/decision", 403, json={"approve": True})

        self.acting = self.qs
        approved = self.call("POST", f"/variations/{vo['id']}/decision", json={"approve": True})
        self.assertEqual(approved["status"], "Approved")
        items = self.latest_items("BRICK")
        self.assertEqual(items["VO-001.1"]["variation_order_id"], vo["id"])
        self.assertEqual(sum(money(i["amount"]) for i in items.values()), Decimal("652200.00"))

        # Deduction, then certify month 1.
        charge = self.call(
            "POST",
            "/contra-charges",
            201,
            json={
                "organization_id": str(self.ws.organization_id),
                "contract_id": brick,
                "description": "Cleaning of rubble, Block A",
                "amount": "3500",
            },
        )
        preview = self.call(
            "POST",
            "/certificates/preview",
            json={"organization_id": str(self.ws.organization_id), "claim_batch_id": month1["id"]},
        )
        # Month 1 was claimed before VO-001, but the contract sum shown and used for the cap includes it.
        self.assertEqual(money(preview["contract_value"]), Decimal("652200.00"))
        cert1 = self.certify(month1)
        self.assertEqual(money(cert1["gross_value_to_date"]), Decimal("168000.00"))
        self.assertEqual(money(cert1["retention_held_to_date"]), Decimal("16800.00"))
        self.assertEqual(money(cert1["contra_charges_to_date"]), Decimal("3500.00"))
        self.assertEqual(money(cert1["amount_due_this_certificate_incl_tax"]), Decimal("169855.00"))
        charges = self.call("GET", "/contra-charges")
        self.assertEqual(charges[0]["certificate_batch_id"], cert1["id"])
        self.call("DELETE", f"/contra-charges/{charge['id']}", 409)

        # Month 2: variation work plus more brickwork; the deduction is not taken again.
        month2 = self.claim_and_approve([("B1", "200"), ("VO-001.1", "30")])
        cert2 = self.certify(month2)
        self.assertEqual(money(cert2["gross_value_to_date"]), Decimal("265500.00"))
        self.assertEqual(money(cert2["retention_held_to_date"]), Decimal("26550.00"))
        self.assertEqual(money(cert2["contra_charges_to_date"]), Decimal("3500.00"))
        self.assertEqual(money(cert2["amount_due_this_certificate_excl_tax"]), Decimal("87750.00"))
        self.assertEqual(money(cert2["amount_due_this_certificate_incl_tax"]), Decimal("100912.50"))

        # Accounts pays both.
        self.acting = self.accounts
        for cert in (cert1, cert2):
            self.call("PATCH", f"/certificates/{cert['id']}/status", json={"status": "Paid"})

        # Practical completion: a retention release certificate without a claim.
        self.acting = self.qs
        self.call("PATCH", f"/contracts/{brick}", json={"practical_completion_date": date.today().isoformat()})
        preview = self.call(
            "POST",
            "/certificates/preview",
            json={"organization_id": str(self.ws.organization_id), "contract_id": brick},
        )
        self.assertEqual(money(preview["retention_released_to_date"]), Decimal("13275.00"))
        release = self.certify()
        self.assertIsNone(release["claim_batch_id"])
        self.assertEqual(money(release["retention_held_to_date"]), Decimal("13275.00"))
        self.assertEqual(money(release["amount_due_this_certificate_excl_tax"]), Decimal("13275.00"))
        self.assertEqual(money(release["amount_due_this_certificate_incl_tax"]), Decimal("15266.25"))

        # The subcontractor sees their variation and deduction; the other subcontractor sees neither.
        self.acting = self.sub
        self.assertEqual(len(self.call("GET", "/variations")), 1)
        self.assertEqual(len(self.call("GET", "/contra-charges")), 1)
        self.acting = self.other_sub
        self.assertEqual(self.call("GET", "/variations"), [])
        self.assertEqual(self.call("GET", "/contra-charges"), [])

    def test_voiding_a_certificate_returns_its_deductions_to_pending(self):
        brick = str(self.ws.contracts["BRICK"])
        self.certify(self.claim_and_approve([("B1", "100")]))
        charge = self.call(
            "POST",
            "/contra-charges",
            201,
            json={
                "organization_id": str(self.ws.organization_id),
                "contract_id": brick,
                "description": "Damaged kerbs",
                "amount": "2000",
            },
        )
        cert = self.certify(self.claim_and_approve([("B1", "50")]))
        self.assertEqual(money(cert["contra_charges_to_date"]), Decimal("2000.00"))

        self.call("PATCH", f"/certificates/{cert['id']}/status", json={"status": "Voided"})
        self.assertIsNone(self.call("GET", "/contra-charges")[0]["certificate_batch_id"])
        self.call("DELETE", f"/contra-charges/{charge['id']}", 204)

    def test_deduction_dated_after_the_issue_date_waits_for_a_later_certificate(self):
        brick = str(self.ws.contracts["BRICK"])
        self.call(
            "POST",
            "/contra-charges",
            201,
            json={
                "organization_id": str(self.ws.organization_id),
                "contract_id": brick,
                "description": "Future",
                "amount": "1000",
                "charge_date": (date.today() + timedelta(days=10)).isoformat(),
            },
        )
        cert = self.certify(self.claim_and_approve([("B1", "10")]))
        self.assertEqual(money(cert["contra_charges_to_date"]), Decimal("0.00"))

    def test_variation_rules(self):
        brick = str(self.ws.contracts["BRICK"])
        body = {
            "organization_id": str(self.ws.organization_id),
            "contract_id": brick,
            "title": "Omitted item",
            "items": [{"item_code": "B1", "description": "Clash", "unit": "m2", "quantity": "1", "rate": "1"}],
        }
        self.acting = self.sub
        self.call("POST", "/variations", 403, json={**body, "approve_now": True})
        self.call("POST", "/variations", 404, json={**body, "contract_id": str(self.ws.contracts["ROOF"])})

        self.acting = self.qs
        self.call("POST", "/variations", 409, json={**body, "approve_now": True})
        pending = self.call("POST", "/variations", 201, json=body)
        self.call("POST", f"/variations/{pending['id']}/decision", 400, json={"approve": False})
        rejected = self.call(
            "POST", f"/variations/{pending['id']}/decision", json={"approve": False, "remarks": "Not instructed"}
        )
        self.assertEqual((rejected["status"], rejected["decision_remarks"]), ("Rejected", "Not instructed"))

    def test_only_the_qs_team_records_deductions(self):
        self.acting = self.sub
        self.call(
            "POST",
            "/contra-charges",
            403,
            json={
                "organization_id": str(self.ws.organization_id),
                "contract_id": str(self.ws.contracts["BRICK"]),
                "description": "Self-inflicted",
                "amount": "1",
            },
        )


if __name__ == "__main__":
    unittest.main()
