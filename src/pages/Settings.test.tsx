import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Settings from './Settings'
import type { Organization, OrganizationMembership } from '../types/api'

const useAppContextMock = vi.fn()
const useAuthMock = vi.fn()

vi.mock('../context/AppContext', () => ({
  useAppContext: () => useAppContextMock(),
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

function buildOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'org-1',
    name: 'QuantEasy Org',
    slug: 'quanteasy-org',
    created_at: '2026-03-22T00:00:00Z',
    updated_at: '2026-03-22T00:00:00Z',
    ...overrides,
  }
}

function buildMembership(overrides: Partial<OrganizationMembership> = {}): OrganizationMembership {
  return {
    id: 'membership-1',
    organization_id: 'org-1',
    user_id: 'user-admin',
    role: 'OrgAdmin',
    created_at: '2026-03-22T00:00:00Z',
    updated_at: '2026-03-22T00:00:00Z',
    ...overrides,
  }
}

function renderSettingsPage(overrides: Record<string, unknown> = {}) {
  const createOrganizationMembership = vi.fn().mockResolvedValue(
    buildMembership({ id: 'membership-2', user_id: 'user-new', role: 'QuantitySurveyor' }),
  )
  const updateOrganizationMembership = vi.fn().mockResolvedValue(
    buildMembership({ id: 'membership-2', user_id: 'user-qs', role: 'Accounts' }),
  )

  useAuthMock.mockReturnValue({
    user: { id: 'user-admin' },
  })

  useAppContextMock.mockReturnValue({
    createOrganizationMembership,
    error: null,
    isRefreshingMemberships: false,
    memberships: [
      buildMembership(),
      buildMembership({
        id: 'membership-2',
        user_id: 'user-qs',
        role: 'QuantitySurveyor',
        created_at: '2026-03-23T00:00:00Z',
        updated_at: '2026-03-23T00:00:00Z',
      }),
    ],
    refreshMemberships: vi.fn().mockResolvedValue(undefined),
    selectedOrganization: buildOrganization(),
    updateOrganizationMembership,
    ...overrides,
  })

  render(<Settings />)

  return {
    createOrganizationMembership,
    updateOrganizationMembership,
  }
}

describe('Settings page', () => {
  beforeEach(() => {
    useAppContextMock.mockReset()
    useAuthMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('adds a member by user uuid for organization admins', async () => {
    const user = userEvent.setup()
    const { createOrganizationMembership } = renderSettingsPage()

    await user.type(await screen.findByLabelText('User UUID'), '11111111-1111-1111-1111-111111111111')
    await user.selectOptions(screen.getByLabelText('Role'), 'Accounts')
    await user.click(screen.getByRole('button', { name: 'Add member' }))

    await waitFor(() => {
      expect(createOrganizationMembership).toHaveBeenCalledWith({
        user_id: '11111111-1111-1111-1111-111111111111',
        role: 'Accounts',
      })
    })
  })

  it('updates an existing member role for organization admins', async () => {
    const user = userEvent.setup()
    const { updateOrganizationMembership } = renderSettingsPage()

    await user.selectOptions(await screen.findByLabelText('Role for user-qs'), 'Accounts')

    await waitFor(() => {
      expect(updateOrganizationMembership).toHaveBeenCalledWith('membership-2', { role: 'Accounts' })
    })
  })

  it('disables member administration for non-admin users', async () => {
    renderSettingsPage({
      memberships: [buildMembership({ role: 'QuantitySurveyor' })],
    })

    expect(await screen.findByText('Only organization admins can add or update members.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add member' })).toBeDisabled()
  })
})
