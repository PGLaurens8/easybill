-- Mirrors alembic revision 20260926_000003 for environments that apply SQL directly (e.g. Supabase SQL editor).
BEGIN;

DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('Pending', 'Accepted', 'Declined', 'Revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS organization_invitations (
    organization_id UUID NOT NULL,
    email VARCHAR(320) NOT NULL,
    role membership_role NOT NULL,
    status invitation_status NOT NULL,
    invited_by_user_id UUID NOT NULL,
    responded_by_user_id UUID NULL,
    responded_at TIMESTAMPTZ NULL,
    id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_organization_invitations PRIMARY KEY (id),
    CONSTRAINT fk_organization_invitations_organization_id_organizations
        FOREIGN KEY (organization_id) REFERENCES organizations (id)
);
CREATE INDEX IF NOT EXISTS ix_organization_invitations_organization_id ON organization_invitations (organization_id);
CREATE INDEX IF NOT EXISTS ix_organization_invitations_email ON organization_invitations (email);
CREATE UNIQUE INDEX IF NOT EXISTS uq_organization_invitations_pending
    ON organization_invitations (organization_id, email) WHERE status = 'Pending';

-- Close the Supabase REST API path to every table; the backend connects as the owner and is unaffected.
ALTER TABLE alembic_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

COMMIT;
