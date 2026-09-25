import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '../components/ui'
import { useAppContext } from '../context/AppContext'
import { contractLabel, latestRevisionByContract, summarizeContracts } from '../lib/commercial'
import { can } from '../lib/permissions'
import { formatCurrency, formatPercent, toNumber } from '../utils/format'

type ActionCard = {
  key: string
  title: string
  detail: string
  count: number
  href: string
  tone: 'amber' | 'sky' | 'emerald' | 'red'
}

const toneClasses: Record<ActionCard['tone'], string> = {
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  sky: 'border-sky-200 bg-sky-50 text-sky-900',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  red: 'border-red-200 bg-red-50 text-red-900',
}

function sumAmounts(items: Array<{ total_claimed_amount?: string; amount_due_this_certificate_incl_tax?: string }>) {
  return items.reduce(
    (sum, item) => sum + toNumber(item.total_claimed_amount ?? item.amount_due_this_certificate_incl_tax),
    0,
  )
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-stone-200" aria-hidden="true">
      <div className="h-1.5 rounded-full bg-[#516645]" style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  )
}

export default function Dashboard() {
  const {
    boqRevisions,
    certificates,
    claims,
    contracts,
    currentRole,
    isBootstrapping,
    organizations,
    projects,
    selectedOrganization,
  } = useAppContext()
  const permissions = can(currentRole)

  const summaries = useMemo(
    () => summarizeContracts(contracts, projects, boqRevisions, claims, certificates),
    [boqRevisions, certificates, claims, contracts, projects],
  )
  const latestByContract = useMemo(() => latestRevisionByContract(boqRevisions), [boqRevisions])

  const awaitingApproval = claims.filter((claim) => ['Submitted', 'UnderReview'].includes(claim.status))
  const readyToCertify = claims.filter(
    (claim) =>
      claim.status === 'Approved' &&
      !certificates.some((certificate) => certificate.claim_batch_id === claim.id && certificate.status !== 'Voided'),
  )
  const unpaidCertificates = certificates.filter((certificate) => certificate.status === 'Issued')
  const rejectedClaims = claims.filter((claim) => claim.status === 'Rejected')
  const draftClaims = claims.filter((claim) => claim.status === 'Draft')
  const contractsWithoutBoq = contracts.filter((contract) => !latestByContract.has(contract.id))

  const setupSteps = [
    { name: 'Create your company workspace', href: '/projects', done: organizations.length > 0 },
    { name: 'Add a project', href: '/projects', done: projects.length > 0 },
    { name: 'Create a subcontract', href: '/boq-builder', done: contracts.length > 0 },
    { name: 'Load its priced BOQ', href: '/boq-builder', done: boqRevisions.length > 0 },
  ]
  const setupComplete = setupSteps.every((step) => step.done)

  const actions: ActionCard[] = permissions.isSubcontractor
    ? [
        {
          key: 'rejected',
          title: 'Claims sent back to you',
          detail: 'Read the reason, fix and resubmit.',
          count: rejectedClaims.length,
          href: '/claims',
          tone: 'red' as const,
        },
        {
          key: 'drafts',
          title: 'Draft claims not yet submitted',
          detail: formatCurrency(sumAmounts(draftClaims)),
          count: draftClaims.length,
          href: '/claims',
          tone: 'amber' as const,
        },
        {
          key: 'unpaid',
          title: 'Certificates awaiting payment',
          detail: formatCurrency(sumAmounts(unpaidCertificates)),
          count: unpaidCertificates.length,
          href: '/certificates',
          tone: 'emerald' as const,
        },
      ]
    : [
        {
          key: 'approve',
          title: 'Claims waiting for your approval',
          detail: formatCurrency(sumAmounts(awaitingApproval)) + ' claimed',
          count: awaitingApproval.length,
          href: '/claims',
          tone: 'amber' as const,
        },
        {
          key: 'certify',
          title: 'Approved claims to certify',
          detail: formatCurrency(sumAmounts(readyToCertify)) + ' claimed',
          count: readyToCertify.length,
          href: '/certificates',
          tone: 'sky' as const,
        },
        {
          key: 'pay',
          title: permissions.markPaid ? 'Certificates to pay' : 'Certificates awaiting payment',
          detail: formatCurrency(sumAmounts(unpaidCertificates)) + ' incl VAT',
          // Only a to-do for people who can mark payment; others see it in the contract table.
          count: permissions.markPaid || currentRole === null ? unpaidCertificates.length : 0,
          href: '/certificates',
          tone: 'emerald' as const,
        },
        {
          key: 'noboq',
          title: 'Contracts without a BOQ',
          detail: 'Subcontractors can’t claim until it is loaded.',
          count: contractsWithoutBoq.length,
          href: '/boq-builder',
          tone: 'red' as const,
        },
      ]
  const openActions = actions.filter((action) => action.count > 0)

  const totals = summaries.reduce(
    (sum, row) => ({
      contractValue: sum.contractValue + row.contractValue,
      gross: sum.gross + row.grossCertified,
      retention: sum.retention + row.retentionHeld,
      paid: sum.paid + row.paid,
    }),
    { contractValue: 0, gross: 0, retention: 0, paid: 0 },
  )

  return (
    <div className="max-w-7xl space-y-8">
      <PageHeader
        title={selectedOrganization ? selectedOrganization.name : 'Welcome to QuantEasy'}
        description={
          permissions.isSubcontractor
            ? 'Your contracts, claims and payments in one place.'
            : 'What needs doing this month, and where every subcontract stands.'
        }
      />

      {!permissions.isSubcontractor && !setupComplete && !isBootstrapping ? (
        <section className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-700">Getting started</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {setupSteps.map((step, index) => (
              <li key={step.name}>
                <Link
                  to={step.href}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                    step.done
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-stone-200 bg-[#fdfcf7] text-stone-800 hover:border-stone-400'
                  }`}
                >
                  {step.done ? (
                    <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold">
                      {index + 1}
                    </span>
                  )}
                  {step.name}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-700">Needs attention</h2>
        {openActions.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-[#fdfcf7] px-5 py-4 text-sm text-stone-600">
            Nothing waiting on you right now.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {openActions.map((action) => (
              <Link
                key={action.key}
                to={action.href}
                className={`rounded-xl border px-5 py-4 transition hover:shadow-sm ${toneClasses[action.tone]}`}
              >
                <p className="text-3xl font-bold tabular-nums">{action.count}</p>
                <p className="mt-1 font-semibold">{action.title}</p>
                <p className="mt-0.5 text-sm opacity-80">{action.detail}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            {permissions.isSubcontractor ? 'Your contracts' : 'Contract position'}
          </h2>
          {summaries.length > 0 ? (
            <p className="text-sm text-stone-600">
              {formatCurrency(totals.gross)} certified of {formatCurrency(totals.contractValue)} ·{' '}
              {formatCurrency(totals.retention)} retention held
            </p>
          ) : null}
        </div>

        {summaries.length === 0 ? (
          <p className="mt-4 text-sm text-stone-600">
            {permissions.isSubcontractor
              ? 'No contracts have been assigned to you yet. Ask the main contractor to link your login to your contract.'
              : 'No contracts yet. Create your first subcontract on Contracts & BOQ.'}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-3 py-2">Contract</th>
                  <th className="px-3 py-2 text-right">Contract value</th>
                  <th className="min-w-[10rem] px-3 py-2">Certified to date</th>
                  <th className="px-3 py-2 text-right">Retention held</th>
                  <th className="px-3 py-2 text-right">Paid (incl VAT)</th>
                  <th className="px-3 py-2">Open claims</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {summaries.map((row) => (
                  <tr key={row.contract.id}>
                    <td className="px-3 py-3">
                      <div className="font-medium text-stone-900">
                        {row.contract.code} · {row.contract.title}
                      </div>
                      <div className="text-xs text-stone-500">
                        {row.contract.subcontractor_name ?? contractLabel(row.contract)} · {row.project?.name}
                      </div>
                    </td>
                    <td className="num whitespace-nowrap px-3 py-3 text-stone-700">
                      {row.contractValue ? formatCurrency(row.contractValue) : <span className="text-amber-700">No BOQ</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-baseline justify-between gap-2 text-stone-800">
                        <span className="tabular-nums">{formatCurrency(row.grossCertified)}</span>
                        <span className="text-xs text-stone-500">{formatPercent(row.percentComplete)}</span>
                      </div>
                      <ProgressBar percent={row.percentComplete} />
                    </td>
                    <td className="num whitespace-nowrap px-3 py-3 text-stone-700">{formatCurrency(row.retentionHeld)}</td>
                    <td className="num whitespace-nowrap px-3 py-3 text-stone-700">{formatCurrency(row.paid)}</td>
                    <td className="px-3 py-3 text-stone-700">
                      {row.openClaims.length === 0 ? (
                        permissions.isSubcontractor && row.contractValue > 0 ? (
                          <Link to="/claims" className="text-sm font-medium text-primary-700 hover:underline">
                            Start a claim
                          </Link>
                        ) : (
                          <span className="text-stone-400">–</span>
                        )
                      ) : (
                        <Link to="/claims" className="text-sm font-medium text-primary-700 hover:underline">
                          {row.openClaims.length} open
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
