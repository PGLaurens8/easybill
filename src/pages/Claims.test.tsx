import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildCertificate,
  buildCertificateLine,
  buildClaim,
  buildContract,
  buildOrganization,
  buildProject,
  buildRevision,
} from '../test/fixtures'
import Claims from './Claims'

const useAppContextMock = vi.fn()

vi.mock('../context/AppContext', () => ({
  useAppContext: () => useAppContextMock(),
}))

function renderPage(overrides: Record<string, unknown> = {}) {
  const createClaimBatch = vi.fn().mockImplementation(async (input) =>
    buildClaim({ id: 'claim-new', status: 'Draft', period_number: 2, ...input, total_claimed_amount: '5000.00' }),
  )
  const updateClaimBatch = vi.fn().mockImplementation(async (id) => buildClaim({ id, status: 'Draft' }))
  const updateClaimStatus = vi.fn().mockImplementation(async (id, status) => buildClaim({ id, status }))

  useAppContextMock.mockReturnValue({
    boqRevisions: [buildRevision()],
    certificates: [],
    claims: [],
    contracts: [buildContract()],
    createClaimBatch,
    currentRole: 'Contractor',
    error: null,
    projects: [buildProject()],
    refreshCommercialData: vi.fn(),
    selectedOrganization: buildOrganization(),
    updateClaimBatch,
    updateClaimStatus,
    ...overrides,
  })

  render(
    <MemoryRouter>
      <Claims />
    </MemoryRouter>,
  )
  return { createClaimBatch, updateClaimBatch, updateClaimStatus }
}

describe('Claims page', () => {
  beforeEach(() => useAppContextMock.mockReset())
  afterEach(() => cleanup())

  it('lets a subcontractor claim by % complete and submit in one click', async () => {
    const user = userEvent.setup()
    const { createClaimBatch, updateClaimStatus } = renderPage({
      certificates: [
        buildCertificate({ lines: [buildCertificateLine({ item_code: 'B1', certified_quantity_this_period: '40.0000' })] }),
      ],
      claims: [buildClaim({ id: 'claim-1', status: 'Paid' })],
    })

    // Only one contract with a BOQ, so it is picked automatically and the next period is shown.
    expect(screen.getByLabelText('Contract')).toHaveValue('contract-1')
    expect(screen.getByText('Period 2')).toBeInTheDocument()

    // 40 of 100 m2 already certified; 65% complete to date means 25 m2 this month.
    await user.type(screen.getByLabelText('Percent complete to date for B1'), '65')
    expect(screen.getByLabelText('This claim quantity for B1')).toHaveValue(25)
    await user.type(screen.getByLabelText('This claim quantity for P1'), '100')
    expect(screen.getByText('R 10 000,00')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save & submit' }))

    await waitFor(() =>
      expect(createClaimBatch).toHaveBeenCalledWith({
        project_id: 'project-1',
        contract_id: 'contract-1',
        valuation_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        remarks: undefined,
        lines: [
          { boq_item_id: 'item-b1', claimed_quantity_this_period: '25', claimed_materials_on_site_value: undefined, notes: undefined },
          { boq_item_id: 'item-p1', claimed_quantity_this_period: '100', claimed_materials_on_site_value: undefined, notes: undefined },
        ],
      }),
    )
    expect(updateClaimStatus).toHaveBeenCalledWith('claim-new', 'Submitted')
  })

  it('flags an over-claim before it is sent', async () => {
    const user = userEvent.setup()
    const { createClaimBatch } = renderPage()

    await user.type(screen.getByLabelText('This claim quantity for B1'), '120')

    expect(screen.getByText('Only 100 m2 left')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('B1: Only 100 m2 left.')
    expect(createClaimBatch).not.toHaveBeenCalled()
  })

  it('gives a QS one-click approve and requires a reason to reject', async () => {
    const user = userEvent.setup()
    const { updateClaimStatus } = renderPage({
      currentRole: 'QuantitySurveyor',
      claims: [buildClaim({ id: 'claim-5', status: 'Submitted', period_number: 5 })],
    })

    const row = screen.getAllByRole('row').find((element) => within(element).queryByText('Awaiting approval'))!
    expect(within(row).getByRole('button', { name: 'Approve' })).toBeInTheDocument()

    await user.click(within(row).getByRole('button', { name: 'Reject' }))
    const reason = screen.getByLabelText('Why? The subcontractor will see this.')
    const submit = screen.getAllByRole('button', { name: 'Reject' }).find((button) => button.closest('form'))!
    expect(submit).toBeDisabled()

    await user.type(reason, 'Plaster not complete on level 2')
    await user.click(submit)

    await waitFor(() =>
      expect(updateClaimStatus).toHaveBeenCalledWith('claim-5', 'Rejected', 'Plaster not complete on level 2'),
    )
  })

  it('does not offer approval to a subcontractor', () => {
    renderPage({ claims: [buildClaim({ status: 'Submitted' })] })

    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })

  it('reopens a draft claim for editing and saves the changed lines', async () => {
    const user = userEvent.setup()
    const { updateClaimBatch } = renderPage({ claims: [buildClaim({ id: 'claim-3', status: 'Draft', period_number: 3 })] })

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    expect(screen.getByText('Edit period 3')).toBeInTheDocument()

    const quantity = screen.getByLabelText('This claim quantity for B1')
    expect(quantity).toHaveValue(40)
    await user.clear(quantity)
    await user.type(quantity, '30')
    await user.click(screen.getByRole('button', { name: 'Save draft' }))

    await waitFor(() =>
      expect(updateClaimBatch).toHaveBeenCalledWith('claim-3', {
        valuation_date: '2026-03-31',
        remarks: undefined,
        lines: [{ boq_item_id: 'item-b1', claimed_quantity_this_period: '30', claimed_materials_on_site_value: undefined, notes: undefined }],
      }),
    )
  })

  it('explains what to do when no contract has a BOQ', () => {
    renderPage({ boqRevisions: [] })

    expect(screen.getByText('No contract assigned to you yet')).toBeInTheDocument()
  })
})
