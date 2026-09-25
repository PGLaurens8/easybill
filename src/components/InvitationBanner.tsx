import { useState } from 'react'

import { useAppContext } from '../context/AppContext'
import { formatApiError } from '../lib/api'
import { roleLabels } from '../lib/permissions'

/** Invitations addressed to the signed-in user, from any company. Nothing happens until they accept. */
export default function InvitationBanner() {
  const { acceptInvitation, declineInvitation, myInvitations } = useAppContext()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (myInvitations.length === 0) {
    return null
  }

  async function respond(invitationId: string, accept: boolean) {
    setBusyId(invitationId)
    setError(null)
    try {
      await (accept ? acceptInvitation(invitationId) : declineInvitation(invitationId))
    } catch (caughtError) {
      setError(formatApiError(caughtError, 'Could not respond to the invitation.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mb-6 space-y-2" aria-label="Invitations">
      {myInvitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            <span className="font-semibold">{invitation.organization_name}</span> invited you to join as{' '}
            <span className="font-semibold">{roleLabels[invitation.role]}</span>.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busyId === invitation.id}
              onClick={() => void respond(invitation.id, true)}
            >
              Accept
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busyId === invitation.id}
              onClick={() => void respond(invitation.id, false)}
            >
              Decline
            </button>
          </div>
        </div>
      ))}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </section>
  )
}
