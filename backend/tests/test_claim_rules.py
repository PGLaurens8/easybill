import unittest
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from fastapi import HTTPException
from pydantic import ValidationError

from app.models.commercial import (
    AuditEvent,
    BoqItem,
    BoqRevision,
    ClaimBatch,
    ClaimLine,
    ClaimStatus,
    Contract,
    Membership,
    MembershipRole,
)
from app.schemas.claim import ClaimBatchCreate, ClaimBatchStatusUpdate
from app.services.commercial import (
    build_claim_created_audit_metadata,
    build_claim_status_audit_metadata,
    create_claim_batch,
    ensure_actor_can_transition_claim,
    ensure_allowed_claim_status_transition,
    update_claim_batch_status,
)


class FakeSession:
    def __init__(self, scalar_results, boq_items_by_id=None):
        self.scalar_results = list(scalar_results)
        self.boq_items_by_id = boq_items_by_id or {}
        self.added = []
        self.audit_events = []
        self.claim_batch = None
        self.commit_count = 0
        self.refresh_count = 0
        self.flushed = False

    def scalar(self, _statement):
        result = self.scalar_results.pop(0)
        if callable(result):
            return result()
        return result

    def add(self, obj):
        self.added.append(obj)

        if isinstance(obj, ClaimBatch):
            now = datetime.now(timezone.utc)
            if obj.id is None:
                obj.id = uuid4()
            if obj.created_at is None:
                obj.created_at = now
            if obj.updated_at is None:
                obj.updated_at = now
            self.claim_batch = obj
            return

        if isinstance(obj, ClaimLine) and self.claim_batch is not None:
            if obj.id is None:
                obj.id = uuid4()
            obj.boq_item = self.boq_items_by_id[obj.boq_item_id]
            self.claim_batch.lines.append(obj)
            return

        if isinstance(obj, AuditEvent):
            if obj.id is None:
                obj.id = uuid4()
            self.audit_events.append(obj)

    def flush(self):
        self.flushed = True

    def commit(self):
        self.commit_count += 1

    def refresh(self, _obj):
        self.refresh_count += 1


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

    def test_quantity_surveyor_cannot_certify_claim(self):
        with self.assertRaises(HTTPException) as context:
            ensure_actor_can_transition_claim(
                ClaimStatus.approved,
                ClaimStatus.certified,
                MembershipRole.quantity_surveyor,
            )

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


class ClaimServicePersistenceTests(unittest.TestCase):
    def make_contract_context(self):
        organization_id = uuid4()
        project_id = uuid4()
        contract_id = uuid4()
        boq_item_id = uuid4()

        contract = Contract(
            id=contract_id,
            organization_id=organization_id,
            project_id=project_id,
            code="SUB-001",
            title="Groundworks",
            currency_code="ZAR",
            retention_percent=Decimal("10.00"),
            tax_percent=Decimal("15.00"),
        )
        boq_item = BoqItem(
            id=boq_item_id,
            organization_id=organization_id,
            project_id=project_id,
            contract_id=contract_id,
            boq_revision_id=uuid4(),
            item_code="A100",
            trade_code="EARTH",
            description="Excavation",
            unit="m3",
            contract_quantity=Decimal("10.0000"),
            rate=Decimal("100.0000"),
            amount=Decimal("1000.00"),
            order_index=0,
        )
        revision = BoqRevision(
            id=uuid4(),
            organization_id=organization_id,
            project_id=project_id,
            contract_id=contract_id,
            revision_number=2,
        )
        revision.items = [boq_item]
        return organization_id, project_id, contract_id, boq_item, contract, revision

    def test_create_claim_batch_persists_lines_and_audit_event(self):
        actor_user_id = uuid4()
        organization_id, project_id, contract_id, boq_item, contract, revision = self.make_contract_context()
        payload = ClaimBatchCreate(
            organization_id=organization_id,
            project_id=project_id,
            contract_id=contract_id,
            period_number=1,
            lines=[
                {
                    "boq_item_id": boq_item.id,
                    "previous_certified_quantity": Decimal("2.0000"),
                    "claimed_quantity_this_period": Decimal("3.0000"),
                }
            ],
        )

        db = FakeSession(
            [
                contract,
                revision,
                None,
                lambda: db.claim_batch,
            ],
            boq_items_by_id={boq_item.id: boq_item},
        )

        claim = create_claim_batch(db, payload, actor_user_id)

        self.assertEqual(claim.period_number, 1)
        self.assertEqual(len(claim.lines), 1)
        self.assertEqual(db.commit_count, 1)
        self.assertEqual(len(db.audit_events), 1)
        self.assertEqual(db.audit_events[0].action, "claim_batch.created")
        self.assertEqual(db.audit_events[0].audit_metadata["source_revision_number"], 2)
        self.assertEqual(db.audit_events[0].audit_metadata["line_count"], 1)

    def test_update_claim_status_records_audit_event(self):
        actor_user_id = uuid4()
        organization_id, project_id, contract_id, boq_item, _contract, _revision = self.make_contract_context()
        now = datetime.now(timezone.utc)
        claim_batch = ClaimBatch(
            id=uuid4(),
            organization_id=organization_id,
            project_id=project_id,
            contract_id=contract_id,
            period_number=1,
            status=ClaimStatus.submitted,
            created_at=now,
            updated_at=now,
        )
        claim_line = ClaimLine(
            id=uuid4(),
            claim_batch_id=claim_batch.id,
            boq_item_id=boq_item.id,
            previous_certified_quantity=Decimal("0.0000"),
            claimed_quantity_this_period=Decimal("1.0000"),
        )
        claim_line.boq_item = boq_item
        claim_batch.lines = [claim_line]

        membership = Membership(
            organization_id=organization_id,
            user_id=actor_user_id,
            role=MembershipRole.accounts,
        )
        db = FakeSession([claim_batch, membership])

        updated = update_claim_batch_status(
            db,
            organization_id,
            claim_batch.id,
            ClaimBatchStatusUpdate(status="UnderReview", remarks="Checked"),
            actor_user_id,
        )

        self.assertEqual(updated.status, "UnderReview")
        self.assertEqual(db.commit_count, 1)
        self.assertEqual(db.refresh_count, 1)
        self.assertEqual(len(db.audit_events), 1)
        self.assertEqual(db.audit_events[0].action, "claim_batch.status_changed")
        self.assertEqual(db.audit_events[0].audit_metadata["previous_status"], "Submitted")
        self.assertEqual(db.audit_events[0].audit_metadata["next_status"], "UnderReview")
        self.assertEqual(db.audit_events[0].audit_metadata["actor_role"], "Accounts")


if __name__ == "__main__":
    unittest.main()
