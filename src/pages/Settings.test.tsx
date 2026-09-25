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
  const createInvitation = vi.fn().mockImplementation(async (input) => ({ id: 'inv-new', status: 'Pending', ...input }))
  const revokeInvitation = vi.fn().mockResolvedValue(undefined)
  const updateOrganizationMembership = vi.fn().mockImplementation(async (id, input) =>
    buildMembership({ id, user_id: 'user-qs', email: 'qs@acme.co.za', ...input }),
  )
  const removeOrganizationMembership = vi.fn().mockResolvedValue(undefined)

  useAuthMock.mockReturnValue({ user: { id: 'user-admin', email: 'director@acme.co.za' } })
  useAppContextMock.mockReturnValue({
    contracts: [buildContract({ subcontractor_user_id: 'user-sub' })],
    createInvitation,
    error: null,
    invitations: [
      {
        id: 'inv-1',
        organization_id: 'org-1',
        email: 'pending@roofco.co.za',
        role: 'Contractor',
        status: 'Pending',
        invited_by_user_id: 'user-admin',
        responded_at: null,
        created_at: '2026-03-21T00:00:00Z',
      },
    ],
    refreshInvitations: vi.fn().mockResolvedValue(undefined),
    revokeInvitation,
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
  return { createInvitation, revokeInvitation, updateOrganizationMembership, removeOrganizationMembership }
}

describe('Team page', () => {
  beforeEach(() => {
    useAppContextMock.mockReset()
    useAuthMock.mockReset()
  })
  afterEach(() => cleanup())

  it('invites someone by email with a plain-language role', async () => {
    const user = userEvent.setup()
    const { createInvitation } = renderPage()

    await user.type(screen.getByLabelText('Email address'), 'Site@Subbie.co.za')
    await user.click(screen.getByLabelText(/^Accounts/))
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))

    await waitFor(() => expect(createInvitation).toHaveBeenCalledWith({ email: 'site@subbie.co.za', role: 'Accounts' }))
    expect(await screen.findByText(/Invitation created for site@subbie.co.za/)).toBeInTheDocument()
  })

  it('lists pending invitations and can revoke them', async () => {
    const user = userEvent.setup()
    const { revokeInvitation } = renderPage()

    expect(screen.getByText('pending@roofco.co.za')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Revoke' }))

    await waitFor(() => expect(revokeInvitation).toHaveBeenCalledWith('inv-1'))
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
    expect(screen.getByRole('button', { name: 'Send invitation' })).toBeDisabled()
  })
})
