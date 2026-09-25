import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ContraCharge, VariationOrder } from '../types/api'
import { buildCertificate, buildContract, buildProject, buildRevision } from '../test/fixtures'
import ContractPage from './ContractPage'

const useAppContextMock = vi.fn()

vi.mock('../context/AppContext', () => ({
  useAppContext: () => useAppContextMock(),
}))

function variation(overrides: Partial<VariationOrder> = {}): VariationOrder {
  return {
    id: 'vo-1',
    organization_id: 'org-1',
    project_id: 'project-1',
    contract_id: 'contract-1',
    number: 'VO-001',
    title: 'Extra boundary wall',
    description: null,
    status: 'Submitted',
    items: [{ item_code: 'VO-001.1', description: 'Boundary wall', unit: 'm2', quantity: '60', rate: '450' }],
    value: '27000.00',
    submitted_by_user_id: 'user-sub',
    decided_by_user_id: null,
    decided_at: null,
    decision_remarks: null,
    created_at: '2026-03-01T00:00:00Z',
    ...overrides,
  }
}

function charge(overrides: Partial<ContraCharge> = {}): ContraCharge {
  return {
    id: 'cc-1',
    contract_id: 'contract-1',
    description: 'Cleaning of rubble',
    amount: '3500.00',
    charge_date: '2026-03-05',
    certificate_batch_id: null,
    created_by_user_id: 'user-qs',
    created_at: '2026-03-05T00:00:00Z',
    ...overrides,
  }
}

