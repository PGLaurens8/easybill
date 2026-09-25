import unittest
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.commercial import (
    BoqItem,
    BoqRevision,
    BoqRevisionStatus,
    ClaimStatus,
    Contract,
    ContractStatus,
    Membership,
    MembershipRole,
    Organization,
    Project,
    ProjectStatus,
)
from app.schemas.claim import ClaimBatchCreate, ClaimBatchStatusUpdate
from app.services.claims import create_claim_batch, update_claim_batch_status


@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(_type, _compiler, **_kw):
    return "JSON"


@compiles(UUID, "sqlite")
def _compile_uuid_sqlite(_type, _compiler, **_kw):
    return "TEXT"


class ClaimDatabaseIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine, autoflush=False, autocommit=False, expire_on_commit=False)

    def tearDown(self):
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def seed_claim_context(self):
        organization_id = uuid4()
        project_id = uuid4()
        contract_id = uuid4()
        actor_user_id = uuid4()

        with self.SessionLocal() as db:
            organization = Organization(id=organization_id, name="Acme QS", slug=f"acme-{organization_id.hex[:8]}")
            membership = Membership(
                organization_id=organization_id,
                user_id=actor_user_id,
                role=MembershipRole.org_admin,
            )
            project = Project(
                id=project_id,
                organization_id=organization_id,
                code="PRJ-001",
                name="Willows Estate",
                status=ProjectStatus.planned,
                currency_code="ZAR",
            )
            contract = Contract(
                id=contract_id,
                organization_id=organization_id,
                project_id=project_id,
                code="SUB-001",
                title="Groundworks",
                status=ContractStatus.draft,
                currency_code="ZAR",
                retention_percent=Decimal("10.00"),
                tax_percent=Decimal("15.00"),
            )
            revision = BoqRevision(
                id=uuid4(),
                organization_id=organization_id,
                project_id=project_id,
                contract_id=contract_id,
                revision_number=2,
                status=BoqRevisionStatus.draft,
            )
            item = BoqItem(
                id=uuid4(),
                organization_id=organization_id,
                project_id=project_id,
                contract_id=contract_id,
                boq_revision_id=revision.id,
                item_code="A100",
                trade_code="EARTH",
                description="Excavation",
                unit="m3",
                contract_quantity=Decimal("10.0000"),
                rate=Decimal("100.0000"),
                amount=Decimal("1000.00"),
                order_index=0,
            )
            db.add(organization)
            db.add(membership)
            db.add(project)
            db.add(contract)
            db.add(revision)
            db.add(item)
            db.commit()

        return {
            "organization_id": organization_id,
            "project_id": project_id,
            "contract_id": contract_id,
            "actor_user_id": actor_user_id,
            "boq_item_id": item.id,
        }

    def test_create_claim_batch_persists_claim_lines_and_audit_event(self):
        ctx = self.seed_claim_context()

        with self.SessionLocal() as db:
            claim = create_claim_batch(
                db,
                ClaimBatchCreate(
                    organization_id=ctx["organization_id"],
                    project_id=ctx["project_id"],
                    contract_id=ctx["contract_id"],
                    period_number=1,
                    lines=[
                        {
                            "boq_item_id": ctx["boq_item_id"],
                            "previous_certified_quantity": Decimal("2.0000"),
                            "claimed_quantity_this_period": Decimal("3.0000"),
                        }
                    ],
                ),
                ctx["actor_user_id"],
            )

            self.assertEqual(claim.period_number, 1)
            self.assertEqual(claim.status, "Draft")
            self.assertEqual(len(claim.lines), 1)

            audit_rows = db.execute(
                Base.metadata.tables["audit_events"].select()
            ).mappings().all()
            self.assertEqual(len(audit_rows), 1)
            self.assertEqual(audit_rows[0]["action"], "claim_batch.created")
            self.assertEqual(audit_rows[0]["entity_type"], "ClaimBatch")
            self.assertEqual(audit_rows[0]["metadata"]["source_revision_number"], 2)
            self.assertEqual(audit_rows[0]["metadata"]["line_count"], 1)

    def test_update_claim_batch_status_persists_status_and_audit_event(self):
        ctx = self.seed_claim_context()

        with self.SessionLocal() as db:
            claim = create_claim_batch(
                db,
                ClaimBatchCreate(
                    organization_id=ctx["organization_id"],
                    project_id=ctx["project_id"],
                    contract_id=ctx["contract_id"],
                    period_number=1,
                    lines=[
                        {
                            "boq_item_id": ctx["boq_item_id"],
                            "previous_certified_quantity": Decimal("0.0000"),
                            "claimed_quantity_this_period": Decimal("1.0000"),
                        }
                    ],
                ),
                ctx["actor_user_id"],
            )

            submitted = update_claim_batch_status(
                db,
                ctx["organization_id"],
                claim.id,
                ClaimBatchStatusUpdate(status=ClaimStatus.submitted.value),
                ctx["actor_user_id"],
            )
            reviewed = update_claim_batch_status(
                db,
                ctx["organization_id"],
                claim.id,
                ClaimBatchStatusUpdate(status=ClaimStatus.under_review.value, remarks="Checked"),
                ctx["actor_user_id"],
            )

            self.assertEqual(submitted.status, "Submitted")
            self.assertEqual(reviewed.status, "UnderReview")

            audit_rows = db.execute(
                Base.metadata.tables["audit_events"].select().order_by(Base.metadata.tables["audit_events"].c.created_at)
            ).mappings().all()
            self.assertEqual(len(audit_rows), 3)
            self.assertEqual(audit_rows[-1]["action"], "claim_batch.status_changed")
            self.assertEqual(audit_rows[-1]["metadata"]["previous_status"], "Submitted")
            self.assertEqual(audit_rows[-1]["metadata"]["next_status"], "UnderReview")
            self.assertEqual(audit_rows[-1]["metadata"]["actor_role"], "OrgAdmin")
            self.assertTrue(audit_rows[-1]["metadata"]["remarks_present"])


if __name__ == "__main__":
    unittest.main()
