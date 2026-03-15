import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampedUUIDMixin


class MembershipRole(str, enum.Enum):
    org_admin = "OrgAdmin"
    commercial_manager = "CommercialManager"
    quantity_surveyor = "QuantitySurveyor"
    contractor = "Contractor"
    accounts = "Accounts"


class ProjectStatus(str, enum.Enum):
    planned = "Planned"
    ongoing = "Ongoing"
    completed = "Completed"
    on_hold = "OnHold"


class ContractStatus(str, enum.Enum):
    draft = "Draft"
    active = "Active"
    closed = "Closed"


class BoqRevisionStatus(str, enum.Enum):
    draft = "Draft"
    published = "Published"
    superseded = "Superseded"


class ClaimStatus(str, enum.Enum):
    draft = "Draft"
    submitted = "Submitted"
    under_review = "UnderReview"
    approved = "Approved"
    rejected = "Rejected"
    certified = "Certified"
    paid = "Paid"


class CertificateStatus(str, enum.Enum):
    draft = "Draft"
    certified = "Certified"
    issued = "Issued"
    paid = "Paid"
    voided = "Voided"


class Organization(TimestampedUUIDMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    memberships: Mapped[list["Membership"]] = relationship(back_populates="organization")
    projects: Mapped[list["Project"]] = relationship(back_populates="organization")


class Membership(TimestampedUUIDMixin, Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("organization_id", "user_id"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    role: Mapped[MembershipRole] = mapped_column(
        Enum(MembershipRole, name="membership_role"), nullable=False
    )

    organization: Mapped["Organization"] = relationship(back_populates="memberships")


class Project(TimestampedUUIDMixin, Base):
    __tablename__ = "projects"
    __table_args__ = (UniqueConstraint("organization_id", "code"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text())
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus, name="project_status"), nullable=False, default=ProjectStatus.planned
    )
    client_name: Mapped[str | None] = mapped_column(String(255))
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False, default="ZAR")
    retention_percent_default: Mapped[float | None] = mapped_column(Numeric(5, 2))
    tax_percent_default: Mapped[float | None] = mapped_column(Numeric(5, 2))

    organization: Mapped["Organization"] = relationship(back_populates="projects")
    contracts: Mapped[list["Contract"]] = relationship(back_populates="project")


class Contract(TimestampedUUIDMixin, Base):
    __tablename__ = "contracts"
    __table_args__ = (UniqueConstraint("project_id", "code"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    contractor_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[ContractStatus] = mapped_column(
        Enum(ContractStatus, name="contract_status"), nullable=False, default=ContractStatus.draft
    )
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False, default="ZAR")
    retention_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    retention_cap_percent: Mapped[float | None] = mapped_column(Numeric(5, 2))
    tax_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    start_date: Mapped[date | None] = mapped_column(Date())
    end_date: Mapped[date | None] = mapped_column(Date())

    project: Mapped["Project"] = relationship(back_populates="contracts")
    boq_revisions: Mapped[list["BoqRevision"]] = relationship(back_populates="contract")


class BoqRevision(TimestampedUUIDMixin, Base):
    __tablename__ = "boq_revisions"
    __table_args__ = (UniqueConstraint("contract_id", "revision_number"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    contract_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False
    )
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[BoqRevisionStatus] = mapped_column(
        Enum(BoqRevisionStatus, name="boq_revision_status"),
        nullable=False,
        default=BoqRevisionStatus.draft,
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    contract: Mapped["Contract"] = relationship(back_populates="boq_revisions")
    items: Mapped[list["BoqItem"]] = relationship(back_populates="boq_revision")


class BoqItem(TimestampedUUIDMixin, Base):
    __tablename__ = "boq_items"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    contract_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False
    )
    boq_revision_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("boq_revisions.id"), nullable=False
    )
    item_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    trade_code: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(Text(), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    contract_quantity: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    rate: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    boq_revision: Mapped["BoqRevision"] = relationship(back_populates="items")


class ClaimBatch(TimestampedUUIDMixin, Base):
    __tablename__ = "claim_batches"
    __table_args__ = (UniqueConstraint("contract_id", "period_number"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    contract_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False
    )
    period_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ClaimStatus] = mapped_column(
        Enum(ClaimStatus, name="claim_status"), nullable=False, default=ClaimStatus.draft
    )
    submitted_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    remarks: Mapped[str | None] = mapped_column(Text())

    lines: Mapped[list["ClaimLine"]] = relationship(back_populates="claim_batch")


class ClaimLine(TimestampedUUIDMixin, Base):
    __tablename__ = "claim_lines"

    claim_batch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("claim_batches.id"), nullable=False
    )
    boq_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("boq_items.id"), nullable=False
    )
    previous_certified_quantity: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False, default=0)
    claimed_quantity_this_period: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    claimed_materials_on_site_value: Mapped[float | None] = mapped_column(Numeric(18, 2))
    notes: Mapped[str | None] = mapped_column(Text())

    claim_batch: Mapped["ClaimBatch"] = relationship(back_populates="lines")


class CertificateBatch(TimestampedUUIDMixin, Base):
    __tablename__ = "certificate_batches"
    __table_args__ = (UniqueConstraint("contract_id", "certificate_number"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    contract_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False
    )
    claim_batch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("claim_batches.id")
    )
    certificate_number: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[CertificateStatus] = mapped_column(
        Enum(CertificateStatus, name="certificate_status"),
        nullable=False,
        default=CertificateStatus.draft,
    )
    issue_date: Mapped[date] = mapped_column(Date(), nullable=False)
    previous_net_certified_excl_tax: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    gross_value_to_date: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    retention_held_to_date: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    net_certified_to_date_excl_tax: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    amount_due_this_certificate_excl_tax: Mapped[float] = mapped_column(
        Numeric(18, 2), nullable=False, default=0
    )
    tax_this_certificate: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    amount_due_this_certificate_incl_tax: Mapped[float] = mapped_column(
        Numeric(18, 2), nullable=False, default=0
    )
    issued_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))

    lines: Mapped[list["CertificateLine"]] = relationship(back_populates="certificate_batch")


class CertificateLine(TimestampedUUIDMixin, Base):
    __tablename__ = "certificate_lines"

    certificate_batch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("certificate_batches.id"), nullable=False
    )
    boq_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("boq_items.id"), nullable=False
    )
    claimed_quantity_this_period: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    certified_quantity_this_period: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    previous_certified_quantity: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False, default=0)
    rate: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    work_value_to_date: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    materials_on_site_value_to_date: Mapped[float | None] = mapped_column(Numeric(18, 2))
    variation_value_to_date: Mapped[float | None] = mapped_column(Numeric(18, 2))
    preliminaries_value_to_date: Mapped[float | None] = mapped_column(Numeric(18, 2))
    dayworks_value_to_date: Mapped[float | None] = mapped_column(Numeric(18, 2))
    escalation_value_to_date: Mapped[float | None] = mapped_column(Numeric(18, 2))
    contra_charge_value_to_date: Mapped[float | None] = mapped_column(Numeric(18, 2))
    other_deduction_value_to_date: Mapped[float | None] = mapped_column(Numeric(18, 2))
    notes: Mapped[str | None] = mapped_column(Text())

    certificate_batch: Mapped["CertificateBatch"] = relationship(back_populates="lines")


class AuditEvent(TimestampedUUIDMixin, Base):
    __tablename__ = "audit_events"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    audit_metadata: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
