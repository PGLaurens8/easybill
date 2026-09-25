import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildCertificate, buildClaim, buildContract, buildOrganization, buildProject, buildRevision } from '../test/fixtures'
import Dashboard from './Dashboard'

const useAppContextMock = vi.fn()

vi.mock('../context/AppContext', () => ({
  useAppContext: () => useAppContextMock(),
}))

function renderPage(overrides: Record<string, unknown> = {}) {
  useAppContextMock.mockReturnValue({
    boqRevisions: [buildRevision()],
    certificates: [],
    claims: [],
    contracts: [buildContract()],
    currentRole: 'QuantitySurveyor',
    isBootstrapping: false,
    organizations: [buildOrganization()],
    projects: [buildProject()],
    selectedOrganization: buildOrganization(),
    ...overrides,
  })
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

describe('Dashboard', () => {
  beforeEach(() => useAppContextMock.mockReset())
  afterEach(() => cleanup())

  it('shows what the QS needs to act on and the contract position', () => {
    renderPage({
      claims: [
        buildClaim({ id: 'a', status: 'Submitted', total_claimed_amount: '5000.00' }),
        buildClaim({ id: 'b', status: 'Approved' }),
      ],
      certificates: [buildCertificate({ claim_batch_id: 'other' })],
    })

    expect(screen.getByText('Claims waiting for your approval')).toBeInTheDocument()
    expect(screen.getByText('Approved claims to certify')).toBeInTheDocument()
    expect(screen.queryByText('Certificates to pay')).not.toBeInTheDocument()
    expect(screen.getByText('R 30 000,00')).toBeInTheDocument()
    expect(screen.getByText('26,7%')).toBeInTheDocument()
    expect(screen.queryByText('Getting started')).not.toBeInTheDocument()
  })

  it('shows unpaid certificates as a to-do for accounts', () => {
    renderPage({ currentRole: 'Accounts', certificates: [buildCertificate()] })

    expect(screen.getByText('Certificates to pay')).toBeInTheDocument()
  })

  it('shows the setup checklist until a BOQ exists', () => {
    renderPage({ boqRevisions: [] })

    expect(screen.getByText('Getting started')).toBeInTheDocument()
    expect(screen.getByText('Contracts without a BOQ')).toBeInTheDocument()
  })

  it('shows a subcontractor their own queue', () => {
    renderPage({ currentRole: 'Contractor', claims: [buildClaim({ status: 'Rejected' })] })

    expect(screen.getByText('Claims sent back to you')).toBeInTheDocument()
    expect(screen.getByText('Your contracts')).toBeInTheDocument()
    expect(screen.queryByText('Getting started')).not.toBeInTheDocument()
  })
})
