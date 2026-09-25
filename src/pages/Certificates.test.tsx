import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CertificateValuation } from '../types/api'
import {
  buildCertificate,
  buildClaim,
  buildClaimLine,
  buildContract,
  buildOrganization,
  buildProject,
} from '../test/fixtures'
import Certificates from './Certificates'

const useAppContextMock = vi.fn()

vi.mock('../context/AppContext', () => ({
  useAppContext: () => useAppContextMock(),
}))

function valuation(overrides: Partial<CertificateValuation> = {}): CertificateValuation {
  return {
    claim_batch_id: 'claim-1',
    contract_id: 'contract-1',
    contract_value: '30000.00',
    previous_net_certified_excl_tax: '0.00',
    gross_value_to_date: '8000.00',
    retention_held_to_date: '800.00',
    retention_released_to_date: '0.00',
    contra_charges_to_date: '0.00',
    net_certified_to_date_excl_tax: '7200.00',
    amount_due_this_certificate_excl_tax: '7200.00',
    tax_this_certificate: '1080.00',
    amount_due_this_certificate_incl_tax: '8280.00',
    lines: [],
    ...overrides,
  }
}

function renderPage(overrides: Record<string, unknown> = {}, initialPath = '/certificates') {
  const previewCertificate = vi.fn().mockResolvedValue(valuation())
  const createCertificateBatch = vi.fn().mockResolvedValue(buildCertificate({ certificate_number: 'CERT-002' }))
  const updateCertificateStatus = vi.fn().mockResolvedValue(buildCertificate({ status: 'Paid' }))

  useAppContextMock.mockReturnValue({
    certificates: [],
    claims: [buildClaim()],
    contracts: [buildContract()],
    createCertificateBatch,
    currentRole: 'QuantitySurveyor',
    error: null,
    previewCertificate,
    projects: [buildProject()],
    refreshCommercialData: vi.fn(),
    selectedOrganization: buildOrganization(),
    updateCertificateStatus,
    ...overrides,
  })

  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Certificates />
    </MemoryRouter>,
  )
  return { previewCertificate, createCertificateBatch, updateCertificateStatus }
}

describe('Certificates page', () => {
  beforeEach(() => useAppContextMock.mockReset())
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('only offers approved claims that have no live certificate', () => {
    renderPage({
      claims: [
        buildClaim({ id: 'claim-1', period_number: 1, status: 'Approved' }),
        buildClaim({ id: 'claim-2', period_number: 2, status: 'Submitted' }),
        buildClaim({ id: 'claim-3', period_number: 3, status: 'Certified' }),
        buildClaim({ id: 'claim-4', period_number: 4, status: 'Approved' }),
      ],
      certificates: [
        buildCertificate({ id: 'cert-a', claim_batch_id: 'claim-3' }),
        buildCertificate({ id: 'cert-b', claim_batch_id: 'claim-4', status: 'Voided' }),
      ],
    })

    const options = Array.from((screen.getByLabelText('Approved claim') as HTMLSelectElement).options).map((o) => o.value)
    expect(options).toEqual(['', 'claim-1', 'claim-4'])
  })

  it('shows the server valuation before issuing and sends QS adjustments', async () => {
    const user = userEvent.setup()
    const { previewCertificate, createCertificateBatch } = renderPage()

    expect(await screen.findByTestId('amount-due')).toHaveTextContent('8 280,00')
    expect(previewCertificate).toHaveBeenCalledWith({
      claim_batch_id: 'claim-1',
      issue_date: expect.any(String),
      adjustments: [],
    })

    const certifyInput = screen.getByLabelText('Certified quantity for B1')
    await user.clear(certifyInput)
    await user.type(certifyInput, '35')

    await waitFor(() =>
      expect(previewCertificate).toHaveBeenLastCalledWith({
        claim_batch_id: 'claim-1',
        issue_date: expect.any(String),
        adjustments: [{ boq_item_id: 'item-b1', certified_quantity_this_period: '35', certified_materials_on_site_value: undefined }],
      }),
    )
    expect(screen.getByText(/1 line certified differently/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Issue certificate/ }))

    await waitFor(() =>
      expect(createCertificateBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          claim_batch_id: 'claim-1',
          certificate_number: undefined,
          adjustments: [expect.objectContaining({ boq_item_id: 'item-b1', certified_quantity_this_period: '35' })],
        }),
      ),
    )
    expect(await screen.findByText(/Issued CERT-002/)).toBeInTheDocument()
  })

  it('preselects the claim passed from the Claims page', async () => {
    renderPage(
      { claims: [buildClaim({ id: 'claim-1' }), buildClaim({ id: 'claim-7', period_number: 7, lines: [buildClaimLine()] })] },
      '/certificates?claim=claim-7',
    )

    expect(screen.getByLabelText('Approved claim')).toHaveValue('claim-7')
  })

  it('lets accounts mark an issued certificate paid but not certify', async () => {
    const user = userEvent.setup()
    const { updateCertificateStatus } = renderPage({ currentRole: 'Accounts', certificates: [buildCertificate()] })

    expect(screen.queryByText('Certify a claim')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark paid' }))

    await waitFor(() => expect(updateCertificateStatus).toHaveBeenCalledWith('certificate-1', 'Paid'))
  })

  it('asks for confirmation before voiding the latest certificate', async () => {
    const user = userEvent.setup()
    const { updateCertificateStatus } = renderPage({ claims: [], certificates: [buildCertificate()] })

    await user.click(screen.getByRole('button', { name: 'Void' }))
    expect(updateCertificateStatus).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Confirm void' }))

    await waitFor(() => expect(updateCertificateStatus).toHaveBeenCalledWith('certificate-1', 'Voided'))
  })

  it('prints through a hidden iframe rather than a popup window', async () => {
    const user = userEvent.setup()
    const openSpy = vi.spyOn(window, 'open')
    // jsdom reports window.print as "not implemented" on the console; that is expected here.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderPage({ claims: [], certificates: [buildCertificate()] })

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Print / PDF' }))
    })

    expect(openSpy).not.toHaveBeenCalled()
    const frame = document.querySelector('iframe')
    expect(frame?.contentDocument?.body.textContent).toContain('CERT-001')
    expect(frame?.contentDocument?.body.textContent).toContain('Mthembu Builders')
  })

  it('lists the month’s certificates in a payment schedule with totals', () => {
    renderPage({
      claims: [],
      currentRole: 'Accounts',
      certificates: [
        buildCertificate({ id: 'c1', issue_date: '2026-03-10', status: 'Paid' }),
        buildCertificate({ id: 'c2', certificate_number: 'CERT-002', issue_date: '2026-03-25', amount_due_this_certificate_incl_tax: '1000.00' }),
        buildCertificate({ id: 'c3', certificate_number: 'CERT-003', issue_date: '2026-04-02' }),
      ],
    })

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-03' } })

    const schedule = screen.getByText('Payment schedule').closest('section')!
    expect(schedule).toHaveTextContent('CERT-001')
    expect(schedule).toHaveTextContent('CERT-002')
    expect(schedule).not.toHaveTextContent('CERT-003')
    expect(schedule).toHaveTextContent('R 9 280,00')
    expect(schedule).toHaveTextContent('R 1 000,00 outstanding')
  })

  it('shows an empty state when nothing is ready to certify', () => {
    renderPage({ claims: [buildClaim({ status: 'Submitted' })] })

    expect(screen.getByText('Nothing to certify')).toBeInTheDocument()
  })
})
