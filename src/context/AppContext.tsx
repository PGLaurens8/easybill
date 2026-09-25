import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react'

import { useAuth } from './AuthContext'
import { ApiError, apiRequest, formatApiError } from '../lib/api'
import type {
  BoqRevision,
  BoqRevisionCreateInput,
  CertificateBatch,
  CertificateBatchCreateInput,
  CertificateValuation,
  CertificateValuationInput,
  ClaimBatch,
  ClaimBatchCreateInput,
  ClaimBatchUpdateInput,
  Contract,
  ContraCharge,
  ContraChargeCreateInput,
  ContractCreateInput,
  ContractUpdateInput,
  MembershipRole,
  MyInvitation,
  Organization,
  OrganizationCreateInput,
  OrganizationInvitation,
  OrganizationInvitationCreateInput,
  OrganizationMembership,
  OrganizationMembershipUpdateInput,
  Project,
  ProjectCreateInput,
  VariationOrder,
  VariationOrderCreateInput,
} from '../types/api'

const SELECTED_ORGANIZATION_STORAGE_KEY = 'quanteasy.selectedOrganizationId'

type WithoutOrg<T> = Omit<T, 'organization_id'>

interface AppContextValue {
  organizations: Organization[]
  memberships: OrganizationMembership[]
  selectedOrganization: Organization | null
  selectedOrganizationId: string | null
  currentRole: MembershipRole | null
  projects: Project[]
  contracts: Contract[]
  boqRevisions: BoqRevision[]
  claims: ClaimBatch[]
  certificates: CertificateBatch[]
  variations: VariationOrder[]
  contraCharges: ContraCharge[]
  isBootstrapping: boolean
  isRefreshingProjects: boolean
  isRefreshingCommercialData: boolean
  isRefreshingMemberships: boolean
  error: string | null
  refreshOrganizations: () => Promise<void>
  refreshProjects: () => Promise<void>
  refreshCommercialData: () => Promise<void>
  refreshMemberships: () => Promise<void>
  createOrganization: (input: OrganizationCreateInput) => Promise<Organization>
  /** Invitations addressed to me, from any organization. */
  myInvitations: MyInvitation[]
  acceptInvitation: (invitationId: string) => Promise<void>
  declineInvitation: (invitationId: string) => Promise<void>
  /** Pending invitations sent by the selected organization (admins only; call refreshInvitations first). */
  invitations: OrganizationInvitation[]
  refreshInvitations: () => Promise<void>
  createInvitation: (input: OrganizationInvitationCreateInput) => Promise<OrganizationInvitation>
  revokeInvitation: (invitationId: string) => Promise<void>
  updateOrganizationMembership: (
    membershipId: string,
    input: OrganizationMembershipUpdateInput,
  ) => Promise<OrganizationMembership>
  removeOrganizationMembership: (membershipId: string) => Promise<void>
  createProject: (input: WithoutOrg<ProjectCreateInput>) => Promise<Project>
  createContract: (input: WithoutOrg<ContractCreateInput>) => Promise<Contract>
  updateContract: (contractId: string, input: ContractUpdateInput) => Promise<Contract>
  createBoqRevision: (input: WithoutOrg<BoqRevisionCreateInput>) => Promise<BoqRevision>
  createClaimBatch: (input: WithoutOrg<ClaimBatchCreateInput>) => Promise<ClaimBatch>
  updateClaimBatch: (claimBatchId: string, input: ClaimBatchUpdateInput) => Promise<ClaimBatch>
  updateClaimStatus: (claimBatchId: string, status: string, remarks?: string) => Promise<ClaimBatch>
  previewCertificate: (input: CertificateValuationInput) => Promise<CertificateValuation>
  createCertificateBatch: (input: WithoutOrg<CertificateBatchCreateInput>) => Promise<CertificateBatch>
  updateCertificateStatus: (certificateId: string, status: 'Paid' | 'Voided') => Promise<CertificateBatch>
  createVariation: (input: VariationOrderCreateInput) => Promise<VariationOrder>
  decideVariation: (variationId: string, approve: boolean, remarks?: string) => Promise<VariationOrder>
  createContraCharge: (input: ContraChargeCreateInput) => Promise<ContraCharge>
  deleteContraCharge: (chargeId: string) => Promise<void>
  setSelectedOrganizationId: (organizationId: string) => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

function replaceById<T extends { id: string }>(items: T[], next: T): T[] {
  return items.map((item) => (item.id === next.id ? next : item))
}

export function AppProvider({ children }: PropsWithChildren) {
  const { accessToken, user } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([])
  const [myInvitations, setMyInvitations] = useState<MyInvitation[]>([])
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [boqRevisions, setBoqRevisions] = useState<BoqRevision[]>([])
  const [claims, setClaims] = useState<ClaimBatch[]>([])
  const [certificates, setCertificates] = useState<CertificateBatch[]>([])
  const [variations, setVariations] = useState<VariationOrder[]>([])
  const [contraCharges, setContraCharges] = useState<ContraCharge[]>([])
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(SELECTED_ORGANIZATION_STORAGE_KEY)
    } catch {
      return null
    }
  })
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isRefreshingProjects, setIsRefreshingProjects] = useState(false)
  const [isRefreshingCommercialData, setIsRefreshingCommercialData] = useState(false)
  const [isRefreshingMemberships, setIsRefreshingMemberships] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedOrganization =
    organizations.find((organization) => organization.id === selectedOrganizationId) ?? null
  const currentRole = memberships.find((membership) => membership.user_id === user?.id)?.role ?? null

  /** Authenticated request scoped to the selected organization. */
  const orgRequest = useCallback(
    async <T,>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> => {
      if (!accessToken || !selectedOrganizationId) {
        throw new ApiError('Select a workspace first.', 400, null)
      }
      return apiRequest<T>(path, { ...init, accessToken, organizationId: selectedOrganizationId })
    },
    [accessToken, selectedOrganizationId],
  )

  const loadCommercialData = useCallback(async () => {
    const [nextContracts, nextBoqRevisions, nextClaims, nextCertificates, nextVariations, nextContraCharges] =
      await Promise.all([
        orgRequest<Contract[]>('/api/v1/contracts'),
        orgRequest<BoqRevision[]>('/api/v1/boq-revisions'),
        orgRequest<ClaimBatch[]>('/api/v1/claims'),
        orgRequest<CertificateBatch[]>('/api/v1/certificates'),
        orgRequest<VariationOrder[]>('/api/v1/variations'),
        orgRequest<ContraCharge[]>('/api/v1/contra-charges'),
      ])
    setContracts(nextContracts)
    setBoqRevisions(nextBoqRevisions)
    setClaims(nextClaims)
    setCertificates(nextCertificates)
    setVariations(nextVariations)
    setContraCharges(nextContraCharges)
  }, [orgRequest])

  useEffect(() => {
    try {
      if (selectedOrganizationId) {
        window.localStorage.setItem(SELECTED_ORGANIZATION_STORAGE_KEY, selectedOrganizationId)
      } else {
        window.localStorage.removeItem(SELECTED_ORGANIZATION_STORAGE_KEY)
      }
    } catch {
      // Storage can be unavailable (private mode); the selection just won't persist.
    }
  }, [selectedOrganizationId])

  useEffect(() => {
    if (!accessToken) {
      setOrganizations([])
      setMyInvitations([])
      setSelectedOrganizationIdState(null)
      setIsBootstrapping(false)
      setError(null)
      return
    }

    let active = true
    setIsBootstrapping(true)
    setError(null)

    Promise.all([
      apiRequest<Organization[]>('/api/v1/organizations', { accessToken }),
      apiRequest<MyInvitation[]>('/api/v1/invitations', { accessToken }),
    ])
      .then(([nextOrganizations, nextInvitations]) => {
        if (!active) {
          return
        }
        setMyInvitations(nextInvitations)
        setOrganizations(nextOrganizations)
        setSelectedOrganizationIdState((current) =>
          nextOrganizations.some((organization) => organization.id === current)
            ? current
            : nextOrganizations[0]?.id ?? null,
        )
      })
      .catch((caughtError) => {
        if (active) {
          setError(formatApiError(caughtError, 'Failed to load application data.'))
        }
      })
      .finally(() => {
        if (active) {
          setIsBootstrapping(false)
        }
      })

    return () => {
      active = false
    }
  }, [accessToken])

  useEffect(() => {
    setMemberships([])
    setInvitations([])
    setProjects([])
    setContracts([])
    setBoqRevisions([])
    setClaims([])
    setCertificates([])
    setVariations([])
    setContraCharges([])

    if (!accessToken || !selectedOrganizationId) {
      return
    }

    let active = true
    setIsRefreshingProjects(true)
    setIsRefreshingCommercialData(true)
    setIsRefreshingMemberships(true)
    setError(null)

    const request = <T,>(path: string) =>
      apiRequest<T>(path, { accessToken, organizationId: selectedOrganizationId })

    Promise.all([
      request<OrganizationMembership[]>(`/api/v1/organizations/${selectedOrganizationId}/memberships`),
      request<Project[]>('/api/v1/projects'),
      request<Contract[]>('/api/v1/contracts'),
      request<BoqRevision[]>('/api/v1/boq-revisions'),
      request<ClaimBatch[]>('/api/v1/claims'),
      request<CertificateBatch[]>('/api/v1/certificates'),
      request<VariationOrder[]>('/api/v1/variations'),
      request<ContraCharge[]>('/api/v1/contra-charges'),
    ])
      .then(
        ([
          nextMemberships,
          nextProjects,
          nextContracts,
          nextBoqRevisions,
          nextClaims,
          nextCertificates,
          nextVariations,
          nextContraCharges,
        ]) => {
        if (!active) {
          return
        }
        setMemberships(nextMemberships)
        setProjects(nextProjects)
        setContracts(nextContracts)
        setBoqRevisions(nextBoqRevisions)
        setClaims(nextClaims)
        setCertificates(nextCertificates)
        setVariations(nextVariations)
        setContraCharges(nextContraCharges)
        },
      )
      .catch((caughtError) => {
        if (active) {
          setError(formatApiError(caughtError, 'Failed to load organization data.'))
        }
      })
      .finally(() => {
        if (active) {
          setIsRefreshingProjects(false)
          setIsRefreshingCommercialData(false)
          setIsRefreshingMemberships(false)
        }
      })

    return () => {
      active = false
    }
  }, [accessToken, selectedOrganizationId])

  async function refreshOrganizations() {
    if (!accessToken) {
      return
    }
    const nextOrganizations = await apiRequest<Organization[]>('/api/v1/organizations', { accessToken })
    setOrganizations(nextOrganizations)
    if (!selectedOrganizationId && nextOrganizations[0]) {
      setSelectedOrganizationIdState(nextOrganizations[0].id)
    }
  }

  async function withRefreshFlag(
    setFlag: (value: boolean) => void,
    fallbackMessage: string,
    work: () => Promise<void>,
  ) {
    if (!accessToken || !selectedOrganizationId) {
      return
    }
    setFlag(true)
    setError(null)
    try {
      await work()
    } catch (caughtError) {
      setError(formatApiError(caughtError, fallbackMessage))
    } finally {
      setFlag(false)
    }
  }

  const refreshMemberships = () =>
    withRefreshFlag(setIsRefreshingMemberships, 'Failed to refresh organization members.', async () => {
      setMemberships(
        await orgRequest<OrganizationMembership[]>(`/api/v1/organizations/${selectedOrganizationId}/memberships`),
      )
    })

  const refreshProjects = () =>
    withRefreshFlag(setIsRefreshingProjects, 'Failed to refresh projects.', async () => {
      setProjects(await orgRequest<Project[]>('/api/v1/projects'))
    })

  const refreshCommercialData = () =>
    withRefreshFlag(setIsRefreshingCommercialData, 'Failed to refresh commercial data.', loadCommercialData)

  async function createOrganization(input: OrganizationCreateInput) {
    if (!accessToken) {
      throw new ApiError('You must be signed in to create an organization.', 401, null)
    }
    const organization = await apiRequest<Organization>('/api/v1/organizations', {
      method: 'POST',
      accessToken,
      body: input,
    })
    setOrganizations((current) => [organization, ...current])
    setSelectedOrganizationIdState(organization.id)
    return organization
  }

  async function acceptInvitation(invitationId: string) {
    if (!accessToken) {
      return
    }
    const invitation = myInvitations.find((item) => item.id === invitationId)
    await apiRequest<OrganizationMembership>(`/api/v1/invitations/${invitationId}/accept`, {
      method: 'POST',
      accessToken,
    })
    setMyInvitations((current) => current.filter((item) => item.id !== invitationId))
    setOrganizations(await apiRequest<Organization[]>('/api/v1/organizations', { accessToken }))
    if (invitation) {
      setSelectedOrganizationIdState(invitation.organization_id)
    }
  }

  async function declineInvitation(invitationId: string) {
    if (!accessToken) {
      return
    }
    await apiRequest<unknown>(`/api/v1/invitations/${invitationId}/decline`, { method: 'POST', accessToken })
    setMyInvitations((current) => current.filter((item) => item.id !== invitationId))
  }

  async function refreshInvitations() {
    setInvitations(
      await orgRequest<OrganizationInvitation[]>(`/api/v1/organizations/${selectedOrganizationId}/invitations`),
    )
  }

  async function createInvitation(input: OrganizationInvitationCreateInput) {
    const invitation = await orgRequest<OrganizationInvitation>(
      `/api/v1/organizations/${selectedOrganizationId}/invitations`,
      { method: 'POST', body: input },
    )
    setInvitations((current) => [invitation, ...current])
    return invitation
  }

  async function revokeInvitation(invitationId: string) {
    await orgRequest<unknown>(`/api/v1/organizations/${selectedOrganizationId}/invitations/${invitationId}`, {
      method: 'DELETE',
    })
    setInvitations((current) => current.filter((item) => item.id !== invitationId))
  }

  async function updateOrganizationMembership(membershipId: string, input: OrganizationMembershipUpdateInput) {
    const membership = await orgRequest<OrganizationMembership>(
      `/api/v1/organizations/${selectedOrganizationId}/memberships/${membershipId}`,
      { method: 'PATCH', body: input },
    )
    setMemberships((current) => replaceById(current, membership))
    return membership
  }

  async function removeOrganizationMembership(membershipId: string) {
    await orgRequest<unknown>(`/api/v1/organizations/${selectedOrganizationId}/memberships/${membershipId}`, {
      method: 'DELETE',
    })
    setMemberships((current) => current.filter((membership) => membership.id !== membershipId))
  }

  async function createProject(input: WithoutOrg<ProjectCreateInput>) {
    const project = await orgRequest<Project>('/api/v1/projects', {
      method: 'POST',
      body: { ...input, organization_id: selectedOrganizationId },
    })
    setProjects((current) => [project, ...current])
    return project
  }

  async function createContract(input: WithoutOrg<ContractCreateInput>) {
    const contract = await orgRequest<Contract>('/api/v1/contracts', {
      method: 'POST',
      body: { ...input, organization_id: selectedOrganizationId },
    })
    setContracts((current) => [contract, ...current])
    return contract
  }

  async function updateContract(contractId: string, input: ContractUpdateInput) {
    const contract = await orgRequest<Contract>(`/api/v1/contracts/${contractId}`, { method: 'PATCH', body: input })
    setContracts((current) => replaceById(current, contract))
    return contract
  }

  async function createBoqRevision(input: WithoutOrg<BoqRevisionCreateInput>) {
    const revision = await orgRequest<BoqRevision>('/api/v1/boq-revisions', {
      method: 'POST',
      body: { ...input, organization_id: selectedOrganizationId },
    })
    // Publishing supersedes earlier revisions and can activate the contract.
    await loadCommercialData()
    return revision
  }

  async function createClaimBatch(input: WithoutOrg<ClaimBatchCreateInput>) {
    const claim = await orgRequest<ClaimBatch>('/api/v1/claims', {
      method: 'POST',
      body: { ...input, organization_id: selectedOrganizationId },
    })
    setClaims((current) => [claim, ...current])
    return claim
  }

  async function updateClaimBatch(claimBatchId: string, input: ClaimBatchUpdateInput) {
    const claim = await orgRequest<ClaimBatch>(`/api/v1/claims/${claimBatchId}`, { method: 'PUT', body: input })
    setClaims((current) => replaceById(current, claim))
    return claim
  }

  async function updateClaimStatus(claimBatchId: string, status: string, remarks?: string) {
    const claim = await orgRequest<ClaimBatch>(`/api/v1/claims/${claimBatchId}/status`, {
      method: 'PATCH',
      body: { status, remarks },
    })
    setClaims((current) => replaceById(current, claim))
    return claim
  }

  function previewCertificate(input: CertificateValuationInput) {
    return orgRequest<CertificateValuation>('/api/v1/certificates/preview', {
      method: 'POST',
      body: { ...input, organization_id: selectedOrganizationId },
    })
  }

  async function createCertificateBatch(input: WithoutOrg<CertificateBatchCreateInput>) {
    const certificate = await orgRequest<CertificateBatch>('/api/v1/certificates', {
      method: 'POST',
      body: { ...input, organization_id: selectedOrganizationId },
    })
    // Issuing also moves the claim to Certified.
    await loadCommercialData()
    return certificate
  }

  async function updateCertificateStatus(certificateId: string, status: 'Paid' | 'Voided') {
    const certificate = await orgRequest<CertificateBatch>(`/api/v1/certificates/${certificateId}/status`, {
      method: 'PATCH',
      body: { status },
    })
    // Paying or voiding also moves the linked claim.
    await loadCommercialData()
    return certificate
  }

  async function createVariation(input: VariationOrderCreateInput) {
    const variation = await orgRequest<VariationOrder>('/api/v1/variations', {
      method: 'POST',
      body: { ...input, organization_id: selectedOrganizationId },
    })
    // An approved variation publishes a new BOQ revision.
    await loadCommercialData()
    return variation
  }

  async function decideVariation(variationId: string, approve: boolean, remarks?: string) {
    const variation = await orgRequest<VariationOrder>(`/api/v1/variations/${variationId}/decision`, {
      method: 'POST',
      body: { approve, remarks },
    })
    await loadCommercialData()
    return variation
  }

  async function createContraCharge(input: ContraChargeCreateInput) {
    const charge = await orgRequest<ContraCharge>('/api/v1/contra-charges', {
      method: 'POST',
      body: { ...input, organization_id: selectedOrganizationId },
    })
    setContraCharges((current) => [charge, ...current])
    return charge
  }

  async function deleteContraCharge(chargeId: string) {
    await orgRequest<unknown>(`/api/v1/contra-charges/${chargeId}`, { method: 'DELETE' })
    setContraCharges((current) => current.filter((charge) => charge.id !== chargeId))
  }

  const value: AppContextValue = {
    organizations,
    memberships,
    selectedOrganization,
    selectedOrganizationId,
    currentRole,
    projects,
    contracts,
    boqRevisions,
    claims,
    certificates,
    variations,
    contraCharges,
    isBootstrapping,
    isRefreshingProjects,
    isRefreshingCommercialData,
    isRefreshingMemberships,
    error,
    refreshOrganizations,
    refreshProjects,
    refreshCommercialData,
    refreshMemberships,
    createOrganization,
    myInvitations,
    acceptInvitation,
    declineInvitation,
    invitations,
    refreshInvitations,
    createInvitation,
    revokeInvitation,
    updateOrganizationMembership,
    removeOrganizationMembership,
    createProject,
    createContract,
    updateContract,
    createBoqRevision,
    createClaimBatch,
    updateClaimBatch,
    updateClaimStatus,
    previewCertificate,
    createCertificateBatch,
    updateCertificateStatus,
    createVariation,
    decideVariation,
    createContraCharge,
    deleteContraCharge,
    setSelectedOrganizationId(organizationId: string) {
      setSelectedOrganizationIdState(organizationId)
    },
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider')
  }

  return context
}
