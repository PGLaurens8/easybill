"""subcontractor assignment on contracts and member emails

Revision ID: 20260925_000002
Revises: 20260313_000001
Create Date: 2026-09-25 00:00:02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260925_000002"
down_revision = "20260313_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("contracts", sa.Column("subcontractor_name", sa.String(length=255), nullable=True))
    op.add_column("contracts", sa.Column("subcontractor_user_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index(op.f("ix_contracts_subcontractor_user_id"), "contracts", ["subcontractor_user_id"], unique=False)
    op.add_column("memberships", sa.Column("email", sa.String(length=320), nullable=True))


def downgrade() -> None:
    op.drop_column("memberships", "email")
    op.drop_index(op.f("ix_contracts_subcontractor_user_id"), table_name="contracts")
    op.drop_column("contracts", "subcontractor_user_id")
    op.drop_column("contracts", "subcontractor_name")
