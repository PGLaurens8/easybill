import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { boqTemplates } from '../data/boqTemplates'
import { useAppContext } from '../context/AppContext'
import { formatApiError } from '../lib/api'
import type { BoqRevisionItemCreateInput } from '../types/api'

type TemplateKey = keyof typeof boqTemplates

type DraftBoqItem = {
  id: string
  item_code: string
  trade_code: string
  description: string
  unit: string
  contract_quantity: string
  rate: string
}

const templateOptions = Object.keys(boqTemplates) as TemplateKey[]

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(dateString))
}

function formatCurrency(amount: number, currencyCode = 'ZAR') {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount)
}

function createEmptyDraftItem(index: number): DraftBoqItem {
  return {
    id: `draft-item-${index}-${Math.random().toString(36).slice(2, 8)}`,
    item_code: '',
    trade_code: '',
    description: '',
    unit: '',
    contract_quantity: '0.0000',
    rate: '0.0000',
  }
}

function cloneRevisionItems(items: BoqRevisionItemCreateInput[]): DraftBoqItem[] {
  return items.map((item, index) => ({
    id: `draft-item-${index}-${Math.random().toString(36).slice(2, 8)}`,
    item_code: item.item_code,
    trade_code: item.trade_code || '',
    description: item.description,
    unit: item.unit,
    contract_quantity: item.contract_quantity,
    rate: item.rate,
  }))
}

function buildTemplateItems(templateKey: TemplateKey): DraftBoqItem[] {
  const selectedTemplate = boqTemplates[templateKey]
  const seedItems: DraftBoqItem[] = []

  selectedTemplate.forEach((trade) => {
    trade.items.forEach((item) => {
      seedItems.push({
        id: `draft-item-${seedItems.length}-${Math.random().toString(36).slice(2, 8)}`,
        item_code: item.code,
        trade_code: trade.code,
        description: item.description,
        unit: item.unit,
        contract_quantity: '1.0000',
        rate: '0.0000',
      })
    })
  })

  return seedItems
}

function toRevisionItems(items: DraftBoqItem[]): BoqRevisionItemCreateInput[] {
  return items.map((item, orderIndex) => ({
    item_code: item.item_code.trim(),
    trade_code: item.trade_code.trim() || undefined,
    description: item.description.trim(),
    unit: item.unit.trim(),
    contract_quantity: item.contract_quantity.trim(),
    rate: item.rate.trim(),
    order_index: orderIndex,
  }))
}

