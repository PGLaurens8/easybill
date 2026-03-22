import { ArrowLeftIcon, BanknotesIcon, ClipboardDocumentListIcon, DocumentTextIcon, FolderIcon } from '@heroicons/react/24/outline'
import { Link, Navigate, useParams } from 'react-router-dom'

import { useAppContext } from '../context/AppContext'

function formatDate(dateString: string | null) {
  if (!dateString) {
    return 'Not set'
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(dateString))
}

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function ProjectDetail() {
  const { projectId } = useParams()
  const { boqRevisions, certificates, claims, contracts, projects, selectedOrganization } = useAppContext()

  if (!selectedOrganization) {
    return <Navigate to="/projects" replace />
  }

  const project = projects.find((item) => item.id === projectId)

  if (!project) {
    return (
      <div className="space-y-6">
        <Link to="/projects" className="inline-flex items-center gap-2 text-sm font-medium text-primary-700">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to projects
        </Link>
        <div className="card">
          <h1 className="text-2xl font-semibold text-gray-900">Project not found</h1>
          <p className="mt-2 text-sm text-gray-600">
            The requested project is not available in the current organization context.
          </p>
        </div>
      </div>
    )
  }

  const projectContracts = contracts.filter((item) => item.project_id === project.id)
  const projectRevisions = boqRevisions.filter((item) => item.project_id === project.id)
  const projectClaims = claims.filter((item) => item.project_id === project.id)
  const projectCertificates = certificates.filter((item) => item.project_id === project.id)
  const currencyCode = project.currency_code || 'ZAR'
  const certifiedValue = projectCertificates.reduce(
    (sum, certificate) => sum + Number(certificate.amount_due_this_certificate_incl_tax),
    0,
  )
  const claimedValue = projectClaims.reduce((sum, claim) => sum + Number(claim.total_claimed_amount), 0)

  const recentActivity = [
    ...projectClaims.map((claim) => ({
      id: claim.id,
      type: 'Claim',
      label: `Period ${claim.period_number}`,
      status: claim.status,
      date: claim.updated_at,
    })),
    ...projectCertificates.map((certificate) => ({
      id: certificate.id,
      type: 'Certificate',
      label: certificate.certificate_number,
      status: certificate.status,
      date: certificate.updated_at,
    })),
  ].sort((left, right) => right.date.localeCompare(left.date))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to="/projects" className="inline-flex items-center gap-2 text-sm font-medium text-primary-700">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to projects
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary-700">Project workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-gray-900">{project.name}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {project.description || 'No project description has been captured yet.'}
          </p>
        </div>
        <div className="rounded-2xl bg-stone-900 px-5 py-4 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-300">Project code</p>
          <p className="mt-2 text-lg font-semibold">{project.code}</p>
          <p className="mt-1 text-sm text-stone-300">{project.status}</p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-50 p-3 text-primary-700">
              <FolderIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Contracts</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{projectContracts.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-50 p-3 text-primary-700">
              <ClipboardDocumentListIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">BOQ revisions</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{projectRevisions.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-50 p-3 text-primary-700">
              <DocumentTextIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Claimed value</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(claimedValue, currencyCode)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-50 p-3 text-primary-700">
              <BanknotesIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Certified value</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(certifiedValue, currencyCode)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Project profile</p>
                <h2 className="mt-2 text-xl font-semibold text-gray-900">Execution overview</h2>
              </div>
              <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
                {project.currency_code}
              </span>
            </div>
            <dl className="mt-6 grid gap-4 text-sm text-gray-600 md:grid-cols-2">
              <div>
                <dt className="font-medium text-gray-900">Client</dt>
                <dd className="mt-1">{project.client_name || 'Not set'}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900">Created</dt>
                <dd className="mt-1">{formatDate(project.created_at)}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900">Retention default</dt>
                <dd className="mt-1">{project.retention_percent_default || 'Not set'}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900">Tax default</dt>
                <dd className="mt-1">{project.tax_percent_default || 'Not set'}</dd>
              </div>
            </dl>
          </div>

          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Contracts</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">Contract register</h2>
            <div className="mt-6 space-y-4">
              {projectContracts.length === 0 ? (
                <p className="text-sm text-gray-600">No contracts exist for this project yet.</p>
              ) : (
                projectContracts.map((contract) => {
                  const contractRevisions = projectRevisions.filter((revision) => revision.contract_id === contract.id)
                  const contractClaims = projectClaims.filter((claim) => claim.contract_id === contract.id)
                  const contractCertificates = projectCertificates.filter((certificate) => certificate.contract_id === contract.id)

                  return (
                    <article key={contract.id} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{contract.code}</p>
                          <h3 className="mt-1 text-lg font-semibold text-gray-900">{contract.title}</h3>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-stone-600">
                          {contract.status}
                        </span>
                      </div>
                      <dl className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-4">
                        <div>
                          <dt className="font-medium text-gray-900">Revisions</dt>
                          <dd>{contractRevisions.length}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-900">Claims</dt>
                          <dd>{contractClaims.length}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-900">Certificates</dt>
                          <dd>{contractCertificates.length}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-900">Retention</dt>
                          <dd>{contract.retention_percent}%</dd>
                        </div>
                      </dl>
                    </article>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Workflow</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">Recent activity</h2>
            <div className="mt-6 space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-gray-600">No claims or certificates have been captured for this project yet.</p>
              ) : (
                recentActivity.slice(0, 8).map((activity) => (
                  <div key={`${activity.type}-${activity.id}`} className="rounded-2xl border border-stone-200 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{activity.type}</p>
                        <p className="mt-1 font-medium text-gray-900">{activity.label}</p>
                      </div>
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                        {activity.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-gray-600">Updated {formatDate(activity.date)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Next actions</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">Suggested path</h2>
            <ul className="mt-5 space-y-3 text-sm text-gray-600">
              <li>Review contracts and create any missing BOQ revisions in Commercial Workspace.</li>
              <li>Move to Claims once a contract has a live BOQ revision.</li>
              <li>Issue certificates only after claims reach an approved state.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
