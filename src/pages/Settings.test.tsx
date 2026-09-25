import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildContract, buildMembership, buildOrganization } from '../test/fixtures'
import Settings from './Settings'

const useAppContextMock = vi.fn()
const useAuthMock = vi.fn()

vi.mock('../context/AppContext', () => ({
  useAppContext: () => useAppContextMock(),
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

function renderPage(overrides: Record<string, unknown> = {}) {
  const createOrganizationMembership = vi.fn().mockImplementation(async (input) => buildMembership({ id: 'new', ...input }))
  const updateOrganizationMembership = vi.fn().mockImplementation(async (id, input) =>
    buildMembership({ id, user_id: 'user-qs', email: 'qs@acme.co.za', ...input }),
  )
  const removeOrganizationMembership = vi.fn().mockResolvedValue(undefined)

  useAuthMock.mockReturnValue({ user: { id: 'user-admin', email: 'director@acme.co.za' } })
  useAppContextMock.mockReturnValue({
    contracts: [buildContract({ subcontractor_user_id: 'user-sub' })],
    createOrganizationMembership,
    error: null,
    isRefreshingMemberships: false,
    memberships: [
      buildMembership(),
      buildMembership({ id: 'membership-2', user_id: 'user-qs', email: 'qs@acme.co.za', role: 'QuantitySurveyor' }),
      buildMembership({ id: 'membership-3', user_id: 'user-sub', email: 'sub@mthembu.co.za', role: 'Contractor' }),
    ],
    refreshMemberships: vi.fn(),
    removeOrganizationMembership,
    selectedOrganization: buildOrganization(),
    updateOrganizationMembership,
    ...overrides,
  })

  render(<Settings />)
  return { createOrganizationMembership, updateOrganizationMembership, removeOrganizationMembership }
}

describe('Team page', () => {
  beforeEach(() => {
    useAppContextMock.mockReset()
    useAuthMock.mockReset()
  })
  afterEach(() => cleanup())

  it('adds a member by email with a plain-language role', async () => {
    const user = userEvent.setup()
    const { createOrganizationMembership } = renderPage()

    await user.type(screen.getByLabelText('Email address'), 'Site@Subbie.co.za')
    await user.click(screen.getByLabelText(/^Accounts/))
    await user.click(screen.getByRole('button', { name: 'Add member' }))

    await waitFor(() =>
      expect(createOrganizationMembership).toHaveBeenCalledWith({ email: 'site@subbie.co.za', role: 'Accounts' }),
    )
  })

  it('still accepts a user id', async () => {
    const user = userEvent.setup()
    const { createOrganizationMembership } = renderPage()

    await user.type(screen.getByLabelText('Email address'), '11111111-1111-1111-1111-111111111111')
    await user.click(screen.getByRole('button', { name: 'Add member' }))

    await waitFor(() =>
      expect(createOrganizationMembership).toHaveBeenCalledWith({
        user_id: '11111111-1111-1111-1111-111111111111',
        role: 'Contractor',
      }),
    )
  })

  it('shows emails and which contracts a subcontractor is linked to', () => {
    renderPage()

    expect(screen.getByText('qs@acme.co.za')).toBeInTheDocument()
    expect(screen.getByText('Contracts: SC-001')).toBeInTheDocument()
  })

  it('updates a role and removes a member after confirmation', async () => {
    const user = userEvent.setup()
    const { updateOrganizationMembership, removeOrganizationMembership } = renderPage()

    await user.selectOptions(screen.getByLabelText('Role for qs@acme.co.za'), 'Accounts')
    await waitFor(() => expect(updateOrganizationMembership).toHaveBeenCalledWith('membership-2', { role: 'Accounts' }))

    await user.click(screen.getAllByRole('button', { name: 'Remove…' })[1])
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(removeOrganizationMembership).toHaveBeenCalledWith('membership-3'))
  })

  it('disables member administration for non-admin users', () => {
    renderPage({ memberships: [buildMembership({ role: 'QuantitySurveyor' })] })

    expect(screen.getByText('Only organization admins can add or update members.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add member' })).toBeDisabled()
  })
})
