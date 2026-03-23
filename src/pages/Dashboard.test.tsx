import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Dashboard from './Dashboard'
import type {
  BoqRevision,
  CertificateBatch,
  ClaimBatch,
  Contract,
  Organization,
  Project,
} from '../types/api'

const useAppContextMock = vi.fn()

vi.mock('../context/AppContext', () => ({
  useAppContext: () => useAppContextMock(),
}))

function buildOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'org-1',
    name: 'QuantEasy Org',
    slug: 'quanteasy-org',
    created_at: '2026-03-23T00:00:00Z',
    updated_at: '2026-03-23T00:00:00Z',
    ...overrides,
  }
}

function buildProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    organization_id: 'org-1',
    code: 'PRJ-001',
    name: 'Civic Centre',
    description: null,
    client_name: 'Metro Council',
    currency_code: 'ZAR',
    retention_percent_default: '10',
    tax_percent_default: '15',
    status: 'Active',
    created_at: '2026-03-20T00:00:00Z',
    updated_at: '2026-03-23T00:00:00Z',
    ...overrides,
  }
}

function buildContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'contract-1',
    organization_id: 'org-1',
    project_id: 'project-1',
    code: 'CT-001',
    title: 'Main Works',
    currency_code: 'ZAR',
    retention_percent: '10',
    retention_cap_percent: '5',
    tax_percent: '15',
    start_date: '2026-01-01',
    end_date: null,
    status: 'Active',
    created_at: '2026-03-20T00:00:00Z',
    updated_at: '2026-03-23T00:00:00Z',
    ...overrides,
  }
}

function buildRevision(overrides: Partial<BoqRevision> = {}): BoqRevision {
  return {
    id: 'revision-1',
    organization_id: 'org-1',
    project_id: 'project-1',
    contract_id: 'contract-1',
    revision_number: 1,
    status: 'Published',
    published_at: '2026-03-21T00:00:00Z',
    created_at: '2026-03-20T00:00:00Z',
    updated_at: '2026-03-21T00:00:00Z',
    items: [],
    ...overrides,
  }
}

function buildClaim(overrides: Partial<ClaimBatch> = {}): ClaimBatch {
  return {
    id: 'claim-1',
    organization_id: 'org-1',
    project_id: 'project-1',
    contract_id: 'contract-1',
    period_number: 1,
    status: 'Approved',
    submitted_by_user_id: 'user-1',
    submitted_at: '2026-03-21T00:00:00Z',
    reviewed_by_user_id: 'user-2',
    reviewed_at: '2026-03-22T00:00:00Z',
    remarks: null,
    created_at: '2026-03-21T00:00:00Z',
    updated_at: '2026-03-22T00:00:00Z',
    total_claimed_amount: '120000.00',
    lines: [],
    ...overrides,
  }
}

function buildCertificate(overrides: Partial<CertificateBatch> = {}): CertificateBatch {
  return {
    id: 'certificate-1',
    organization_id: 'org-1',
    project_id: 'project-1',
    contract_id: 'contract-1',
    claim_batch_id: 'claim-1',
    certificate_number: 'CERT-001',
    status: 'Issued',
    issue_date: '2026-03-23',
    previous_net_certified_excl_tax: '0.00',
    gross_value_to_date: '120000.00',
    retention_held_to_date: '12000.00',
    net_certified_to_date_excl_tax: '108000.00',
    amount_due_this_certificate_excl_tax: '108000.00',
    tax_this_certificate: '16200.00',
    amount_due_this_certificate_incl_tax: '124200.00',
    issued_by_user_id: 'user-2',
    created_at: '2026-03-23T00:00:00Z',
    updated_at: '2026-03-23T00:00:00Z',
    lines: [],
    ...overrides,
  }
}

function renderDashboard(overrides: Record<string, unknown> = {}) {
  useAppContextMock.mockReturnValue({
    boqRevisions: [],
    certificates: [],
    claims: [],
    contracts: [],
    organizations: [buildOrganization()],
    projects: [],
    selectedOrganization: buildOrganization(),
    ...overrides,
  })

  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

describe('Dashboard page', () => {
  beforeEach(() => {
    useAppContextMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('points the next quick action to project creation when no project exists yet', async () => {
    renderDashboard()

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Next: Create project')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create project Projects are required before contracts, BOQ revisions, and claims.' })).toHaveAttribute(
      'href',
      '/projects',
    )
  })

  it('advances the setup quick action to claims once project, contract, and BOQ setup are complete', async () => {
    renderDashboard({
      projects: [buildProject()],
      contracts: [buildContract()],
      boqRevisions: [buildRevision()],
    })

    expect(await screen.findByText('Next: Create claim')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create claim Submit the first claim after the BOQ has been seeded.' })).toHaveAttribute(
      'href',
      '/claims',
    )
  })

  it('shows the live workflow review action once the commercial setup is complete', async () => {
    renderDashboard({
      projects: [buildProject()],
      contracts: [buildContract()],
      boqRevisions: [buildRevision()],
      claims: [buildClaim()],
      certificates: [buildCertificate()],
    })

    expect(await screen.findByRole('link', { name: 'Review live workflow The core setup is complete. Review the commercial pipeline.' })).toHaveAttribute(
      'href',
      '/claims',
    )
    expect(screen.getByRole('link', { name: 'Projects 1 Open' })).toHaveAttribute('href', '/projects')
    expect(screen.getByRole('link', { name: 'Certificates 1 Open' })).toHaveAttribute('href', '/certificates')
  })
})
