import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import InvitationBanner from './InvitationBanner'

const useAppContextMock = vi.fn()

vi.mock('../context/AppContext', () => ({
  useAppContext: () => useAppContextMock(),
}))

describe('InvitationBanner', () => {
  afterEach(() => cleanup())

  it('lets an invited subcontractor accept or decline', async () => {
    const user = userEvent.setup()
    const acceptInvitation = vi.fn().mockResolvedValue(undefined)
    const declineInvitation = vi.fn().mockResolvedValue(undefined)
    useAppContextMock.mockReturnValue({
      acceptInvitation,
      declineInvitation,
      myInvitations: [
        { id: 'inv-1', organization_id: 'org-1', organization_name: 'Acme Builders', role: 'Contractor', created_at: '' },
        { id: 'inv-2', organization_id: 'org-2', organization_name: 'Other Co', role: 'Accounts', created_at: '' },
      ],
    })

    render(<InvitationBanner />)

    expect(screen.getByText('Acme Builders')).toBeInTheDocument()
    expect(screen.getByText('Subcontractor')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])
    await user.click(screen.getAllByRole('button', { name: 'Decline' })[1])

    await waitFor(() => expect(acceptInvitation).toHaveBeenCalledWith('inv-1'))
    expect(declineInvitation).toHaveBeenCalledWith('inv-2')
  })

  it('renders nothing without invitations', () => {
    useAppContextMock.mockReturnValue({ acceptInvitation: vi.fn(), declineInvitation: vi.fn(), myInvitations: [] })
    const { container } = render(<InvitationBanner />)
    expect(container).toBeEmptyDOMElement()
  })
})
