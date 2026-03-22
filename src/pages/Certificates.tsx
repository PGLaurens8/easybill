import { useEffect, useMemo, useState } from 'react'

import { useAppContext } from '../context/AppContext'
import { formatApiError } from '../lib/api'
import type { CertificateBatch, CertificateLine, ClaimBatch, Contract, Project } from '../types/api'

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

function escapeHtml(value: string) {
  return value
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#39;')
}

function getCertificateLineDetails(line: CertificateLine, claim: ClaimBatch | null) {
  const claimLine = claim?.lines.find((item) => item.boq_item_id === line.boq_item_id)

  return {
    itemCode: claimLine?.item_code || line.boq_item_id,
    description: claimLine?.description || 'Linked BOQ item',
    unit: claimLine?.unit || '',
  }
}

function buildCertificateDocumentHtml(
  certificate: CertificateBatch,
  project: Project | null,
  contract: Contract | null,
  claim: ClaimBatch | null,
) {
  const currencyCode = contract?.currency_code || 'ZAR'
  const lineRows = certificate.lines
    .map((line) => {
      const mosValue = Number(line.materials_on_site_value_to_date || '0')
      const details = getCertificateLineDetails(line, claim)
      return `
        <tr>
          <td>${escapeHtml(details.itemCode)}</td>
          <td>${escapeHtml(details.description)}</td>
          <td>${escapeHtml(details.unit)}</td>
          <td class="number">${line.previous_certified_quantity}</td>
          <td class="number">${line.certified_quantity_this_period}</td>
          <td class="number">${formatCurrency(Number(line.work_value_to_date), currencyCode)}</td>
          <td class="number">${formatCurrency(mosValue, currencyCode)}</td>
        </tr>
      `
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(certificate.certificate_number)}</title>
    <style>
      body {
        font-family: Georgia, "Times New Roman", serif;
        color: #1c1917;
        margin: 32px;
      }
      h1, h2, h3, p {
        margin: 0;
      }
      .header {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        border-bottom: 2px solid #d6d3d1;
        padding-bottom: 16px;
      }
      .meta {
        margin-top: 24px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px 24px;
      }
      .label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #57534e;
      }
      .value {
        margin-top: 4px;
        font-size: 15px;
        font-weight: 600;
      }
      .summary {
        margin-top: 24px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .summary-card {
        border: 1px solid #d6d3d1;
        border-radius: 12px;
        padding: 12px 14px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 24px;
        font-size: 13px;
      }
      th, td {
        border-bottom: 1px solid #e7e5e4;
        padding: 10px 8px;
        vertical-align: top;
        text-align: left;
      }
      th {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #57534e;
      }
      .number {
        text-align: right;
        white-space: nowrap;
      }
      .totals {
        margin-top: 24px;
        margin-left: auto;
        width: min(360px, 100%);
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #e7e5e4;
      }
      .total-row strong {
        font-size: 16px;
      }
      .note {
        margin-top: 20px;
        font-size: 12px;
        color: #57534e;
      }
    </style>
  </head>
  <body>
    <section class="header">
      <div>
        <p class="label">Payment Certificate</p>
        <h1>${escapeHtml(certificate.certificate_number)}</h1>
        <p style="margin-top: 8px; color: #57534e;">${escapeHtml(project?.name || 'Unknown project')} · ${escapeHtml(contract?.title || 'Unknown contract')}</p>
      </div>
      <div>
        <p class="label">Status</p>
        <p class="value">${escapeHtml(certificate.status)}</p>
        <p class="label" style="margin-top: 12px;">Issue Date</p>
        <p class="value">${escapeHtml(formatDate(certificate.issue_date))}</p>
      </div>
    </section>

    <section class="meta">
      <div>
        <p class="label">Project Code</p>
        <p class="value">${escapeHtml(project?.code || 'Not set')}</p>
      </div>
      <div>
        <p class="label">Contract Code</p>
        <p class="value">${escapeHtml(contract?.code || 'Not set')}</p>
      </div>
      <div>
        <p class="label">Claim Period</p>
        <p class="value">${claim ? `Period ${claim.period_number}` : 'Not linked'}</p>
      </div>
      <div>
        <p class="label">Currency</p>
        <p class="value">${escapeHtml(currencyCode)}</p>
      </div>
    </section>

    <section class="summary">
      <div class="summary-card">
        <p class="label">Gross Value To Date</p>
        <p class="value">${formatCurrency(Number(certificate.gross_value_to_date), currencyCode)}</p>
      </div>
      <div class="summary-card">
        <p class="label">Retention Held To Date</p>
        <p class="value">${formatCurrency(Number(certificate.retention_held_to_date), currencyCode)}</p>
      </div>
      <div class="summary-card">
        <p class="label">Amount Due Incl Tax</p>
        <p class="value">${formatCurrency(Number(certificate.amount_due_this_certificate_incl_tax), currencyCode)}</p>
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Description</th>
          <th>Unit</th>
          <th class="number">Prev Qty</th>
          <th class="number">Certified This Cert</th>
          <th class="number">Work Value To Date</th>
          <th class="number">MOS To Date</th>
        </tr>
      </thead>
      <tbody>
        ${lineRows || '<tr><td colspan="7">No certificate lines available.</td></tr>'}
      </tbody>
    </table>

    <section class="totals">
      <div class="total-row"><span>Previous net certified excl tax</span><span>${formatCurrency(Number(certificate.previous_net_certified_excl_tax), currencyCode)}</span></div>
      <div class="total-row"><span>Net certified to date excl tax</span><span>${formatCurrency(Number(certificate.net_certified_to_date_excl_tax), currencyCode)}</span></div>
      <div class="total-row"><span>Amount due this certificate excl tax</span><span>${formatCurrency(Number(certificate.amount_due_this_certificate_excl_tax), currencyCode)}</span></div>
      <div class="total-row"><span>Tax this certificate</span><span>${formatCurrency(Number(certificate.tax_this_certificate), currencyCode)}</span></div>
      <div class="total-row"><strong>Amount due this certificate incl tax</strong><strong>${formatCurrency(Number(certificate.amount_due_this_certificate_incl_tax), currencyCode)}</strong></div>
    </section>

    <p class="note">Generated from QuantEasy for commercial review and payment recommendation.</p>
  </body>
</html>`
}

function printCertificateDocument(html: string) {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer')

  if (!printWindow) {
    throw new Error('Unable to open the print preview. Check whether the browser blocked the popup window.')
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
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
  const [selectedCertificateId, setSelectedCertificateId] = useState('')
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
  const selectedCertificate = recentCertificates.find((certificate) => certificate.id === selectedCertificateId) ?? recentCertificates[0] ?? null
  const selectedCertificateContract = contracts.find((contract) => contract.id === selectedCertificate?.contract_id) ?? null
  const selectedCertificateProject = projects.find((project) => project.id === selectedCertificate?.project_id) ?? null
  const selectedCertificateClaim = claims.find((claim) => claim.id === selectedCertificate?.claim_batch_id) ?? null
  const selectedCertificateDocument = selectedCertificate
    ? buildCertificateDocumentHtml(
        selectedCertificate,
        selectedCertificateProject,
        selectedCertificateContract,
        selectedCertificateClaim,
      )
    : null

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

  useEffect(() => {
    if (!selectedCertificate) {
      if (selectedCertificateId !== '') {
        setSelectedCertificateId('')
      }
      return
    }

    if (!selectedCertificateId || !recentCertificates.some((certificate) => certificate.id === selectedCertificateId)) {
      setSelectedCertificateId(selectedCertificate.id)
    }
  }, [recentCertificates, selectedCertificate, selectedCertificateId])

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

      const createdCertificate = await createCertificateBatch({
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
      setSelectedCertificateId(createdCertificate.id)
      setSelectedClaimId('')
      setCertificateNumber('')
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to create certificate.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleDownloadCertificateDocument() {
    if (!selectedCertificate || !selectedCertificateDocument) {
      return
    }

    downloadTextFile(`${selectedCertificate.certificate_number}.html`, selectedCertificateDocument, 'text/html')
  }

  function handlePrintCertificateDocument() {
    if (!selectedCertificateDocument) {
      return
    }

    try {
      printCertificateDocument(selectedCertificateDocument)
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to open the certificate print preview.'))
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
              ? 'Issue, review, and export certificates for ' + selectedOrganization.name
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

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.45fr]">
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

        <section className="space-y-6">
          <div className="rounded-2xl bg-white/70 p-6 shadow-sm ring-1 ring-stone-200/70">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">Certificate Document</h2>
                <p className="mt-1 text-sm text-stone-600">
                  Review the issued certificate schedule, then download or print the same output for payment sign-off.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDownloadCertificateDocument}
                  disabled={!selectedCertificateDocument}
                >
                  Download HTML
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePrintCertificateDocument}
                  disabled={!selectedCertificateDocument}
                >
                  Print certificate
                </button>
              </div>
            </div>

            {!selectedCertificate ? (
              <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
                Issue the first certificate to generate a document preview here.
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Selected certificate</p>
                    <h3 className="mt-2 text-2xl font-semibold text-stone-900">{selectedCertificate.certificate_number}</h3>
                    <p className="mt-2 text-sm text-stone-600">
                      {(selectedCertificateProject?.name || 'Unknown project') + ' · ' + (selectedCertificateContract?.title || 'Unknown contract')}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-stone-500">Issue date</p>
                      <p className="mt-1 text-sm font-semibold text-stone-900">{formatDate(selectedCertificate.issue_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">Claim period</p>
                      <p className="mt-1 text-sm font-semibold text-stone-900">
                        {selectedCertificateClaim ? `Period ${selectedCertificateClaim.period_number}` : 'Not linked'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-stone-50 px-4 py-3 ring-1 ring-stone-200">
                    <p className="text-xs text-stone-500">Gross value to date</p>
                    <p className="mt-1 text-sm font-semibold text-stone-900">
                      {formatCurrency(Number(selectedCertificate.gross_value_to_date), selectedCertificateContract?.currency_code || 'ZAR')}
                    </p>
                  </div>
                  <div className="rounded-xl bg-stone-50 px-4 py-3 ring-1 ring-stone-200">
                    <p className="text-xs text-stone-500">Retention held</p>
                    <p className="mt-1 text-sm font-semibold text-stone-900">
                      {formatCurrency(Number(selectedCertificate.retention_held_to_date), selectedCertificateContract?.currency_code || 'ZAR')}
                    </p>
                  </div>
                  <div className="rounded-xl bg-stone-50 px-4 py-3 ring-1 ring-stone-200">
                    <p className="text-xs text-stone-500">Net certified excl tax</p>
                    <p className="mt-1 text-sm font-semibold text-stone-900">
                      {formatCurrency(Number(selectedCertificate.net_certified_to_date_excl_tax), selectedCertificateContract?.currency_code || 'ZAR')}
                    </p>
                  </div>
                  <div className="rounded-xl bg-stone-50 px-4 py-3 ring-1 ring-stone-200">
                    <p className="text-xs text-stone-500">Amount due incl tax</p>
                    <p className="mt-1 text-sm font-semibold text-stone-900">
                      {formatCurrency(Number(selectedCertificate.amount_due_this_certificate_incl_tax), selectedCertificateContract?.currency_code || 'ZAR')}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-stone-200">
                  <table className="min-w-full divide-y divide-stone-200 text-sm">
                    <thead className="bg-stone-50 text-left text-stone-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Item</th>
                        <th className="px-4 py-3 font-medium">Description</th>
                        <th className="px-4 py-3 font-medium">Unit</th>
                        <th className="px-4 py-3 font-medium">Prev Qty</th>
                        <th className="px-4 py-3 font-medium">Certified This Cert</th>
                        <th className="px-4 py-3 font-medium">Work Value To Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white">
                      {selectedCertificate.lines.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-stone-500">
                            No certificate lines available.
                          </td>
                        </tr>
                      ) : (
                        selectedCertificate.lines.map((line) => {
                          const details = getCertificateLineDetails(line, selectedCertificateClaim)

                          return (
                            <tr key={line.id}>
                              <td className="px-4 py-3 font-medium text-stone-900">{details.itemCode}</td>
                              <td className="px-4 py-3 text-stone-700">{details.description}</td>
                              <td className="px-4 py-3 text-stone-700">{details.unit}</td>
                              <td className="px-4 py-3 text-stone-700">{line.previous_certified_quantity}</td>
                              <td className="px-4 py-3 text-stone-700">{line.certified_quantity_this_period}</td>
                              <td className="px-4 py-3 text-stone-900">
                                {formatCurrency(Number(line.work_value_to_date), selectedCertificateContract?.currency_code || 'ZAR')}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/70 p-6 shadow-sm ring-1 ring-stone-200/70">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">Issued Certificates</h2>
                <p className="mt-1 text-sm text-stone-600">
                  Review issued values and switch the live document preview between certificates.
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
                  const isSelected = certificate.id === selectedCertificate?.id

                  return (
                    <article
                      key={certificate.id}
                      className={
                        'rounded-2xl border p-5 transition ' +
                        (isSelected
                          ? 'border-stone-900 bg-white shadow-sm'
                          : 'border-stone-200 bg-stone-50/80')
                      }
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
                        <div className="flex flex-col items-start gap-3 md:items-end">
                          <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Amount due incl tax</p>
                            <p className="mt-2 text-lg font-bold text-stone-900">
                              {formatCurrency(Number(certificate.amount_due_this_certificate_incl_tax), currencyCode)}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setSelectedCertificateId(certificate.id)}
                          >
                            {isSelected ? 'Viewing document' : 'View document'}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
