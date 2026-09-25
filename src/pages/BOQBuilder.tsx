import { useEffect, useMemo, useState } from 'react'

import { Alert, EmptyState, PageHeader, StatusBadge } from '../components/ui'
import { useAppContext } from '../context/AppContext'
import { boqTemplates } from '../data/boqTemplates'
import { formatApiError } from '../lib/api'
import { latestRevisionByContract, revisionValue } from '../lib/commercial'
import { can } from '../lib/permissions'
import type { BoqItem, BoqRevisionItemCreateInput, Contract } from '../types/api'
import { parseBoqPaste } from '../utils/boqPaste'
import { formatCurrency, formatDate, formatQuantity, toNumber } from '../utils/format'

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

let draftSequence = 0
function draftId() {
  draftSequence += 1
  return `draft-${draftSequence}`
}

function emptyDraftItem(): DraftBoqItem {
  return { id: draftId(), item_code: '', trade_code: '', description: '', unit: '', contract_quantity: '', rate: '' }
}

function draftFromBoqItems(items: BoqItem[]): DraftBoqItem[] {
  return items.map((item) => ({
    id: draftId(),
    item_code: item.item_code,
    trade_code: item.trade_code || '',
    description: item.description,
    unit: item.unit,
    contract_quantity: item.contract_quantity,
    rate: item.rate,
  }))
}

function draftFromTemplate(templateKey: TemplateKey): DraftBoqItem[] {
  return boqTemplates[templateKey].flatMap((trade) =>
    trade.items.map((item) => ({
      id: draftId(),
      item_code: item.code,
      trade_code: trade.code,
      description: item.description,
      unit: item.unit,
      contract_quantity: '1',
      rate: '0',
    })),
  )
}

/** Normalise "25.5000" -> "25.5" so what is sent matches what the user sees. */
function cleanNumber(value: string) {
  const trimmed = value.trim()
  return trimmed === '' ? '' : String(Number(trimmed))
}

function toRevisionItems(items: DraftBoqItem[]): BoqRevisionItemCreateInput[] {
  return items.map((item, orderIndex) => ({
    item_code: item.item_code.trim(),
    trade_code: item.trade_code.trim() || undefined,
    description: item.description.trim(),
    unit: item.unit.trim(),
    contract_quantity: cleanNumber(item.contract_quantity),
    rate: cleanNumber(item.rate),
    order_index: orderIndex,
  }))
}

function validateDraft(items: BoqRevisionItemCreateInput[]): string | null {
  if (items.length === 0) {
    return 'Add at least one BOQ line before publishing.'
  }
  const invalidIndex = items.findIndex(
    (item) =>
      !item.item_code ||
      item.description.length < 2 ||
      !item.unit ||
      item.contract_quantity === '' ||
      Number.isNaN(Number(item.contract_quantity)) ||
      Number(item.contract_quantity) < 0 ||
      item.rate === '' ||
      Number.isNaN(Number(item.rate)) ||
      Number(item.rate) < 0,
  )
  if (invalidIndex >= 0) {
    return `Line ${invalidIndex + 1} needs an item code, description, unit, quantity and rate (0 or more).`
  }
  const codes = items.map((item) => item.item_code.toLowerCase())
  const duplicate = codes.find((code, index) => codes.indexOf(code) !== index)
  if (duplicate) {
    return `Item code "${duplicate}" is used more than once. Item codes must be unique.`
  }
  return null
}

function suggestContractCode(contracts: Contract[], projectId: string) {
  const used = new Set(contracts.filter((c) => c.project_id === projectId).map((c) => c.code.toUpperCase()))
  let index = used.size + 1
  while (used.has(`SC-${String(index).padStart(3, '0')}`)) {
    index += 1
  }
  return `SC-${String(index).padStart(3, '0')}`
}

