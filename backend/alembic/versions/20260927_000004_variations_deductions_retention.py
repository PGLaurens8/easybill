"""variations, contra-charges, retention release and valuation month

Revision ID: 20260927_000004
Revises: 20260926_000003
Create Date: 2026-09-27 00:00:04
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "20260927_000004"
down_revision = "20260926_000003"
branch_labels = None
depends_on = None

variation_status = postgresql.ENUM("Submitted", "Approved", "Rejected", name="variation_status", create_type=False)


def _timestamps():
    return [
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    ]


def upgrade() -> None:
    variation_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "variation_orders",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contract_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("number", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", variation_status, nullable=False),
        sa.Column("items", postgresql.JSONB(), nullable=False),
        sa.Column("submitted_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("decided_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_remarks", sa.Text(), nullable=True),
        sa.Column("boq_revision_id", postgresql.UUID(as_uuid=True), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], name=op.f("fk_variation_orders_organization_id_organizations")
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name=op.f("fk_variation_orders_project_id_projects")),
        sa.ForeignKeyConstraint(
            ["contract_id"], ["contracts.id"], name=op.f("fk_variation_orders_contract_id_contracts")
        ),
        sa.ForeignKeyConstraint(
            ["boq_revision_id"], ["boq_revisions.id"], name=op.f("fk_variation_orders_boq_revision_id_boq_revisions")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_variation_orders")),
        sa.UniqueConstraint("contract_id", "number", name=op.f("uq_variation_orders_contract_id")),
    )
    op.create_index(op.f("ix_variation_orders_contract_id"), "variation_orders", ["contract_id"])

    op.create_table(
        "contra_charges",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contract_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("charge_date", sa.Date(), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("certificate_batch_id", postgresql.UUID(as_uuid=True), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], name=op.f("fk_contra_charges_organization_id_organizations")
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name=op.f("fk_contra_charges_project_id_projects")),
        sa.ForeignKeyConstraint(
            ["contract_id"], ["contracts.id"], name=op.f("fk_contra_charges_contract_id_contracts")
        ),
        sa.ForeignKeyConstraint(
            ["certificate_batch_id"],
            ["certificate_batches.id"],
            name=op.f("fk_contra_charges_certificate_batch_id_certificate_batches"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_contra_charges")),
    )
    op.create_index(op.f("ix_contra_charges_contract_id"), "contra_charges", ["contract_id"])

    op.add_column("boq_items", sa.Column("variation_order_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        op.f("fk_boq_items_variation_order_id_variation_orders"),
        "boq_items",
        "variation_orders",
        ["variation_order_id"],
        ["id"],
    )
    op.create_index(op.f("ix_boq_items_variation_order_id"), "boq_items", ["variation_order_id"])

    op.add_column("contracts", sa.Column("practical_completion_date", sa.Date(), nullable=True))
    op.add_column("contracts", sa.Column("final_completion_date", sa.Date(), nullable=True))
    op.add_column("claim_batches", sa.Column("valuation_date", sa.Date(), nullable=True))
    op.add_column(
        "certificate_batches",
        sa.Column("retention_released_to_date", sa.Numeric(18, 2), server_default="0", nullable=False),
    )
    op.add_column(
        "certificate_batches",
        sa.Column("contra_charges_to_date", sa.Numeric(18, 2), server_default="0", nullable=False),
    )

    # Keep the Supabase REST API closed for the new tables too (see 20260926_000003).
    op.execute('ALTER TABLE "variation_orders" ENABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE "contra_charges" ENABLE ROW LEVEL SECURITY')
    op.execute(
        """
        DO $$
        DECLARE api_role text;
        BEGIN
          FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
              EXECUTE format('REVOKE ALL ON variation_orders, contra_charges FROM %I', api_role);
            END IF;
          END LOOP;
        END $$;
        """
    )


def downgrade() -> None:
    op.drop_column("certificate_batches", "contra_charges_to_date")
    op.drop_column("certificate_batches", "retention_released_to_date")
    op.drop_column("claim_batches", "valuation_date")
    op.drop_column("contracts", "final_completion_date")
    op.drop_column("contracts", "practical_completion_date")
    op.drop_index(op.f("ix_boq_items_variation_order_id"), table_name="boq_items")
    op.drop_constraint(op.f("fk_boq_items_variation_order_id_variation_orders"), "boq_items", type_="foreignkey")
    op.drop_column("boq_items", "variation_order_id")
    op.drop_index(op.f("ix_contra_charges_contract_id"), table_name="contra_charges")
    op.drop_table("contra_charges")
    op.drop_index(op.f("ix_variation_orders_contract_id"), table_name="variation_orders")
    op.drop_table("variation_orders")
    variation_status.drop(op.get_bind(), checkfirst=True)
