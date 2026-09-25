import { useMemo, useState } from 'react'

import { Alert, PageHeader } from '../components/ui'
import { useAppContext } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { formatApiError } from '../lib/api'
import { roleDescriptions, roleLabels } from '../lib/permissions'
import type { MembershipRole, OrganizationMembership } from '../types/api'
import { formatDate } from '../utils/format'

const membershipRoleOptions: MembershipRole[] = [
  'OrgAdmin',
  'CommercialManager',
  'QuantitySurveyor',
  'Contractor',
  'Accounts',
]

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function Settings() {
  const { user } = useAuth()
  const {
    contracts,
    createOrganizationMembership,
    error,
    isRefreshingMemberships,
    memberships,
    refreshMemberships,
    removeOrganizationMembership,
    selectedOrganization,
    updateOrganizationMembership,
  } = useAppContext()
  const [identity, setIdentity] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<MembershipRole>('Contractor')
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updatingMembershipId, setUpdatingMembershipId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const currentMembership = useMemo(
    () => memberships.find((membership) => membership.user_id === user?.id) ?? null,
    [memberships, user?.id],
  )
  const isOrgAdmin = currentMembership?.role === 'OrgAdmin'

  const sortedMemberships = useMemo(
    () =>
      [...memberships].sort((left, right) => {
        if (left.user_id === user?.id) return -1
        if (right.user_id === user?.id) return 1
        return left.created_at.localeCompare(right.created_at)
      }),
    [memberships, user?.id],
  )

  function describe(membership: OrganizationMembership) {
    if (membership.user_id === user?.id) {
      return `You${user?.email ? ` (${user.email})` : ''}`
    }
    return membership.email ?? `User ${membership.user_id.slice(0, 8)}…`
  }

  function assignedContracts(membership: OrganizationMembership) {
    return contracts.filter((contract) => contract.subcontractor_user_id === membership.user_id)
  }

  async function handleAddMember(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    if (!selectedOrganization) {
      setFormError('Select an organization before adding a member.')
      return
    }

    const value = identity.trim()
    const byUserId = UUID_PATTERN.test(value)

    setIsSubmitting(true)
    try {
      await createOrganizationMembership(
        byUserId ? { user_id: value, role: newMemberRole } : { email: value.toLowerCase(), role: newMemberRole },
      )
      setSuccessMessage(
        `Added ${value} as ${roleLabels[newMemberRole]}.${
          newMemberRole === 'Contractor' ? ' Now link them to their contract on Contracts & BOQ.' : ''
        }${byUserId ? '' : ' If they are new to QuantEasy they will get an email invitation.'}`,
      )
      setIdentity('')
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to add organization member.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRoleChange(membership: OrganizationMembership, role: MembershipRole) {
    setFormError(null)
    setSuccessMessage(null)
    setUpdatingMembershipId(membership.id)
    try {
      const updated = await updateOrganizationMembership(membership.id, { role })
      setSuccessMessage(`${describe(updated)} is now ${roleLabels[updated.role]}.`)
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to update organization member role.'))
    } finally {
      setUpdatingMembershipId(null)
    }
  }

  async function handleRemove(membership: OrganizationMembership) {
    setFormError(null)
    setSuccessMessage(null)
    setUpdatingMembershipId(membership.id)
    try {
      await removeOrganizationMembership(membership.id)
      setSuccessMessage(`${describe(membership)} removed.`)
      setConfirmRemoveId(null)
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to remove member.'))
    } finally {
      setUpdatingMembershipId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Team"
        description={
          selectedOrganization
            ? `Who can use ${selectedOrganization.name}, and what they can do. Subcontractors only ever see their own contracts.`
            : 'Select an organization first to review member access.'
        }
        actions={
          <button type="button" className="btn btn-secondary" onClick={() => void refreshMemberships()}>
            {isRefreshingMemberships ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      {error || formError ? <Alert>{formError || error}</Alert> : null}
      {successMessage ? <Alert tone="success">{successMessage}</Alert> : null}

      {!selectedOrganization ? (
        <div className="card">
          <h2 className="text-lg font-semibold text-stone-900">No organization selected</h2>
          <p className="mt-2 text-sm text-stone-600">Choose a workspace at the top of the page first.</p>
        </div>
      ) : (
        <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            <section className="card">
              <h2 className="text-lg font-semibold text-stone-900">Add someone</h2>

              {!isOrgAdmin ? (
                <div className="mt-4">
                  <Alert tone="warning">Only organization admins can add or update members.</Alert>
                </div>
              ) : null}

              <form className="mt-4 space-y-4" onSubmit={handleAddMember}>
                <div>
                  <label htmlFor="newMemberIdentity" className="label">
                    Email address
                  </label>
                  <input
                    id="newMemberIdentity"
                    className="input mt-1"
                    value={identity}
                    onChange={(event) => setIdentity(event.target.value)}
                    placeholder="site.manager@subbie.co.za"
                    required
                    disabled={!isOrgAdmin || isSubmitting}
                  />
                  <p className="hint">You can also paste their QuantEasy user ID (shown on their own Team page).</p>
                </div>

                <fieldset>
                  <legend className="label">Role</legend>
                  <div className="mt-2 space-y-2">
                    {membershipRoleOptions.map((role) => (
                      <label
                        key={role}
                        className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2 text-sm ${
                          newMemberRole === role ? 'border-primary-500 bg-primary-50' : 'border-stone-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="newMemberRole"
                          value={role}
                          checked={newMemberRole === role}
                          onChange={() => setNewMemberRole(role)}
                          disabled={!isOrgAdmin || isSubmitting}
                          className="mt-1"
                        />
                        <span>
                          <span className="font-medium text-stone-900">{roleLabels[role]}</span>
                          <span className="block text-xs text-stone-600">{roleDescriptions[role]}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <button type="submit" className="btn btn-primary w-full" disabled={!isOrgAdmin || isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add member'}
                </button>
              </form>
            </section>

            <section className="card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-700">Your access</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-stone-500">Role</dt>
                  <dd className="font-medium text-stone-900">
                    {currentMembership ? roleLabels[currentMembership.role] : 'No active membership'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500">Your user ID (share if someone can’t find you by email)</dt>
                  <dd className="break-all font-mono text-xs text-stone-800">{user?.id}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900">Members</h2>
              <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                {sortedMemberships.length}
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200 text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-3 py-2">Person</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {sortedMemberships.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-stone-500">
                        No members found for this organization yet.
                      </td>
                    </tr>
                  ) : (
                    sortedMemberships.map((membership) => {
                      const isCurrentUser = membership.user_id === user?.id
                      const isUpdating = updatingMembershipId === membership.id
                      const linked = assignedContracts(membership)

                      return (
                        <tr key={membership.id}>
                          <td className="px-3 py-3 align-top">
                            <div className="font-medium text-stone-900">{describe(membership)}</div>
                            <div className="text-xs text-stone-500">Joined {formatDate(membership.created_at)}</div>
                            {membership.role === 'Contractor' ? (
                              <div className={`mt-1 text-xs ${linked.length ? 'text-stone-600' : 'text-amber-700'}`}>
                                {linked.length
                                  ? `Contracts: ${linked.map((contract) => contract.code).join(', ')}`
                                  : 'Not linked to a contract yet'}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <select
                              aria-label={`Role for ${membership.email ?? membership.user_id}`}
                              className="input py-1.5 text-sm"
                              value={membership.role}
                              disabled={!isOrgAdmin || isUpdating}
                              onChange={(event) => void handleRoleChange(membership, event.target.value as MembershipRole)}
                            >
                              {membershipRoleOptions.map((role) => (
                                <option key={role} value={role}>
                                  {roleLabels[role]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-3 text-right align-top">
                            {isOrgAdmin && !isCurrentUser ? (
                              confirmRemoveId === membership.id ? (
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    disabled={isUpdating}
                                    onClick={() => void handleRemove(membership)}
                                  >
                                    Remove
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setConfirmRemoveId(null)}
                                  >
                                    Keep
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="text-xs font-medium text-stone-500 hover:text-red-700"
                                  onClick={() => setConfirmRemoveId(membership.id)}
                                >
                                  Remove…
                                </button>
                              )
                            ) : null}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
