import { ArrowPathIcon, ClipboardDocumentListIcon, CubeIcon, FolderIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'

import { useAppContext } from '../context/AppContext'
import { formatCurrency, formatQuantity } from '../utils/format'

type MaterialRow = {
  boqItemId: string
  projectId: string
  projectName: string
  contractId: string
  contractTitle: string
  tradeCode: string
  itemCode: string
  description: string
  unit: string
  quantity: number
  rate: number
  amount: number
  revisionNumber: number
}

export default function Materials() {
  const {
    boqRevisions,
    contracts,
    error,
    isRefreshingCommercialData,
    projects,
    refreshCommercialData,
    selectedOrganization,
  } = useAppContext()
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [tradeFilter, setTradeFilter] = useState('all')

  const latestRevisionByContract = useMemo(() => {
    const next = new Map<string, (typeof boqRevisions)[number]>()

    boqRevisions.forEach((revision) => {
      const current = next.get(revision.contract_id)
      if (!current || revision.revision_number > current.revision_number) {
        next.set(revision.contract_id, revision)
      }
    })

    return next
  }, [boqRevisions])

  const materialRows = useMemo<MaterialRow[]>(() => {
    return [...latestRevisionByContract.values()].flatMap((revision) => {
      const project = projects.find((item) => item.id === revision.project_id)
      const contract = contracts.find((item) => item.id === revision.contract_id)

      return revision.items.map((item) => ({
        boqItemId: item.id,
        projectId: revision.project_id,
        projectName: project?.name || 'Unknown project',
        contractId: revision.contract_id,
        contractTitle: contract?.title || 'Unknown contract',
        tradeCode: item.trade_code || 'General',
        itemCode: item.item_code,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.contract_quantity),
        rate: Number(item.rate),
        amount: Number(item.amount),
        revisionNumber: revision.revision_number,
      }))
    })
  }, [contracts, latestRevisionByContract, projects])

  const tradeOptions = useMemo(() => {
    return ['all', ...new Set(materialRows.map((item) => item.tradeCode).sort((left, right) => left.localeCompare(right)))]
  }, [materialRows])

  const filteredRows = useMemo(() => {
    return materialRows.filter((row) => {
      const matchesProject = projectFilter === 'all' || row.projectId === projectFilter
      const matchesTrade = tradeFilter === 'all' || row.tradeCode === tradeFilter
      const searchValue = `${row.projectName} ${row.contractTitle} ${row.itemCode} ${row.description} ${row.tradeCode}`.toLowerCase()
      const matchesSearch = searchTerm.trim() === '' || searchValue.includes(searchTerm.trim().toLowerCase())

      return matchesProject && matchesTrade && matchesSearch
    })
  }, [materialRows, projectFilter, searchTerm, tradeFilter])

  const totalBillValue = filteredRows.reduce((sum, row) => sum + row.amount, 0)
  const tradeGroups = useMemo(() => {
    const totals = new Map<string, { lineCount: number; amount: number }>()

    filteredRows.forEach((row) => {
      const current = totals.get(row.tradeCode) || { lineCount: 0, amount: 0 }
      totals.set(row.tradeCode, {
        lineCount: current.lineCount + 1,
        amount: current.amount + row.amount,
      })
    })

    return [...totals.entries()]
      .map(([tradeCode, summary]) => ({ tradeCode, ...summary }))
      .sort((left, right) => right.amount - left.amount)
  }, [filteredRows])

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow text-primary-700">Reference</p>
          <h1 className="text-2xl font-semibold text-gray-900">Rate lookup</h1>
          <p className="mt-2 text-gray-600">
            {selectedOrganization
              ? 'Search every current BOQ line across your subcontracts, e.g. to compare what you pay for plaster on different sites.'
              : 'Create an organization, project, contract, and BOQ revision first to unlock the materials reference view.'}
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void refreshCommercialData()}>
          {isRefreshingCommercialData ? 'Refreshing...' : 'Refresh references'}
        </button>
      </section>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!selectedOrganization ? (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900">Materials view unavailable</h2>
          <p className="mt-2 text-sm text-gray-600">
            This page is driven from live project, contract, and BOQ data. Start on Projects, then seed the Commercial Workspace.
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary-50 p-3 text-primary-700">
                  <FolderIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Projects in scope</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{new Set(filteredRows.map((row) => row.projectId)).size}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary-50 p-3 text-primary-700">
                  <ClipboardDocumentListIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Latest BOQ lines</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{filteredRows.length}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary-50 p-3 text-primary-700">
                  <CubeIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Trade groups</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{tradeGroups.length}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary-50 p-3 text-primary-700">
                  <ArrowPathIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Bill value</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(totalBillValue)}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-6">
              <div className="card">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Filters</p>
                <h2 className="mt-2 text-xl font-semibold text-gray-900">Narrow the reference set</h2>
                <div className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="materials-search" className="block text-sm font-medium text-gray-900">
                      Search
                    </label>
                    <div className="relative mt-2">
                      <input
                        id="materials-search"
                        className="input pl-10"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Trade code, item code, contract, or description"
                      />
                      <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="materials-project" className="block text-sm font-medium text-gray-900">
                      Project
                    </label>
                    <select
                      id="materials-project"
                      className="input mt-2"
                      value={projectFilter}
                      onChange={(event) => setProjectFilter(event.target.value)}
                    >
                      <option value="all">All projects</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="materials-trade" className="block text-sm font-medium text-gray-900">
                      Trade code
                    </label>
                    <select
                      id="materials-trade"
                      className="input mt-2"
                      value={tradeFilter}
                      onChange={(event) => setTradeFilter(event.target.value)}
                    >
                      {tradeOptions.map((tradeCode) => (
                        <option key={tradeCode} value={tradeCode}>
                          {tradeCode === 'all' ? 'All trades' : tradeCode}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="card">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Trade mix</p>
                <h2 className="mt-2 text-xl font-semibold text-gray-900">Current revision spread</h2>
                <div className="mt-6 space-y-3">
                  {tradeGroups.length === 0 ? (
                    <p className="text-sm text-gray-600">No BOQ reference items are available yet.</p>
                  ) : (
                    tradeGroups.slice(0, 8).map((group) => (
                      <div key={group.tradeCode} className="rounded-2xl border border-stone-200 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900">{group.tradeCode}</p>
                            <p className="mt-1 text-sm text-gray-600">{group.lineCount} reference lines</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(group.amount)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Reference register</p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900">Latest BOQ-derived materials view</h2>
              <p className="mt-2 text-sm text-gray-600">
                This is a lean read-model from the latest BOQ revision on each contract, useful for procurement and commercial review.
              </p>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 font-medium">Project / Contract</th>
                      <th className="px-3 py-2 font-medium">Trade</th>
                      <th className="px-3 py-2 font-medium">Qty</th>
                      <th className="px-3 py-2 font-medium">Rate</th>
                      <th className="px-3 py-2 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-10 text-center text-gray-500">
                          No BOQ-derived references match the current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => (
                        <tr key={row.boqItemId}>
                          <td className="px-3 py-3 align-top">
                            <div className="font-medium text-gray-900">{row.itemCode}</div>
                            <div className="mt-1 text-xs text-gray-500">Rev {row.revisionNumber}</div>
                            <div className="mt-2 text-sm text-gray-600">{row.description}</div>
                          </td>
                          <td className="px-3 py-3 align-top text-gray-600">
                            <div className="font-medium text-gray-900">{row.projectName}</div>
                            <div className="mt-1 text-xs text-gray-500">{row.contractTitle}</div>
                          </td>
                          <td className="px-3 py-3 align-top text-gray-600">{row.tradeCode}</td>
                          <td className="px-3 py-3 align-top text-gray-600">{formatQuantity(row.quantity)} {row.unit}</td>
                          <td className="px-3 py-3 align-top text-gray-600">{formatCurrency(row.rate)}</td>
                          <td className="px-3 py-3 align-top font-medium text-gray-900">{formatCurrency(row.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
