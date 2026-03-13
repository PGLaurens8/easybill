"""initial commercial schema

Revision ID: 20260313_000001
Revises:
Create Date: 2026-03-13 00:00:01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260313_000001"
down_revision = None
branch_labels = None
depends_on = None


membership_role = sa.Enum(
    "OrgAdmin",
    "CommercialManager",
    "QuantitySurveyor",
    "Contractor",
    "Accounts",
    name="membership_role",
)
project_status = sa.Enum("Planned", "Ongoing", "Completed", "OnHold", name="project_status")
contract_status = sa.Enum("Draft", "Active", "Closed", name="contract_status")
boq_revision_status = sa.Enum("Draft", "Published", "Superseded", name="boq_revision_status")
claim_status = sa.Enum(
    "Draft", "Submitted", "UnderReview", "Approved", "Rejected", "Certified", "Paid", name="claim_status"
)
certificate_status = sa.Enum("Draft", "Certified", "Issued", "Paid", "Voided", name="certificate_status")


def upgrade() -> None:
    bind = op.get_bind()
    membership_role.create(bind, checkfirst=True)
    project_status.create(bind, checkfirst=True)
    contract_status.create(bind, checkfirst=True)
    boq_revision_status.create(bind, checkfirst=True)
    claim_status.create(bind, checkfirst=True)
    certificate_status.create(bind, checkfirst=True)

    op.create_table(
        "organizations",
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_organizations")),
        sa.UniqueConstraint("slug", name=op.f("uq_organizations_slug")),
    )
    op.create_table(
        "memberships",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", membership_role, nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], name=op.f("fk_memberships_organization_id_organizations")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_memberships")),
        sa.UniqueConstraint("organization_id", "user_id", name="uq_memberships_organization_id_user_id"),
    )
    op.create_index(op.f("ix_memberships_user_id"), "memberships", ["user_id"], unique=False)
    op.create_table(
        "projects",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", project_status, nullable=False),
        sa.Column("client_name", sa.String(length=255), nullable=True),
        sa.Column("currency_code", sa.String(length=3), nullable=False),
        sa.Column("retention_percent_default", sa.Numeric(5, 2), nullable=True),
        sa.Column("tax_percent_default", sa.Numeric(5, 2), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], name=op.f("fk_projects_organization_id_organizations")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_projects")),
        sa.UniqueConstraint("organization_id", "code", name="uq_projects_organization_id_code"),
    )
    op.create_table(
        "contracts",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contractor_organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("status", contract_status, nullable=False),
        sa.Column("currency_code", sa.String(length=3), nullable=False),
        sa.Column("retention_percent", sa.Numeric(5, 2), nullable=False),
        sa.Column("retention_cap_percent", sa.Numeric(5, 2), nullable=True),
        sa.Column("tax_percent", sa.Numeric(5, 2), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], name=op.f("fk_contracts_organization_id_organizations")),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name=op.f("fk_contracts_project_id_projects")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_contracts")),
        sa.UniqueConstraint("project_id", "code", name="uq_contracts_project_id_code"),
    )
    op.create_table(
        "boq_revisions",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contract_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("status", boq_revision_status, nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["contract_id"], ["contracts.id"], name=op.f("fk_boq_revisions_contract_id_contracts")),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], name=op.f("fk_boq_revisions_organization_id_organizations")),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name=op.f("fk_boq_revisions_project_id_projects")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_boq_revisions")),
        sa.UniqueConstraint("contract_id", "revision_number", name="uq_boq_revisions_contract_id_revision_number"),
    )
    op.create_table(
        "claim_batches",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contract_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("period_number", sa.Integer(), nullable=False),
        sa.Column("status", claim_status, nullable=False),
        sa.Column("submitted_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["contract_id"], ["contracts.id"], name=op.f("fk_claim_batches_contract_id_contracts")),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], name=op.f("fk_claim_batches_organization_id_organizations")),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name=op.f("fk_claim_batches_project_id_projects")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_claim_batches")),
        sa.UniqueConstraint("contract_id", "period_number", name="uq_claim_batches_contract_id_period_number"),
    )
    op.create_table(
        "certificate_batches",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contract_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("claim_batch_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("certificate_number", sa.String(length=50), nullable=False),
        sa.Column("status", certificate_status, nullable=False),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("previous_net_certified_excl_tax", sa.Numeric(18, 2), nullable=False),
        sa.Column("gross_value_to_date", sa.Numeric(18, 2), nullable=False),
        sa.Column("retention_held_to_date", sa.Numeric(18, 2), nullable=False),
        sa.Column("net_certified_to_date_excl_tax", sa.Numeric(18, 2), nullable=False),
        sa.Column("amount_due_this_certificate_excl_tax", sa.Numeric(18, 2), nullable=False),
        sa.Column("tax_this_certificate", sa.Numeric(18, 2), nullable=False),
        sa.Column("amount_due_this_certificate_incl_tax", sa.Numeric(18, 2), nullable=False),
        sa.Column("issued_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["claim_batch_id"], ["claim_batches.id"], name=op.f("fk_certificate_batches_claim_batch_id_claim_batches")),
        sa.ForeignKeyConstraint(["contract_id"], ["contracts.id"], name=op.f("fk_certificate_batches_contract_id_contracts")),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], name=op.f("fk_certificate_batches_organization_id_organizations")),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name=op.f("fk_certificate_batches_project_id_projects")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_certificate_batches")),
        sa.UniqueConstraint("contract_id", "certificate_number", name="uq_certificate_batches_contract_id_certificate_number"),
    )
    op.create_table(
        "boq_items",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contract_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("boq_revision_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_code", sa.String(length=50), nullable=False),
        sa.Column("trade_code", sa.String(length=50), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("unit", sa.String(length=20), nullable=False),
        sa.Column("contract_quantity", sa.Numeric(18, 4), nullable=False),
        sa.Column("rate", sa.Numeric(18, 4), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["boq_revision_id"], ["boq_revisions.id"], name=op.f("fk_boq_items_boq_revision_id_boq_revisions")),
        sa.ForeignKeyConstraint(["contract_id"], ["contracts.id"], name=op.f("fk_boq_items_contract_id_contracts")),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], name=op.f("fk_boq_items_organization_id_organizations")),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name=op.f("fk_boq_items_project_id_projects")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_boq_items")),
    )
    op.create_index(op.f("ix_boq_items_item_code"), "boq_items", ["item_code"], unique=False)
    op.create_table(
        "audit_events",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], name=op.f("fk_audit_events_organization_id_organizations")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_audit_events")),
    )
    op.create_index(op.f("ix_audit_events_entity_id"), "audit_events", ["entity_id"], unique=False)
    op.create_table(
        "claim_lines",
        sa.Column("claim_batch_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("boq_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("previous_certified_quantity", sa.Numeric(18, 4), nullable=False),
        sa.Column("claimed_quantity_this_period", sa.Numeric(18, 4), nullable=False),
        sa.Column("claimed_materials_on_site_value", sa.Numeric(18, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["boq_item_id"], ["boq_items.id"], name=op.f("fk_claim_lines_boq_item_id_boq_items")),
        sa.ForeignKeyConstraint(["claim_batch_id"], ["claim_batches.id"], name=op.f("fk_claim_lines_claim_batch_id_claim_batches")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_claim_lines")),
    )
    op.create_table(
        "certificate_lines",
        sa.Column("certificate_batch_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("boq_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("claimed_quantity_this_period", sa.Numeric(18, 4), nullable=False),
        sa.Column("certified_quantity_this_period", sa.Numeric(18, 4), nullable=False),
        sa.Column("previous_certified_quantity", sa.Numeric(18, 4), nullable=False),
        sa.Column("rate", sa.Numeric(18, 4), nullable=False),
        sa.Column("work_value_to_date", sa.Numeric(18, 2), nullable=False),
        sa.Column("materials_on_site_value_to_date", sa.Numeric(18, 2), nullable=True),
        sa.Column("variation_value_to_date", sa.Numeric(18, 2), nullable=True),
        sa.Column("preliminaries_value_to_date", sa.Numeric(18, 2), nullable=True),
        sa.Column("dayworks_value_to_date", sa.Numeric(18, 2), nullable=True),
        sa.Column("escalation_value_to_date", sa.Numeric(18, 2), nullable=True),
        sa.Column("contra_charge_value_to_date", sa.Numeric(18, 2), nullable=True),
        sa.Column("other_deduction_value_to_date", sa.Numeric(18, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["boq_item_id"], ["boq_items.id"], name=op.f("fk_certificate_lines_boq_item_id_boq_items")),
        sa.ForeignKeyConstraint(["certificate_batch_id"], ["certificate_batches.id"], name=op.f("fk_certificate_lines_certificate_batch_id_certificate_batches")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_certificate_lines")),
    )


def downgrade() -> None:
    op.drop_table("certificate_lines")
    op.drop_table("claim_lines")
    op.drop_index(op.f("ix_audit_events_entity_id"), table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_index(op.f("ix_boq_items_item_code"), table_name="boq_items")
    op.drop_table("boq_items")
    op.drop_table("certificate_batches")
    op.drop_table("claim_batches")
    op.drop_table("boq_revisions")
    op.drop_table("contracts")
    op.drop_table("projects")
    op.drop_index(op.f("ix_memberships_user_id"), table_name="memberships")
    op.drop_table("memberships")
    op.drop_table("organizations")

    bind = op.get_bind()
    certificate_status.drop(bind, checkfirst=True)
    claim_status.drop(bind, checkfirst=True)
    boq_revision_status.drop(bind, checkfirst=True)
    contract_status.drop(bind, checkfirst=True)
    project_status.drop(bind, checkfirst=True)
    membership_role.drop(bind, checkfirst=True)
