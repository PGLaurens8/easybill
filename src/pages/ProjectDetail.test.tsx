import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ProjectDetail from './ProjectDetail'
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
    description: 'Municipal offices and chamber upgrades',
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

function renderProjectDetail(overrides: Record<string, unknown> = {}) {
  useAppContextMock.mockReturnValue({
    boqRevisions: [buildRevision()],
    certificates: [buildCertificate()],
    claims: [buildClaim()],
    contracts: [buildContract()],
    projects: [buildProject()],
    selectedOrganization: buildOrganization(),
    ...overrides,
  })

  render(
    <MemoryRouter initialEntries={['/projects/project-1']}>
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
        <Route path="/projects" element={<div>Projects Index</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProjectDetail page', () => {
  beforeEach(() => {
    useAppContextMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('builds workflow links that preserve the current project context', async () => {
    renderProjectDetail()

    expect(await screen.findByText('Project workspace')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Commercial Workspace Create or refine contracts and BOQ revisions for this project.' })).toHaveAttribute(
      'href',
      '/boq-builder?projectId=project-1',
    )
    expect(screen.getByRole('link', { name: 'Open Claims Review or create claims with this project preselected.' })).toHaveAttribute(
      'href',
      '/claims?projectId=project-1',
    )
    expect(screen.getByRole('link', { name: 'Open Certificates Issue or review certificates for the same project context.' })).toHaveAttribute(
      'href',
      '/certificates?projectId=project-1',
    )
  })

  it('falls back to the projects index when the selected organization is missing', async () => {
    renderProjectDetail({ selectedOrganization: null })

    expect(await screen.findByText('Projects Index')).toBeInTheDocument()
  })
})
