import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildContract, buildMembership, buildOrganization, buildProject, buildRevision } from '../test/fixtures'
import BOQBuilder from './BOQBuilder'

const useAppContextMock = vi.fn()

vi.mock('../context/AppContext', () => ({
  useAppContext: () => useAppContextMock(),
}))

function renderPage(overrides: Record<string, unknown> = {}) {
  const createBoqRevision = vi.fn().mockImplementation(async (input) =>
    buildRevision({ revision_number: input.revision_number, items: [] }),
  )
  const createContract = vi.fn().mockImplementation(async (input) => buildContract({ id: 'contract-new', ...input }))
  const updateContract = vi.fn().mockResolvedValue(buildContract())

  useAppContextMock.mockReturnValue({
    boqRevisions: [],
    contracts: [buildContract()],
    createBoqRevision,
    createContract,
    currentRole: 'QuantitySurveyor',
    error: null,
    isRefreshingCommercialData: false,
    memberships: [buildMembership(), buildMembership({ id: 'm-sub', user_id: 'user-sub', email: 'sub@mthembu.co.za', role: 'Contractor' })],
    projects: [buildProject()],
    refreshCommercialData: vi.fn(),
    selectedOrganization: buildOrganization(),
    updateContract,
    ...overrides,
  })

  render(
    <MemoryRouter>
      <BOQBuilder />
    </MemoryRouter>,
  )
  return { createBoqRevision, createContract, updateContract }
}

describe('Contracts & BOQ page', () => {
  beforeEach(() => useAppContextMock.mockReset())
  afterEach(() => cleanup())

  it('creates a subcontract with the subcontractor, their login and a capped retention', async () => {
    const user = userEvent.setup()
    const { createContract } = renderPage()

    await user.type(screen.getByLabelText('Package'), 'Roofing')
    await user.type(screen.getByLabelText('Subcontractor company'), 'Top Roof CC')
    await user.selectOptions(screen.getByLabelText(/^Subcontractor login/, { selector: '#subcontractorUserId' }), 'user-sub')
    await user.click(screen.getByRole('button', { name: 'Create subcontract' }))

    await waitFor(() =>
      expect(createContract).toHaveBeenCalledWith({
        project_id: 'project-1',
        code: 'SC-002',
        title: 'Roofing',
        subcontractor_name: 'Top Roof CC',
        subcontractor_user_id: 'user-sub',
        currency_code: 'ZAR',
        retention_percent: '10',
        retention_cap_percent: '5',
        tax_percent: '15',
      }),
    )
  })

  it('publishes a BOQ pasted from Excel as the next revision', async () => {
    const user = userEvent.setup()
    const { createBoqRevision } = renderPage()

    await user.selectOptions(screen.getByLabelText('Contract'), 'contract-1')
    await user.click(screen.getByRole('button', { name: 'Paste from Excel' }))
    fireEvent.change(screen.getByLabelText('Paste rows from Excel'), {
      target: { value: 'Item\tDescription\tUnit\tQty\tRate\n1.1\tFace brick\tm2\t1 200\t185,50\n1.2\tDPC\tm\t300\t22' },
    })
    await user.click(screen.getByRole('button', { name: 'Add pasted lines' }))

    expect(await screen.findByText(/Added 2 lines, skipped 1/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Publish BOQ (Rev 1)' }))

    await waitFor(() =>
      expect(createBoqRevision).toHaveBeenCalledWith({
        project_id: 'project-1',
        contract_id: 'contract-1',
        revision_number: 1,
        items: [
          { item_code: '1.1', trade_code: undefined, description: 'Face brick', unit: 'm2', contract_quantity: '1200', rate: '185.5', order_index: 0 },
          { item_code: '1.2', trade_code: undefined, description: 'DPC', unit: 'm', contract_quantity: '300', rate: '22', order_index: 1 },
        ],
      }),
    )
  })

  it('loads the current BOQ for revision and blocks duplicate item codes', async () => {
    const user = userEvent.setup()
    const { createBoqRevision } = renderPage({ boqRevisions: [buildRevision({ revision_number: 2 })] })

    await user.click(screen.getByRole('button', { name: 'Revise BOQ' }))

    expect(await screen.findByDisplayValue('Face brick walls')).toBeInTheDocument()
    expect(screen.getByText('Will publish as Rev 3')).toBeInTheDocument()

    const codeInput = screen.getByLabelText('Item code line 2')
    await user.clear(codeInput)
    await user.type(codeInput, 'b1')
    await user.click(screen.getByRole('button', { name: 'Publish BOQ (Rev 3)' }))

    expect(await screen.findByText(/"b1" is used more than once/)).toBeInTheDocument()
    expect(createBoqRevision).not.toHaveBeenCalled()
  })

  it('links a subcontractor login to an existing contract', async () => {
    const user = userEvent.setup()
    const { updateContract } = renderPage()

    await user.selectOptions(screen.getByLabelText('Subcontractor login for SC-001'), 'user-sub')

    await waitFor(() => expect(updateContract).toHaveBeenCalledWith('contract-1', { subcontractor_user_id: 'user-sub' }))
  })

  it('is read-only for accounts', () => {
    renderPage({ currentRole: 'Accounts' })

    expect(screen.queryByRole('button', { name: 'Create subcontract' })).not.toBeInTheDocument()
    expect(screen.getByText('Contract register')).toBeInTheDocument()
  })
})
