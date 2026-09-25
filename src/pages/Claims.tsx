import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Alert, EmptyState, PageHeader, StatusBadge } from '../components/ui'
import { useAppContext } from '../context/AppContext'
import { formatApiError } from '../lib/api'
import { certifiedQuantityByItemCode, contractLabel, latestRevisionByContract } from '../lib/commercial'
import { can, claimActionsFor, type ClaimAction } from '../lib/permissions'
import type { ClaimBatch, ClaimLineCreateInput } from '../types/api'
import { downloadCsv } from '../utils/download'
import { formatCurrency, formatDate, formatPercent, formatQuantity, toNumber } from '../utils/format'

type DraftLine = {
  boq_item_id: string
  item_code: string
  description: string
  unit: string
  rate: number
  contract_quantity: number
  previous: number
  quantity: string
  /** What the user typed in the % box, kept so partial input like "33." isn't reformatted. */
  percentText: string | null
  mos: string
  notes: string
}

const OPEN_STATUSES = new Set(['Draft', 'Submitted', 'UnderReview', 'Approved', 'Rejected'])
const statusFilterOptions = [
  { value: 'open', label: 'Open claims' },
  { value: 'all', label: 'All claims' },
  { value: 'Submitted', label: 'Awaiting approval' },
  { value: 'Approved', label: 'Ready to certify' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Draft', label: 'Drafts' },
  { value: 'Certified', label: 'Certified' },
  { value: 'Paid', label: 'Paid' },
]

function roundQuantity(value: number) {
  return Math.round(value * 1000) / 1000
}

function lineValue(line: DraftLine) {
  return toNumber(line.quantity) * line.rate + toNumber(line.mos)
}

function lineProblem(line: DraftLine): string | null {
  const quantity = toNumber(line.quantity)
  if (quantity < 0 || toNumber(line.mos) < 0) {
    return 'Cannot be negative'
  }
  if (line.previous + quantity > line.contract_quantity + 1e-9) {
    return `Only ${formatQuantity(line.contract_quantity - line.previous)} ${line.unit} left`
  }
  return null
}

export default function Claims() {
  const {
    boqRevisions,
    certificates,
    claims,
    contracts,
    createClaimBatch,
    currentRole,
    error,
    projects,
    refreshCommercialData,
    updateClaimBatch,
    updateClaimStatus,
  } = useAppContext()
  const permissions = can(currentRole)
  const canPrepare = permissions.prepareClaims || currentRole === null

  const [statusFilter, setStatusFilter] = useState('open')
  const [contractFilter, setContractFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null)

  const [formContractId, setFormContractId] = useState('')
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null)
  const [remarks, setRemarks] = useState('')
  const [draftLines, setDraftLines] = useState<DraftLine[]>([])
  const [onlyRemaining, setOnlyRemaining] = useState(true)

  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [busyClaimId, setBusyClaimId] = useState<string | null>(null)
  const [pendingReason, setPendingReason] = useState<{ claimId: string; action: ClaimAction } | null>(null)
  const [reason, setReason] = useState('')

  const latestByContract = useMemo(() => latestRevisionByContract(boqRevisions), [boqRevisions])
  const claimableContracts = contracts.filter((contract) => latestByContract.has(contract.id))
  const formContract = contracts.find((contract) => contract.id === formContractId)
  const editingClaim = claims.find((claim) => claim.id === editingClaimId) ?? null

  const nextPeriod = useMemo(() => {
    const periods = claims.filter((claim) => claim.contract_id === formContractId).map((claim) => claim.period_number)
    return periods.length ? Math.max(...periods) + 1 : 1
  }, [claims, formContractId])

  useEffect(() => {
    if (!formContractId && claimableContracts.length === 1) {
      setFormContractId(claimableContracts[0].id)
    }
  }, [claimableContracts, formContractId])

  // Rebuild the claim sheet when the contract (or the claim being edited) changes.
  useEffect(() => {
    const revision = latestByContract.get(formContractId)
    if (!revision) {
      setDraftLines([])
      return
    }
    const certified = certifiedQuantityByItemCode(certificates, formContractId)
    const existing = new Map((editingClaim?.lines ?? []).map((line) => [line.boq_item_id, line]))

    setDraftLines(
      revision.items.map((item) => {
        const current = existing.get(item.id)
        return {
          boq_item_id: item.id,
          item_code: item.item_code,
          description: item.description,
          unit: item.unit,
          rate: toNumber(item.rate),
          contract_quantity: toNumber(item.contract_quantity),
          previous: certified.get(item.item_code) ?? 0,
          quantity: current ? String(toNumber(current.claimed_quantity_this_period)) : '',
          percentText: null,
          mos: current?.claimed_materials_on_site_value ? String(toNumber(current.claimed_materials_on_site_value)) : '',
          notes: current?.notes ?? '',
        }
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only rebuild on contract/claim switch, not every refresh
  }, [formContractId, editingClaimId, latestByContract])

  const filteredClaims = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return claims.filter((claim) => {
      const contract = contracts.find((item) => item.id === claim.contract_id)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'open' ? OPEN_STATUSES.has(claim.status) : claim.status === statusFilter)
      const matchesContract = contractFilter === 'all' || claim.contract_id === contractFilter
      const haystack = `${contract?.code ?? ''} ${contract?.title ?? ''} ${contract?.subcontractor_name ?? ''} ${
        claim.period_number
      } ${claim.remarks ?? ''}`.toLowerCase()
      return matchesStatus && matchesContract && (term === '' || haystack.includes(term))
    })
  }, [claims, contractFilter, contracts, searchTerm, statusFilter])

  const selectedClaim = claims.find((claim) => claim.id === selectedClaimId) ?? filteredClaims[0] ?? null
  const draftTotal = draftLines.reduce((sum, line) => sum + lineValue(line), 0)
  const problems = draftLines.map(lineProblem)
  const visibleLines = draftLines.filter(
    (line) => !onlyRemaining || line.previous < line.contract_quantity || toNumber(line.quantity) > 0 || toNumber(line.mos) > 0,
  )

  function contractFor(claim: ClaimBatch) {
    return contracts.find((contract) => contract.id === claim.contract_id)
  }

  function updateLine(boqItemId: string, patch: Partial<DraftLine>) {
    setDraftLines((current) => current.map((line) => (line.boq_item_id === boqItemId ? { ...line, ...patch } : line)))
  }

  function setPercentComplete(line: DraftLine, percentText: string) {
    if (percentText === '') {
      updateLine(line.boq_item_id, { quantity: '', percentText })
      return
    }
    const target = (toNumber(percentText) / 100) * line.contract_quantity
    updateLine(line.boq_item_id, { quantity: String(Math.max(0, roundQuantity(target - line.previous))), percentText })
  }

  function resetForm() {
    setEditingClaimId(null)
    setRemarks('')
    setDraftLines((current) => current.map((line) => ({ ...line, quantity: '', percentText: null, mos: '', notes: '' })))
  }

  function startEditing(claim: ClaimBatch) {
    setFormContractId(claim.contract_id)
    setEditingClaimId(claim.id)
    setRemarks(claim.remarks ?? '')
    setFormError(null)
    setNotice(null)
    document.getElementById('claim-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleSave(submitAfterSave: boolean) {
    setFormError(null)
    setNotice(null)

    if (!formContract) {
      setFormError('Choose the contract you are claiming against.')
      return
    }
    const problemIndex = problems.findIndex(Boolean)
    if (problemIndex >= 0) {
      setFormError(`${draftLines[problemIndex].item_code}: ${problems[problemIndex]}.`)
      return
    }

    const lines: ClaimLineCreateInput[] = draftLines
      .filter((line) => toNumber(line.quantity) > 0 || toNumber(line.mos) > 0)
      .map((line) => ({
        boq_item_id: line.boq_item_id,
        claimed_quantity_this_period: String(toNumber(line.quantity)),
        claimed_materials_on_site_value: toNumber(line.mos) > 0 ? String(toNumber(line.mos)) : undefined,
        notes: line.notes.trim() || undefined,
      }))

    if (lines.length === 0) {
      setFormError('Enter a quantity (or % complete) on at least one line.')
      return
    }

    setIsSubmitting(true)
    try {
      const saved = editingClaim
        ? await updateClaimBatch(editingClaim.id, { remarks: remarks.trim() || undefined, lines })
        : await createClaimBatch({
            project_id: formContract.project_id,
            contract_id: formContract.id,
            remarks: remarks.trim() || undefined,
            lines,
          })

      if (submitAfterSave) {
        await updateClaimStatus(saved.id, 'Submitted')
      }

      setSelectedClaimId(saved.id)
      setNotice(
        `Period ${saved.period_number} for ${formContract.code} ${
          submitAfterSave ? 'submitted for approval' : 'saved as a draft'
        } (${formatCurrency(saved.total_claimed_amount)}).`,
      )
      resetForm()
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to save the claim.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function runAction(claim: ClaimBatch, action: ClaimAction, actionReason?: string) {
    setFormError(null)
    setNotice(null)
    setBusyClaimId(claim.id)
    try {
      await updateClaimStatus(claim.id, action.to, actionReason)
      setNotice(`${contractFor(claim)?.code ?? 'Claim'} period ${claim.period_number}: ${action.label.toLowerCase()} done.`)
      setPendingReason(null)
      setReason('')
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to update the claim.'))
    } finally {
      setBusyClaimId(null)
    }
  }

  function onAction(claim: ClaimBatch, action: ClaimAction) {
    if (action.needsReason) {
      setSelectedClaimId(claim.id)
      setPendingReason({ claimId: claim.id, action })
      setReason('')
      return
    }
    void runAction(claim, action)
  }

  function exportRegister() {
    downloadCsv('claims-register.csv', [
      ['Contract', 'Package', 'Subcontractor', 'Period', 'Status', 'Submitted', 'Reviewed', 'Amount excl VAT'],
      ...filteredClaims.map((claim) => {
        const contract = contractFor(claim)
        return [
          contract?.code ?? '',
          contract?.title ?? '',
          contract?.subcontractor_name ?? '',
          claim.period_number,
          claim.status,
          claim.submitted_at?.slice(0, 10) ?? '',
          claim.reviewed_at?.slice(0, 10) ?? '',
          claim.total_claimed_amount,
        ]
      }),
    ])
  }

  function exportClaim(claim: ClaimBatch) {
    const contract = contractFor(claim)
    downloadCsv(`${contract?.code ?? 'claim'}-period-${claim.period_number}.csv`, [
      ['Item', 'Description', 'Unit', 'Contract qty', 'Rate', 'Certified before', 'This claim qty', 'MOS', 'Value', 'Notes'],
      ...claim.lines.map((line) => [
        line.item_code,
        line.description,
        line.unit,
        line.contract_quantity,
        line.rate,
        line.previous_certified_quantity,
        line.claimed_quantity_this_period,
        line.claimed_materials_on_site_value ?? '',
        line.line_value,
        line.notes ?? '',
      ]),
    ])
  }

  function renderActions(claim: ClaimBatch, size: 'sm' | 'md' = 'sm') {
    const actions = claimActionsFor(claim.status, currentRole)
    const sizeClass = size === 'sm' ? 'btn-sm' : ''
    return (
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.to}
            type="button"
            disabled={busyClaimId === claim.id}
            className={`btn ${sizeClass} ${
              action.tone === 'primary' ? 'btn-primary' : action.tone === 'danger' ? 'btn-danger' : 'btn-secondary'
            }`}
            onClick={(event) => {
              event.stopPropagation()
              onAction(claim, action)
            }}
          >
            {busyClaimId === claim.id ? 'Saving...' : action.label}
          </button>
        ))}
        {claim.status === 'Draft' && canPrepare ? (
          <button
            type="button"
            className={`btn btn-secondary ${sizeClass}`}
            onClick={(event) => {
              event.stopPropagation()
              startEditing(claim)
            }}
          >
            Edit
          </button>
        ) : null}
        {claim.status === 'Approved' && permissions.certify ? (
          <Link
            to={`/certificates?claim=${claim.id}`}
            className={`btn btn-primary ${sizeClass}`}
            onClick={(event) => event.stopPropagation()}
          >
            Certify payment
          </Link>
        ) : null}
      </div>
    )
  }

  const hasBoq = claimableContracts.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Monthly"
        title="Claims"
        description={
          permissions.isSubcontractor
            ? 'Enter how much work you completed this month. The main contractor’s QS reviews it and issues a payment certificate.'
            : 'Subcontractor progress claims. Approve what is right, reject with a reason, then certify payment.'
        }
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => void refreshCommercialData()}>
              Refresh
            </button>
            <button type="button" className="btn btn-secondary" onClick={exportRegister} disabled={filteredClaims.length === 0}>
              Export register
            </button>
          </>
        }
      />

      {error || formError ? <Alert>{formError || error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {!hasBoq ? (
        <EmptyState title={permissions.isSubcontractor ? 'No contract assigned to you yet' : 'No priced BOQ yet'}>
          {permissions.isSubcontractor
            ? 'Once the main contractor assigns your contract and loads its BOQ, you can claim here.'
            : 'Claims are made against a contract’s BOQ. Load a BOQ on Contracts & BOQ first.'}
        </EmptyState>
      ) : null}

      <div className="grid gap-6 [&>*]:min-w-0 2xl:grid-cols-[1.1fr_0.9fr]">
        {hasBoq && canPrepare ? (
          <section id="claim-form" className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">
                  {editingClaim ? `Edit period ${editingClaim.period_number}` : 'New claim'}
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  Type this month’s quantity, or the % complete to date and we work out the quantity.
                </p>
              </div>
              {formContract ? (
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                  Period {editingClaim?.period_number ?? nextPeriod}
                </span>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
              <div>
                <label htmlFor="claimContractId" className="label">
                  Contract
                </label>
                <select
                  id="claimContractId"
                  className="input mt-1"
                  value={formContractId}
                  disabled={Boolean(editingClaim)}
                  onChange={(event) => {
                    setFormContractId(event.target.value)
                    setEditingClaimId(null)
                  }}
                >
                  <option value="">Select a contract</option>
                  {claimableContracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.code} · {contractLabel(contract)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="claimRemarks" className="label">
                  Note to the QS <span className="font-normal text-stone-500">(optional)</span>
                </label>
                <input
                  id="claimRemarks"
                  className="input mt-1"
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="e.g. Block B first floor slab complete"
                />
              </div>
            </div>

            {formContract ? (
              <>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-stone-600">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={onlyRemaining}
                      onChange={(event) => setOnlyRemaining(event.target.checked)}
                    />
                    Hide lines that are fully certified
                  </label>
                  <span>
                    {visibleLines.length} of {draftLines.length} lines
                  </span>
                </div>

                <div className="mt-2 max-h-[34rem] overflow-auto rounded-xl border border-stone-200">
                  <table className="min-w-full divide-y divide-stone-200 text-sm">
                    <thead className="table-head sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-2 py-2 text-right">Contract qty</th>
                        <th className="px-2 py-2 text-right">Certified to date</th>
                        <th className="px-2 py-2 text-right">This claim</th>
                        <th className="px-2 py-2 text-right">% complete</th>
                        <th className="px-2 py-2 text-right">Materials on site (R)</th>
                        <th className="px-3 py-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-[#fdfcf7]">
                      {visibleLines.map((line) => {
                        const index = draftLines.indexOf(line)
                        const problem = problems[index]
                        const percent =
                          line.contract_quantity > 0
                            ? ((line.previous + toNumber(line.quantity)) / line.contract_quantity) * 100
                            : 0
                        return (
                          <tr key={line.boq_item_id} className={problem ? 'bg-red-50' : undefined}>
                            <td className="px-3 py-2 align-top">
                              <div className="font-medium text-stone-900">{line.item_code}</div>
                              <div className="max-w-xs text-xs text-stone-500">{line.description}</div>
                              <div className="text-xs text-stone-400">
                                {formatCurrency(line.rate)} / {line.unit}
                              </div>
                              {problem ? <div className="text-xs font-medium text-red-700">{problem}</div> : null}
                            </td>
                            <td className="num px-2 py-2 align-top text-stone-600">
                              {formatQuantity(line.contract_quantity)} {line.unit}
                            </td>
                            <td className="num px-2 py-2 align-top text-stone-600">{formatQuantity(line.previous)}</td>
                            <td className="px-2 py-2 align-top">
                              <input
                                aria-label={`This claim quantity for ${line.item_code}`}
                                type="number"
                                min="0"
                                step="any"
                                inputMode="decimal"
                                className="input w-24 px-2 py-1 text-right"
                                value={line.quantity}
                                onChange={(event) =>
                                  updateLine(line.boq_item_id, { quantity: event.target.value, percentText: null })
                                }
                                placeholder="0"
                              />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <input
                                aria-label={`Percent complete to date for ${line.item_code}`}
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                inputMode="decimal"
                                className="input w-20 px-2 py-1 text-right"
                                value={line.percentText ?? (toNumber(line.quantity) > 0 ? String(Math.round(percent * 10) / 10) : '')}
                                onChange={(event) => setPercentComplete(line, event.target.value)}
                                onBlur={() => updateLine(line.boq_item_id, { percentText: null })}
                                placeholder={
                                  line.previous > 0 && line.contract_quantity > 0
                                    ? String(Math.round((line.previous / line.contract_quantity) * 1000) / 10)
                                    : '%'
                                }
                              />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <input
                                aria-label={`Materials on site for ${line.item_code}`}
                                type="number"
                                min="0"
                                step="any"
                                inputMode="decimal"
                                className="input w-28 px-2 py-1 text-right"
                                value={line.mos}
                                onChange={(event) => updateLine(line.boq_item_id, { mos: event.target.value })}
                                placeholder="0"
                              />
                            </td>
                            <td className="num whitespace-nowrap px-3 py-2 align-top font-medium text-stone-900">
                              {lineValue(line) ? formatCurrency(lineValue(line)) : '–'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-stone-700">
                    This claim: <span className="text-lg font-semibold text-stone-900">{formatCurrency(draftTotal)}</span>{' '}
                    <span className="text-xs text-stone-500">excl VAT, before retention</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {editingClaim ? (
                      <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={isSubmitting}>
                        Cancel edit
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void handleSave(false)}
                      disabled={isSubmitting}
                    >
                      Save draft
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => void handleSave(true)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : 'Save & submit'}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        <div className="space-y-6">
          <section className="card">
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-stone-900">Claims register</h2>
              <div className="grid gap-2 sm:grid-cols-3">
                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="input py-1.5 text-sm"
                >
                  {statusFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter by contract"
                  value={contractFilter}
                  onChange={(event) => setContractFilter(event.target.value)}
                  className="input py-1.5 text-sm"
                >
                  <option value="all">All contracts</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.code} · {contractLabel(contract)}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Search claims"
                  className="input py-1.5 text-sm"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search"
                />
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              {filteredClaims.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone-500">No claims match these filters.</p>
              ) : (
                <table className="min-w-full divide-y divide-stone-200 text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="px-3 py-2">Contract</th>
                      <th className="px-3 py-2">Period</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredClaims.map((claim) => {
                      const contract = contractFor(claim)
                      return (
                        <tr
                          key={claim.id}
                          className={`cursor-pointer ${
                            selectedClaim?.id === claim.id ? 'bg-primary-50' : 'hover:bg-stone-50'
                          }`}
                          onClick={() => setSelectedClaimId(claim.id)}
                        >
                          <td className="px-3 py-2">
                            <div className="font-medium text-stone-900">{contract?.code ?? '—'}</div>
                            <div className="text-xs text-stone-500">{contractLabel(contract)}</div>
                          </td>
                          <td className="px-3 py-2 text-stone-700">{claim.period_number}</td>
                          <td className="px-3 py-2">
                            <StatusBadge status={claim.status} />
                          </td>
                          <td className="num whitespace-nowrap px-3 py-2 text-stone-900">
                            {formatCurrency(claim.total_claimed_amount, contract?.currency_code)}
                          </td>
                          <td className="px-3 py-2">{renderActions(claim)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {selectedClaim ? (
            <section className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-primary-700">{contractFor(selectedClaim)?.code}</p>
                  <h2 className="text-lg font-semibold text-stone-900">
                    Period {selectedClaim.period_number} · {contractLabel(contractFor(selectedClaim))}
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">
                    {projects.find((project) => project.id === selectedClaim.project_id)?.name}
                  </p>
                </div>
                <StatusBadge status={selectedClaim.status} />
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-stone-500">Claimed</dt>
                  <dd className="font-semibold text-stone-900">{formatCurrency(selectedClaim.total_claimed_amount)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500">Submitted</dt>
                  <dd className="text-stone-800">{formatDate(selectedClaim.submitted_at, '—')}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500">Reviewed</dt>
                  <dd className="text-stone-800">{formatDate(selectedClaim.reviewed_at, '—')}</dd>
                </div>
              </dl>

              {selectedClaim.remarks ? (
                <div
                  className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                    selectedClaim.status === 'Rejected' ? 'bg-red-50 text-red-900' : 'bg-stone-50 text-stone-700'
                  }`}
                >
                  <span className="font-semibold">{selectedClaim.status === 'Rejected' ? 'Reason: ' : 'Note: '}</span>
                  {selectedClaim.remarks}
                </div>
              ) : null}

              {pendingReason?.claimId === selectedClaim.id ? (
                <form
                  className="mt-4 rounded-xl border border-red-200 bg-red-50/60 p-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void runAction(selectedClaim, pendingReason.action, reason.trim())
                  }}
                >
                  <label htmlFor="rejectReason" className="label">
                    Why? The subcontractor will see this.
                  </label>
                  <textarea
                    id="rejectReason"
                    className="input mt-1 min-h-20"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="e.g. Only 30 m² of plaster measured on site – please resubmit"
                    required
                  />
                  <div className="mt-2 flex gap-2">
                    <button type="submit" className="btn btn-danger btn-sm" disabled={!reason.trim()}>
                      {pendingReason.action.label}
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPendingReason(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  {renderActions(selectedClaim, 'md')}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => exportClaim(selectedClaim)}>
                    Export to Excel (CSV)
                  </button>
                </div>
              )}

              <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200">
                <table className="min-w-full divide-y divide-stone-200 text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-right">Certified before</th>
                      <th className="px-3 py-2 text-right">This claim</th>
                      <th className="px-3 py-2 text-right">% to date</th>
                      <th className="px-3 py-2 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-[#fdfcf7]">
                    {selectedClaim.lines.map((line) => {
                      const contractQty = toNumber(line.contract_quantity)
                      const toDate = toNumber(line.previous_certified_quantity) + toNumber(line.claimed_quantity_this_period)
                      return (
                        <tr key={line.id}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-stone-900">{line.item_code}</div>
                            <div className="text-xs text-stone-500">{line.description}</div>
                            {line.notes ? <div className="text-xs italic text-stone-500">{line.notes}</div> : null}
                          </td>
                          <td className="num px-3 py-2 text-stone-600">{formatQuantity(line.previous_certified_quantity)}</td>
                          <td className="num px-3 py-2 text-stone-800">
                            {formatQuantity(line.claimed_quantity_this_period)} {line.unit}
                            {line.claimed_materials_on_site_value ? (
                              <div className="text-xs text-stone-500">
                                + MOS {formatCurrency(line.claimed_materials_on_site_value)}
                              </div>
                            ) : null}
                          </td>
                          <td className="num px-3 py-2 text-stone-600">
                            {contractQty > 0 ? formatPercent((toDate / contractQty) * 100) : '–'}
                          </td>
                          <td className="num whitespace-nowrap px-3 py-2 font-medium text-stone-900">
                            {formatCurrency(line.line_value)}
                          </td>
                        </tr>
                      )
                    })}
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
