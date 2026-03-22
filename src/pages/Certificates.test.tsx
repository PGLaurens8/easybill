import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Certificates from './Certificates'
import type {
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
    created_at: '2026-03-21T00:00:00Z',
    updated_at: '2026-03-21T00:00:00Z',
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
    client_name: 'Client',
    currency_code: 'ZAR',
    retention_percent_default: '10',
    tax_percent_default: '15',
    status: 'Active',
    created_at: '2026-03-21T00:00:00Z',
    updated_at: '2026-03-21T00:00:00Z',
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
    created_at: '2026-03-21T00:00:00Z',
    updated_at: '2026-03-21T00:00:00Z',
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
    submitted_at: '2026-03-20T00:00:00Z',
    reviewed_by_user_id: 'user-2',
    reviewed_at: '2026-03-21T00:00:00Z',
    remarks: null,
    created_at: '2026-03-20T00:00:00Z',
    updated_at: '2026-03-21T00:00:00Z',
    total_claimed_amount: '125000.00',
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
    issue_date: '2026-03-21',
    previous_net_certified_excl_tax: '0',
    gross_value_to_date: '125000.00',
    retention_held_to_date: '12500.00',
    net_certified_to_date_excl_tax: '112500.00',
    amount_due_this_certificate_excl_tax: '112500.00',
    tax_this_certificate: '16875.00',
    amount_due_this_certificate_incl_tax: '129375.00',
    issued_by_user_id: 'user-2',
    created_at: '2026-03-21T00:00:00Z',
    updated_at: '2026-03-21T00:00:00Z',
    lines: [],
    ...overrides,
  }
}

function renderCertificatesPage(overrides: Record<string, unknown> = {}) {
  const createCertificateBatch = vi.fn().mockResolvedValue(buildCertificate())
  const refreshCommercialData = vi.fn().mockResolvedValue(undefined)

  useAppContextMock.mockReturnValue({
    certificates: [],
    claims: [buildClaim()],
    contracts: [buildContract()],
    createCertificateBatch,
    error: null,
    projects: [buildProject()],
    refreshCommercialData,
    selectedOrganization: buildOrganization(),
    ...overrides,
  })

  render(<Certificates />)

  return {
    createCertificateBatch,
    refreshCommercialData,
  }
}

describe('Certificates page', () => {
  beforeEach(() => {
    useAppContextMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('only shows approved or certified claims that do not already have a certificate', async () => {
    renderCertificatesPage({
      claims: [
        buildClaim({ id: 'claim-approved', period_number: 1, status: 'Approved' }),
        buildClaim({ id: 'claim-certified', period_number: 2, status: 'Certified' }),
        buildClaim({ id: 'claim-draft', period_number: 3, status: 'Draft' }),
        buildClaim({ id: 'claim-paid', period_number: 4, status: 'Paid' }),
      ],
      certificates: [buildCertificate({ id: 'certificate-existing', claim_batch_id: 'claim-paid' })],
    })

    const claimSelect = await screen.findByLabelText('Eligible claim')
    const options = Array.from(claimSelect.querySelectorAll('option')).map((option) => option.textContent)

    expect(options).toContain('PRJ-001 · Main Works · Period 1')
    expect(options).toContain('PRJ-001 · Main Works · Period 2')
    expect(options).not.toContain('PRJ-001 · Main Works · Period 3')
    expect(options).not.toContain('PRJ-001 · Main Works · Period 4')
  })

  it('submits a certificate for the selected claim and refreshes commercial data', async () => {
    const user = userEvent.setup()
    const { createCertificateBatch, refreshCommercialData } = renderCertificatesPage({
      claims: [buildClaim({ id: 'claim-7', period_number: 7 })],
    })

    const certificateNumberInput = await screen.findByLabelText('Certificate number')
    await waitFor(() => {
      expect(certificateNumberInput).toHaveValue('CERT-007')
    })

    fireEvent.change(certificateNumberInput, { target: { value: 'CERT-2026-007' } })
    await user.click(screen.getByRole('button', { name: 'Issue certificate' }))

    await waitFor(() => {
      expect(createCertificateBatch).toHaveBeenCalledWith({
        project_id: 'project-1',
        contract_id: 'contract-1',
        claim_batch_id: 'claim-7',
        certificate_number: 'CERT-2026-007',
        issue_date: new Date().toISOString().slice(0, 10),
      })
    })
    expect(refreshCommercialData).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state when there are no eligible claims left to certify', async () => {
    renderCertificatesPage({
      claims: [buildClaim({ id: 'claim-draft', status: 'Draft' })],
    })

    expect(await screen.findByText('No approved claims available')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Issue certificate' })).toBeDisabled()
  })
})
