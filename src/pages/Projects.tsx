import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'

import { useAppContext } from '../context/AppContext'
import { formatApiError } from '../lib/api'

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(dateString))
}

export default function Projects() {
  const {
    createOrganization,
    createProject,
    error,
    isBootstrapping,
    isRefreshingProjects,
    organizations,
    projects,
    refreshProjects,
    selectedOrganization,
  } = useAppContext()
  const [organizationName, setOrganizationName] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [projectName, setProjectName] = useState('')
  const [clientName, setClientName] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmittingOrganization, setIsSubmittingOrganization] = useState(false)
  const [isSubmittingProject, setIsSubmittingProject] = useState(false)

  const projectCountLabel = useMemo(() => {
    if (projects.length === 1) {
      return '1 active project'
    }

    return `${projects.length} active projects`
  }, [projects.length])

  async function handleCreateOrganization(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    setIsSubmittingOrganization(true)

    try {
      const slug = organizationName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      if (!slug) {
        throw new Error('Enter a valid organization name.')
      }

      await createOrganization({
        name: organizationName.trim(),
        slug,
      })
      setOrganizationName('')
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to create organization.'))
    } finally {
      setIsSubmittingOrganization(false)
    }
  }

  async function handleCreateProject(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    setIsSubmittingProject(true)

    try {
      await createProject({
        code: projectCode.trim(),
        name: projectName.trim(),
        client_name: clientName.trim() || undefined,
        description: description.trim() || undefined,
        currency_code: 'ZAR',
      })

      setProjectCode('')
      setProjectName('')
      setClientName('')
      setDescription('')
    } catch (caughtError) {
      setFormError(formatApiError(caughtError, 'Unable to create project.'))
    } finally {
      setIsSubmittingProject(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow text-primary-700">Step 1</p>
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <p className="mt-2 text-gray-600">
            {selectedOrganization
              ? 'Start here when onboarding a new workspace. Create the project before contracts, BOQ revisions, or claims.'
              : 'Start here. Create your first organization, then create the first project.'}
          </p>
        </div>
        {selectedOrganization ? (
          <button type="button" className="btn btn-secondary" onClick={() => void refreshProjects()}>
            {isRefreshingProjects ? 'Refreshing...' : 'Refresh projects'}
          </button>
        ) : null}
      </section>

      {error || formError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError || error}
        </div>
      ) : null}

      {!selectedOrganization ? (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900">Create your organization</h2>
            <p className="mt-2 text-sm text-gray-600">
              Organizations are the top-level tenant boundary used by the backend for auth and project scoping.
            </p>
            <form className="mt-6 space-y-4" onSubmit={handleCreateOrganization}>
              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-gray-900">
                  Organization name
                </label>
                <input
                  id="organizationName"
                  className="input mt-2"
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  placeholder="Acme Quantity Surveyors"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={isSubmittingOrganization}>
                {isSubmittingOrganization ? 'Creating organization...' : 'Create organization'}
              </button>
            </form>
          </div>

          <div className="card-dark">
            <h2 className="text-xl font-semibold">Onboarding order</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>1. Create the organization.</li>
              <li>2. Create the project.</li>
              <li>3. Move to Commercial Workspace for contracts and BOQ revisions.</li>
              <li>4. Open Claims only after the BOQ revision exists.</li>
            </ul>
          </div>
        </section>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-700">
                    {selectedOrganization.name}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-gray-900">{projectCountLabel}</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    Once the project exists, the next stop is Commercial Workspace.
                  </p>
                </div>
                <div className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
                  {organizations.length} orgs available
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {isBootstrapping ? (
                <div className="card text-sm text-gray-600">Loading projects...</div>
              ) : projects.length === 0 ? (
                <div className="card text-sm text-gray-600">No projects yet. Create one from the form.</div>
              ) : (
                projects.map((project) => (
                  <article key={project.id} className="card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-700">
                          {project.code}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-gray-900">{project.name}</h3>
                        <p className="mt-2 text-sm text-gray-600">
                          {project.description || 'No description captured yet.'}
                        </p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-600">
                        {project.status}
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-3">
                      <div>
                        <dt className="font-medium text-gray-900">Client</dt>
                        <dd>{project.client_name || 'Not set'}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-900">Currency</dt>
                        <dd>{project.currency_code}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-900">Created</dt>
                        <dd>{formatDate(project.created_at)}</dd>
                      </div>
                    </dl>
                    <div className="mt-5">
                      <Link to={`/projects/${project.id}`} className="text-sm font-medium text-primary-700 hover:text-primary-800">
                        Open project workspace
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <p className="eyebrow text-primary-700">Required Start</p>
            <h2 className="text-xl font-semibold text-gray-900">Create project</h2>
            <p className="mt-2 text-sm text-gray-600">
              This is the required first data record for a live workspace. Contracts, BOQ revisions, and claims all depend on it.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleCreateProject}>
              <div>
                <label htmlFor="projectCode" className="block text-sm font-medium text-gray-900">
                  Project code
                </label>
                <input
                  id="projectCode"
                  className="input mt-2"
                  value={projectCode}
                  onChange={(event) => setProjectCode(event.target.value)}
                  placeholder="PRJ-001"
                  required
                />
              </div>

              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-900">
                  Project name
                </label>
                <input
                  id="projectName"
                  className="input mt-2"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="The Willows Estate"
                  required
                />
              </div>

              <div>
                <label htmlFor="clientName" className="block text-sm font-medium text-gray-900">
                  Client name
                </label>
                <input
                  id="clientName"
                  className="input mt-2"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Willows Devco"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-900">
                  Description
                </label>
                <textarea
                  id="description"
                  className="input mt-2 min-h-28"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Residential development"
                />
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={isSubmittingProject}>
                {isSubmittingProject ? 'Creating project...' : 'Create project'}
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  )
}
