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
    lines: [
      {
        id: 'claim-line-1',
        boq_item_id: 'boq-1',
        item_code: 'EARTH-001',
        trade_code: 'EARTH',
        description: 'Bulk excavation',
        unit: 'm3',
        rate: '12500.00',
        previous_certified_quantity: '0.0000',
        claimed_quantity_this_period: '10.0000',
        claimed_materials_on_site_value: '5000.00',
        line_value: '125000.00',
        notes: null,
      },
    ],
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
    lines: [
      {
        id: 'certificate-line-1',
        boq_item_id: 'boq-1',
        claimed_quantity_this_period: '10.0000',
        certified_quantity_this_period: '10.0000',
        previous_certified_quantity: '0.0000',
        rate: '12500.00',
        work_value_to_date: '125000.00',
        materials_on_site_value_to_date: '5000.00',
        variation_value_to_date: null,
        preliminaries_value_to_date: null,
        dayworks_value_to_date: null,
        escalation_value_to_date: null,
        contra_charge_value_to_date: null,
        other_deduction_value_to_date: null,
        notes: null,
      },
    ],
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
    vi.restoreAllMocks()
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

  it('shows the selected certificate document details and line items', async () => {
    renderCertificatesPage({
      certificates: [buildCertificate()],
      claims: [buildClaim({ id: 'claim-1', status: 'Certified' })],
    })

    expect(await screen.findByText('Certificate Document')).toBeInTheDocument()
    expect(screen.getAllByText('CERT-001')).toHaveLength(2)
    expect(screen.getByText('Bulk excavation')).toBeInTheDocument()
    expect(screen.getByText('Period 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download HTML' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Print certificate' })).toBeEnabled()
  })

  it('downloads the selected certificate document as html', async () => {
    const user = userEvent.setup()
    const createObjectURLSpy = vi.fn(() => 'blob:certificate')
    const revokeObjectURLSpy = vi.fn()
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: revokeObjectURLSpy,
    })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    renderCertificatesPage({
      certificates: [buildCertificate()],
      claims: [buildClaim({ id: 'claim-1', status: 'Certified' })],
    })

    await user.click(await screen.findByRole('button', { name: 'Download HTML' }))

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:certificate')
  })

  it('opens a print preview for the selected certificate document', async () => {
    const user = userEvent.setup()
    const printSpy = vi.fn()
    const focusSpy = vi.fn()
    const writeSpy = vi.fn()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({
      document: {
        open: vi.fn(),
        write: writeSpy,
        close: vi.fn(),
      },
      focus: focusSpy,
      print: printSpy,
    } as unknown as Window)

    renderCertificatesPage({
      certificates: [buildCertificate()],
      claims: [buildClaim({ id: 'claim-1', status: 'Certified' })],
    })

    await user.click(await screen.findByRole('button', { name: 'Print certificate' }))

    expect(openSpy).toHaveBeenCalled()
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('Payment Certificate'))
    expect(focusSpy).toHaveBeenCalled()
    expect(printSpy).toHaveBeenCalled()
  })

  it('shows an empty state when there are no eligible claims left to certify', async () => {
    renderCertificatesPage({
      claims: [buildClaim({ id: 'claim-draft', status: 'Draft' })],
    })

    expect(await screen.findByText('No approved claims available')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Issue certificate' })).toBeDisabled()
  })
})
