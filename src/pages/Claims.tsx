import { useEffect, useMemo, useState } from 'react'

import { useAppContext } from '../context/AppContext'

type ClaimDraftLine = {
  boq_item_id: string
  item_code: string
  description: string
  unit: string
  rate: string
  previous_certified_quantity: string
  claimed_quantity_this_period: string
  claimed_materials_on_site_value: string
  notes: string
}

function formatCurrency(amount: number, currencyCode = 'ZAR') {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount)
}

function formatDate(dateString: string | null) {
  if (!dateString) {
    return 'Not set'
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(dateString))
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const statusOptions = ['all', 'Draft', 'Submitted', 'UnderReview', 'Approved', 'Rejected', 'Certified', 'Paid']

export default function Claims() {
  const {
    boqRevisions,
    claims,
    contracts,
    createClaimBatch,
    error,
    projects,
    refreshCommercialData,
    selectedOrganization,
    updateClaimStatus,
  } = useAppContext()
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [contractFilter, setContractFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedContractId, setSelectedContractId] = useState('')
  const [periodNumber, setPeriodNumber] = useState('1')
  const [remarks, setRemarks] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusChangeId, setStatusChangeId] = useState<string | null>(null)
  const [draftLines, setDraftLines] = useState<ClaimDraftLine[]>([])

  const contractsForSelectedProject = useMemo(() => {
    return contracts.filter((contract) => contract.project_id === selectedProjectId)
  }, [contracts, selectedProjectId])

  const latestRevisionItems = useMemo(() => {
    const revision = boqRevisions
      .filter((item) => item.contract_id === selectedContractId)
      .sort((left, right) => right.revision_number - left.revision_number)[0]

    return revision?.items ?? []
  }, [boqRevisions, selectedContractId])

  useEffect(() => {
    if (!selectedProjectId && projects[0]) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedContractId('')
      return
    }

    const projectContracts = contracts.filter((contract) => contract.project_id === selectedProjectId)
    if (projectContracts.length === 0) {
      setSelectedContractId('')
      return
    }

    const stillValid = projectContracts.some((contract) => contract.id === selectedContractId)
    if (!stillValid) {
      setSelectedContractId(projectContracts[0].id)
    }
  }, [contracts, selectedContractId, selectedProjectId])

  useEffect(() => {
    setDraftLines(
      latestRevisionItems.map((item) => ({
        boq_item_id: item.id,
        item_code: item.item_code,
        description: item.description,
        unit: item.unit,
        rate: item.rate,
        previous_certified_quantity: '0.0000',
        claimed_quantity_this_period: '0.0000',
        claimed_materials_on_site_value: '0.00',
        notes: '',
      })),
    )
  }, [latestRevisionItems])

  useEffect(() => {
    if (!selectedClaimId && claims[0]) {
      setSelectedClaimId(claims[0].id)
    }
  }, [claims, selectedClaimId])

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      const project = projects.find((item) => item.id === claim.project_id)
      const contract = contracts.find((item) => item.id === claim.contract_id)
      const matchesStatus = statusFilter === 'all' || claim.status === statusFilter
      const matchesProject = projectFilter === 'all' || claim.project_id === projectFilter
      const matchesContract = contractFilter === 'all' || claim.contract_id === contractFilter
      const searchValue = `${project?.name || ''} ${contract?.title || ''} ${claim.period_number} ${claim.remarks || ''}`.toLowerCase()
      const matchesSearch = searchTerm.trim() === '' || searchValue.includes(searchTerm.trim().toLowerCase())

      return matchesStatus && matchesProject && matchesContract && matchesSearch
    })
  }, [claims, contractFilter, contracts, projectFilter, projects, searchTerm, statusFilter])

  const selectedClaim = filteredClaims.find((claim) => claim.id === selectedClaimId) ?? claims.find((claim) => claim.id === selectedClaimId) ?? null

  const totalFilteredValue = filteredClaims.reduce((sum, claim) => sum + Number(claim.total_claimed_amount), 0)

  function updateDraftLine(boqItemId: string, field: keyof ClaimDraftLine, value: string) {
    setDraftLines((current) =>
      current.map((line) => (line.boq_item_id === boqItemId ? { ...line, [field]: value } : line)),
    )
  }

  async function handleCreateClaim(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    setIsSubmitting(true)

    try {
      const lines = draftLines
        .filter((line) => Number(line.claimed_quantity_this_period) > 0 || Number(line.claimed_materials_on_site_value) > 0)
        .map((line) => ({
          boq_item_id: line.boq_item_id,
          previous_certified_quantity: line.previous_certified_quantity,
          claimed_quantity_this_period: line.claimed_quantity_this_period,
          claimed_materials_on_site_value:
            Number(line.claimed_materials_on_site_value) > 0 ? line.claimed_materials_on_site_value : undefined,
          notes: line.notes.trim() || undefined,
        }))

      if (lines.length === 0) {
        throw new Error('Add at least one claimed quantity or materials-on-site value.')
      }

      const claim = await createClaimBatch({
        project_id: selectedProjectId,
        contract_id: selectedContractId,
        period_number: Number(periodNumber),
        remarks: remarks.trim() || undefined,
        lines,
      })

      setSelectedClaimId(claim.id)
      setPeriodNumber((current) => String(Number(current) + 1))
      setRemarks('')
      setDraftLines((current) =>
        current.map((line) => ({
          ...line,
          claimed_quantity_this_period: '0.0000',
          claimed_materials_on_site_value: '0.00',
          notes: '',
        })),
      )
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : 'Unable to create claim.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleStatusChange(claimId: string, status: string) {
    setFormError(null)
    setStatusChangeId(claimId)

    try {
      await updateClaimStatus(claimId, status)
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : 'Unable to update claim status.')
    } finally {
      setStatusChangeId(null)
    }
  }

  function exportFilteredClaims() {
    const header = ['Project', 'Contract', 'Period', 'Status', 'Submitted', 'Reviewed', 'Total']
    const rows = filteredClaims.map((claim) => {
      const project = projects.find((item) => item.id === claim.project_id)
      const contract = contracts.find((item) => item.id === claim.contract_id)

      return [
        project?.name || '',
        contract?.title || '',
        String(claim.period_number),
        claim.status,
        claim.submitted_at || '',
        claim.reviewed_at || '',
        claim.total_claimed_amount,
      ]
    })

    downloadTextFile(
      'claims-summary.csv',
      [header, ...rows]
        .map((row) =>
          row
            .map((value) => {
              if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`
              }

              return value
            })
            .join(','),
        )
        .join('\n'),
      'text/csv;charset=utf-8;',
    )
  }

  function exportSelectedClaim() {
    if (!selectedClaim) {
      return
    }

    const project = projects.find((item) => item.id === selectedClaim.project_id)
    const contract = contracts.find((item) => item.id === selectedClaim.contract_id)

    const lines = selectedClaim.lines.map((line) => ({
      item_code: line.item_code,
      description: line.description,
      unit: line.unit,
      rate: line.rate,
      claimed_quantity_this_period: line.claimed_quantity_this_period,
      claimed_materials_on_site_value: line.claimed_materials_on_site_value,
      line_value: line.line_value,
      notes: line.notes,
    }))

    downloadTextFile(
      `claim-period-${selectedClaim.period_number}.json`,
      JSON.stringify(
        {
          project: project?.name,
          contract: contract?.title,
          period_number: selectedClaim.period_number,
          status: selectedClaim.status,
          total_claimed_amount: selectedClaim.total_claimed_amount,
          remarks: selectedClaim.remarks,
          lines,
        },
        null,
        2,
      ),
      'application/json;charset=utf-8;',
    )
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow text-primary-700">Step 3</p>
          <h1 className="text-2xl font-semibold text-gray-900">Claims Management</h1>
          <p className="mt-2 text-gray-600">
            {selectedOrganization
              ? `Use this only after the project, contract, and BOQ revision are in place. Then submit, review, and export claims for ${selectedOrganization.name}.`
              : 'Create an organization and commercial data first.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-secondary" onClick={() => void refreshCommercialData()}>
            Refresh
          </button>
          <button type="button" className="btn btn-secondary" onClick={exportFilteredClaims}>
            Export CSV
          </button>
          <button type="button" className="btn btn-secondary" onClick={exportSelectedClaim} disabled={!selectedClaim}>
            Export Selected
          </button>
        </div>
      </section>

      {error || formError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError || error}
        </div>
      ) : null}

      {contracts.length === 0 || boqRevisions.length === 0 ? (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900">Claims require contracts and BOQ revisions</h2>
          <p className="mt-2 text-sm text-gray-600">
            Create a project, contract, and BOQ revision first. Claims are built from BOQ items on the latest revision of a contract.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
          <section className="card">
            <h2 className="text-xl font-semibold text-gray-900">Create claim</h2>
            <p className="mt-2 text-sm text-gray-600">
              Start with the latest BOQ revision for a contract, enter quantities for this period, then submit the claim.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleCreateClaim}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="selectedProjectId" className="block text-sm font-medium text-gray-900">
                    Project
                  </label>
                  <select
                    id="selectedProjectId"
                    className="input mt-2"
                    value={selectedProjectId}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                    required
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.code} - {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="selectedContractId" className="block text-sm font-medium text-gray-900">
                    Contract
                  </label>
                  <select
                    id="selectedContractId"
                    className="input mt-2"
                    value={selectedContractId}
                    onChange={(event) => setSelectedContractId(event.target.value)}
                    required
                  >
                    <option value="">Select a contract</option>
                    {contractsForSelectedProject.map((contract) => (
                      <option key={contract.id} value={contract.id}>
                        {contract.code} - {contract.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[0.35fr_0.65fr]">
                <div>
                  <label htmlFor="periodNumber" className="block text-sm font-medium text-gray-900">
                    Period number
                  </label>
                  <input
                    id="periodNumber"
                    type="number"
                    min="1"
                    className="input mt-2"
                    value={periodNumber}
                    onChange={(event) => setPeriodNumber(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="remarks" className="block text-sm font-medium text-gray-900">
                    Remarks
                  </label>
                  <input
                    id="remarks"
                    className="input mt-2"
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder="Progress update or review notes"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-900">Claim lines</h3>
                  <p className="mt-1 text-xs text-gray-600">
                    Seeded from the latest BOQ revision for the selected contract. Only non-zero lines are submitted.
                  </p>
                </div>
                <div className="max-h-[28rem] overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Item</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Rate</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Prev Qty</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">This Period</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">MOS Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {draftLines.map((line) => (
                        <tr key={line.boq_item_id}>
                          <td className="px-3 py-2 align-top">
                            <div className="font-medium text-gray-900">{line.item_code}</div>
                            <div className="text-xs text-gray-500">{line.description}</div>
                          </td>
                          <td className="px-3 py-2 align-top text-gray-600">{formatCurrency(Number(line.rate))}</td>
                          <td className="px-3 py-2 align-top">
                            <input
                              className="input py-1.5"
                              value={line.previous_certified_quantity}
                              onChange={(event) =>
                                updateDraftLine(line.boq_item_id, 'previous_certified_quantity', event.target.value)
                              }
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <input
                              className="input py-1.5"
                              value={line.claimed_quantity_this_period}
                              onChange={(event) =>
                                updateDraftLine(line.boq_item_id, 'claimed_quantity_this_period', event.target.value)
                              }
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <input
                              className="input py-1.5"
                              value={line.claimed_materials_on_site_value}
                              onChange={(event) =>
                                updateDraftLine(line.boq_item_id, 'claimed_materials_on_site_value', event.target.value)
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating claim...' : 'Create claim'}
              </button>
            </form>
          </section>

          <div className="space-y-6">
            <section className="card">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Claims register</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    {filteredClaims.length} claims · {formatCurrency(totalFilteredValue)}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input py-2">
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status === 'all' ? 'All statuses' : status}
                      </option>
                    ))}
                  </select>
                  <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="input py-2">
                    <option value="all">All projects</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <select value={contractFilter} onChange={(event) => setContractFilter(event.target.value)} className="input py-2">
                    <option value="all">All contracts</option>
                    {contracts.map((contract) => (
                      <option key={contract.id} value={contract.id}>
                        {contract.title}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input py-2"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search claims"
                  />
                </div>
              </div>

              <div className="mt-4 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold text-gray-900">Project</th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-900">Contract</th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-900">Period</th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-900">Status</th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-900">Total</th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredClaims.map((claim) => {
                      const project = projects.find((item) => item.id === claim.project_id)
                      const contract = contracts.find((item) => item.id === claim.contract_id)

                      return (
                        <tr
                          key={claim.id}
                          className={`cursor-pointer transition-colors ${
                            selectedClaimId === claim.id ? 'bg-primary-50' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedClaimId(claim.id)}
                        >
                          <td className="px-3 py-3 text-gray-900">{project?.name || 'Unknown project'}</td>
                          <td className="px-3 py-3 text-gray-600">{contract?.title || 'Unknown contract'}</td>
                          <td className="px-3 py-3 text-gray-600">#{claim.period_number}</td>
                          <td className="px-3 py-3">
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                              {claim.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-gray-900">{formatCurrency(Number(claim.total_claimed_amount))}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              {claim.status === 'Draft' ? (
                                <button
                                  type="button"
                                  className="text-primary-700 hover:text-primary-900"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    void handleStatusChange(claim.id, 'Submitted')
                                  }}
                                >
                                  {statusChangeId === claim.id ? 'Saving...' : 'Submit'}
                                </button>
                              ) : null}
                              {claim.status === 'Submitted' ? (
                                <>
                                  <button
                                    type="button"
                                    className="text-blue-700 hover:text-blue-900"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      void handleStatusChange(claim.id, 'UnderReview')
                                    }}
                                  >
                                    Review
                                  </button>
                                  <button
                                    type="button"
                                    className="text-green-700 hover:text-green-900"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      void handleStatusChange(claim.id, 'Approved')
                                    }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="text-red-700 hover:text-red-900"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      void handleStatusChange(claim.id, 'Rejected')
                                    }}
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : null}
                              {claim.status === 'Approved' ? (
                                <button
                                  type="button"
                                  className="text-green-700 hover:text-green-900"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    void handleStatusChange(claim.id, 'Paid')
                                  }}
                                >
                                  Mark paid
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedClaim ? (
              <section className="card">
                <h2 className="text-xl font-semibold text-gray-900">Claim detail</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Period #{selectedClaim.period_number} · {selectedClaim.status} · {formatCurrency(Number(selectedClaim.total_claimed_amount))}
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Submitted</p>
                    <p className="mt-1 text-sm text-gray-600">{formatDate(selectedClaim.submitted_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Reviewed</p>
                    <p className="mt-1 text-sm text-gray-600">{formatDate(selectedClaim.reviewed_at)}</p>
                  </div>
                </div>
                <div className="mt-4 overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Item</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Qty</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Rate</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">MOS</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedClaim.lines.map((line) => (
                        <tr key={line.id}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{line.item_code}</div>
                            <div className="text-xs text-gray-500">{line.description}</div>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{line.claimed_quantity_this_period}</td>
                          <td className="px-3 py-2 text-gray-600">{formatCurrency(Number(line.rate))}</td>
                          <td className="px-3 py-2 text-gray-600">
                            {line.claimed_materials_on_site_value
                              ? formatCurrency(Number(line.claimed_materials_on_site_value))
                              : '-'}
                          </td>
                          <td className="px-3 py-2 text-gray-900">{formatCurrency(Number(line.line_value))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
