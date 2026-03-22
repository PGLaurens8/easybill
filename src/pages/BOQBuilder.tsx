import { useMemo, useState } from 'react'

import { boqTemplates } from '../data/boqTemplates'
import { useAppContext } from '../context/AppContext'
import { formatApiError } from '../lib/api'
import type { BoqRevisionItemCreateInput } from '../types/api'

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
  const [contractProjectId, setContractProjectId] = useState('')
  const [contractCode, setContractCode] = useState('')
  const [contractTitle, setContractTitle] = useState('')
  const [retentionPercent, setRetentionPercent] = useState('10.00')
  const [taxPercent, setTaxPercent] = useState('15.00')
  const [revisionProjectId, setRevisionProjectId] = useState('')
  const [revisionContractId, setRevisionContractId] = useState('')
  const [revisionNumber, setRevisionNumber] = useState('1')
  const [templateKey, setTemplateKey] = useState<'residential' | 'commercial'>('residential')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmittingContract, setIsSubmittingContract] = useState(false)
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false)

  const contractsByProject = useMemo(() => {
    return contracts.filter((contract) => contract.project_id === revisionProjectId)
  }, [contracts, revisionProjectId])

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

  function buildTemplateItems(): BoqRevisionItemCreateInput[] {
    const selectedTemplate = boqTemplates[templateKey]
    let orderIndex = 0

    const seedItems = selectedTemplate.flatMap((trade) =>
      trade.items.slice(0, 4).map((item) => ({
        item_code: item.code,
        trade_code: trade.code,
        description: item.description,
        unit: item.unit,
        contract_quantity: '1.0000',
        rate: '0.0000',
        order_index: orderIndex++,
      })),
    )

    return seedItems.slice(0, 12)
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
    setIsSubmittingRevision(true)

    try {
      await createBoqRevision({
        project_id: revisionProjectId,
        contract_id: revisionContractId,
        revision_number: Number(revisionNumber),
        items: buildTemplateItems(),
      })

      setRevisionNumber((current) => String(Number(current) + 1))
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
              ? `After the project exists, create the contract and then seed the BOQ revision here.`
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
                Contracts anchor downstream commercial workflows including claims and BOQ revisions.
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
              <h2 className="text-xl font-semibold text-gray-900">Create BOQ revision</h2>
              <p className="mt-2 text-sm text-gray-600">
                Create the BOQ revision immediately after the contract. Claims only become usable once this exists.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleCreateRevision}>
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

                <div className="grid gap-4 sm:grid-cols-2">
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
                      Template seed
                    </label>
                    <select
                      id="templateKey"
                      className="input mt-2"
                      value={templateKey}
                      onChange={(event) => setTemplateKey(event.target.value as 'residential' | 'commercial')}
                    >
                      <option value="residential">Residential starter</option>
                      <option value="commercial">Commercial starter</option>
                    </select>
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
