import type {
  BoqRevision,
  CertificateBatch,
  CertificateLine,
  ClaimBatch,
  ClaimLine,
  Contract,
  Organization,
  OrganizationMembership,
  Project,
} from '../types/api'

const timestamp = '2026-03-21T00:00:00Z'

export function buildOrganization(overrides: Partial<Organization> = {}): Organization {
  return { id: 'org-1', name: 'Acme Builders', slug: 'acme', created_at: timestamp, updated_at: timestamp, ...overrides }
}

export function buildMembership(overrides: Partial<OrganizationMembership> = {}): OrganizationMembership {
  return {
    id: 'membership-1',
    organization_id: 'org-1',
    user_id: 'user-admin',
    email: 'director@acme.co.za',
    role: 'OrgAdmin',
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  }
}

export function buildProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    organization_id: 'org-1',
    code: 'PRJ-001',
    name: 'Willows Estate',
    description: null,
    client_name: 'Willows Devco',
    currency_code: 'ZAR',
    retention_percent_default: null,
    tax_percent_default: null,
    status: 'Ongoing',
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  }
}

export function buildContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'contract-1',
    organization_id: 'org-1',
    project_id: 'project-1',
    code: 'SC-001',
    title: 'Brickwork',
    subcontractor_name: 'Mthembu Builders',
    subcontractor_user_id: null,
    currency_code: 'ZAR',
    retention_percent: '10.00',
    retention_cap_percent: '5.00',
    tax_percent: '15.00',
    start_date: null,
    end_date: null,
    practical_completion_date: null,
    final_completion_date: null,
    status: 'Active',
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  }
}

export function buildRevision(overrides: Partial<BoqRevision> = {}): BoqRevision {
  return {
    id: 'revision-1',
    organization_id: 'org-1',
    project_id: 'project-1',
    contract_id: 'contract-1',
    revision_number: 1,
    status: 'Published',
    published_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
    items: [
      {
        id: 'item-b1',
        boq_revision_id: 'revision-1',
        item_code: 'B1',
        trade_code: 'BRICK',
        description: 'Face brick walls',
        unit: 'm2',
        contract_quantity: '100.0000',
        rate: '200.0000',
        amount: '20000.00',
        order_index: 0,
        variation_order_id: null,
      },
      {
        id: 'item-p1',
        boq_revision_id: 'revision-1',
        item_code: 'P1',
        trade_code: 'PLAST',
        description: 'Internal plaster',
        unit: 'm2',
        contract_quantity: '200.0000',
        rate: '50.0000',
        amount: '10000.00',
        order_index: 1,
        variation_order_id: null,
      },
    ],
    ...overrides,
  }
}

export function buildClaimLine(overrides: Partial<ClaimLine> = {}): ClaimLine {
  return {
    id: 'claim-line-1',
    boq_item_id: 'item-b1',
    item_code: 'B1',
    trade_code: 'BRICK',
    description: 'Face brick walls',
    unit: 'm2',
    rate: '200.0000',
    contract_quantity: '100.0000',
    previous_certified_quantity: '0.0000',
    claimed_quantity_this_period: '40.0000',
    claimed_materials_on_site_value: null,
    line_value: '8000.00',
    notes: null,
    ...overrides,
  }
}

export function buildClaim(overrides: Partial<ClaimBatch> = {}): ClaimBatch {
  return {
    id: 'claim-1',
    organization_id: 'org-1',
    project_id: 'project-1',
    contract_id: 'contract-1',
    period_number: 1,
    valuation_date: '2026-03-31',
    status: 'Approved',
    submitted_by_user_id: 'user-sub',
    submitted_at: timestamp,
    reviewed_by_user_id: 'user-admin',
    reviewed_at: timestamp,
    remarks: null,
    created_at: timestamp,
    updated_at: timestamp,
    total_claimed_amount: '8000.00',
    lines: [buildClaimLine()],
    ...overrides,
  }
}

export function buildCertificateLine(overrides: Partial<CertificateLine> = {}): CertificateLine {
  return {
    id: 'cert-line-1',
    boq_item_id: 'item-b1',
    item_code: 'B1',
    description: 'Face brick walls',
    unit: 'm2',
    rate: '200.0000',
    contract_quantity: '100.0000',
    previous_certified_quantity: '0.0000',
    claimed_quantity_this_period: '40.0000',
    certified_quantity_this_period: '40.0000',
    work_value_to_date: '8000.00',
    materials_on_site_value_to_date: null,
    variation_value_to_date: null,
    preliminaries_value_to_date: null,
    dayworks_value_to_date: null,
    escalation_value_to_date: null,
    contra_charge_value_to_date: null,
    other_deduction_value_to_date: null,
    notes: null,
    ...overrides,
  }
}

export function buildCertificate(overrides: Partial<CertificateBatch> = {}): CertificateBatch {
  return {
    id: 'certificate-1',
    organization_id: 'org-1',
    project_id: 'project-1',
    contract_id: 'contract-1',
    claim_batch_id: 'claim-9',
    certificate_number: 'CERT-001',
    status: 'Issued',
    issue_date: '2026-03-25',
    previous_net_certified_excl_tax: '0.00',
    gross_value_to_date: '8000.00',
    retention_held_to_date: '800.00',
    retention_released_to_date: '0.00',
    contra_charges_to_date: '0.00',
    net_certified_to_date_excl_tax: '7200.00',
    amount_due_this_certificate_excl_tax: '7200.00',
    tax_this_certificate: '1080.00',
    amount_due_this_certificate_incl_tax: '8280.00',
    issued_by_user_id: 'user-admin',
    created_at: timestamp,
    updated_at: timestamp,
    lines: [buildCertificateLine()],
    ...overrides,
  }
}
