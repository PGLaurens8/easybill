"""row level security on all tables, and consent-based organization invitations

Supabase exposes the public schema through its REST API using the anon key that ships in the
frontend. Enabling RLS with no policies (and revoking table privileges from the API roles) closes
that path; the backend connects as the table owner and is unaffected.

Revision ID: 20260926_000003
Revises: 20260925_000002
Create Date: 2026-09-26 00:00:03
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "20260926_000003"
down_revision = "20260925_000002"
branch_labels = None
depends_on = None

TABLES = [
    "alembic_version",
    "organizations",
    "memberships",
    "organization_invitations",
    "projects",
    "contracts",
    "boq_revisions",
    "boq_items",
    "claim_batches",
    "claim_lines",
    "certificate_batches",
    "certificate_lines",
    "audit_events",
]

invitation_status = postgresql.ENUM(
    "Pending", "Accepted", "Declined", "Revoked", name="invitation_status", create_type=False
)
membership_role = postgresql.ENUM(name="membership_role", create_type=False)


def upgrade() -> None:
    invitation_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "organization_invitations",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("role", membership_role, nullable=False),
        sa.Column("status", invitation_status, nullable=False),
        sa.Column("invited_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("responded_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_organization_invitations_organization_id_organizations"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_organization_invitations")),
    )
    op.create_index(
        op.f("ix_organization_invitations_organization_id"), "organization_invitations", ["organization_id"]
    )
    op.create_index(op.f("ix_organization_invitations_email"), "organization_invitations", ["email"])
    op.create_index(
        "uq_organization_invitations_pending",
        "organization_invitations",
        ["organization_id", "email"],
        unique=True,
        postgresql_where=sa.text("status = 'Pending'"),
    )

    for table in TABLES:
        op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')
    # anon/authenticated only exist on Supabase; skip quietly elsewhere (local Postgres, CI).
    op.execute(
        """
        DO $$
        DECLARE api_role text;
        BEGIN
          FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
              EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', api_role);
              EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', api_role);
              EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', api_role);
            END IF;
          END LOOP;
        END $$;
        """
    )


def downgrade() -> None:
    for table in TABLES:
        if table != "organization_invitations":
            op.execute(f'ALTER TABLE "{table}" DISABLE ROW LEVEL SECURITY')
    op.drop_index("uq_organization_invitations_pending", table_name="organization_invitations")
    op.drop_index(op.f("ix_organization_invitations_email"), table_name="organization_invitations")
    op.drop_index(op.f("ix_organization_invitations_organization_id"), table_name="organization_invitations")
    op.drop_table("organization_invitations")
    invitation_status.drop(op.get_bind(), checkfirst=True)