export default function BOQBuilder() {
  const {
    boqRevisions,
    contracts,
    createBoqRevision,
    createContract,
    currentRole,
    error,
    isRefreshingCommercialData,
    memberships,
    projects,
    refreshCommercialData,
    selectedOrganization,
    updateContract,
  } = useAppContext()
  const permissions = can(currentRole)
  const canEdit = permissions.manageContracts || currentRole === null

  const [contractProjectId, setContractProjectId] = useState('')
  const [contractTitle, setContractTitle] = useState('')
  const [subcontractorName, setSubcontractorName] = useState('')
  const [subcontractorUserId, setSubcontractorUserId] = useState('')
  const [contractCode, setContractCode] = useState('')
  const [retentionPercent, setRetentionPercent] = useState('10')
  const [retentionCapPercent, setRetentionCapPercent] = useState('5')
  const [taxPercent, setTaxPercent] = useState('15')

  const [boqContractId, setBoqContractId] = useState('')
  const [templateKey, setTemplateKey] = useState<TemplateKey>(templateOptions[0])
  const [draftItems, setDraftItems] = useState<DraftBoqItem[]>([])
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmittingContract, setIsSubmittingContract] = useState(false)
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false)

  const latestByContract = useMemo(() => latestRevisionByContract(boqRevisions), [boqRevisions])
  const subcontractorLogins = memberships.filter((membership) => membership.role === 'Contractor')
  const boqContract = contracts.find((contract) => contract.id === boqContractId)
  const latestRevision = boqContractId ? latestByContract.get(boqContractId) : undefined
  const nextRevisionNumber = (latestRevision?.revision_number ?? 0) + 1
  const draftTotal = draftItems.reduce((sum, item) => sum + toNumber(item.contract_quantity) * toNumber(item.rate), 0)

  useEffect(() => {
    if (!contractProjectId && projects.length === 1) {
      setContractProjectId(projects[0].id)
    }
  }, [contractProjectId, projects])

  useEffect(() => {
    if (contractProjectId) {
      setContractCode(suggestContractCode(contracts, contractProjectId))
      const project = projects.find((item) => item.id === contractProjectId)
      if (project?.retention_percent_default) {
        setRetentionPercent(String(Number(project.retention_percent_default)))
      }
      if (project?.tax_percent_default) {
        setTaxPercent(String(Number(project.tax_percent_default)))
      }
    }
  }, [contractProjectId, contracts, projects])

  function projectName(projectId: string) {
    const project = projects.find((item) => item.id === projectId)
    return project ? `${project.code} · ${project.name}` : 'Unknown project'
  }

  function startBoqFor(contractId: string) {
    setBoqContractId(contractId)
    setFormError(null)
    setNotice(null)
    const revision = latestByContract.get(contractId)
    setDraftItems(revision ? draftFromBoqItems(revision.items) : [])
    document.getElementById('boq-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function updateDraftItem(id: string, field: keyof Omit<DraftBoqItem, 'id'>, value: string) {
    setDraftItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  function applyPaste() {
    const { lines, skipped } = parseBoqPaste(pasteText)
    if (lines.length === 0) {
      setFormError(
        'No BOQ lines found. Copy the columns Item code, Description, Unit, Quantity, Rate from Excel and paste them here.',
      )
      return
    }
    setDraftItems((current) => [
      ...current.filter((item) => item.item_code || item.description),
      ...lines.map((line) => ({ id: draftId(), ...line })),
    ])
    setPasteText('')
    setPasteOpen(false)
    setFormError(null)
    setNotice(`Added ${lines.length} line${lines.length === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} (headings or incomplete rows)` : ''}.`)
  }

  async function handleCreateContract(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    setNotice(null)
    setIsSubmittingContract(true)

    try {
      const contract = await createContract({
        project_id: contractProjectId,
        code: contractCode.trim(),
        title: contractTitle.trim(),
        subcontractor_name: subcontractorName.trim() || undefined,
        subcontractor_user_id: subcontractorUserId || undefined,
        currency_code: 'ZAR',
        retention_percent: retentionPercent || '0',
        retention_cap_percent: retentionCapPercent || undefined,
        tax_percent: taxPercent || '0',
      })

      setContractTitle('')
      setSubcontractorName('')
      setSubcontractorUserId('')
      setNotice(`Contract ${contract.code} created. Now load its priced BOQ below.`)
      setBoqContractId(contract.id)
      setDraftItems([])
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to create contract.'))
    } finally {
      setIsSubmittingContract(false)
    }
  }

  async function handlePublishRevision(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    setNotice(null)

    if (!boqContract) {
      setFormError('Choose the contract this BOQ belongs to.')
      return
    }

    const items = toRevisionItems(draftItems)
    const problem = validateDraft(items)
    if (problem) {
      setFormError(problem)
      return
    }

    setIsSubmittingRevision(true)
    try {
      const revision = await createBoqRevision({
        project_id: boqContract.project_id,
        contract_id: boqContract.id,
        revision_number: nextRevisionNumber,
        items,
      })
      setDraftItems(draftFromBoqItems(revision.items))
      setNotice(`Published Rev ${revision.revision_number} for ${boqContract.code}. Claims now use this BOQ.`)
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to publish BOQ revision.'))
    } finally {
      setIsSubmittingRevision(false)
    }
  }

  async function handleAssignLogin(contract: Contract, userId: string) {
    setFormError(null)
    setNotice(null)
    try {
      await updateContract(contract.id, { subcontractor_user_id: userId || null })
      setNotice(userId ? `${contract.code} is now visible to that subcontractor login.` : `Login removed from ${contract.code}.`)
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to update the subcontractor login.'))
    }
  }

  function loginLabel(userId: string) {
    const membership = memberships.find((item) => item.user_id === userId)
    return membership?.email || `${userId.slice(0, 8)}…`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Set up"
        title="Contracts & BOQ"
        description={
          selectedOrganization
            ? 'Each subcontract package is a contract. Create it once, paste its priced BOQ from Excel, and it is ready for monthly claims.'
            : 'Create your company workspace and a project first.'
        }
        actions={
          <button type="button" className="btn btn-secondary" onClick={() => void refreshCommercialData()}>
            {isRefreshingCommercialData ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      {error || formError ? <Alert>{formError || error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {projects.length === 0 ? (
        <EmptyState title="Create a project first">
          Contracts belong to a project. Add the project on the Projects page, then come back here.
        </EmptyState>
      ) : (
        <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            {canEdit ? (
              <section className="card">
                <h2 className="text-lg font-semibold text-stone-900">New subcontract</h2>
                <p className="mt-1 text-sm text-stone-600">One per package, e.g. brickwork, roofing, electrical.</p>

                <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleCreateContract}>
                  <div className="sm:col-span-2">
                    <label htmlFor="contractProjectId" className="label">
                      Project
                    </label>
                    <select
                      id="contractProjectId"
                      className="input mt-1"
                      value={contractProjectId}
                      onChange={(event) => setContractProjectId(event.target.value)}
                      required
                    >
                      <option value="">Select a project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.code} · {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="contractTitle" className="label">
                      Package
                    </label>
                    <input
                      id="contractTitle"
                      className="input mt-1"
                      value={contractTitle}
                      onChange={(event) => setContractTitle(event.target.value)}
                      placeholder="Brickwork & plaster"
                      required
                      minLength={2}
                    />
                  </div>

                  <div>
                    <label htmlFor="subcontractorName" className="label">
                      Subcontractor company
                    </label>
                    <input
                      id="subcontractorName"
                      className="input mt-1"
                      value={subcontractorName}
                      onChange={(event) => setSubcontractorName(event.target.value)}
                      placeholder="Mthembu Builders (Pty) Ltd"
                    />
                  </div>

                  <div>
                    <label htmlFor="subcontractorUserId" className="label">
                      Subcontractor login <span className="font-normal text-stone-500">(optional)</span>
                    </label>
                    <select
                      id="subcontractorUserId"
                      className="input mt-1"
                      value={subcontractorUserId}
                      onChange={(event) => setSubcontractorUserId(event.target.value)}
                    >
                      <option value="">No login – we capture claims for them</option>
                      {subcontractorLogins.map((membership) => (
                        <option key={membership.user_id} value={membership.user_id}>
                          {membership.email || membership.user_id}
                        </option>
                      ))}
                    </select>
                    <p className="hint">Lets the sub submit their own claims. Invite them on the Team page.</p>
                  </div>

                  <div>
                    <label htmlFor="contractCode" className="label">
                      Contract number
                    </label>
                    <input
                      id="contractCode"
                      className="input mt-1"
                      value={contractCode}
                      onChange={(event) => setContractCode(event.target.value)}
                      placeholder="SC-001"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                    <div>
                      <label htmlFor="retentionPercent" className="label">
                        Retention %
                      </label>
                      <input
                        id="retentionPercent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="input mt-1"
                        value={retentionPercent}
                        onChange={(event) => setRetentionPercent(event.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="retentionCapPercent" className="label">
                        Capped at % of contract
                      </label>
                      <input
                        id="retentionCapPercent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="input mt-1"
                        value={retentionCapPercent}
                        onChange={(event) => setRetentionCapPercent(event.target.value)}
                        placeholder="No cap"
                      />
                    </div>
                    <div>
                      <label htmlFor="taxPercent" className="label">
                        VAT %
                      </label>
                      <input
                        id="taxPercent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="input mt-1"
                        value={taxPercent}
                        onChange={(event) => setTaxPercent(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <button type="submit" className="btn btn-primary w-full" disabled={isSubmittingContract}>
                      {isSubmittingContract ? 'Creating...' : 'Create subcontract'}
                    </button>
                  </div>
                </form>
              </section>
            ) : null}

            {canEdit ? (
              <section id="boq-editor" className="card">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-stone-900">Priced BOQ</h2>
                    <p className="mt-1 text-sm text-stone-600">
                      Publishing creates a new revision. Quantities already certified carry over.
                    </p>
                  </div>
                  {boqContract ? (
                    <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                      Will publish as Rev {nextRevisionNumber}
                    </span>
                  ) : null}
                </div>

                <form className="mt-5 space-y-4" onSubmit={handlePublishRevision}>
                  <div>
                    <label htmlFor="boqContractId" className="label">
                      Contract
                    </label>
                    <select
                      id="boqContractId"
                      className="input mt-1"
                      value={boqContractId}
                      onChange={(event) => startBoqFor(event.target.value)}
                      required
                    >
                      <option value="">Select a contract</option>
                      {contracts.map((contract) => (
                        <option key={contract.id} value={contract.id}>
                          {contract.code} · {contract.title}
                          {contract.subcontractor_name ? ` · ${contract.subcontractor_name}` : ''}
                        </option>
                      ))}
                    </select>
                    {latestRevision ? (
                      <p className="hint">
                        Current BOQ is Rev {latestRevision.revision_number} ({latestRevision.items.length} lines,{' '}
                        {formatCurrency(revisionValue(latestRevision))}). It has been loaded below for editing.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setPasteOpen((open) => !open)}
                    >
                      Paste from Excel
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setDraftItems((current) => [...current, emptyDraftItem()])}
                    >
                      Add line item
                    </button>
                    <select
                      aria-label="Starter template"
                      className="input w-auto py-1.5 text-xs"
                      value={templateKey}
                      onChange={(event) => setTemplateKey(event.target.value as TemplateKey)}
                    >
                      {templateOptions.map((option) => (
                        <option key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)} template
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setDraftItems(draftFromTemplate(templateKey))}
                    >
                      Load template
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setDraftItems([])}
                      disabled={draftItems.length === 0}
                    >
                      Clear
                    </button>
                  </div>

                  {pasteOpen ? (
                    <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-4">
                      <label htmlFor="boqPaste" className="label">
                        Paste rows from Excel
                      </label>
                      <p className="hint">
                        Select the columns <strong>Item code, Description, Unit, Quantity, Rate</strong> (optionally
                        with a Trade column first) in your spreadsheet, copy, and paste here.
                      </p>
                      <textarea
                        id="boqPaste"
                        className="input mt-2 min-h-32 font-mono text-xs"
                        value={pasteText}
                        onChange={(event) => setPasteText(event.target.value)}
                        placeholder={'1.1\tSite clearance\tm2\t450\t18.50\n1.2\tBulk excavation\tm3\t120\t145.00'}
                      />
                      <div className="mt-2 flex gap-2">
                        <button type="button" className="btn btn-primary btn-sm" onClick={applyPaste}>
                          Add pasted lines
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPasteOpen(false)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="overflow-x-auto rounded-xl border border-stone-200">
                    <table className="min-w-full divide-y divide-stone-200 text-sm">
                      <thead className="table-head">
                        <tr>
                          <th className="px-2 py-2">Item</th>
                          <th className="px-2 py-2">Trade</th>
                          <th className="px-2 py-2">Description</th>
                          <th className="px-2 py-2">Unit</th>
                          <th className="px-2 py-2 text-right">Qty</th>
                          <th className="px-2 py-2 text-right">Rate</th>
                          <th className="px-2 py-2 text-right">Amount</th>
                          <th className="px-2 py-2">
                            <span className="sr-only">Remove</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 bg-[#fdfcf7]">
                        {draftItems.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-3 py-8 text-center text-sm text-stone-500">
                              {boqContract
                                ? 'No lines yet. Paste from Excel, add a line, or load a template.'
                                : 'Choose a contract above to start its BOQ.'}
                            </td>
                          </tr>
                        ) : (
                          draftItems.map((item, index) => (
                            <tr key={item.id}>
                              <td className="px-1 py-1">
                                <input
                                  aria-label={`Item code line ${index + 1}`}
                                  className="input w-24 px-2 py-1"
                                  value={item.item_code}
                                  onChange={(event) => updateDraftItem(item.id, 'item_code', event.target.value)}
                                />
                              </td>
                              <td className="px-1 py-1">
                                <input
                                  aria-label={`Trade line ${index + 1}`}
                                  className="input w-20 px-2 py-1"
                                  value={item.trade_code}
                                  onChange={(event) => updateDraftItem(item.id, 'trade_code', event.target.value)}
                                />
                              </td>
                              <td className="min-w-[16rem] px-1 py-1">
                                <input
                                  aria-label={`Description line ${index + 1}`}
                                  className="input px-2 py-1"
                                  value={item.description}
                                  onChange={(event) => updateDraftItem(item.id, 'description', event.target.value)}
                                />
                              </td>
                              <td className="px-1 py-1">
                                <input
                                  aria-label={`Unit line ${index + 1}`}
                                  className="input w-16 px-2 py-1"
                                  value={item.unit}
                                  onChange={(event) => updateDraftItem(item.id, 'unit', event.target.value)}
                                />
                              </td>
                              <td className="px-1 py-1">
                                <input
                                  aria-label={`Quantity line ${index + 1}`}
                                  type="number"
                                  min="0"
                                  step="any"
                                  className="input w-24 px-2 py-1 text-right"
                                  value={item.contract_quantity}
                                  onChange={(event) => updateDraftItem(item.id, 'contract_quantity', event.target.value)}
                                />
                              </td>
                              <td className="px-1 py-1">
                                <input
                                  aria-label={`Rate line ${index + 1}`}
                                  type="number"
                                  min="0"
                                  step="any"
                                  className="input w-28 px-2 py-1 text-right"
                                  value={item.rate}
                                  onChange={(event) => updateDraftItem(item.id, 'rate', event.target.value)}
                                />
                              </td>
                              <td className="num whitespace-nowrap px-2 py-1 font-medium text-stone-900">
                                {formatCurrency(toNumber(item.contract_quantity) * toNumber(item.rate))}
                              </td>
                              <td className="px-1 py-1 text-right">
                                <button
                                  type="button"
                                  className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                  onClick={() => setDraftItems((current) => current.filter((row) => row.id !== item.id))}
                                  aria-label={`Remove line ${index + 1}`}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {draftItems.length > 0 ? (
                        <tfoot>
                          <tr className="bg-stone-50 font-semibold">
                            <td colSpan={6} className="px-2 py-2 text-right text-stone-600">
                              {draftItems.length} lines · Contract value (excl VAT)
                            </td>
                            <td className="num whitespace-nowrap px-2 py-2 text-stone-900">{formatCurrency(draftTotal)}</td>
                            <td />
                          </tr>
                        </tfoot>
                      ) : null}
                    </table>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={isSubmittingRevision || !boqContract}
                  >
                    {isSubmittingRevision ? 'Publishing...' : `Publish BOQ${boqContract ? ` (Rev ${nextRevisionNumber})` : ''}`}
                  </button>
                </form>
              </section>
            ) : null}
          </div>

          <section className="card h-fit">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900">Contract register</h2>
              <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                {contracts.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {contracts.length === 0 ? (
                <p className="text-sm text-stone-600">No contracts yet.</p>
              ) : (
                contracts.map((contract) => {
                  const revision = latestByContract.get(contract.id)
                  return (
                    <article key={contract.id} className="rounded-xl border border-stone-200 bg-[#fdfcf7] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">{contract.code}</p>
                          <h3 className="mt-0.5 font-semibold text-stone-900">{contract.title}</h3>
                          <p className="text-sm text-stone-600">{contract.subcontractor_name || 'Subcontractor not named'}</p>
                          <p className="mt-1 text-xs text-stone-500">{projectName(contract.project_id)}</p>
                        </div>
                        <StatusBadge status={contract.status} label={contract.status} />
                      </div>
                      <p className="mt-3 text-sm text-stone-700">
                        {revision ? (
                          <>
                            <span className="font-semibold">{formatCurrency(revisionValue(revision))}</span> · Rev{' '}
                            {revision.revision_number} · {revision.items.length} lines ·{' '}
                            {formatDate(revision.published_at ?? revision.created_at)}
                          </>
                        ) : (
                          <span className="text-amber-700">No BOQ yet – claims can’t start until it is loaded.</span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        Retention {formatQuantity(contract.retention_percent)}%
                        {contract.retention_cap_percent ? ` capped at ${formatQuantity(contract.retention_cap_percent)}%` : ''} ·
                        VAT {formatQuantity(contract.tax_percent)}%
                      </p>

                      {canEdit ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => startBoqFor(contract.id)}
                          >
                            {revision ? 'Revise BOQ' : 'Load BOQ'}
                          </button>
                          <select
                            aria-label={`Subcontractor login for ${contract.code}`}
                            className="input w-auto flex-1 py-1.5 text-xs"
                            value={contract.subcontractor_user_id ?? ''}
                            onChange={(event) => void handleAssignLogin(contract, event.target.value)}
                          >
                            <option value="">No subcontractor login</option>
                            {subcontractorLogins.map((membership) => (
                              <option key={membership.user_id} value={membership.user_id}>
                                Login: {membership.email || membership.user_id}
                              </option>
                            ))}
                            {contract.subcontractor_user_id &&
                            !subcontractorLogins.some((m) => m.user_id === contract.subcontractor_user_id) ? (
                              <option value={contract.subcontractor_user_id}>
                                Login: {loginLabel(contract.subcontractor_user_id)}
                              </option>
                            ) : null}
                          </select>
                        </div>
                      ) : null}
                    </article>
                  )
                })
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
