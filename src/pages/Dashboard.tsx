import { type ComponentType, type SVGProps, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  CheckBadgeIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  FolderPlusIcon,
} from '@heroicons/react/24/outline'

import { useAppContext } from '../context/AppContext'
import { apiRequest, getApiOrigin } from '../lib/api'

type WorkflowStep = {
  id: string
  title: string
  detail: string
  route: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  ready: boolean
}

export default function Dashboard() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const navigate = useNavigate()
  const { organizations, projects, contracts, boqRevisions, claims, selectedOrganization } = useAppContext()

  useEffect(() => {
    let active = true

    apiRequest<{ status: string }>('/healthz')
      .then(() => {
        if (active) {
          setApiStatus('online')
        }
      })
      .catch(() => {
        if (active) {
          setApiStatus('offline')
        }
      })

    return () => {
      active = false
    }
  }, [])

  const workflowSteps: WorkflowStep[] = useMemo(
    () => [
      {
        id: 'organization',
        title: selectedOrganization ? 'Organization ready' : 'Create organization',
        detail: selectedOrganization
          ? 'Tenant scope is active and ready for project data.'
          : 'Start on Projects. The organization unlocks every protected workflow.',
        route: '/projects',
        icon: BuildingOffice2Icon,
        ready: organizations.length > 0 && Boolean(selectedOrganization),
      },
      {
        id: 'project',
        title: projects.length > 0 ? 'Project base set' : 'Create project',
        detail:
          projects.length > 0
            ? 'You can now set up contract packages and commercial structure.'
            : 'Create the first project before anything commercial can be captured.',
        route: '/projects',
        icon: FolderPlusIcon,
        ready: projects.length > 0,
      },
      {
        id: 'contract',
        title: contracts.length > 0 ? 'Contract package ready' : 'Create contract',
        detail:
          contracts.length > 0
            ? 'Contract packages are available for BOQ revisions.'
            : 'Open Commercial Workspace and create the contract package next.',
        route: '/boq-builder',
        icon: ClipboardDocumentListIcon,
        ready: contracts.length > 0,
      },
      {
        id: 'boq',
        title: boqRevisions.length > 0 ? 'BOQ revision seeded' : 'Create BOQ revision',
        detail:
          boqRevisions.length > 0
            ? 'Claims can now be built from live BOQ items.'
            : 'Seed a BOQ revision for the contract before raising claims.',
        route: '/boq-builder',
        icon: ChartBarIcon,
        ready: boqRevisions.length > 0,
      },
      {
        id: 'claim',
        title: claims.length > 0 ? 'Claims workflow active' : 'Create first claim',
        detail:
          claims.length > 0
            ? 'Claims exist and can be reviewed, certified, paid, and exported.'
            : 'Once a BOQ exists, open Claims and create the first period submission.',
        route: '/claims',
        icon: DocumentTextIcon,
        ready: claims.length > 0,
      },
    ],
    [boqRevisions.length, claims.length, contracts.length, organizations.length, projects.length, selectedOrganization],
  )

  const currentStepIndex = workflowSteps.findIndex((step) => !step.ready)
  const nextStep = workflowSteps[currentStepIndex === -1 ? workflowSteps.length - 1 : currentStepIndex]
  const completedSteps = workflowSteps.filter((step) => step.ready).length

  const quickActions = [
    {
      label: 'Start with project setup',
      helper: 'Organization and project creation live on the Projects page.',
      route: '/projects',
      enabled: true,
    },
    {
      label: 'Build commercial structure',
      helper: 'Create the contract and BOQ revision after the project exists.',
      route: '/boq-builder',
      enabled: projects.length > 0,
    },
    {
      label: 'Raise and review claims',
      helper: 'Claims only work once the contract and BOQ revision are ready.',
      route: '/claims',
      enabled: contracts.length > 0 && boqRevisions.length > 0,
    },
  ]

  const summaryCards = [
    { label: 'API', value: apiStatus === 'checking' ? 'Checking' : apiStatus === 'online' ? 'Online' : 'Offline', hint: getApiOrigin() },
    { label: 'Projects', value: String(projects.length), hint: 'Live project records' },
    { label: 'Contracts', value: String(contracts.length), hint: 'Commercial packages' },
    { label: 'Claims', value: String(claims.length), hint: 'Submitted workflows' },
  ]

  return (
    <div className="space-y-6">
      <section className="card-dark overflow-hidden">
        <div className="absolute" />
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <p className="eyebrow text-primary-200">Operations Dashboard</p>
            <h1 className="mt-4 text-4xl font-semibold text-white">Make the next required action obvious.</h1>
            <p className="mt-4 max-w-2xl text-base text-slate-300">
              QuantEasy should be used in a fixed order: organization and project first, then contract, BOQ revision, claim, and export. This dashboard now reflects that sequence directly.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4">
                  <p className="eyebrow text-slate-400">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{card.value}</p>
                  <p className="mt-2 text-sm text-slate-400">{card.hint}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-6">
            <p className="eyebrow text-primary-200">Start Here</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{nextStep.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{nextStep.detail}</p>
            <div className="mt-6 rounded-2xl border border-primary-400/20 bg-primary-500/12 px-4 py-4">
              <p className="text-sm font-medium text-primary-100">Workflow progress</p>
              <p className="mt-2 text-3xl font-semibold text-white">{completedSteps} / {workflowSteps.length}</p>
              <p className="mt-1 text-sm text-slate-300">core setup stages completed</p>
            </div>
            <button
              type="button"
              className="btn btn-primary mt-6 inline-flex w-full items-center justify-center gap-2"
              onClick={() => navigate(nextStep.route)}
            >
              Open next required page
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow text-primary-700">Workflow Order</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Use the app in this order</h2>
            </div>
            <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100">
              {selectedOrganization ? selectedOrganization.name : 'No active organization'}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {workflowSteps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                className={`flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition-all ${
                  step.ready
                    ? 'border-primary-200 bg-primary-50/70 hover:bg-primary-50'
                    : index === currentStepIndex
                      ? 'border-blue-200 bg-blue-50/80 shadow-[0_12px_30px_rgba(70,103,137,0.12)]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
                onClick={() => navigate(step.route)}
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  step.ready ? 'bg-primary-600 text-white' : index === currentStepIndex ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {step.ready ? <CheckBadgeIcon className="h-6 w-6" /> : <step.icon className="h-6 w-6" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {index + 1}. {step.title}
                    </h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                      step.ready ? 'bg-primary-100 text-primary-700' : index === currentStepIndex ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {step.ready ? 'Ready' : index === currentStepIndex ? 'Next' : 'Pending'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.detail}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <p className="eyebrow text-primary-700">Quick Actions</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Action only in dependency order</h2>
            <div className="mt-6 space-y-3">
              {quickActions.map((action, index) => (
                <button
                  key={action.label}
                  type="button"
                  disabled={!action.enabled}
                  onClick={() => navigate(action.route)}
                  className={`flex w-full items-start justify-between rounded-2xl border px-4 py-4 text-left transition-all ${
                    action.enabled
                      ? 'border-slate-200 bg-white hover:border-primary-200 hover:shadow-[0_12px_24px_rgba(15,23,36,0.08)]'
                      : 'cursor-not-allowed border-slate-200 bg-slate-100/80 opacity-70'
                  }`}
                >
                  <div>
                    <p className="eyebrow text-slate-500">Step {index + 1}</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{action.label}</p>
                    <p className="mt-1 text-sm text-slate-600">{action.helper}</p>
                  </div>
                  <ArrowRightIcon className="mt-2 h-5 w-5 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <p className="eyebrow text-primary-700">Before Smoke Test</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">What must be true</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
              <li>Organization selected in the header.</li>
              <li>At least one project exists.</li>
              <li>At least one contract exists under that project.</li>
              <li>At least one BOQ revision exists for that contract.</li>
              <li>Health check remains online at the active API origin.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
