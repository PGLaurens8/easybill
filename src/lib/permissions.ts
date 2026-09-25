/**
 * What each role can do, mirrored from backend/app/core/permissions.py so the UI only offers
 * actions that will succeed. The API remains the authority.
 */
import type { MembershipRole } from '../types/api'

export type ClaimStatus =
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'Approved'
  | 'Rejected'
  | 'Certified'
  | 'Paid'

const COMMERCIAL: MembershipRole[] = ['OrgAdmin', 'CommercialManager', 'QuantitySurveyor']
const PREPARE: MembershipRole[] = [...COMMERCIAL, 'Contractor']
const PAYMENT: MembershipRole[] = ['OrgAdmin', 'CommercialManager', 'Accounts']

export const roleLabels: Record<MembershipRole, string> = {
  OrgAdmin: 'Director / Admin',
  CommercialManager: 'Commercial Manager',
  QuantitySurveyor: 'Quantity Surveyor',
  Contractor: 'Subcontractor',
  Accounts: 'Accounts',
}

export const roleDescriptions: Record<MembershipRole, string> = {
  OrgAdmin: 'Everything, including adding people.',
  CommercialManager: 'Contracts, BOQs, approving claims, certifying and paying.',
  QuantitySurveyor: 'Contracts, BOQs, approving claims and issuing certificates.',
  Contractor: 'Sees only the contracts assigned to them. Submits claims and views certificates.',
  Accounts: 'Views everything and marks certificates as paid.',
}

export type ClaimAction = {
  to: ClaimStatus
  label: string
  tone: 'primary' | 'neutral' | 'danger'
  needsReason?: boolean
}

const CLAIM_ACTIONS: Record<ClaimStatus, Array<ClaimAction & { roles: MembershipRole[] }>> = {
  Draft: [{ to: 'Submitted', label: 'Submit for approval', tone: 'primary', roles: PREPARE }],
  Submitted: [
    { to: 'Approved', label: 'Approve', tone: 'primary', roles: COMMERCIAL },
    { to: 'Rejected', label: 'Reject', tone: 'danger', needsReason: true, roles: COMMERCIAL },
  ],
  UnderReview: [
    { to: 'Approved', label: 'Approve', tone: 'primary', roles: COMMERCIAL },
    { to: 'Rejected', label: 'Reject', tone: 'danger', needsReason: true, roles: COMMERCIAL },
  ],
  Approved: [{ to: 'Rejected', label: 'Send back', tone: 'danger', needsReason: true, roles: COMMERCIAL }],
  Rejected: [{ to: 'Draft', label: 'Reopen to fix', tone: 'neutral', roles: PREPARE }],
  Certified: [],
  Paid: [],
}

export function claimActionsFor(status: string, role: MembershipRole | null): ClaimAction[] {
  if (!role) {
    return []
  }
  return (CLAIM_ACTIONS[status as ClaimStatus] ?? []).filter((action) => action.roles.includes(role))
}

export function can(role: MembershipRole | null) {
  const has = (roles: MembershipRole[]) => role !== null && roles.includes(role)
  return {
    manageContracts: has(COMMERCIAL),
    prepareClaims: has(PREPARE),
    certify: has(COMMERCIAL),
    markPaid: has(PAYMENT),
    manageMembers: has(['OrgAdmin']),
    isSubcontractor: role === 'Contractor',
  }
}

export const claimStatusLabels: Record<string, string> = {
  Draft: 'Draft',
  Submitted: 'Awaiting approval',
  UnderReview: 'Under review',
  Approved: 'Approved – ready to certify',
  Rejected: 'Rejected',
  Certified: 'Certified',
  Paid: 'Paid',
}

export const statusTone: Record<string, string> = {
  Draft: 'bg-stone-100 text-stone-700',
  Submitted: 'bg-amber-100 text-amber-800',
  UnderReview: 'bg-amber-100 text-amber-800',
  Approved: 'bg-sky-100 text-sky-800',
  Rejected: 'bg-red-100 text-red-800',
  Certified: 'bg-emerald-100 text-emerald-800',
  Issued: 'bg-emerald-100 text-emerald-800',
  Paid: 'bg-emerald-200 text-emerald-900',
  Voided: 'bg-stone-200 text-stone-500 line-through',
  Active: 'bg-emerald-100 text-emerald-800',
  Published: 'bg-emerald-100 text-emerald-800',
  Superseded: 'bg-stone-100 text-stone-500',
  Closed: 'bg-stone-200 text-stone-600',
}
