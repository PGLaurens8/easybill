import unittest
from decimal import Decimal
from uuid import uuid4

from fastapi import HTTPException
from pydantic import ValidationError

from app.models.commercial import (
    ClaimStatus,
    MembershipRole,
)
from app.schemas.claim import ClaimBatchCreate
from app.services.audit import build_claim_created_audit_metadata, build_claim_status_audit_metadata
from app.services.claims import (
    ensure_actor_can_transition_claim,
    ensure_allowed_claim_status_transition,
)


class ClaimSchemaValidationTests(unittest.TestCase):
    def make_payload(self, **overrides):
        payload = {
            "organization_id": uuid4(),
            "project_id": uuid4(),
            "contract_id": uuid4(),
            "period_number": 1,
            "lines": [
                {
                    "boq_item_id": uuid4(),
                    "previous_certified_quantity": Decimal("0"),
                    "claimed_quantity_this_period": Decimal("1"),
                }
            ],
        }
        payload.update(overrides)
        return payload

    def test_rejects_empty_claim_lines(self):
        with self.assertRaises(ValidationError):
            ClaimBatchCreate(**self.make_payload(lines=[]))

    def test_rejects_negative_claim_values(self):
        with self.assertRaises(ValidationError):
            ClaimBatchCreate(
                **self.make_payload(
                    lines=[
                        {
                            "boq_item_id": uuid4(),
                            "previous_certified_quantity": Decimal("-1"),
                            "claimed_quantity_this_period": Decimal("1"),
                        }
                    ]
                )
            )


class ClaimStatusTransitionTests(unittest.TestCase):
    def test_allows_forward_transition(self):
        ensure_allowed_claim_status_transition(ClaimStatus.draft, ClaimStatus.submitted)

    def test_rejects_skipping_directly_to_paid(self):
        with self.assertRaises(HTTPException) as context:
            ensure_allowed_claim_status_transition(ClaimStatus.draft, ClaimStatus.paid)

        self.assertEqual(context.exception.status_code, 409)

    def test_allows_one_click_approval_from_submitted(self):
        ensure_allowed_claim_status_transition(ClaimStatus.submitted, ClaimStatus.approved)

    def test_rejects_noop_transition(self):
        with self.assertRaises(HTTPException) as context:
            ensure_allowed_claim_status_transition(ClaimStatus.submitted, ClaimStatus.submitted)

        self.assertEqual(context.exception.status_code, 409)


class ClaimRolePermissionTests(unittest.TestCase):
    def test_quantity_surveyor_can_submit_claim(self):
        ensure_actor_can_transition_claim(
            ClaimStatus.draft,
            ClaimStatus.submitted,
            MembershipRole.quantity_surveyor,
        )

    def test_quantity_surveyor_can_certify_claim(self):
        ensure_actor_can_transition_claim(
            ClaimStatus.approved,
            ClaimStatus.certified,
            MembershipRole.quantity_surveyor,
        )

    def test_contractor_can_submit_but_not_approve_claim(self):
        ensure_actor_can_transition_claim(ClaimStatus.draft, ClaimStatus.submitted, MembershipRole.contractor)

        with self.assertRaises(HTTPException) as context:
            ensure_actor_can_transition_claim(ClaimStatus.submitted, ClaimStatus.approved, MembershipRole.contractor)

        self.assertEqual(context.exception.status_code, 403)

    def test_accounts_cannot_approve_claim(self):
        with self.assertRaises(HTTPException) as context:
            ensure_actor_can_transition_claim(ClaimStatus.submitted, ClaimStatus.approved, MembershipRole.accounts)

        self.assertEqual(context.exception.status_code, 403)

    def test_accounts_can_mark_paid(self):
        ensure_actor_can_transition_claim(
            ClaimStatus.certified,
            ClaimStatus.paid,
            MembershipRole.accounts,
        )


class ClaimAuditMetadataTests(unittest.TestCase):
    def test_builds_claim_created_metadata(self):
        project_id = uuid4()
        contract_id = uuid4()

        metadata = build_claim_created_audit_metadata(
            period_number=4,
            project_id=project_id,
            contract_id=contract_id,
            revision_number=3,
            line_count=12,
        )

        self.assertEqual(
            metadata,
            {
                "period_number": 4,
                "project_id": str(project_id),
                "contract_id": str(contract_id),
                "source_revision_number": 3,
                "line_count": 12,
            },
        )

    def test_builds_claim_status_metadata(self):
        metadata = build_claim_status_audit_metadata(
            previous_status=ClaimStatus.submitted,
            next_status=ClaimStatus.under_review,
            actor_role=MembershipRole.accounts,
            remarks_present=True,
        )

        self.assertEqual(
            metadata,
            {
                "previous_status": "Submitted",
                "next_status": "UnderReview",
                "actor_role": "Accounts",
                "remarks_present": True,
            },
        )


if __name__ == "__main__":
    unittest.main()
