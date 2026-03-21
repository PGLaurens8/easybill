import { useEffect, useMemo, useState } from 'react'

import { useAppContext } from '../context/AppContext'

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

const eligibleStatuses = new Set(['Approved', 'Certified', 'Paid'])

export default function Certificates() {
  const {
    certificates,
    claims,
    contracts,
    createCertificateBatch,
    error,
    projects,
    refreshCommercialData,
    selectedOrganization,
  } = useAppContext()
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedClaimId, setSelectedClaimId] = useState('')
  const [certificateNumber, setCertificateNumber] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const eligibleClaims = useMemo(() => {
    return claims.filter((claim) => {
      const projectMatches = selectedProjectId === '' || claim.project_id === selectedProjectId
      const statusMatches = eligibleStatuses.has(claim.status)
      const certificateExists = certificates.some((certificate) => certificate.claim_batch_id === claim.id)
      return projectMatches && statusMatches && !certificateExists
    })
  }, [certificates, claims, selectedProjectId])

  const selectedClaim = eligibleClaims.find((claim) => claim.id === selectedClaimId) ?? null
  const selectedContract = contracts.find((contract) => contract.id === selectedClaim?.contract_id) ?? null
  const selectedProject = projects.find((project) => project.id === selectedClaim?.project_id) ?? null
  const recentCertificates = useMemo(() => {
    return [...certificates].sort((left, right) => right.issue_date.localeCompare(left.issue_date))
  }, [certificates])

  useEffect(() => {
    if (!selectedProjectId && projects[0]) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  useEffect(() => {
    if (eligibleClaims.length === 0) {
      setSelectedClaimId('')
      if (!certificateNumber) {
        setCertificateNumber('')
      }
      return
    }

    const stillValid = eligibleClaims.some((claim) => claim.id === selectedClaimId)
    const nextClaimId = stillValid ? selectedClaimId : eligibleClaims[0].id

    if (nextClaimId !== selectedClaimId) {
      setSelectedClaimId(nextClaimId)
    }
  }, [eligibleClaims, selectedClaimId, certificateNumber])

  useEffect(() => {
    if (!selectedClaim || certificateNumber.trim() !== '') {
      return
    }

    const nextNumber = 'CERT-' + String(selectedClaim.period_number).padStart(3, '0')
    setCertificateNumber(nextNumber)
  }, [certificateNumber, selectedClaim])

  function handleProjectChange(nextProjectId: string) {
    setSelectedProjectId(nextProjectId)
    setFormError(null)
    setSuccessMessage(null)
  }

  function handleClaimChange(nextClaimId: string) {
    setSelectedClaimId(nextClaimId)
    setFormError(null)
    setSuccessMessage(null)
  }

  function handleCertificateNumberChange(nextValue: string) {
    setCertificateNumber(nextValue)
    setFormError(null)
    setSuccessMessage(null)
  }

  function handleIssueDateChange(nextValue: string) {
    setIssueDate(nextValue)
    setFormError(null)
    setSuccessMessage(null)
  }

  async function handleCreateCertificate(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    if (!selectedClaim) {
      setFormError('Select an eligible claim before issuing a certificate.')
      return
    }

    setIsSubmitting(true)

    try {
      const trimmedCertificateNumber = certificateNumber.trim()

      await createCertificateBatch({
        project_id: selectedClaim.project_id,
        contract_id: selectedClaim.contract_id,
        claim_batch_id: selectedClaim.id,
        certificate_number: trimmedCertificateNumber,
        issue_date: issueDate,
      })
      await refreshCommercialData()
      setSuccessMessage(
        'Issued ' + trimmedCertificateNumber + ' for ' + (selectedProject?.name || 'the selected project') + '.',
      )
      setSelectedClaimId('')
      setCertificateNumber('')
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : 'Unable to create certificate.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasProjects = projects.length > 0
  const hasClaims = claims.length > 0

  return (
    <div className="max-w-7xl">
      <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Payment Certificates</h1>
          <p className="mt-2 text-sm font-medium text-stone-600">
            {selectedOrganization
              ? 'Issue and review certificates for ' + selectedOrganization.name
              : 'Select an organization to issue certificates'}
          </p>
        </div>
        <div className="rounded-full bg-[#dfe8db] px-4 py-2 text-sm font-semibold text-stone-700">
          {recentCertificates.length} issued
        </div>
      </header>

      {!hasProjects ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <p className="font-semibold">No project available yet</p>
          <p className="mt-1">
            Create a project, add a contract, create a claim, approve it, and then return here to issue the first certificate.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.5fr]">
        <section className="rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-stone-200/70">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Issue Certificate</h2>
              <p className="mt-1 text-sm text-stone-600">
                Certificates can only be created from approved commercial claims.
              </p>
            </div>
            <div className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
              {eligibleClaims.length} eligible
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleCreateCertificate}>
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="certificate-project">
                Project
              </label>
              <select
                id="certificate-project"
                value={selectedProjectId}
                onChange={(event) => handleProjectChange(event.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm focus:border-stone-500 focus:outline-none"
                disabled={!hasProjects}
              >
                {!hasProjects ? <option value="">No project available</option> : null}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code + ' · ' + project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="certificate-claim">
                Eligible claim
              </label>
              <select
                id="certificate-claim"
                value={selectedClaimId}
                onChange={(event) => handleClaimChange(event.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm focus:border-stone-500 focus:outline-none"
                disabled={eligibleClaims.length === 0}
              >
                {eligibleClaims.length === 0 ? <option value="">No approved claims available</option> : null}
                {eligibleClaims.map((claim) => {
                  const project = projects.find((projectItem) => projectItem.id === claim.project_id)
                  const contract = contracts.find((contractItem) => contractItem.id === claim.contract_id)

                  return (
                    <option key={claim.id} value={claim.id}>
                      {(project?.code || 'Project') + ' · ' + (contract?.title || 'Contract') + ' · Period ' + claim.period_number}
                    </option>
                  )
                })}
              </select>
              <p className="mt-2 text-xs text-stone-500">
                Claims appear here after they are approved and before a certificate has been issued for them.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="certificate-number">
                  Certificate number
                </label>
                <input
                  id="certificate-number"
                  value={certificateNumber}
                  onChange={(event) => handleCertificateNumberChange(event.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm focus:border-stone-500 focus:outline-none"
                  placeholder="CERT-001"
                  required
                />
                <p className="mt-2 text-xs text-stone-500">
                  Suggested format: CERT-001, CERT-002, and so on.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="issue-date">
                  Issue date
                </label>
                <input
                  id="issue-date"
                  type="date"
                  value={issueDate}
                  onChange={(event) => handleIssueDateChange(event.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm focus:border-stone-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {selectedClaim ? (
              <div className="rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Selected claim</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-stone-500">Project</p>
                    <p className="text-sm font-semibold text-stone-900">{selectedProject?.name || 'Unknown project'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Contract</p>
                    <p className="text-sm font-semibold text-stone-900">{selectedContract?.title || 'Unknown contract'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Claim status</p>
                    <p className="text-sm font-semibold text-stone-900">{selectedClaim.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Claim total</p>
                    <p className="text-sm font-semibold text-stone-900">
                      {formatCurrency(Number(selectedClaim.total_claimed_amount), selectedContract?.currency_code || 'ZAR')}
                    </p>
                  </div>
                </div>
              </div>
            ) : hasClaims ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-600">
                Approve a claim first, then it will appear in the eligible claim list above.
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {successMessage}
              </div>
            ) : null}

            {formError || error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {formError || error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !selectedClaim}
              className="inline-flex items-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isSubmitting ? 'Issuing...' : 'Issue certificate'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl bg-white/70 p-6 shadow-sm ring-1 ring-stone-200/70">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Issued Certificates</h2>
              <p className="mt-1 text-sm text-stone-600">
                Review issued values and payment due totals for each certificate.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {recentCertificates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
                No certificates yet. Approve a claim first, then issue the first certificate here.
              </div>
            ) : (
              recentCertificates.map((certificate) => {
                const project = projects.find((item) => item.id === certificate.project_id)
                const contract = contracts.find((item) => item.id === certificate.contract_id)
                const currencyCode = contract?.currency_code || 'ZAR'

                return (
                  <article
                    key={certificate.id}
                    className="rounded-2xl border border-stone-200 bg-stone-50/80 p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-base font-semibold text-stone-900">{certificate.certificate_number}</h3>
                          <span className="rounded-full bg-[#dfe8db] px-3 py-1 text-xs font-semibold text-stone-700">
                            {certificate.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-stone-600">
                          {(project?.name || 'Unknown project') + ' · ' + (contract?.title || 'Unknown contract')}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">Issued {formatDate(certificate.issue_date)}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Amount due incl tax</p>
                        <p className="mt-2 text-lg font-bold text-stone-900">
                          {formatCurrency(Number(certificate.amount_due_this_certificate_incl_tax), currencyCode)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-stone-200">
                        <p className="text-xs text-stone-500">Gross value to date</p>
                        <p className="mt-1 text-sm font-semibold text-stone-900">
                          {formatCurrency(Number(certificate.gross_value_to_date), currencyCode)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-stone-200">
                        <p className="text-xs text-stone-500">Retention held</p>
                        <p className="mt-1 text-sm font-semibold text-stone-900">
                          {formatCurrency(Number(certificate.retention_held_to_date), currencyCode)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-stone-200">
                        <p className="text-xs text-stone-500">Net certified excl tax</p>
                        <p className="mt-1 text-sm font-semibold text-stone-900">
                          {formatCurrency(Number(certificate.net_certified_to_date_excl_tax), currencyCode)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-stone-200">
                        <p className="text-xs text-stone-500">Tax this certificate</p>
                        <p className="mt-1 text-sm font-semibold text-stone-900">
                          {formatCurrency(Number(certificate.tax_this_certificate), currencyCode)}
                        </p>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
