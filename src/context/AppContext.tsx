import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react'

import { useAuth } from './AuthContext'
import { ApiError, apiRequest, formatApiError } from '../lib/api'
import type {
  ClaimBatch,
  ClaimBatchCreateInput,
  BoqRevision,
  BoqRevisionCreateInput,
  CertificateBatch,
  CertificateBatchCreateInput,
  Contract,
  ContractCreateInput,
  Organization,
  OrganizationCreateInput,
  OrganizationMembership,
  OrganizationMembershipCreateInput,
  OrganizationMembershipUpdateInput,
  Project,
  ProjectCreateInput,
} from '../types/api'

const SELECTED_ORGANIZATION_STORAGE_KEY = 'quanteasy.selectedOrganizationId'

interface AppContextValue {
  organizations: Organization[]
  memberships: OrganizationMembership[]
  selectedOrganization: Organization | null
  selectedOrganizationId: string | null
  projects: Project[]
  contracts: Contract[]
  boqRevisions: BoqRevision[]
  claims: ClaimBatch[]
  certificates: CertificateBatch[]
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
  createOrganizationMembership: (input: OrganizationMembershipCreateInput) => Promise<OrganizationMembership>
  updateOrganizationMembership: (
    membershipId: string,
    input: OrganizationMembershipUpdateInput,
  ) => Promise<OrganizationMembership>
  createProject: (input: Omit<ProjectCreateInput, 'organization_id'>) => Promise<Project>
  createContract: (input: Omit<ContractCreateInput, 'organization_id'>) => Promise<Contract>
  createBoqRevision: (input: Omit<BoqRevisionCreateInput, 'organization_id'>) => Promise<BoqRevision>
  createClaimBatch: (input: Omit<ClaimBatchCreateInput, 'organization_id'>) => Promise<ClaimBatch>
  createCertificateBatch: (input: Omit<CertificateBatchCreateInput, 'organization_id'>) => Promise<CertificateBatch>
  updateClaimStatus: (claimBatchId: string, status: string, remarks?: string) => Promise<ClaimBatch>
  setSelectedOrganizationId: (organizationId: string) => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: PropsWithChildren) {
  const { accessToken } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [boqRevisions, setBoqRevisions] = useState<BoqRevision[]>([])
  const [claims, setClaims] = useState<ClaimBatch[]>([])
  const [certificates, setCertificates] = useState<CertificateBatch[]>([])
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState<string | null>(() => {
    return window.localStorage.getItem(SELECTED_ORGANIZATION_STORAGE_KEY)
  })
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isRefreshingProjects, setIsRefreshingProjects] = useState(false)
  const [isRefreshingCommercialData, setIsRefreshingCommercialData] = useState(false)
  const [isRefreshingMemberships, setIsRefreshingMemberships] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedOrganization =
    organizations.find((organization) => organization.id === selectedOrganizationId) ?? null

  useEffect(() => {
    if (!selectedOrganizationId) {
      window.localStorage.removeItem(SELECTED_ORGANIZATION_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(SELECTED_ORGANIZATION_STORAGE_KEY, selectedOrganizationId)
  }, [selectedOrganizationId])

  useEffect(() => {
    if (!accessToken) {
      setOrganizations([])
      setMemberships([])
      setProjects([])
      setContracts([])
      setBoqRevisions([])
      setClaims([])
      setCertificates([])
      setSelectedOrganizationIdState(null)
      setIsBootstrapping(false)
      setError(null)
      return
    }

    let active = true

    async function bootstrap() {
      setIsBootstrapping(true)
      setError(null)

      try {
        const nextOrganizations = await apiRequest<Organization[]>('/api/v1/organizations', {
          accessToken,
        })

        if (!active) {
          return
        }

        setOrganizations(nextOrganizations)

        const persistedOrganization = nextOrganizations.find(
          (organization) => organization.id === selectedOrganizationId,
        )
        const nextSelectedOrganizationId = persistedOrganization?.id ?? nextOrganizations[0]?.id ?? null

        setSelectedOrganizationIdState(nextSelectedOrganizationId)
      } catch (caughtError) {
        if (!active) {
          return
        }

        setError(formatApiError(caughtError, 'Failed to load application data.'))
      } finally {
        if (active) {
          setIsBootstrapping(false)
        }
      }
    }

    bootstrap()

    return () => {
      active = false
    }
  }, [accessToken])

  useEffect(() => {
    if (!accessToken || !selectedOrganizationId) {
      setMemberships([])
      setProjects([])
      setContracts([])
      setBoqRevisions([])
      setClaims([])
      setCertificates([])
      return
    }

    let active = true
    setIsRefreshingProjects(true)
    setIsRefreshingCommercialData(true)
    setIsRefreshingMemberships(true)
    setError(null)

    Promise.all([
      apiRequest<OrganizationMembership[]>(`/api/v1/organizations/${selectedOrganizationId}/memberships`, {
        accessToken,
        organizationId: selectedOrganizationId,
      }),
      apiRequest<Project[]>('/api/v1/projects', {
        accessToken,
        organizationId: selectedOrganizationId,
      }),
      apiRequest<Contract[]>('/api/v1/contracts', {
        accessToken,
        organizationId: selectedOrganizationId,
      }),
      apiRequest<BoqRevision[]>('/api/v1/boq-revisions', {
        accessToken,
        organizationId: selectedOrganizationId,
      }),
      apiRequest<ClaimBatch[]>('/api/v1/claims', {
        accessToken,
        organizationId: selectedOrganizationId,
      }),
      apiRequest<CertificateBatch[]>('/api/v1/certificates', {
        accessToken,
        organizationId: selectedOrganizationId,
      }),
    ])
      .then(([nextMemberships, nextProjects, nextContracts, nextBoqRevisions, nextClaims, nextCertificates]) => {
        if (active) {
          setMemberships(nextMemberships)
          setProjects(nextProjects)
          setContracts(nextContracts)
          setBoqRevisions(nextBoqRevisions)
          setClaims(nextClaims)
          setCertificates(nextCertificates)
        }
      })
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

    const nextOrganizations = await apiRequest<Organization[]>('/api/v1/organizations', {
      accessToken,
    })

    setOrganizations(nextOrganizations)

    if (!selectedOrganizationId && nextOrganizations[0]) {
      setSelectedOrganizationIdState(nextOrganizations[0].id)
    }
  }

  async function refreshMemberships() {
    if (!accessToken || !selectedOrganizationId) {
      setMemberships([])
      return
    }

    setIsRefreshingMemberships(true)
    setError(null)

    try {
      const nextMemberships = await apiRequest<OrganizationMembership[]>(
        `/api/v1/organizations/${selectedOrganizationId}/memberships`,
        {
          accessToken,
          organizationId: selectedOrganizationId,
        },
      )

      setMemberships(nextMemberships)
    } catch (caughtError) {
      setError(formatApiError(caughtError, 'Failed to refresh organization members.'))
    } finally {
      setIsRefreshingMemberships(false)
    }
  }

  async function refreshProjects() {
    if (!accessToken || !selectedOrganizationId) {
      setProjects([])
      return
    }

    setIsRefreshingProjects(true)
    setError(null)

    try {
      const nextProjects = await apiRequest<Project[]>('/api/v1/projects', {
        accessToken,
        organizationId: selectedOrganizationId,
      })

      setProjects(nextProjects)
    } catch (caughtError) {
      setError(formatApiError(caughtError, 'Failed to refresh projects.'))
    } finally {
      setIsRefreshingProjects(false)
    }
  }

  async function refreshCommercialData() {
    if (!accessToken || !selectedOrganizationId) {
      setContracts([])
      setBoqRevisions([])
      setClaims([])
      setCertificates([])
      return
    }

    setIsRefreshingCommercialData(true)
    setError(null)

    try {
      const [nextContracts, nextBoqRevisions, nextClaims, nextCertificates] = await Promise.all([
        apiRequest<Contract[]>('/api/v1/contracts', {
          accessToken,
          organizationId: selectedOrganizationId,
        }),
        apiRequest<BoqRevision[]>('/api/v1/boq-revisions', {
          accessToken,
          organizationId: selectedOrganizationId,
        }),
        apiRequest<ClaimBatch[]>('/api/v1/claims', {
          accessToken,
          organizationId: selectedOrganizationId,
        }),
        apiRequest<CertificateBatch[]>('/api/v1/certificates', {
          accessToken,
          organizationId: selectedOrganizationId,
        }),
      ])

      setContracts(nextContracts)
      setBoqRevisions(nextBoqRevisions)
      setClaims(nextClaims)
      setCertificates(nextCertificates)
    } catch (caughtError) {
      setError(formatApiError(caughtError, 'Failed to refresh commercial data.'))
    } finally {
      setIsRefreshingCommercialData(false)
    }
  }

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

  async function createOrganizationMembership(input: OrganizationMembershipCreateInput) {
    if (!accessToken || !selectedOrganizationId) {
      throw new ApiError('Select an organization before adding a member.', 400, null)
    }

    const membership = await apiRequest<OrganizationMembership>(
      `/api/v1/organizations/${selectedOrganizationId}/memberships`,
      {
        method: 'POST',
        accessToken,
        organizationId: selectedOrganizationId,
        body: input,
      },
    )

    setMemberships((current) => [...current, membership].sort((left, right) => left.created_at.localeCompare(right.created_at)))
    return membership
  }

  async function updateOrganizationMembership(
    membershipId: string,
    input: OrganizationMembershipUpdateInput,
  ) {
    if (!accessToken || !selectedOrganizationId) {
      throw new ApiError('Select an organization before updating a member.', 400, null)
    }

    const membership = await apiRequest<OrganizationMembership>(
      `/api/v1/organizations/${selectedOrganizationId}/memberships/${membershipId}`,
      {
        method: 'PATCH',
        accessToken,
        organizationId: selectedOrganizationId,
        body: input,
      },
    )

    setMemberships((current) => current.map((item) => (item.id === membership.id ? membership : item)))
    return membership
  }

  async function createProject(input: Omit<ProjectCreateInput, 'organization_id'>) {
    if (!accessToken || !selectedOrganizationId) {
      throw new ApiError('Select an organization before creating a project.', 400, null)
    }

    const project = await apiRequest<Project>('/api/v1/projects', {
      method: 'POST',
      accessToken,
      organizationId: selectedOrganizationId,
      body: {
        ...input,
        organization_id: selectedOrganizationId,
      },
    })

    setProjects((current) => [project, ...current])
    return project
  }

  async function createContract(input: Omit<ContractCreateInput, 'organization_id'>) {
    if (!accessToken || !selectedOrganizationId) {
      throw new ApiError('Select an organization before creating a contract.', 400, null)
    }

    const contract = await apiRequest<Contract>('/api/v1/contracts', {
      method: 'POST',
      accessToken,
      organizationId: selectedOrganizationId,
      body: {
        ...input,
        organization_id: selectedOrganizationId,
      },
    })

    setContracts((current) => [contract, ...current])
    return contract
  }

  async function createBoqRevision(input: Omit<BoqRevisionCreateInput, 'organization_id'>) {
    if (!accessToken || !selectedOrganizationId) {
      throw new ApiError('Select an organization before creating a BOQ revision.', 400, null)
    }

    const revision = await apiRequest<BoqRevision>('/api/v1/boq-revisions', {
      method: 'POST',
      accessToken,
      organizationId: selectedOrganizationId,
      body: {
        ...input,
        organization_id: selectedOrganizationId,
      },
    })

    setBoqRevisions((current) => [revision, ...current])
    return revision
  }

  async function createClaimBatch(input: Omit<ClaimBatchCreateInput, 'organization_id'>) {
    if (!accessToken || !selectedOrganizationId) {
      throw new ApiError('Select an organization before creating a claim.', 400, null)
    }

    const claim = await apiRequest<ClaimBatch>('/api/v1/claims', {
      method: 'POST',
      accessToken,
      organizationId: selectedOrganizationId,
      body: {
        ...input,
        organization_id: selectedOrganizationId,
      },
    })

    setClaims((current) => [claim, ...current])
    return claim
  }

  async function createCertificateBatch(input: Omit<CertificateBatchCreateInput, 'organization_id'>) {
    if (!accessToken || !selectedOrganizationId) {
      throw new ApiError('Select an organization before creating a certificate.', 400, null)
    }

    const certificate = await apiRequest<CertificateBatch>('/api/v1/certificates', {
      method: 'POST',
      accessToken,
      organizationId: selectedOrganizationId,
      body: {
        ...input,
        organization_id: selectedOrganizationId,
      },
    })

    setCertificates((current) => [certificate, ...current])
    return certificate
  }

  async function updateClaimStatus(claimBatchId: string, status: string, remarks?: string) {
    if (!accessToken || !selectedOrganizationId) {
      throw new ApiError('Select an organization before updating a claim.', 400, null)
    }

    const claim = await apiRequest<ClaimBatch>(`/api/v1/claims/${claimBatchId}/status`, {
      method: 'PATCH',
      accessToken,
      organizationId: selectedOrganizationId,
      body: {
        status,
        remarks,
      },
    })

    setClaims((current) => current.map((item) => (item.id === claim.id ? claim : item)))
    return claim
  }

  const value: AppContextValue = {
    organizations,
    memberships,
    selectedOrganization,
    selectedOrganizationId,
    projects,
    contracts,
    boqRevisions,
    claims,
    certificates,
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
    createOrganizationMembership,
    updateOrganizationMembership,
    createProject,
    createContract,
    createBoqRevision,
    createClaimBatch,
    createCertificateBatch,
    updateClaimStatus,
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
