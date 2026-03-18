-- Initial commercial schema bootstrap for Supabase SQL Editor.
-- Source of truth: backend/alembic/versions/20260313_000001_initial_schema.py
--
-- Notes:
-- - This creates the same enum types, tables, constraints, and indexes as the
--   initial Alembic migration.
-- - It does not add extra defaults or triggers that are not present in the
--   Alembic migration.
-- - Run this once against the target Supabase Postgres database.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_role') THEN
        CREATE TYPE membership_role AS ENUM (
            'OrgAdmin',
            'CommercialManager',
            'QuantitySurveyor',
            'Contractor',
            'Accounts'
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE project_status AS ENUM (
            'Planned',
            'Ongoing',
            'Completed',
            'OnHold'
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_status') THEN
        CREATE TYPE contract_status AS ENUM (
            'Draft',
            'Active',
            'Closed'
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'boq_revision_status') THEN
        CREATE TYPE boq_revision_status AS ENUM (
            'Draft',
            'Published',
            'Superseded'
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_status') THEN
        CREATE TYPE claim_status AS ENUM (
            'Draft',
            'Submitted',
            'UnderReview',
            'Approved',
            'Rejected',
            'Certified',
            'Paid'
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certificate_status') THEN
        CREATE TYPE certificate_status AS ENUM (
            'Draft',
            'Certified',
            'Issued',
            'Paid',
            'Voided'
        );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS organizations (
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_organizations PRIMARY KEY (id),
    CONSTRAINT uq_organizations_slug UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS memberships (
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role membership_role NOT NULL,
    id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_memberships PRIMARY KEY (id),
    CONSTRAINT fk_memberships_organization_id_organizations
        FOREIGN KEY (organization_id) REFERENCES organizations (id),
    CONSTRAINT uq_memberships_organization_id_user_id UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_memberships_user_id ON memberships (user_id);

CREATE TABLE IF NOT EXISTS projects (
    organization_id UUID NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    status project_status NOT NULL,
    client_name VARCHAR(255) NULL,
    currency_code VARCHAR(3) NOT NULL,
    retention_percent_default NUMERIC(5, 2) NULL,
    tax_percent_default NUMERIC(5, 2) NULL,
    id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_projects PRIMARY KEY (id),
    CONSTRAINT fk_projects_organization_id_organizations
        FOREIGN KEY (organization_id) REFERENCES organizations (id),
    CONSTRAINT uq_projects_organization_id_code UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS contracts (
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    contractor_organization_id UUID NULL,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status contract_status NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    retention_percent NUMERIC(5, 2) NOT NULL,
    retention_cap_percent NUMERIC(5, 2) NULL,
    tax_percent NUMERIC(5, 2) NOT NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_contracts PRIMARY KEY (id),
    CONSTRAINT fk_contracts_organization_id_organizations
        FOREIGN KEY (organization_id) REFERENCES organizations (id),
    CONSTRAINT fk_contracts_project_id_projects
        FOREIGN KEY (project_id) REFERENCES projects (id),
    CONSTRAINT uq_contracts_project_id_code UNIQUE (project_id, code)
);

CREATE TABLE IF NOT EXISTS boq_revisions (
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    contract_id UUID NOT NULL,
    revision_number INTEGER NOT NULL,
    status boq_revision_status NOT NULL,
    published_at TIMESTAMPTZ NULL,
    id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_boq_revisions PRIMARY KEY (id),
    CONSTRAINT fk_boq_revisions_contract_id_contracts
        FOREIGN KEY (contract_id) REFERENCES contracts (id),
    CONSTRAINT fk_boq_revisions_organization_id_organizations
        FOREIGN KEY (organization_id) REFERENCES organizations (id),
    CONSTRAINT fk_boq_revisions_project_id_projects
        FOREIGN KEY (project_id) REFERENCES projects (id),
    CONSTRAINT uq_boq_revisions_contract_id_revision_number UNIQUE (contract_id, revision_number)
);

CREATE TABLE IF NOT EXISTS claim_batches (
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    contract_id UUID NOT NULL,
    period_number INTEGER NOT NULL,
    status claim_status NOT NULL,
    submitted_by_user_id UUID NULL,
    submitted_at TIMESTAMPTZ NULL,
    reviewed_by_user_id UUID NULL,
    reviewed_at TIMESTAMPTZ NULL,
    remarks TEXT NULL,
    id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_claim_batches PRIMARY KEY (id),
    CONSTRAINT fk_claim_batches_contract_id_contracts
        FOREIGN KEY (contract_id) REFERENCES contracts (id),
    CONSTRAINT fk_claim_batches_organization_id_organizations
        FOREIGN KEY (organization_id) REFERENCES organizations (id),
    CONSTRAINT fk_claim_batches_project_id_projects
        FOREIGN KEY (project_id) REFERENCES projects (id),
    CONSTRAINT uq_claim_batches_contract_id_period_number UNIQUE (contract_id, period_number)
);

CREATE TABLE IF NOT EXISTS certificate_batches (
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    contract_id UUID NOT NULL,
    claim_batch_id UUID NULL,
    certificate_number VARCHAR(50) NOT NULL,
    status certificate_status NOT NULL,
    issue_date DATE NOT NULL,
    previous_net_certified_excl_tax NUMERIC(18, 2) NOT NULL,
    gross_value_to_date NUMERIC(18, 2) NOT NULL,
    retention_held_to_date NUMERIC(18, 2) NOT NULL,
    net_certified_to_date_excl_tax NUMERIC(18, 2) NOT NULL,
    amount_due_this_certificate_excl_tax NUMERIC(18, 2) NOT NULL,
    tax_this_certificate NUMERIC(18, 2) NOT NULL,
    amount_due_this_certificate_incl_tax NUMERIC(18, 2) NOT NULL,
    issued_by_user_id UUID NULL,
    id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_certificate_batches PRIMARY KEY (id),
    CONSTRAINT fk_certificate_batches_claim_batch_id_claim_batches
        FOREIGN KEY (claim_batch_id) REFERENCES claim_batches (id),
    CONSTRAINT fk_certificate_batches_contract_id_contracts
        FOREIGN KEY (contract_id) REFERENCES contracts (id),
    CONSTRAINT fk_certificate_batches_organization_id_organizations
        FOREIGN KEY (organization_id) REFERENCES organizations (id),
    CONSTRAINT fk_certificate_batches_project_id_projects
        FOREIGN KEY (project_id) REFERENCES projects (id),
    CONSTRAINT uq_certificate_batches_contract_id_certificate_number UNIQUE (contract_id, certificate_number)
);

CREATE TABLE IF NOT EXISTS boq_items (
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    contract_id UUID NOT NULL,
    boq_revision_id UUID NOT NULL,
    item_code VARCHAR(50) NOT NULL,
    trade_code VARCHAR(50) NULL,
    description TEXT NOT NULL,
    unit VARCHAR(20) NOT NULL,
    contract_quantity NUMERIC(18, 4) NOT NULL,
    rate NUMERIC(18, 4) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    order_index INTEGER NOT NULL,
    id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_boq_items PRIMARY KEY (id),
    CONSTRAINT fk_boq_items_boq_revision_id_boq_revisions
        FOREIGN KEY (boq_revision_id) REFERENCES boq_revisions (id),
    CONSTRAINT fk_boq_items_contract_id_contracts
        FOREIGN KEY (contract_id) REFERENCES contracts (id),
    CONSTRAINT fk_boq_items_organization_id_organizations
        FOREIGN KEY (organization_id) REFERENCES organizations (id),
    CONSTRAINT fk_boq_items_project_id_projects
        FOREIGN KEY (project_id) REFERENCES projects (id)
);

CREATE INDEX IF NOT EXISTS ix_boq_items_item_code ON boq_items (item_code);

CREATE TABLE IF NOT EXISTS audit_events (
    organization_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    actor_user_id UUID NULL,
    action VARCHAR(100) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL,
    id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_audit_events PRIMARY KEY (id),
    CONSTRAINT fk_audit_events_organization_id_organizations
        FOREIGN KEY (organization_id) REFERENCES organizations (id)
);

CREATE INDEX IF NOT EXISTS ix_audit_events_entity_id ON audit_events (entity_id);

CREATE TABLE IF NOT EXISTS claim_lines (
    claim_batch_id UUID NOT NULL,
    boq_item_id UUID NOT NULL,
    previous_certified_quantity NUMERIC(18, 4) NOT NULL,
    claimed_quantity_this_period NUMERIC(18, 4) NOT NULL,
    claimed_materials_on_site_value NUMERIC(18, 2) NULL,
    notes TEXT NULL,
    id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_claim_lines PRIMARY KEY (id),
    CONSTRAINT fk_claim_lines_boq_item_id_boq_items
        FOREIGN KEY (boq_item_id) REFERENCES boq_items (id),
    CONSTRAINT fk_claim_lines_claim_batch_id_claim_batches
        FOREIGN KEY (claim_batch_id) REFERENCES claim_batches (id)
);

CREATE TABLE IF NOT EXISTS certificate_lines (
    certificate_batch_id UUID NOT NULL,
    boq_item_id UUID NOT NULL,
    claimed_quantity_this_period NUMERIC(18, 4) NOT NULL,
    certified_quantity_this_period NUMERIC(18, 4) NOT NULL,
    previous_certified_quantity NUMERIC(18, 4) NOT NULL,
    rate NUMERIC(18, 4) NOT NULL,
    work_value_to_date NUMERIC(18, 2) NOT NULL,
    materials_on_site_value_to_date NUMERIC(18, 2) NULL,
    variation_value_to_date NUMERIC(18, 2) NULL,
    preliminaries_value_to_date NUMERIC(18, 2) NULL,
    dayworks_value_to_date NUMERIC(18, 2) NULL,
    escalation_value_to_date NUMERIC(18, 2) NULL,
    contra_charge_value_to_date NUMERIC(18, 2) NULL,
    other_deduction_value_to_date NUMERIC(18, 2) NULL,
    notes TEXT NULL,
    id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_certificate_lines PRIMARY KEY (id),
    CONSTRAINT fk_certificate_lines_boq_item_id_boq_items
        FOREIGN KEY (boq_item_id) REFERENCES boq_items (id),
    CONSTRAINT fk_certificate_lines_certificate_batch_id_certificate_batches
        FOREIGN KEY (certificate_batch_id) REFERENCES certificate_batches (id)
);

COMMIT;
