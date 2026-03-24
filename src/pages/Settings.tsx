import { useMemo, useState } from 'react'

import { useAppContext } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { formatApiError } from '../lib/api'
import type { MembershipRole } from '../types/api'

const membershipRoleOptions: MembershipRole[] = [
  'OrgAdmin',
  'CommercialManager',
  'QuantitySurveyor',
  'Contractor',
  'Accounts',
]

const membershipRoleLabels: Record<MembershipRole, string> = {
  OrgAdmin: 'Organization Admin',
  CommercialManager: 'Commercial Manager',
  QuantitySurveyor: 'Quantity Surveyor',
  Contractor: 'Contractor',
  Accounts: 'Accounts',
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateString))
}

export default function Settings() {
  const { user } = useAuth()
  const {
    createOrganization,
    createOrganizationMembership,
    error,
    isRefreshingMemberships,
    memberships,
    refreshMemberships,
    selectedOrganization,
    updateOrganizationMembership,
  } = useAppContext()
  const [organizationName, setOrganizationName] = useState('')
  const [newMemberUserId, setNewMemberUserId] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<MembershipRole>('QuantitySurveyor')
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updatingMembershipId, setUpdatingMembershipId] = useState<string | null>(null)

  const currentMembership = useMemo(() => {
    return memberships.find((membership) => membership.user_id === user?.id) ?? null
  }, [memberships, user?.id])

  const isOrgAdmin = currentMembership?.role === 'OrgAdmin'

  const sortedMemberships = useMemo(() => {
    return [...memberships].sort((left, right) => {
      if (left.user_id === user?.id) {
        return -1
      }
      if (right.user_id === user?.id) {
        return 1
      }
      return left.created_at.localeCompare(right.created_at)
    })
  }, [memberships, user?.id])

  async function handleCreateOrganization(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)
    setIsCreatingOrganization(true)

    try {
      const slug = organizationName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      if (!slug) {
        throw new Error('Enter a valid organization name.')
      }

      const organization = await createOrganization({
        name: organizationName.trim(),
        slug,
      })
      setSuccessMessage(`Created ${organization.name} and switched to it.`)
      setOrganizationName('')
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to create organization.'))
    } finally {
      setIsCreatingOrganization(false)
    }
  }
  async function handleAddMember(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    if (!selectedOrganization) {
      setFormError('Select an organization before adding a member.')
      return
    }

    setIsSubmitting(true)

    try {
      const trimmedUserId = newMemberUserId.trim()
      await createOrganizationMembership({
        user_id: trimmedUserId,
        role: newMemberRole,
      })
      setSuccessMessage(`Added ${trimmedUserId} to ${selectedOrganization.name}.`)
      setNewMemberUserId('')
      setNewMemberRole('QuantitySurveyor')
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to add organization member.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRoleChange(membershipId: string, role: MembershipRole) {
    setFormError(null)
    setSuccessMessage(null)
    setUpdatingMembershipId(membershipId)

    try {
      const updated = await updateOrganizationMembership(membershipId, { role })
      setSuccessMessage(`Updated ${updated.user_id} to ${membershipRoleLabels[updated.role]}.`)
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to update organization member role.'))
    } finally {
      setUpdatingMembershipId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow text-primary-700">Workspace Admin</p>
          <h1 className="text-2xl font-semibold text-gray-900">Organization Settings</h1>
          <p className="mt-2 text-gray-600">
            {selectedOrganization
              ? `Manage members and workspace access for ${selectedOrganization.name}.`
              : 'Select an organization first to review member access and workspace settings.'}
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void refreshMemberships()}>
          {isRefreshingMemberships ? 'Refreshing...' : 'Refresh members'}
        </button>
      </section>

      {error || formError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError || error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {!selectedOrganization ? (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900">No organization selected</h2>
          <p className="mt-2 text-sm text-gray-600">
            Use the organization switcher in the sidebar, then return here to manage roles and member access.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <section className="card">
              <p className="eyebrow text-primary-700">Workspace</p>
              <h2 className="text-xl font-semibold text-gray-900">Organization profile</h2>
              <dl className="mt-6 space-y-4 text-sm text-gray-700">
                <div>
                  <dt className="font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-base font-semibold text-gray-900">{selectedOrganization.name}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Slug</dt>
                  <dd className="mt-1 font-mono text-gray-900">{selectedOrganization.slug}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Members</dt>
                  <dd className="mt-1 text-gray-900">{memberships.length}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Your role</dt>
                  <dd className="mt-1 text-gray-900">
                    {currentMembership ? membershipRoleLabels[currentMembership.role] : 'No active membership'}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="card">
              <p className="eyebrow text-primary-700">Workspace</p>
              <h2 className="text-xl font-semibold text-gray-900">Create another organization</h2>
              <p className="mt-2 text-sm text-gray-600">
                Add another workspace without leaving the current one. You will switch to the new organization after creation.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleCreateOrganization}>
                <div>
                  <label htmlFor="organizationName" className="block text-sm font-medium text-gray-900">
                    Organization name
                  </label>
                  <input
                    id="organizationName"
                    className="input mt-2"
                    value={organizationName}
                    onChange={(event) => setOrganizationName(event.target.value)}
                    placeholder="Acme Quantity Surveyors"
                    required
                    disabled={isCreatingOrganization}
                  />
                </div>

                <button type="submit" className="btn btn-secondary w-full" disabled={isCreatingOrganization}>
                  {isCreatingOrganization ? 'Creating organization...' : 'Create organization'}
                </button>
              </form>
            </section>

            <section className="card">
              <p className="eyebrow text-primary-700">Access</p>
              <h2 className="text-xl font-semibold text-gray-900">Add member</h2>
              <p className="mt-2 text-sm text-gray-600">
                Add a user by their Supabase user UUID and assign the role they need for pilot testing.
              </p>

              {!isOrgAdmin ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Only organization admins can add or update members.
                </div>
              ) : null}

              <form className="mt-6 space-y-4" onSubmit={handleAddMember}>
                <div>
                  <label htmlFor="newMemberUserId" className="block text-sm font-medium text-gray-900">
                    User UUID
                  </label>
                  <input
                    id="newMemberUserId"
                    className="input mt-2"
                    value={newMemberUserId}
                    onChange={(event) => setNewMemberUserId(event.target.value)}
                    placeholder="00000000-0000-0000-0000-000000000000"
                    required
                    disabled={!isOrgAdmin || isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="newMemberRole" className="block text-sm font-medium text-gray-900">
                    Role
                  </label>
                  <select
                    id="newMemberRole"
                    className="input mt-2"
                    value={newMemberRole}
                    onChange={(event) => setNewMemberRole(event.target.value as MembershipRole)}
                    disabled={!isOrgAdmin || isSubmitting}
                  >
                    {membershipRoleOptions.map((role) => (
                      <option key={role} value={role}>
                        {membershipRoleLabels[role]}
                      </option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="btn btn-primary w-full" disabled={!isOrgAdmin || isSubmitting}>
                  {isSubmitting ? 'Adding member...' : 'Add member'}
                </button>
              </form>
            </section>
          </div>

          <section className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow text-primary-700">Memberships</p>
                <h2 className="text-xl font-semibold text-gray-900">Current members</h2>
              </div>
              <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
                {sortedMemberships.length}
              </span>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sortedMemberships.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-gray-500">
                        No members found for this organization yet.
                      </td>
                    </tr>
                  ) : (
                    sortedMemberships.map((membership) => {
                      const isCurrentUser = membership.user_id === user?.id
                      const isUpdating = updatingMembershipId === membership.id

                      return (
                        <tr key={membership.id}>
                          <td className="px-3 py-3 align-top">
                            <div className="font-medium text-gray-900">
                              {isCurrentUser ? 'You' : membership.user_id}
                            </div>
                            <div className="mt-1 font-mono text-xs text-gray-500">{membership.user_id}</div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <select
                              aria-label={`Role for ${membership.user_id}`}
                              className="input"
                              value={membership.role}
                              disabled={!isOrgAdmin || isUpdating}
                              onChange={(event) => void handleRoleChange(membership.id, event.target.value as MembershipRole)}
                            >
                              {membershipRoleOptions.map((role) => (
                                <option key={role} value={role}>
                                  {membershipRoleLabels[role]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-3 align-top text-gray-600">{formatDate(membership.created_at)}</td>
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