export default function BOQBuilder() {
  const {
    boqRevisions,
    contracts,
    createBoqRevision,
    createContract,
    error,
    isRefreshingCommercialData,
    projects,
    refreshCommercialData,
    selectedOrganization,
  } = useAppContext()
  const [searchParams] = useSearchParams()
  const [contractProjectId, setContractProjectId] = useState('')
  const [contractCode, setContractCode] = useState('')
  const [contractTitle, setContractTitle] = useState('')
  const [retentionPercent, setRetentionPercent] = useState('10.00')
  const [taxPercent, setTaxPercent] = useState('15.00')
  const [revisionProjectId, setRevisionProjectId] = useState('')
  const [revisionContractId, setRevisionContractId] = useState('')
  const [revisionNumber, setRevisionNumber] = useState('1')
  const [templateKey, setTemplateKey] = useState<TemplateKey>('residential')
  const [draftItems, setDraftItems] = useState<DraftBoqItem[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmittingContract, setIsSubmittingContract] = useState(false)
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false)
  const preselectedProjectId = searchParams.get('projectId') ?? ''

  const contractsByProject = useMemo(() => {
    return contracts.filter((contract) => contract.project_id === revisionProjectId)
  }, [contracts, revisionProjectId])

  const latestRevisionForSelectedContract = useMemo(() => {
    return boqRevisions
      .filter((revision) => revision.contract_id === revisionContractId)
      .sort((left, right) => right.revision_number - left.revision_number)[0] ?? null
  }, [boqRevisions, revisionContractId])

  const revisionCards = useMemo(() => {
    return boqRevisions.map((revision) => {
      const contract = contracts.find((item) => item.id === revision.contract_id)
      const project = projects.find((item) => item.id === revision.project_id)
      const total = revision.items.reduce((sum, item) => sum + Number(item.amount), 0)

      return {
        revision,
        contract,
        project,
        total,
      }
    })
  }, [boqRevisions, contracts, projects])

  const draftSummary = useMemo(() => {
    const total = draftItems.reduce((sum, item) => {
      return sum + Number(item.contract_quantity || '0') * Number(item.rate || '0')
    }, 0)

    return {
      lineCount: draftItems.length,
      total,
    }
  }, [draftItems])

  useEffect(() => {
    if (!preselectedProjectId) {
      return
    }

    if (projects.some((project) => project.id === preselectedProjectId)) {
      setContractProjectId((current) => current || preselectedProjectId)
      setRevisionProjectId((current) => current || preselectedProjectId)
    }
  }, [preselectedProjectId, projects])

  useEffect(() => {
    if (!revisionProjectId) {
      setRevisionContractId('')
      return
    }

    if (!contracts.some((contract) => contract.id === revisionContractId && contract.project_id === revisionProjectId)) {
      setRevisionContractId('')
    }
  }, [contracts, revisionContractId, revisionProjectId])

  useEffect(() => {
    if (!revisionContractId) {
      setRevisionNumber('1')
      return
    }

    const nextRevisionNumber = (latestRevisionForSelectedContract?.revision_number ?? 0) + 1
    setRevisionNumber(String(nextRevisionNumber))
  }, [latestRevisionForSelectedContract, revisionContractId])

  function appendDraftItem() {
    setDraftItems((current) => [...current, createEmptyDraftItem(current.length)])
  }

  function replaceDraftWithTemplate() {
    setDraftItems(buildTemplateItems(templateKey))
  }

  function copyLatestRevision() {
    if (!latestRevisionForSelectedContract) {
      setFormError('No existing revision is available to copy for this contract.')
      return
    }

    setFormError(null)
    setDraftItems(
      cloneRevisionItems(
        latestRevisionForSelectedContract.items.map((item) => ({
          item_code: item.item_code,
          trade_code: item.trade_code || undefined,
          description: item.description,
          unit: item.unit,
          contract_quantity: item.contract_quantity,
          rate: item.rate,
          order_index: item.order_index,
        })),
      ),
    )
  }

  function clearDraft() {
    setDraftItems([])
  }

  function updateDraftItem(id: string, field: keyof Omit<DraftBoqItem, 'id'>, value: string) {
    setDraftItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  function removeDraftItem(id: string) {
    setDraftItems((current) => current.filter((item) => item.id !== id))
  }

  async function handleCreateContract(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    setIsSubmittingContract(true)

    try {
      await createContract({
        project_id: contractProjectId,
        code: contractCode.trim(),
        title: contractTitle.trim(),
        currency_code: 'ZAR',
        retention_percent: retentionPercent,
        tax_percent: taxPercent,
      })

      setContractCode('')
      setContractTitle('')
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to create contract.'))
    } finally {
      setIsSubmittingContract(false)
    }
  }

  async function handleCreateRevision(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    const revisionItems = toRevisionItems(draftItems)

    if (revisionItems.length === 0) {
      setFormError('Add at least one BOQ line before creating a revision.')
      return
    }

    const invalidItem = revisionItems.find(
      (item) =>
        !item.item_code ||
        !item.description ||
        !item.unit ||
        Number.isNaN(Number(item.contract_quantity)) ||
        Number(item.contract_quantity) < 0 ||
        Number.isNaN(Number(item.rate)) ||
        Number(item.rate) < 0,
    )

    if (invalidItem) {
      setFormError('Each BOQ line needs an item code, description, unit, quantity, and a non-negative rate.')
      return
    }

    const normalizedCodes = revisionItems.map((item) => item.item_code.toLowerCase())
    if (new Set(normalizedCodes).size !== normalizedCodes.length) {
      setFormError('BOQ item codes must be unique within a revision.')
      return
    }

    setIsSubmittingRevision(true)

    try {
      const createdRevision = await createBoqRevision({
        project_id: revisionProjectId,
        contract_id: revisionContractId,
        revision_number: Number(revisionNumber),
        items: revisionItems,
      })

      setDraftItems(
        cloneRevisionItems(
          createdRevision.items.map((item) => ({
            item_code: item.item_code,
            trade_code: item.trade_code || undefined,
            description: item.description,
            unit: item.unit,
            contract_quantity: item.contract_quantity,
            rate: item.rate,
            order_index: item.order_index,
          })),
        ),
      )
      setRevisionNumber(String(createdRevision.revision_number + 1))
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to create BOQ revision.'))
    } finally {
      setIsSubmittingRevision(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow text-primary-700">Step 2</p>
          <h1 className="text-2xl font-semibold text-gray-900">Commercial Workspace</h1>
          <p className="mt-2 text-gray-600">
            {selectedOrganization
              ? 'After the project exists, create the contract and prepare a BOQ draft with real line items before publishing the revision.'
              : 'Create an organization and project first before setting up commercial data.'}
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void refreshCommercialData()}>
          {isRefreshingCommercialData ? 'Refreshing...' : 'Refresh workspace'}
        </button>
      </section>

      {error || formError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError || error}
        </div>
      ) : null}

      {projects.length === 0 ? (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900">Projects required first</h2>
          <p className="mt-2 text-sm text-gray-600">
            Contracts and BOQ revisions depend on a project. Create at least one project from the Projects page before continuing.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <section className="card">
              <p className="eyebrow text-primary-700">2A</p>
              <h2 className="text-xl font-semibold text-gray-900">Create contract</h2>
              <p className="mt-2 text-sm text-gray-600">
                Contracts anchor downstream commercial workflows including claims, certificates, and BOQ revisions.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleCreateContract}>
                <div>
                  <label htmlFor="contractProjectId" className="block text-sm font-medium text-gray-900">
                    Project
                  </label>
                  <select
                    id="contractProjectId"
                    className="input mt-2"
                    value={contractProjectId}
                    onChange={(event) => setContractProjectId(event.target.value)}
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
                  <label htmlFor="contractCode" className="block text-sm font-medium text-gray-900">
                    Contract code
                  </label>
                  <input
                    id="contractCode"
                    className="input mt-2"
                    value={contractCode}
                    onChange={(event) => setContractCode(event.target.value)}
                    placeholder="SUB-001"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="contractTitle" className="block text-sm font-medium text-gray-900">
                    Contract title
                  </label>
                  <input
                    id="contractTitle"
                    className="input mt-2"
                    value={contractTitle}
                    onChange={(event) => setContractTitle(event.target.value)}
                    placeholder="Groundworks Package"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="retentionPercent" className="block text-sm font-medium text-gray-900">
                      Retention %
                    </label>
                    <input
                      id="retentionPercent"
                      className="input mt-2"
                      value={retentionPercent}
                      onChange={(event) => setRetentionPercent(event.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="taxPercent" className="block text-sm font-medium text-gray-900">
                      Tax %
                    </label>
                    <input
                      id="taxPercent"
                      className="input mt-2"
                      value={taxPercent}
                      onChange={(event) => setTaxPercent(event.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-full" disabled={isSubmittingContract}>
                  {isSubmittingContract ? 'Creating contract...' : 'Create contract'}
                </button>
              </form>
            </section>

            <section className="card">
              <p className="eyebrow text-primary-700">2B</p>
              <h2 className="text-xl font-semibold text-gray-900">Prepare BOQ revision</h2>
              <p className="mt-2 text-sm text-gray-600">
                Draft the line items here, then create the revision once quantities and rates are ready for review.
              </p>

              <form className="mt-6 space-y-6" onSubmit={handleCreateRevision}>
                <div>
                  <label htmlFor="revisionProjectId" className="block text-sm font-medium text-gray-900">
                    Project
                  </label>
                  <select
                    id="revisionProjectId"
                    className="input mt-2"
                    value={revisionProjectId}
                    onChange={(event) => {
                      setRevisionProjectId(event.target.value)
                      setRevisionContractId('')
                    }}
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
                  <label htmlFor="revisionContractId" className="block text-sm font-medium text-gray-900">
                    Contract
                  </label>
                  <select
                    id="revisionContractId"
                    className="input mt-2"
                    value={revisionContractId}
                    onChange={(event) => setRevisionContractId(event.target.value)}
                    required
                  >
                    <option value="">Select a contract</option>
                    {contractsByProject.map((contract) => (
                      <option key={contract.id} value={contract.id}>
                        {contract.code} - {contract.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-[0.7fr_1.3fr]">
                  <div>
                    <label htmlFor="revisionNumber" className="block text-sm font-medium text-gray-900">
                      Revision number
                    </label>
                    <input
                      id="revisionNumber"
                      type="number"
                      min="1"
                      className="input mt-2"
                      value={revisionNumber}
                      onChange={(event) => setRevisionNumber(event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="templateKey" className="block text-sm font-medium text-gray-900">
                      Starter template
                    </label>
                    <select
                      id="templateKey"
                      className="input mt-2"
                      value={templateKey}
                      onChange={(event) => setTemplateKey(event.target.value as TemplateKey)}
                    >
                      {templateOptions.map((option) => (
                        <option key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)} starter
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-700">BOQ Draft</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Use a starter template, copy the latest revision, or build the line items from scratch.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn btn-secondary" onClick={appendDraftItem}>
                        Add line item
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={replaceDraftWithTemplate}>
                        Load starter template
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={copyLatestRevision}
                        disabled={!latestRevisionForSelectedContract}
                      >
                        Copy latest revision
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={clearDraft} disabled={draftItems.length === 0}>
                        Clear draft
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Draft lines</p>
                      <p className="mt-1 text-2xl font-semibold text-gray-900">{draftSummary.lineCount}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Draft value</p>
                      <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(draftSummary.total)}</p>
                    </div>
                  </div>

                  {latestRevisionForSelectedContract ? (
                    <p className="mt-4 text-sm text-gray-600">
                      Latest revision for this contract is Rev {latestRevisionForSelectedContract.revision_number} with{' '}
                      {latestRevisionForSelectedContract.items.length} items. Copy it before editing if you are preparing a superseding revision.
                    </p>
                  ) : null}

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th className="px-3 py-2 font-medium">Item code</th>
                          <th className="px-3 py-2 font-medium">Trade</th>
                          <th className="px-3 py-2 font-medium">Description</th>
                          <th className="px-3 py-2 font-medium">Unit</th>
                          <th className="px-3 py-2 font-medium">Quantity</th>
                          <th className="px-3 py-2 font-medium">Rate</th>
                          <th className="px-3 py-2 font-medium">Amount</th>
                          <th className="px-3 py-2 font-medium sr-only">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {draftItems.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-500">
                              No BOQ lines drafted yet. Add a blank line, load a starter template, or copy the latest revision.
                            </td>
                          </tr>
                        ) : (
                          draftItems.map((item) => {
                            const amount = Number(item.contract_quantity || '0') * Number(item.rate || '0')

                            return (
                              <tr key={item.id}>
                                <td className="px-3 py-3 align-top">
                                  <input
                                    aria-label={`Item code ${item.id}`}
                                    className="input"
                                    value={item.item_code}
                                    onChange={(event) => updateDraftItem(item.id, 'item_code', event.target.value)}
                                    placeholder="ITEM-001"
                                    required
                                  />
                                </td>
                                <td className="px-3 py-3 align-top">
                                  <input
                                    aria-label={`Trade ${item.id}`}
                                    className="input"
                                    value={item.trade_code}
                                    onChange={(event) => updateDraftItem(item.id, 'trade_code', event.target.value)}
                                    placeholder="PREL"
                                  />
                                </td>
                                <td className="px-3 py-3 align-top min-w-[18rem]">
                                  <input
                                    aria-label={`Description ${item.id}`}
                                    className="input"
                                    value={item.description}
                                    onChange={(event) => updateDraftItem(item.id, 'description', event.target.value)}
                                    placeholder="Describe the measured work item"
                                    required
                                  />
                                </td>
                                <td className="px-3 py-3 align-top">
                                  <input
                                    aria-label={`Unit ${item.id}`}
                                    className="input"
                                    value={item.unit}
                                    onChange={(event) => updateDraftItem(item.id, 'unit', event.target.value)}
                                    placeholder="m2"
                                    required
                                  />
                                </td>
                                <td className="px-3 py-3 align-top">
                                  <input
                                    aria-label={`Quantity ${item.id}`}
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    className="input"
                                    value={item.contract_quantity}
                                    onChange={(event) => updateDraftItem(item.id, 'contract_quantity', event.target.value)}
                                    required
                                  />
                                </td>
                                <td className="px-3 py-3 align-top">
                                  <input
                                    aria-label={`Rate ${item.id}`}
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    className="input"
                                    value={item.rate}
                                    onChange={(event) => updateDraftItem(item.id, 'rate', event.target.value)}
                                    required
                                  />
                                </td>
                                <td className="px-3 py-3 align-top font-medium text-gray-900">
                                  {formatCurrency(amount)}
                                </td>
                                <td className="px-3 py-3 align-top text-right">
                                  <button type="button" className="text-sm font-medium text-red-600" onClick={() => removeDraftItem(item.id)}>
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-full" disabled={isSubmittingRevision}>
                  {isSubmittingRevision ? 'Creating revision...' : 'Create BOQ revision'}
                </button>
              </form>
            </section>
          </div>

          <div className="space-y-6">
            <section className="card">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Contracts</h2>
                <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
                  {contracts.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {contracts.length === 0 ? (
                  <p className="text-sm text-gray-600">No contracts yet.</p>
                ) : (
                  contracts.map((contract) => {
                    const project = projects.find((item) => item.id === contract.project_id)

                    return (
                      <article key={contract.id} className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-700">
                              {contract.code}
                            </p>
                            <h3 className="mt-1 text-lg font-semibold text-gray-900">{contract.title}</h3>
                            <p className="mt-1 text-sm text-gray-600">{project?.name || 'Unknown project'}</p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-600">
                            {contract.status}
                          </span>
                        </div>
                      </article>
                    )
                  })
                )}
              </div>
            </section>

            <section className="card">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">BOQ revisions</h2>
                <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
                  {boqRevisions.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {revisionCards.length === 0 ? (
                  <p className="text-sm text-gray-600">No BOQ revisions yet.</p>
                ) : (
                  revisionCards.map(({ revision, contract, project, total }) => (
                    <article key={revision.id} className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-700">
                            Rev {revision.revision_number}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold text-gray-900">
                            {contract?.code || 'Contract'} · {project?.name || 'Project'}
                          </h3>
                          <p className="mt-1 text-sm text-gray-600">
                            {revision.items.length} items · created {formatDate(revision.created_at)}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-600">
                          {revision.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-gray-900">
                        {formatCurrency(total, contract?.currency_code || 'ZAR')}
                      </p>
                      {revision.items.length > 0 ? (
                        <ul className="mt-3 space-y-1 text-sm text-gray-600">
                          {revision.items.slice(0, 3).map((item) => (
                            <li key={item.id}>
                              {item.item_code} · {item.description}
                            </li>
                          ))}
                          {revision.items.length > 3 ? <li>+ {revision.items.length - 3} more items</li> : null}
                        </ul>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
