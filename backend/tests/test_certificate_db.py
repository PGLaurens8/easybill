import unittest
from datetime import date
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
from app.schemas.certificate import CertificateBatchCreate
from app.schemas.claim import ClaimBatchCreate, ClaimBatchStatusUpdate
from app.services.commercial import create_certificate_batch, create_claim_batch, list_certificate_batches, update_claim_batch_status


@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(_type, _compiler, **_kw):
    return "JSON"


@compiles(UUID, "sqlite")
def _compile_uuid_sqlite(_type, _compiler, **_kw):
    return "TEXT"


class CertificateDatabaseIntegrationTests(unittest.TestCase):
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

    def seed_context(self):
        organization_id = uuid4()
        project_id = uuid4()
        contract_id = uuid4()
        actor_user_id = uuid4()

        with self.SessionLocal() as db:
            db.add(Organization(id=organization_id, name="Acme QS", slug=f"acme-{organization_id.hex[:8]}"))
            db.add(
                Membership(
                    organization_id=organization_id,
                    user_id=actor_user_id,
                    role=MembershipRole.org_admin,
                )
            )
            db.add(
                Project(
                    id=project_id,
                    organization_id=organization_id,
                    code="PRJ-001",
                    name="Willows Estate",
                    status=ProjectStatus.planned,
                    currency_code="ZAR",
                )
            )
            db.add(
                Contract(
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
            )
            revision_id = uuid4()
            db.add(
                BoqRevision(
                    id=revision_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    contract_id=contract_id,
                    revision_number=2,
                    status=BoqRevisionStatus.draft,
                )
            )
            boq_item_id = uuid4()
            db.add(
                BoqItem(
                    id=boq_item_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    contract_id=contract_id,
                    boq_revision_id=revision_id,
                    item_code="A100",
                    trade_code="EARTH",
                    description="Excavation",
                    unit="m3",
                    contract_quantity=Decimal("10.0000"),
                    rate=Decimal("100.0000"),
                    amount=Decimal("1000.00"),
                    order_index=0,
                )
            )
            db.commit()

        return {
            "organization_id": organization_id,
            "project_id": project_id,
            "contract_id": contract_id,
            "actor_user_id": actor_user_id,
            "boq_item_id": boq_item_id,
        }

    def create_approved_claim(self, db, ctx):
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
        update_claim_batch_status(
            db,
            ctx["organization_id"],
            claim.id,
            ClaimBatchStatusUpdate(status=ClaimStatus.submitted.value),
            ctx["actor_user_id"],
        )
        update_claim_batch_status(
            db,
            ctx["organization_id"],
            claim.id,
            ClaimBatchStatusUpdate(status=ClaimStatus.under_review.value),
            ctx["actor_user_id"],
        )
        return update_claim_batch_status(
            db,
            ctx["organization_id"],
            claim.id,
            ClaimBatchStatusUpdate(status=ClaimStatus.approved.value),
            ctx["actor_user_id"],
        )

    def test_create_certificate_batch_persists_certificate_and_audit_event(self):
        ctx = self.seed_context()

        with self.SessionLocal() as db:
            approved_claim = self.create_approved_claim(db, ctx)
            certificate = create_certificate_batch(
                db,
                CertificateBatchCreate(
                    organization_id=ctx["organization_id"],
                    project_id=ctx["project_id"],
                    contract_id=ctx["contract_id"],
                    claim_batch_id=approved_claim.id,
                    certificate_number="CERT-001",
                    issue_date=date(2026, 3, 21),
                ),
                ctx["actor_user_id"],
            )

            self.assertEqual(certificate.certificate_number, "CERT-001")
            self.assertEqual(certificate.status, "Draft")
            self.assertEqual(len(certificate.lines), 1)
            self.assertEqual(certificate.gross_value_to_date, Decimal("500.00"))
            self.assertEqual(certificate.retention_held_to_date, Decimal("50.00"))
            self.assertEqual(certificate.amount_due_this_certificate_excl_tax, Decimal("450.00"))
            self.assertEqual(certificate.tax_this_certificate, Decimal("67.50"))
            self.assertEqual(certificate.amount_due_this_certificate_incl_tax, Decimal("517.50"))

            audit_rows = db.execute(Base.metadata.tables["audit_events"].select()).mappings().all()
            self.assertTrue(any(row["action"] == "certificate_batch.created" for row in audit_rows))

    def test_list_certificate_batches_returns_created_certificate(self):
        ctx = self.seed_context()

        with self.SessionLocal() as db:
            approved_claim = self.create_approved_claim(db, ctx)
            create_certificate_batch(
                db,
                CertificateBatchCreate(
                    organization_id=ctx["organization_id"],
                    project_id=ctx["project_id"],
                    contract_id=ctx["contract_id"],
                    claim_batch_id=approved_claim.id,
                    certificate_number="CERT-001",
                    issue_date=date(2026, 3, 21),
                ),
                ctx["actor_user_id"],
            )

            certificates = list_certificate_batches(db, ctx["organization_id"])
            self.assertEqual(len(certificates), 1)
            self.assertEqual(certificates[0].certificate_number, "CERT-001")


if __name__ == "__main__":
    unittest.main()
