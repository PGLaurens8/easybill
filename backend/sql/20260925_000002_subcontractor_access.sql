-- Mirrors alembic revision 20260925_000002 for environments that apply SQL directly.
BEGIN;

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS subcontractor_name VARCHAR(255) NULL;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS subcontractor_user_id UUID NULL;
CREATE INDEX IF NOT EXISTS ix_contracts_subcontractor_user_id ON contracts (subcontractor_user_id);
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS email VARCHAR(320) NULL;

COMMIT;
