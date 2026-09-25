import unittest
from decimal import Decimal
from uuid import uuid4

from app.models.commercial import MembershipRole, Organization
from app.services.certificates import list_certificate_batches
from app.services.claims import list_claim_batches
from app.services.organizations import list_organization_memberships
from scripts.seed_demo import DEMO_SLUG, delete_demo_workspace, seed
from tests.support import make_session_factory


class SeedDemoTests(unittest.TestCase):
    def setUp(self):
        self.engine, self.SessionLocal = make_session_factory()

    def tearDown(self):
        self.engine.dispose()

    def test_seeds_a_workspace_with_every_workflow_state(self):
        demo_user, owner = uuid4(), uuid4()
        with self.SessionLocal() as db:
            organization = seed(db, demo_user, "demo@quanteasy.app", (owner, "owner@example.com"))

            roles = {m.user_id: m.role for m in list_organization_memberships(db, organization.id)}
            self.assertEqual(roles, {demo_user: MembershipRole.commercial_manager, owner: MembershipRole.org_admin})

            statuses = sorted(claim.status for claim in list_claim_batches(db, organization.id))
            self.assertEqual(statuses, ["Approved", "Certified", "Paid", "Rejected", "Submitted"])

            certificates = {c.certificate_number: c for c in list_certificate_batches(db, organization.id)}
            self.assertEqual(certificates["CERT-001"].status, "Paid")
            self.assertEqual(certificates["CERT-002"].status, "Issued")
            # Period 2 keeps period 1's value and reflects the QS adjustment on B1 (350 claimed, 320 certified).
            b1 = next(line for line in certificates["CERT-002"].lines if line.item_code == "B1")
            self.assertEqual(b1.certified_quantity_this_period, Decimal("320.0000"))
            self.assertGreater(certificates["CERT-002"].amount_due_this_certificate_excl_tax, 0)

    def test_workspace_can_be_deleted_and_recreated(self):
        demo_user = uuid4()
        with self.SessionLocal() as db:
            first = seed(db, demo_user, "demo@quanteasy.app", None)
            delete_demo_workspace(db, first.id)
            self.assertIsNone(db.query(Organization).filter_by(slug=DEMO_SLUG).first())
            second = seed(db, demo_user, "demo@quanteasy.app", None)
            self.assertEqual(second.slug, DEMO_SLUG)


if __name__ == "__main__":
    unittest.main()
