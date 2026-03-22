import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import BOQBuilder from './BOQBuilder'
import type { BoqRevision, Contract, Organization, Project } from '../types/api'

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

function buildRevision(overrides: Partial<BoqRevision> = {}): BoqRevision {
  return {
    id: 'revision-1',
    organization_id: 'org-1',
    project_id: 'project-1',
    contract_id: 'contract-1',
    revision_number: 2,
    status: 'Published',
    published_at: '2026-03-20T00:00:00Z',
    created_at: '2026-03-20T00:00:00Z',
    updated_at: '2026-03-20T00:00:00Z',
    items: [
      {
        id: 'boq-item-1',
        boq_revision_id: 'revision-1',
        item_code: 'EARTH-001',
        trade_code: 'EARTH',
        description: 'Bulk excavation',
        unit: 'm3',
        contract_quantity: '125.0000',
        rate: '350.0000',
        amount: '43750.0000',
        order_index: 0,
      },
    ],
    ...overrides,
  }
}

function renderBOQBuilder(overrides: Record<string, unknown> = {}) {
  const createBoqRevision = vi.fn().mockResolvedValue(buildRevision({
    revision_number: 1,
    items: [
      {
        id: 'boq-item-created',
        boq_revision_id: 'revision-created',
        item_code: 'ITEM-001',
        trade_code: 'EARTH',
        description: 'Excavation to reduced levels',
        unit: 'm3',
        contract_quantity: '25.5000',
        rate: '175.2500',
        amount: '4468.8750',
        order_index: 0,
      },
    ],
  }))

  useAppContextMock.mockReturnValue({
    boqRevisions: [],
    contracts: [buildContract()],
    createBoqRevision,
    createContract: vi.fn(),
    error: null,
    isRefreshingCommercialData: false,
    projects: [buildProject()],
    refreshCommercialData: vi.fn().mockResolvedValue(undefined),
    selectedOrganization: buildOrganization(),
    ...overrides,
  })

  render(
    <MemoryRouter>
      <BOQBuilder />
    </MemoryRouter>,
  )

  return { createBoqRevision }
}

describe('BOQBuilder page', () => {
  beforeEach(() => {
    useAppContextMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('submits drafted BOQ line items instead of relying on a hidden template seed', async () => {
    const user = userEvent.setup()
    const { createBoqRevision } = renderBOQBuilder()

    await user.selectOptions(await screen.findByLabelText('Project', { selector: '#revisionProjectId' }), 'project-1')
    await user.selectOptions(screen.getByLabelText('Contract'), 'contract-1')
    await user.click(screen.getByRole('button', { name: 'Add line item' }))

    await user.type(screen.getByLabelText(/Item code /), 'ITEM-001')
    await user.type(screen.getByLabelText(/Trade /), 'EARTH')
    await user.type(screen.getByLabelText(/Description /), 'Excavation to reduced levels')
    await user.type(screen.getByLabelText(/Unit /), 'm3')
    await user.clear(screen.getByLabelText(/Quantity /))
    await user.type(screen.getByLabelText(/Quantity /), '25.5000')
    await user.clear(screen.getByLabelText(/Rate /))
    await user.type(screen.getByLabelText(/Rate /), '175.2500')

    await user.click(screen.getByRole('button', { name: 'Create BOQ revision' }))

    await waitFor(() => {
      expect(createBoqRevision).toHaveBeenCalledWith({
        project_id: 'project-1',
        contract_id: 'contract-1',
        revision_number: 1,
        items: [
          {
            item_code: 'ITEM-001',
            trade_code: 'EARTH',
            description: 'Excavation to reduced levels',
            unit: 'm3',
            contract_quantity: '25.5',
            rate: '175.25',
            order_index: 0,
          },
        ],
      })
    })
  })

  it('can copy the latest revision into the editable draft and advance the revision number', async () => {
    const user = userEvent.setup()

    renderBOQBuilder({ boqRevisions: [buildRevision()] })

    await user.selectOptions(await screen.findByLabelText('Project', { selector: '#revisionProjectId' }), 'project-1')
    await user.selectOptions(screen.getByLabelText('Contract'), 'contract-1')

    await waitFor(() => {
      expect(screen.getByLabelText('Revision number')).toHaveValue(3)
    })

    await user.click(screen.getByRole('button', { name: 'Copy latest revision' }))

    expect(await screen.findByDisplayValue('EARTH-001')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bulk excavation')).toBeInTheDocument()
    expect(screen.getByDisplayValue('125.0000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('350.0000')).toBeInTheDocument()
  })
})
