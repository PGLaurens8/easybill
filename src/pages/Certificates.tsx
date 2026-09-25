import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Alert, EmptyState, PageHeader, StatusBadge } from '../components/ui'
import { useAppContext } from '../context/AppContext'
import { formatApiError } from '../lib/api'
import { contractLabel, liveCertificates } from '../lib/commercial'
import { can } from '../lib/permissions'
import type {
  CertificateBatch,
  CertificateLineAdjustment,
  CertificateTotals,
  CertificateValuation,
} from '../types/api'
import { buildCertificateDocumentHtml } from '../lib/certificateDocument'
import { downloadTextFile, printHtmlDocument } from '../utils/download'
import { formatCurrency, formatDate, formatQuantity, todayIsoDate, toNumber } from '../utils/format'

const eligibleStatuses = new Set(['Approved', 'Certified', 'Paid'])

/** undefined = use what was claimed; '' = certify zero. */
type LineOverride = { quantity?: string; mos?: string }

function ValuationSummary({ totals, contractValue, currency }: { totals: CertificateTotals; contractValue?: string; currency: string }) {
  const money = (value: string) => formatCurrency(value, currency)
  const rows: Array<[string, string, boolean?]> = [
    ['Gross value to date', money(totals.gross_value_to_date)],
    ['Less retention', `(${money(totals.retention_held_to_date)})`],
    ['Net value to date', money(totals.net_certified_to_date_excl_tax)],
    ['Less previously certified', `(${money(totals.previous_net_certified_excl_tax)})`],
    ['Amount due excl VAT', money(totals.amount_due_this_certificate_excl_tax)],
    ['VAT', money(totals.tax_this_certificate)],
  ]
  return (
    <div className="rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
      {contractValue ? (
        <p className="mb-2 text-xs text-stone-500">
          Contract value {money(contractValue)} ·{' '}
          {toNumber(contractValue) > 0
            ? `${Math.round((toNumber(totals.gross_value_to_date) / toNumber(contractValue)) * 1000) / 10}% complete`
            : ''}
        </p>
      ) : null}
      <dl className="space-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-stone-600">{label}</dt>
            <dd className="tabular-nums text-stone-900">{value}</dd>
          </div>
        ))}
        <div className="mt-2 flex justify-between gap-4 border-t border-stone-300 pt-2">
          <dt className="font-semibold text-stone-900">Amount due incl VAT</dt>
          <dd className="text-lg font-bold tabular-nums text-stone-900" data-testid="amount-due">
            {money(totals.amount_due_this_certificate_incl_tax)}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export default function Certificates() {
  const {
    certificates,
    claims,
    contracts,
    createCertificateBatch,
    currentRole,
    error,
    previewCertificate,
    projects,
    refreshCommercialData,
    selectedOrganization,
    updateCertificateStatus,
  } = useAppContext()
  const permissions = can(currentRole)
  const canCertify = permissions.certify || currentRole === null
  const [searchParams] = useSearchParams()

  const [selectedClaimId, setSelectedClaimId] = useState(searchParams.get('claim') ?? '')
  const [overrides, setOverrides] = useState<Record<string, LineOverride>>({})
  const [certificateNumber, setCertificateNumber] = useState('')
  const [issueDate, setIssueDate] = useState(todayIsoDate())
  const [preview, setPreview] = useState<CertificateValuation | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [selectedCertificateId, setSelectedCertificateId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [busyCertificateId, setBusyCertificateId] = useState<string | null>(null)
  const [confirmVoidId, setConfirmVoidId] = useState<string | null>(null)

  const eligibleClaims = useMemo(
    () =>
      claims.filter(
        (claim) =>
          eligibleStatuses.has(claim.status) &&
          !certificates.some((certificate) => certificate.claim_batch_id === claim.id && certificate.status !== 'Voided'),
      ),
    [certificates, claims],
  )
  const selectedClaim = eligibleClaims.find((claim) => claim.id === selectedClaimId) ?? null
  const selectedContract = contracts.find((contract) => contract.id === selectedClaim?.contract_id) ?? null
  const currency = selectedContract?.currency_code ?? 'ZAR'

  const sortedCertificates = useMemo(
    () => [...certificates].sort((left, right) => right.created_at.localeCompare(left.created_at)),
    [certificates],
  )
  const selectedCertificate =
    sortedCertificates.find((certificate) => certificate.id === selectedCertificateId) ?? sortedCertificates[0] ?? null

  useEffect(() => {
    if (!selectedClaimId && eligibleClaims.length > 0 && canCertify) {
      setSelectedClaimId(eligibleClaims[0].id)
    }
  }, [canCertify, eligibleClaims, selectedClaimId])

  useEffect(() => {
    setOverrides({})
    setCertificateNumber('')
  }, [selectedClaimId])

  const adjustments = useMemo<CertificateLineAdjustment[]>(() => {
    if (!selectedClaim) {
      return []
    }
    return selectedClaim.lines.flatMap((line) => {
      const override = overrides[line.boq_item_id]
      if (!override) {
        return []
      }
      const quantityChanged =
        override.quantity !== undefined && toNumber(override.quantity) !== toNumber(line.claimed_quantity_this_period)
      const mosChanged =
        override.mos !== undefined && toNumber(override.mos) !== toNumber(line.claimed_materials_on_site_value)
      if (!quantityChanged && !mosChanged) {
        return []
      }
      return [
        {
          boq_item_id: line.boq_item_id,
          certified_quantity_this_period: String(toNumber(override.quantity ?? line.claimed_quantity_this_period)),
          certified_materials_on_site_value: mosChanged ? String(toNumber(override.mos)) : undefined,
        },
      ]
    })
  }, [overrides, selectedClaim])

  const adjustmentKey = JSON.stringify(adjustments)

  // Ask the API for the valuation whenever the claim or adjustments change (debounced).
  useEffect(() => {
    if (!selectedClaim || !canCertify) {
      setPreview(null)
      return
    }
    let active = true
    setIsPreviewing(true)
    const timer = window.setTimeout(() => {
      previewCertificate({ claim_batch_id: selectedClaim.id, adjustments })
        .then((result) => {
          if (active) {
            setPreview(result)
            setPreviewError(null)
          }
        })
        .catch((caughtError) => {
          if (active) {
            setPreview(null)
            setPreviewError(formatApiError(caughtError, 'Could not value this certificate.'))
          }
        })
        .finally(() => {
          if (active) {
            setIsPreviewing(false)
          }
        })
    }, 350)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- adjustmentKey captures adjustments by value
  }, [selectedClaim?.id, adjustmentKey, canCertify])

  function setOverride(boqItemId: string, patch: Partial<LineOverride>) {
    setOverrides((current) => ({
      ...current,
      [boqItemId]: { ...current[boqItemId], ...patch },
    }))
  }

  function contractFor(item: { contract_id: string }) {
    return contracts.find((contract) => contract.id === item.contract_id) ?? null
  }

  function documentFor(certificate: CertificateBatch) {
    return buildCertificateDocumentHtml(
      certificate,
      projects.find((project) => project.id === certificate.project_id) ?? null,
      contractFor(certificate),
      claims.find((claim) => claim.id === certificate.claim_batch_id) ?? null,
      selectedOrganization,
    )
  }

  async function handleIssue(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    setNotice(null)
    if (!selectedClaim) {
      setFormError('Choose an approved claim to certify.')
      return
    }

    setIsSubmitting(true)
    try {
      const certificate = await createCertificateBatch({
        project_id: selectedClaim.project_id,
        contract_id: selectedClaim.contract_id,
        claim_batch_id: selectedClaim.id,
        certificate_number: certificateNumber.trim() || undefined,
        issue_date: issueDate,
        adjustments,
      })
      setNotice(
        `Issued ${certificate.certificate_number}: ${formatCurrency(certificate.amount_due_this_certificate_incl_tax, currency)} due incl VAT.`,
      )
      setSelectedCertificateId(certificate.id)
      setSelectedClaimId('')
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to issue the certificate.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function changeStatus(certificate: CertificateBatch, status: 'Paid' | 'Voided') {
    setFormError(null)
    setNotice(null)
    setBusyCertificateId(certificate.id)
    try {
      await updateCertificateStatus(certificate.id, status)
      setNotice(
        status === 'Paid'
          ? `${certificate.certificate_number} marked as paid.`
          : `${certificate.certificate_number} voided. The claim is back to Approved so it can be certified again.`,
      )
      setConfirmVoidId(null)
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to update the certificate.'))
    } finally {
      setBusyCertificateId(null)
    }
  }

  function handlePrint(certificate: CertificateBatch) {
    try {
      printHtmlDocument(documentFor(certificate))
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to print the certificate.'))
    }
  }

  function isLatestLive(certificate: CertificateBatch) {
    const live = liveCertificates(certificates, certificate.contract_id)
    return live[live.length - 1]?.id === certificate.id
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Monthly"
        title="Payment certificates"
        description={
          permissions.isSubcontractor
            ? 'Certificates issued to you, with the amount due and retention held.'
            : 'Certify approved claims. Adjust any quantity you disagree with and check the payment figure before you issue.'
        }
        actions={
          <button type="button" className="btn btn-secondary" onClick={() => void refreshCommercialData()}>
            Refresh
          </button>
        }
      />

      {error || formError ? <Alert>{formError || error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="grid gap-6 [&>*]:min-w-0 2xl:grid-cols-[1.15fr_0.85fr]">
        {canCertify ? (
          <section className="card">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-stone-900">Certify a claim</h2>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                {eligibleClaims.length} ready
              </span>
            </div>

            {eligibleClaims.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="Nothing to certify">
                  Approved claims appear here. Approve a claim on the Claims page first.
                </EmptyState>
              </div>
            ) : (
              <form className="mt-4 space-y-4" onSubmit={handleIssue}>
                <div>
                  <label className="label" htmlFor="certificate-claim">
                    Approved claim
                  </label>
                  <select
                    id="certificate-claim"
                    value={selectedClaimId}
                    onChange={(event) => setSelectedClaimId(event.target.value)}
                    className="input mt-1"
                  >
                    <option value="">Select a claim</option>
                    {eligibleClaims.map((claim) => {
                      const contract = contractFor(claim)
                      return (
                        <option key={claim.id} value={claim.id}>
                          {`${contract?.code ?? 'Contract'} · ${contractLabel(contract ?? undefined)} · Period ${
                            claim.period_number
                          } · ${formatCurrency(claim.total_claimed_amount, contract?.currency_code)}`}
                        </option>
                      )
                    })}
                  </select>
                </div>

                {selectedClaim ? (
                  <>
                    {selectedClaim.remarks ? (
                      <p className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">
                        <span className="font-semibold">Subcontractor note:</span> {selectedClaim.remarks}
                      </p>
                    ) : null}

                    <div className="overflow-x-auto rounded-xl border border-stone-200">
                      <table className="min-w-full divide-y divide-stone-200 text-sm">
                        <thead className="table-head">
                          <tr>
                            <th className="px-3 py-2">Item</th>
                            <th className="px-2 py-2 text-right">Certified before</th>
                            <th className="px-2 py-2 text-right">Claimed</th>
                            <th className="px-2 py-2 text-right">Certify</th>
                            <th className="px-2 py-2 text-right">MOS (R)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 bg-[#fdfcf7]">
                          {selectedClaim.lines.map((line) => {
                            const override = overrides[line.boq_item_id]
                            const changed = adjustments.some((item) => item.boq_item_id === line.boq_item_id)
                            return (
                              <tr key={line.id} className={changed ? 'bg-amber-50' : undefined}>
                                <td className="px-3 py-2">
                                  <div className="font-medium text-stone-900">{line.item_code}</div>
                                  <div className="max-w-xs text-xs text-stone-500">{line.description}</div>
                                </td>
                                <td className="num px-2 py-2 text-stone-600">
                                  {formatQuantity(line.previous_certified_quantity)} / {formatQuantity(line.contract_quantity)}
                                </td>
                                <td className="num px-2 py-2 text-stone-700">
                                  {formatQuantity(line.claimed_quantity_this_period)} {line.unit}
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    aria-label={`Certified quantity for ${line.item_code}`}
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="input ml-auto w-24 px-2 py-1 text-right"
                                    value={override?.quantity ?? String(toNumber(line.claimed_quantity_this_period))}
                                    onChange={(event) => setOverride(line.boq_item_id, { quantity: event.target.value })}
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    aria-label={`Certified materials on site for ${line.item_code}`}
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="input ml-auto w-28 px-2 py-1 text-right"
                                    value={
                                      override?.mos ??
                                      (line.claimed_materials_on_site_value
                                        ? String(toNumber(line.claimed_materials_on_site_value))
                                        : '')
                                    }
                                    onChange={(event) => setOverride(line.boq_item_id, { mos: event.target.value })}
                                    placeholder="0"
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {adjustments.length > 0 ? (
                      <p className="text-xs text-amber-800">
                        {adjustments.length} line{adjustments.length === 1 ? '' : 's'} certified differently from the
                        claim.{' '}
                        <button type="button" className="underline" onClick={() => setOverrides({})}>
                          Reset to claimed
                        </button>
                      </p>
                    ) : null}

                    {previewError ? <Alert>{previewError}</Alert> : null}
                    {preview ? (
                      <div className={isPreviewing ? 'opacity-60 transition-opacity' : undefined}>
                        <ValuationSummary totals={preview} contractValue={preview.contract_value} currency={currency} />
                      </div>
                    ) : isPreviewing ? (
                      <p className="text-sm text-stone-500">Calculating…</p>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor="certificate-number">
                          Certificate number
                        </label>
                        <input
                          id="certificate-number"
                          value={certificateNumber}
                          onChange={(event) => setCertificateNumber(event.target.value)}
                          className="input mt-1"
                          placeholder="Automatic (CERT-001, CERT-002…)"
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor="issue-date">
                          Issue date
                        </label>
                        <input
                          id="issue-date"
                          type="date"
                          value={issueDate}
                          onChange={(event) => setIssueDate(event.target.value)}
                          className="input mt-1"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || Boolean(previewError)}
                      className="btn btn-primary w-full"
                    >
                      {isSubmitting
                        ? 'Issuing...'
                        : preview
                          ? `Issue certificate · ${formatCurrency(preview.amount_due_this_certificate_incl_tax, currency)}`
                          : 'Issue certificate'}
                    </button>
                  </>
                ) : null}
              </form>
            )}
          </section>
        ) : null}

        <div className="space-y-6">
          <section className="card">
            <h2 className="text-lg font-semibold text-stone-900">Issued certificates</h2>
            <div className="mt-4 space-y-3">
              {sortedCertificates.length === 0 ? (
                <p className="text-sm text-stone-500">No certificates issued yet.</p>
              ) : (
                sortedCertificates.map((certificate) => {
                  const contract = contractFor(certificate)
                  const isSelected = certificate.id === selectedCertificate?.id
                  const busy = busyCertificateId === certificate.id
                  return (
                    <article
                      key={certificate.id}
                      className={`rounded-xl border p-4 ${
                        isSelected ? 'border-stone-800 bg-[#fdfcf7]' : 'border-stone-200 bg-stone-50/60'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-stone-900">{certificate.certificate_number}</h3>
                            <StatusBadge status={certificate.status} label={certificate.status} />
                          </div>
                          <p className="text-sm text-stone-600">
                            {contract?.code} · {contractLabel(contract ?? undefined)}
                          </p>
                          <p className="text-xs text-stone-500">Issued {formatDate(certificate.issue_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-stone-500">Due incl VAT</p>
                          <p className="text-lg font-bold tabular-nums text-stone-900">
                            {formatCurrency(certificate.amount_due_this_certificate_incl_tax, contract?.currency_code)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedCertificateId(certificate.id)}
                        >
                          {isSelected ? 'Viewing' : 'View'}
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => handlePrint(certificate)}>
                          Print / PDF
                        </button>
                        {certificate.status === 'Issued' && permissions.markPaid ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={busy}
                            onClick={() => void changeStatus(certificate, 'Paid')}
                          >
                            Mark paid
                          </button>
                        ) : null}
                        {certificate.status === 'Issued' && permissions.certify && isLatestLive(certificate) ? (
                          confirmVoidId === certificate.id ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                disabled={busy}
                                onClick={() => void changeStatus(certificate, 'Voided')}
                              >
                                Confirm void
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setConfirmVoidId(null)}
                              >
                                Keep
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => setConfirmVoidId(certificate.id)}
                            >
                              Void
                            </button>
                          )
                        ) : null}
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </section>

          {selectedCertificate ? (
            <section className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-primary-700">Certificate</p>
                  <h2 className="text-lg font-semibold text-stone-900">{selectedCertificate.certificate_number}</h2>
                  <p className="text-sm text-stone-600">
                    {contractLabel(contractFor(selectedCertificate) ?? undefined)}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() =>
                    downloadTextFile(
                      `${selectedCertificate.certificate_number}.html`,
                      documentFor(selectedCertificate),
                      'text/html',
                    )
                  }
                >
                  Download
                </button>
              </div>
              <div className="mt-4">
                <ValuationSummary
                  totals={selectedCertificate}
                  currency={contractFor(selectedCertificate)?.currency_code ?? 'ZAR'}
                />
              </div>
              <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200">
                <table className="min-w-full divide-y divide-stone-200 text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-right">This cert</th>
                      <th className="px-3 py-2 text-right">To date</th>
                      <th className="px-3 py-2 text-right">Value to date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-[#fdfcf7]">
                    {selectedCertificate.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-3 py-2">
                          <div className="font-medium text-stone-900">{line.item_code}</div>
                          <div className="text-xs text-stone-500">{line.description}</div>
                        </td>
                        <td className="num px-3 py-2 text-stone-700">
                          {formatQuantity(line.certified_quantity_this_period)} {line.unit}
                          {toNumber(line.certified_quantity_this_period) !== toNumber(line.claimed_quantity_this_period) ? (
                            <div className="text-xs text-amber-700">
                              claimed {formatQuantity(line.claimed_quantity_this_period)}
                            </div>
                          ) : null}
                        </td>
                        <td className="num px-3 py-2 text-stone-700">
                          {formatQuantity(
                            toNumber(line.previous_certified_quantity) + toNumber(line.certified_quantity_this_period),
                          )}{' '}
                          / {formatQuantity(line.contract_quantity)}
                        </td>
                        <td className="num whitespace-nowrap px-3 py-2 font-medium text-stone-900">
                          {formatCurrency(line.work_value_to_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
