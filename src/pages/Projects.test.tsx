import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Projects from './Projects'
import { ApiError } from '../lib/api'
import type { Organization, Project } from '../types/api'

const useAppContextMock = vi.fn()

vi.mock('../context/AppContext', () => ({
  useAppContext: () => useAppContextMock(),
}))

function buildOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'org-1',
    name: 'QuantEasy Org',
    slug: 'quanteasy-org',
    created_at: '2026-03-22T00:00:00Z',
    updated_at: '2026-03-22T00:00:00Z',
    ...overrides,
  }
}

function buildProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    organization_id: 'org-1',
    code: 'PRJ-001',
    name: 'Civic Centre',
    description: null,
    client_name: 'Client',
    currency_code: 'ZAR',
    retention_percent_default: '10',
    tax_percent_default: '15',
    status: 'Active',
    created_at: '2026-03-22T00:00:00Z',
    updated_at: '2026-03-22T00:00:00Z',
    ...overrides,
  }
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

function renderProjectsPage(overrides: Record<string, unknown> = {}) {
  const createOrganization = vi.fn()
  const createProject = vi.fn().mockResolvedValue(buildProject())
  const refreshProjects = vi.fn().mockResolvedValue(undefined)

  useAppContextMock.mockReturnValue({
    createOrganization,
    createProject,
    error: null,
    isBootstrapping: false,
    isRefreshingProjects: false,
    organizations: [buildOrganization()],
    projects: [],
    refreshProjects,
    selectedOrganization: buildOrganization(),
    ...overrides,
  })

  render(
    <MemoryRouter>
      <Projects />
    </MemoryRouter>,
  )

  return { createOrganization, createProject, refreshProjects }
}

describe('Projects page', () => {
  beforeEach(() => {
    useAppContextMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('ignores a second submit while project creation is still in flight', async () => {
    const deferred = createDeferred<Project>()
    const createProject = vi.fn().mockReturnValue(deferred.promise)

    renderProjectsPage({ createProject })

    await userEvent.type(await screen.findByLabelText('Project code'), 'PRJ-002')
    await userEvent.type(screen.getByLabelText('Project name'), 'New Project')

    const submitButton = screen.getByRole('button', { name: 'Create project' })
    const form = submitButton.closest('form')
    expect(form).not.toBeNull()

    fireEvent.submit(form!)
    fireEvent.submit(form!)

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledTimes(1)
    })

    deferred.resolve(buildProject({ id: 'project-2', code: 'PRJ-002', name: 'New Project' }))
    await waitFor(() => {
      expect(submitButton).toHaveTextContent('Create project')
    })
  })

  it('refreshes projects after a conflict so the existing record can appear', async () => {
    const user = userEvent.setup()
    const createProject = vi.fn().mockRejectedValue(new ApiError('Project code already exists', 409, null, 'req-409'))
    const refreshProjects = vi.fn().mockResolvedValue(undefined)

    renderProjectsPage({ createProject, refreshProjects })

    await user.type(await screen.findByLabelText('Project code'), 'PRJ-001')
    await user.type(screen.getByLabelText('Project name'), 'Civic Centre')
    await user.click(screen.getByRole('button', { name: 'Create project' }))

    await waitFor(() => {
      expect(refreshProjects).toHaveBeenCalledTimes(1)
    })

    expect(await screen.findByText('Project code already exists · HTTP 409 · request req-409')).toBeInTheDocument()
  })
})