function renderPage(overrides: Record<string, unknown> = {}) {
  const fns = {
    createVariation: vi.fn().mockImplementation(async (input) =>
      variation({ id: 'vo-new', number: 'VO-002', status: input.approve_now ? 'Approved' : 'Submitted' }),
    ),
    decideVariation: vi.fn().mockResolvedValue(variation({ status: 'Approved' })),
    createContraCharge: vi.fn().mockResolvedValue(charge({ id: 'cc-new' })),
    deleteContraCharge: vi.fn().mockResolvedValue(undefined),
    updateContract: vi.fn().mockResolvedValue(buildContract({ practical_completion_date: '2026-09-01' })),
    previewCertificate: vi.fn().mockResolvedValue({
      ...buildCertificate(),
      claim_batch_id: null,
      contract_id: 'contract-1',
      contract_value: '30000.00',
      retention_held_to_date: '400.00',
      retention_released_to_date: '400.00',
      amount_due_this_certificate_excl_tax: '400.00',
      tax_this_certificate: '60.00',
      amount_due_this_certificate_incl_tax: '460.00',
      lines: [],
    }),
    createCertificateBatch: vi.fn().mockResolvedValue(buildCertificate({ certificate_number: 'CERT-002' })),
  }
  useAppContextMock.mockReturnValue({
    boqRevisions: [buildRevision()],
    certificates: [buildCertificate({ contra_charges_to_date: '0.00' })],
    claims: [],
    contraCharges: [charge()],
    contracts: [buildContract()],
    currentRole: 'QuantitySurveyor',
    projects: [buildProject()],
    variations: [variation()],
    ...fns,
    ...overrides,
  })
  render(
    <MemoryRouter initialEntries={['/contracts/contract-1']}>
      <Routes>
        <Route path="/contracts/:contractId" element={<ContractPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return fns
}

describe('Contract page', () => {
  beforeEach(() => useAppContextMock.mockReset())
  afterEach(() => cleanup())

  it('shows the contract position in one place', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Brickwork' })).toBeInTheDocument()
    expect(screen.getByText('R 30 000,00')).toBeInTheDocument()
    expect(screen.getByText('CERT-001')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Variations/ })).toHaveTextContent('1')
  })

  it('lets the QS approve a submitted variation or reject it with a reason', async () => {
    const user = userEvent.setup()
    const { decideVariation } = renderPage()

    await user.click(screen.getByRole('tab', { name: /Variations/ }))
    await user.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(decideVariation).toHaveBeenCalledWith('vo-1', true, undefined))

    await user.click(screen.getByRole('button', { name: 'Reject' }))
    expect(screen.getByRole('button', { name: 'Reject variation' })).toBeDisabled()
    await user.type(screen.getByLabelText('Why? The subcontractor will see this.'), 'Not instructed')
    await user.click(screen.getByRole('button', { name: 'Reject variation' }))
    await waitFor(() => expect(decideVariation).toHaveBeenLastCalledWith('vo-1', false, 'Not instructed'))
  })

  it('lets the QS record an instructed variation as approved in one step', async () => {
    const user = userEvent.setup()
    const { createVariation } = renderPage()

    await user.click(screen.getByRole('tab', { name: /Variations/ }))
    await user.click(screen.getByRole('button', { name: 'Add variation' }))
    await user.type(screen.getByLabelText('What was instructed'), 'Extra lintels')
    expect(screen.getByLabelText('Variation item code 1')).toHaveValue('VO-002.1')
    await user.type(screen.getByLabelText('Variation description 1'), 'Precast lintels')
    await user.type(screen.getByLabelText('Variation unit 1'), 'no')
    await user.type(screen.getByLabelText('Variation quantity 1'), '12')
    await user.type(screen.getByLabelText('Variation rate 1'), '380')
    await user.click(screen.getByRole('button', { name: 'Approve variation' }))

    await waitFor(() =>
      expect(createVariation).toHaveBeenCalledWith({
        contract_id: 'contract-1',
        title: 'Extra lintels',
        description: undefined,
        items: [{ item_code: 'VO-002.1', description: 'Precast lintels', unit: 'no', quantity: '12', rate: '380' }],
        approve_now: true,
      }),
    )
    expect(await screen.findByText(/VO-002 approved and added to the BOQ/)).toBeInTheDocument()
  })

  it('lets a subcontractor submit a variation but not approve or record deductions', async () => {
    const user = userEvent.setup()
    const { createVariation } = renderPage({ currentRole: 'Contractor' })

    expect(screen.queryByRole('tab', { name: 'Completion & retention' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Variations/ }))
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Submit a variation' }))
    await user.type(screen.getByLabelText('What was instructed'), 'Extra wall')
    await user.type(screen.getByLabelText('Variation description 1'), 'Wall')
    await user.type(screen.getByLabelText('Variation unit 1'), 'm2')
    await user.type(screen.getByLabelText('Variation quantity 1'), '5')
    await user.type(screen.getByLabelText('Variation rate 1'), '400')
    await user.click(screen.getByRole('button', { name: 'Submit for approval' }))
    await waitFor(() => expect(createVariation).toHaveBeenCalledWith(expect.objectContaining({ approve_now: false })))

    await user.click(screen.getByRole('tab', { name: 'Deductions' }))
    expect(screen.getByText('Cleaning of rubble')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record deduction' })).not.toBeInTheDocument()
  })

  it('records a deduction and only allows removing ones not yet certified', async () => {
    const user = userEvent.setup()
    const { createContraCharge, deleteContraCharge } = renderPage({
      contraCharges: [charge(), charge({ id: 'cc-2', description: 'Damaged kerbs', certificate_batch_id: 'certificate-1' })],
    })

    await user.click(screen.getByRole('tab', { name: 'Deductions' }))
    const kerbs = screen.getByText('Damaged kerbs').closest('tr')!
    expect(within(kerbs).getByText('Deducted on CERT-001')).toBeInTheDocument()
    expect(within(kerbs).queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()

    await user.click(within(screen.getByText('Cleaning of rubble').closest('tr')!).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(deleteContraCharge).toHaveBeenCalledWith('cc-1'))

    await user.type(screen.getByLabelText('Deduction'), 'Scaffold hire')
    await user.type(screen.getByLabelText('Amount excl VAT (R)'), '1200')
    await user.click(screen.getByRole('button', { name: 'Record deduction' }))
    await waitFor(() =>
      expect(createContraCharge).toHaveBeenCalledWith(
        expect.objectContaining({ contract_id: 'contract-1', description: 'Scaffold hire', amount: '1200' }),
      ),
    )
  })

  it('issues a retention release certificate after practical completion', async () => {
    const user = userEvent.setup()
    const { previewCertificate, createCertificateBatch } = renderPage({
      contracts: [buildContract({ practical_completion_date: '2026-09-01' })],
    })

    await user.click(screen.getByRole('tab', { name: 'Completion & retention' }))
    await user.click(screen.getByRole('button', { name: 'Calculate release' }))
    await waitFor(() =>
      expect(previewCertificate).toHaveBeenCalledWith(expect.objectContaining({ contract_id: 'contract-1', adjustments: [] })),
    )
    expect(await screen.findByText(/Retention released to date/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Issue release certificate/ }))
    await waitFor(() =>
      expect(createCertificateBatch).toHaveBeenCalledWith(
        expect.objectContaining({ project_id: 'project-1', contract_id: 'contract-1', adjustments: [] }),
      ),
    )
    expect(await screen.findByText(/Issued CERT-002/)).toBeInTheDocument()
  })
})
