import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import ValuationSummary from '../components/ValuationSummary'
import { Alert, EmptyState, Stat, StatusBadge } from '../components/ui'
import { useAppContext } from '../context/AppContext'
import { formatApiError } from '../lib/api'
import { certifiedQuantityByItemCode, latestRevisionByContract, summarizeContracts } from '../lib/commercial'
import { can } from '../lib/permissions'
import type { CertificateValuation, Contract, VariationItem, VariationOrder } from '../types/api'
import { parseBoqPaste } from '../utils/boqPaste'
import { formatCurrency, formatDate, formatPercent, formatQuantity, todayIsoDate, toNumber } from '../utils/format'

type Tab = 'certificates' | 'variations' | 'deductions' | 'boq' | 'completion'

const variationLabels: Record<string, string> = {
  Submitted: 'Awaiting approval',
  Approved: 'Approved',
  Rejected: 'Rejected',
}

function emptyVariationLine(number: string, index: number): VariationItem {
  return { item_code: `${number}.${index}`, description: '', unit: '', quantity: '', rate: '' }
}

function nextVariationNumber(variations: VariationOrder[], contractId: string) {
  const highest = variations
    .filter((variation) => variation.contract_id === contractId)
    .map((variation) => Number(variation.number.split('-').pop()))
    .filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), 0)
  return `VO-${String(highest + 1).padStart(3, '0')}`
}

