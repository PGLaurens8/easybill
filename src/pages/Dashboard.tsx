import {
  BanknotesIcon,
  CheckCircleIcon,
  ChartBarSquareIcon,
  ClipboardDocumentListIcon,
  DocumentPlusIcon,
  FolderIcon,
  MicrophoneIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { useAppContext } from '../context/AppContext'

type SetupStep = {
  name: string
  detail: string
  href: string
  complete: boolean
}

export default function Dashboard() {
  const {
    boqRevisions,
    certificates,
    claims,
    contracts,
    organizations,
    projects,
    selectedOrganization,
  } = useAppContext()

  const setupSteps = useMemo<SetupStep[]>(
    () => [
      {
        name: 'Create organization',
        detail: 'Create the first workspace boundary for your team.',
        href: '/projects',
        complete: organizations.length > 0,
      },
      {
        name: 'Create project',
        detail: 'Projects are required before contracts, BOQ revisions, and claims.',
        href: '/projects',
        complete: projects.length > 0,
      },
      {
        name: 'Create contract',
        detail: 'Contracts anchor the commercial workflow.',
        href: '/boq-builder',
        complete: contracts.length > 0,
      },
      {
        name: 'Create BOQ revision',
        detail: 'Claims depend on a BOQ revision being in place.',
        href: '/boq-builder',
        complete: boqRevisions.length > 0,
      },
      {
        name: 'Create claim',
        detail: 'Submit the first claim after the BOQ has been seeded.',
        href: '/claims',
        complete: claims.length > 0,
      },
      {
        name: 'Issue certificate',
        detail: 'Generate the first payment certificate from an approved claim.',
        href: '/certificates',
        complete: certificates.length > 0,
      },
    ],
    [
      boqRevisions.length,
      certificates.length,
      claims.length,
      contracts.length,
      organizations.length,
      projects.length,
    ],
  )

  const quickActions = [
    {
      name: organizations.length === 0 ? 'Create Organization' : 'Manage Projects',
      detail: organizations.length === 0 ? 'Start the workspace setup' : 'Create and review projects',
      icon: UserPlusIcon,
      href: '/projects',
    },
    {
      name: 'Commercial Workspace',
      detail: 'Create contracts and seed BOQ revisions',
      icon: ClipboardDocumentListIcon,
      href: '/boq-builder',
    },
    {
      name: 'Claims Management',
      detail: 'Create and track claims after the BOQ is ready',
      icon: DocumentPlusIcon,
      href: '/claims',
    },
    {
      name: 'Payment Certificates',
      detail: 'Issue certificates from approved claims',
      icon: BanknotesIcon,
      href: '/certificates',
    },
    {
      name: 'Project Register',
      detail: 'Review the live project list',
      icon: FolderIcon,
      href: '/projects',
    },
    {
      name: 'Reports',
      detail: 'Review progress and totals once data exists',
      icon: ChartBarSquareIcon,
      href: '/certificates',
    },
  ]

  const completedCount = setupSteps.filter((step) => step.complete).length

  return (
    <div className="max-w-5xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">Dashboard</h1>
        <p className="mt-2 font-medium text-stone-600">
          {selectedOrganization
            ? 'Workspace overview for ' + selectedOrganization.name
            : 'Complete the setup checklist to unlock the full workflow'}
        </p>
      </header>

      <section className="mb-10 rounded-2xl bg-white/70 p-6 shadow-sm ring-1 ring-stone-200/70">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800">Setup Progress</h2>
            <p className="mt-2 text-sm text-stone-600">
              Follow this order. Most forms only become usable after the previous record exists.
            </p>
          </div>
          <div className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">
            {completedCount}/{setupSteps.length} complete
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {setupSteps.map((step, index) => (
            <Link
              key={step.name}
              to={step.href}
              className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 transition hover:border-stone-300 hover:bg-stone-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-stone-900">{step.name}</h3>
                  <p className="mt-2 text-sm text-stone-600">{step.detail}</p>
                </div>
                <div
                  className={[
                    'mt-1 flex h-7 w-7 items-center justify-center rounded-full',
                    step.complete ? 'bg-green-100 text-green-700' : 'bg-stone-200 text-stone-500',
                  ].join(' ')}
                >
                  {step.complete ? <CheckCircleIcon className="h-5 w-5" /> : <span>{index + 1}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-stone-800">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="flex flex-col items-start rounded-xl bg-stone-100/80 p-5 text-left transition-all hover:bg-stone-200"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <action.icon className="h-6 w-6 text-stone-600" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">{action.name}</h3>
              <p className="mt-1 text-xs text-stone-500">{action.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10 rounded-xl bg-[#e3eae3] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#516645]">
              <MicrophoneIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Voice Input</h3>
              <p className="text-xs text-stone-600">Reserved for later. Focus on the setup checklist first.</p>
            </div>
          </div>
          <div className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-stone-600">
            Coming later
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-stone-800">Live Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl bg-stone-100/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Organizations</p>
            <p className="mt-3 text-2xl font-bold text-stone-900">{organizations.length}</p>
          </div>
          <div className="rounded-xl bg-stone-100/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Projects</p>
            <p className="mt-3 text-2xl font-bold text-stone-900">{projects.length}</p>
          </div>
          <div className="rounded-xl bg-stone-100/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Contracts</p>
            <p className="mt-3 text-2xl font-bold text-stone-900">{contracts.length}</p>
          </div>
          <div className="rounded-xl bg-stone-100/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Claims</p>
            <p className="mt-3 text-2xl font-bold text-stone-900">{claims.length}</p>
          </div>
          <div className="rounded-xl bg-stone-100/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Certificates</p>
            <p className="mt-3 text-2xl font-bold text-stone-900">{certificates.length}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