export default function ContractPage() {
  const { contractId } = useParams()
  const app = useAppContext()
  const {
    boqRevisions,
    certificates,
    claims,
    contraCharges,
    contracts,
    currentRole,
    projects,
    variations,
  } = app
  const permissions = can(currentRole)
  const canManage = permissions.manageContracts || currentRole === null

  const [tab, setTab] = useState<Tab>('certificates')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const contract = contracts.find((item) => item.id === contractId)
  const summary = useMemo(
    () =>
      contract
        ? summarizeContracts([contract], projects, boqRevisions, claims, certificates, variations, contraCharges)[0]
        : null,
    [boqRevisions, certificates, claims, contraCharges, contract, projects, variations],
  )

  if (!contract || !summary) {
    return (
      <div className="space-y-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-primary-700">
          <ArrowLeftIcon className="h-4 w-4" /> Back
        </Link>
        <EmptyState title="Contract not found">It may belong to another workspace, or you may not have access.</EmptyState>
      </div>
    )
  }

  const currency = contract.currency_code
  const contractVariations = variations.filter((variation) => variation.contract_id === contract.id)
  const tabs: Array<{ id: Tab; label: string; badge?: number }> = [
    { id: 'certificates', label: 'Certificates' },
    { id: 'variations', label: 'Variations', badge: summary.pendingVariations.length },
    { id: 'deductions', label: 'Deductions' },
    { id: 'boq', label: 'BOQ' },
    ...(canManage ? [{ id: 'completion' as Tab, label: 'Completion & retention' }] : []),
  ]

  const feedback = {
    ok: (message: string) => {
      setError(null)
      setNotice(message)
    },
    fail: (caughtError: unknown, fallback: string) => {
      setNotice(null)
      setError(formatApiError(caughtError, fallback))
    },
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <Link
          to={permissions.isSubcontractor ? '/' : '/boq-builder'}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-700"
        >
          <ArrowLeftIcon className="h-4 w-4" /> {permissions.isSubcontractor ? 'Dashboard' : 'Contracts & BOQ'}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-primary-700">{contract.code}</p>
            <h1 className="text-2xl font-semibold text-stone-900 sm:text-3xl">{contract.title}</h1>
            <p className="mt-1 text-sm text-stone-600">
              {contract.subcontractor_name || 'Subcontractor not named'} · {summary.project?.name}
            </p>
          </div>
          <StatusBadge status={contract.status} label={contract.status} />
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Contract value (revised)"
          value={formatCurrency(summary.contractValue, currency)}
          hint={`${formatCurrency(summary.originalValue, currency)} original + ${formatCurrency(summary.variationsValue, currency)} variations`}
        />
        <Stat
          label="Certified to date (gross)"
          value={formatCurrency(summary.grossCertified, currency)}
          hint={`${formatPercent(summary.percentComplete)} complete`}
        />
        <Stat
          label="Retention held"
          value={formatCurrency(summary.retentionHeld, currency)}
          hint={`${formatQuantity(contract.retention_percent)}%${
            contract.retention_cap_percent ? `, capped at ${formatQuantity(contract.retention_cap_percent)}%` : ''
          }`}
        />
        <Stat
          label="Paid (incl VAT)"
          value={formatCurrency(summary.paid, currency)}
          hint={
            summary.deductionsTotal
              ? `Deductions ${formatCurrency(summary.deductionsTotal, currency)}`
              : 'No deductions'
          }
        />
      </section>

      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="flex flex-wrap gap-1 border-b border-stone-200" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === item.id ? 'border-[#516645] text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            {item.label}
            {item.badge ? (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{item.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'certificates' ? <CertificatesTab contract={contract} /> : null}
      {tab === 'variations' ? (
        <VariationsTab contract={contract} variations={contractVariations} feedback={feedback} />
      ) : null}
      {tab === 'deductions' ? <DeductionsTab contract={contract} feedback={feedback} /> : null}
      {tab === 'boq' ? <BoqTab contract={contract} /> : null}
      {tab === 'completion' && canManage ? <CompletionTab contract={contract} feedback={feedback} /> : null}
    </div>
  )
}

type Feedback = { ok: (message: string) => void; fail: (error: unknown, fallback: string) => void }

function CertificatesTab({ contract }: { contract: Contract }) {
  const { certificates, claims } = useAppContext()
  const rows = certificates
    .filter((certificate) => certificate.contract_id === contract.id)
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
  const money = (value: string) => formatCurrency(value, contract.currency_code)

  if (rows.length === 0) {
    return <EmptyState title="No certificates yet">Certificates appear here once the QS certifies a claim.</EmptyState>
  }

  return (
    <section className="card overflow-x-auto p-0">
      <table className="min-w-full divide-y divide-stone-200 text-sm">
        <thead className="table-head">
          <tr>
            <th className="px-4 py-2">Certificate</th>
            <th className="px-4 py-2">Issued</th>
            <th className="px-4 py-2 text-right">Gross to date</th>
            <th className="px-4 py-2 text-right">Retention held</th>
            <th className="px-4 py-2 text-right">Deductions</th>
            <th className="px-4 py-2 text-right">Due incl VAT</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 bg-[#fdfcf7]">
          {rows.map((certificate) => {
            const claim = claims.find((item) => item.id === certificate.claim_batch_id)
            return (
              <tr key={certificate.id} className={certificate.status === 'Voided' ? 'text-stone-400' : undefined}>
                <td className="px-4 py-2">
                  <div className="font-medium text-stone-900">{certificate.certificate_number}</div>
                  <div className="text-xs text-stone-500">
                    {claim ? `Period ${claim.period_number}` : 'Retention release / no claim'}
                  </div>
                </td>
                <td className="px-4 py-2">{formatDate(certificate.issue_date)}</td>
                <td className="num px-4 py-2">{money(certificate.gross_value_to_date)}</td>
                <td className="num px-4 py-2">{money(certificate.retention_held_to_date)}</td>
                <td className="num px-4 py-2">{money(certificate.contra_charges_to_date)}</td>
                <td className="num px-4 py-2 font-semibold text-stone-900">
                  {money(certificate.amount_due_this_certificate_incl_tax)}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={certificate.status} label={certificate.status} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

function VariationsTab({
  contract,
  variations,
  feedback,
}: {
  contract: Contract
  variations: VariationOrder[]
  feedback: Feedback
}) {
  const { createVariation, currentRole, decideVariation, variations: allVariations } = useAppContext()
  const permissions = can(currentRole)
  const canApprove = permissions.certify || currentRole === null
  const number = nextVariationNumber(allVariations, contract.id)

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<VariationItem[]>([emptyVariationLine(number, 1)])
  const [approveNow, setApproveNow] = useState(canApprove)
  const [paste, setPaste] = useState('')
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const total = lines.reduce((sum, line) => sum + toNumber(line.quantity) * toNumber(line.rate), 0)
  const money = (value: string | number) => formatCurrency(value, contract.currency_code)

  function updateLine(index: number, patch: Partial<VariationItem>) {
    setLines((current) => current.map((line, position) => (position === index ? { ...line, ...patch } : line)))
  }

  function applyPaste() {
    const parsed = parseBoqPaste(paste).lines
    if (parsed.length) {
      setLines(
        parsed.map((line) => ({
          item_code: line.item_code,
          description: line.description,
          unit: line.unit,
          quantity: line.contract_quantity,
          rate: line.rate,
        })),
      )
      setPaste('')
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const items = lines.filter((line) => line.description.trim() || toNumber(line.quantity) > 0)
    if (items.some((line) => !line.item_code.trim() || line.description.trim().length < 2 || !line.unit.trim())) {
      feedback.fail(new Error('Each line needs an item code, a description and a unit.'), '')
      return
    }
    if (items.length === 0) {
      feedback.fail(new Error('Add at least one priced line.'), '')
      return
    }
    setBusy(true)
    try {
      const variation = await createVariation({
        contract_id: contract.id,
        title: title.trim(),
        description: description.trim() || undefined,
        items: items.map((line) => ({
          ...line,
          quantity: String(toNumber(line.quantity)),
          rate: String(toNumber(line.rate)),
        })),
        approve_now: canApprove && approveNow,
      })
      feedback.ok(
        variation.status === 'Approved'
          ? `${variation.number} approved and added to the BOQ (${money(variation.value)}).`
          : `${variation.number} sent to the QS for approval (${money(variation.value)}).`,
      )
      setOpen(false)
      setTitle('')
      setDescription('')
      setLines([emptyVariationLine(nextVariationNumber([...allVariations, variation], contract.id), 1)])
    } catch (caughtError) {
      feedback.fail(caughtError, 'Unable to save the variation.')
    } finally {
      setBusy(false)
    }
  }

  async function decide(variation: VariationOrder, approve: boolean) {
    setBusy(true)
    try {
      await decideVariation(variation.id, approve, approve ? undefined : reason.trim())
      feedback.ok(approve ? `${variation.number} approved and added to the BOQ.` : `${variation.number} rejected.`)
      setRejecting(null)
      setReason('')
    } catch (caughtError) {
      feedback.fail(caughtError, 'Unable to update the variation.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-600">
          Approved variations join the BOQ, so they are claimed and certified like any other item.
        </p>
        {permissions.prepareClaims || currentRole === null ? (
          <button type="button" className="btn btn-primary" onClick={() => setOpen((value) => !value)}>
            {permissions.isSubcontractor ? 'Submit a variation' : 'Add variation'}
          </button>
        ) : null}
      </div>

      {open ? (
        <form className="card space-y-4" onSubmit={submit}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-900">New variation {number}</h2>
            <span className="text-sm font-semibold text-stone-900">{money(total)}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="voTitle" className="label">
                What was instructed
              </label>
              <input
                id="voTitle"
                className="input mt-1"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Extra boundary wall to Block A"
                required
                minLength={2}
              />
            </div>
            <div>
              <label htmlFor="voDescription" className="label">
                Reference / notes <span className="font-normal text-stone-500">(optional)</span>
              </label>
              <input
                id="voDescription"
                className="input mt-1"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Site instruction SI 04"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-2 py-2">Item</th>
                  <th className="px-2 py-2">Description</th>
                  <th className="px-2 py-2">Unit</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Rate</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-[#fdfcf7]">
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className="px-1 py-1">
                      <input
                        aria-label={`Variation item code ${index + 1}`}
                        className="input w-28 px-2 py-1"
                        value={line.item_code}
                        onChange={(event) => updateLine(index, { item_code: event.target.value })}
                      />
                    </td>
                    <td className="min-w-[14rem] px-1 py-1">
                      <input
                        aria-label={`Variation description ${index + 1}`}
                        className="input px-2 py-1"
                        value={line.description}
                        onChange={(event) => updateLine(index, { description: event.target.value })}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        aria-label={`Variation unit ${index + 1}`}
                        className="input w-16 px-2 py-1"
                        value={line.unit}
                        onChange={(event) => updateLine(index, { unit: event.target.value })}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        aria-label={`Variation quantity ${index + 1}`}
                        type="number"
                        min="0"
                        step="any"
                        className="input w-24 px-2 py-1 text-right"
                        value={line.quantity}
                        onChange={(event) => updateLine(index, { quantity: event.target.value })}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        aria-label={`Variation rate ${index + 1}`}
                        type="number"
                        min="0"
                        step="any"
                        className="input w-28 px-2 py-1 text-right"
                        value={line.rate}
                        onChange={(event) => updateLine(index, { rate: event.target.value })}
                      />
                    </td>
                    <td className="num whitespace-nowrap px-2 py-1">
                      {money(toNumber(line.quantity) * toNumber(line.rate))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-start gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setLines((current) => [...current, emptyVariationLine(number, current.length + 1)])}
            >
              Add line
            </button>
            <textarea
              aria-label="Paste variation lines from Excel"
              className="input min-h-9 flex-1 py-1.5 font-mono text-xs"
              value={paste}
              onChange={(event) => setPaste(event.target.value)}
              placeholder="…or paste rows from Excel: Item, Description, Unit, Qty, Rate"
            />
            {paste ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={applyPaste}>
                Use pasted lines
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {canApprove ? (
              <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" checked={approveNow} onChange={(event) => setApproveNow(event.target.checked)} />
                Already instructed – approve now and add to the BOQ
              </label>
            ) : (
              <span className="text-sm text-stone-600">The QS will approve or reject it.</span>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving...' : canApprove && approveNow ? 'Approve variation' : 'Submit for approval'}
            </button>
          </div>
        </form>
      ) : null}

      {variations.length === 0 ? (
        <EmptyState title="No variations yet" />
      ) : (
        <div className="space-y-3">
          {variations.map((variation) => (
            <article key={variation.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">{variation.number}</p>
                  <h3 className="font-semibold text-stone-900">{variation.title}</h3>
                  <p className="text-xs text-stone-500">
                    {variation.description ? `${variation.description} · ` : ''}raised {formatDate(variation.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={variation.status} label={variationLabels[variation.status]} />
                  <p className="mt-1 font-semibold tabular-nums text-stone-900">{money(variation.value)}</p>
                </div>
              </div>
              <ul className="mt-2 text-sm text-stone-600">
                {variation.items.map((item) => (
                  <li key={item.item_code}>
                    {item.item_code} · {item.description} · {formatQuantity(item.quantity)} {item.unit} @{' '}
                    {money(item.rate)}
                  </li>
                ))}
              </ul>
              {variation.decision_remarks ? (
                <p
                  className={`mt-2 rounded-lg px-3 py-2 text-sm ${
                    variation.status === 'Rejected' ? 'bg-red-50 text-red-900' : 'bg-stone-50 text-stone-700'
                  }`}
                >
                  {variation.decision_remarks}
                </p>
              ) : null}
              {variation.status === 'Submitted' && canApprove ? (
                rejecting === variation.id ? (
                  <div className="mt-3 space-y-2">
                    <label htmlFor={`reason-${variation.id}`} className="label">
                      Why? The subcontractor will see this.
                    </label>
                    <textarea
                      id={`reason-${variation.id}`}
                      className="input min-h-16"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={busy || !reason.trim()}
                        onClick={() => void decide(variation, false)}
                      >
                        Reject variation
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRejecting(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy}
                      onClick={() => void decide(variation, true)}
                    >
                      Approve
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => setRejecting(variation.id)}>
                      Reject
                    </button>
                  </div>
                )
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function DeductionsTab({ contract, feedback }: { contract: Contract; feedback: Feedback }) {
  const { certificates, contraCharges, createContraCharge, currentRole, deleteContraCharge } = useAppContext()
  const canManage = can(currentRole).manageContracts || currentRole === null
  const charges = contraCharges.filter((charge) => charge.contract_id === contract.id)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [chargeDate, setChargeDate] = useState(todayIsoDate())
  const [busy, setBusy] = useState(false)
  const money = (value: string | number) => formatCurrency(value, contract.currency_code)

  async function add(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await createContraCharge({
        contract_id: contract.id,
        description: description.trim(),
        amount: String(toNumber(amount)),
        charge_date: chargeDate,
      })
      feedback.ok(`Deduction of ${money(amount)} recorded. It will come off the next certificate.`)
      setDescription('')
      setAmount('')
    } catch (caughtError) {
      feedback.fail(caughtError, 'Unable to record the deduction.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(chargeId: string) {
    try {
      await deleteContraCharge(chargeId)
      feedback.ok('Deduction removed.')
    } catch (caughtError) {
      feedback.fail(caughtError, 'Unable to remove the deduction.')
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Contra-charges for damage, cleaning, materials or attendance. Each one is deducted once, on the first
        certificate issued on or after its date, and the subcontractor can see it.
      </p>
      {canManage ? (
        <form className="card grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end" onSubmit={add}>
          <div>
            <label htmlFor="deductionDescription" className="label">
              Deduction
            </label>
            <input
              id="deductionDescription"
              className="input mt-1"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Removal of rubble left at Block A"
              required
              minLength={2}
            />
          </div>
          <div>
            <label htmlFor="deductionAmount" className="label">
              Amount excl VAT (R)
            </label>
            <input
              id="deductionAmount"
              type="number"
              min="0.01"
              step="any"
              className="input mt-1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="deductionDate" className="label">
              Date
            </label>
            <input
              id="deductionDate"
              type="date"
              className="input mt-1"
              value={chargeDate}
              onChange={(event) => setChargeDate(event.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Record deduction
          </button>
        </form>
      ) : null}

      {charges.length === 0 ? (
        <EmptyState title="No deductions" />
      ) : (
        <section className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Deduction</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-[#fdfcf7]">
              {charges.map((charge) => {
                const certificate = certificates.find((item) => item.id === charge.certificate_batch_id)
                return (
                  <tr key={charge.id}>
                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(charge.charge_date)}</td>
                    <td className="px-4 py-2">{charge.description}</td>
                    <td className="num px-4 py-2 font-medium">{money(charge.amount)}</td>
                    <td className="px-4 py-2 text-xs">
                      {certificate ? (
                        <span className="text-stone-700">Deducted on {certificate.certificate_number}</span>
                      ) : (
                        <span className="text-amber-700">Pending – next certificate</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {canManage && !certificate ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-stone-500 hover:text-red-700"
                          onClick={() => void remove(charge.id)}
                        >
                          Remove
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}

function BoqTab({ contract }: { contract: Contract }) {
  const { boqRevisions, certificates, variations } = useAppContext()
  const revision = latestRevisionByContract(boqRevisions).get(contract.id)
  const certified = certifiedQuantityByItemCode(certificates, contract.id)
  const money = (value: string | number) => formatCurrency(value, contract.currency_code)

  if (!revision) {
    return <EmptyState title="No BOQ yet">The QS loads it on Contracts &amp; BOQ.</EmptyState>
  }

  return (
    <section className="card overflow-x-auto p-0">
      <p className="px-4 pt-4 text-xs text-stone-500">
        Rev {revision.revision_number} · published {formatDate(revision.published_at ?? revision.created_at)}
      </p>
      <table className="mt-2 min-w-full divide-y divide-stone-200 text-sm">
        <thead className="table-head">
          <tr>
            <th className="px-4 py-2">Item</th>
            <th className="px-4 py-2 text-right">Qty</th>
            <th className="px-4 py-2 text-right">Rate</th>
            <th className="px-4 py-2 text-right">Amount</th>
            <th className="px-4 py-2 text-right">Certified to date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 bg-[#fdfcf7]">
          {revision.items.map((item) => {
            const done = certified.get(item.item_code) ?? 0
            const variation = variations.find((vo) => vo.id === item.variation_order_id)
            return (
              <tr key={item.id}>
                <td className="px-4 py-2">
                  <div className="font-medium text-stone-900">
                    {item.item_code}
                    {variation ? (
                      <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                        {variation.number}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-stone-500">{item.description}</div>
                </td>
                <td className="num px-4 py-2">
                  {formatQuantity(item.contract_quantity)} {item.unit}
                </td>
                <td className="num px-4 py-2">{money(item.rate)}</td>
                <td className="num px-4 py-2">{money(item.amount)}</td>
                <td className="num px-4 py-2">
                  {formatQuantity(done)}{' '}
                  <span className="text-xs text-stone-500">
                    ({toNumber(item.contract_quantity) ? formatPercent((done / toNumber(item.contract_quantity)) * 100) : '–'})
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

function CompletionTab({ contract, feedback }: { contract: Contract; feedback: Feedback }) {
  const { createCertificateBatch, previewCertificate, updateContract } = useAppContext()
  const [practical, setPractical] = useState(contract.practical_completion_date ?? '')
  const [final, setFinal] = useState(contract.final_completion_date ?? '')
  const [issueDate, setIssueDate] = useState(todayIsoDate())
  const [preview, setPreview] = useState<CertificateValuation | null>(null)
  const [busy, setBusy] = useState(false)

  async function saveDates(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await updateContract(contract.id, {
        practical_completion_date: practical || null,
        final_completion_date: final || null,
      })
      setPreview(null)
      feedback.ok('Completion dates saved.')
    } catch (caughtError) {
      feedback.fail(caughtError, 'Unable to save the dates.')
    } finally {
      setBusy(false)
    }
  }

  async function loadPreview() {
    setBusy(true)
    try {
      setPreview(await previewCertificate({ contract_id: contract.id, issue_date: issueDate, adjustments: [] }))
    } catch (caughtError) {
      feedback.fail(caughtError, 'Unable to value the release.')
    } finally {
      setBusy(false)
    }
  }

  async function issue() {
    setBusy(true)
    try {
      const certificate = await createCertificateBatch({
        project_id: contract.project_id,
        contract_id: contract.id,
        issue_date: issueDate,
        adjustments: [],
      })
      setPreview(null)
      feedback.ok(
        `Issued ${certificate.certificate_number}: ${formatCurrency(certificate.amount_due_this_certificate_incl_tax, contract.currency_code)} due incl VAT.`,
      )
    } catch (caughtError) {
      feedback.fail(caughtError, 'Unable to issue the certificate.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
      <form className="card space-y-4" onSubmit={saveDates}>
        <h2 className="text-lg font-semibold text-stone-900">Completion</h2>
        <p className="text-sm text-stone-600">
          Certificates issued from practical completion release half the retention; from final completion (end of
          the defects period) the rest.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="practicalCompletion" className="label">
              Practical completion
            </label>
            <input
              id="practicalCompletion"
              type="date"
              className="input mt-1"
              value={practical}
              onChange={(event) => setPractical(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="finalCompletion" className="label">
              Final completion
            </label>
            <input
              id="finalCompletion"
              type="date"
              className="input mt-1"
              value={final}
              onChange={(event) => setFinal(event.target.value)}
            />
          </div>
        </div>
        <button type="submit" className="btn btn-secondary" disabled={busy}>
          Save dates
        </button>
      </form>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold text-stone-900">Retention release certificate</h2>
        <p className="text-sm text-stone-600">
          Pays out released retention (and any pending deductions) without waiting for a claim.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="releaseDate" className="label">
              Issue date
            </label>
            <input
              id="releaseDate"
              type="date"
              className="input mt-1"
              value={issueDate}
              onChange={(event) => {
                setIssueDate(event.target.value)
                setPreview(null)
              }}
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || !contract.practical_completion_date}
            onClick={() => void loadPreview()}
          >
            Calculate release
          </button>
        </div>
        {!contract.practical_completion_date ? (
          <p className="text-xs text-stone-500">Save a practical completion date first.</p>
        ) : null}
        {preview ? (
          <>
            <ValuationSummary totals={preview} currency={contract.currency_code} />
            <button
              type="button"
              className="btn btn-primary w-full"
              disabled={busy || toNumber(preview.amount_due_this_certificate_excl_tax) === 0}
              onClick={() => void issue()}
            >
              {toNumber(preview.amount_due_this_certificate_excl_tax) === 0
                ? 'Nothing to release on this date'
                : `Issue release certificate · ${formatCurrency(preview.amount_due_this_certificate_incl_tax, contract.currency_code)}`}
            </button>
          </>
        ) : null}
      </section>
    </div>
  )
}
