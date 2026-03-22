import {
  ArrowRightIcon,
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

type QuickAction = {
  name: string
  detail: string
  href: string
  icon: typeof UserPlusIcon
  tone?: 'primary' | 'default'
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

  const completedCount = setupSteps.filter((step) => step.complete).length
  const nextIncompleteStep = setupSteps.find((step) => !step.complete) ?? null

  const quickActions = useMemo<QuickAction[]>(() => {
    const nextAction = nextIncompleteStep
      ? {
          name: nextIncompleteStep.name,
          detail: nextIncompleteStep.detail,
          href: nextIncompleteStep.href,
          icon:
            nextIncompleteStep.href === '/projects'
              ? UserPlusIcon
              : nextIncompleteStep.href === '/boq-builder'
                ? ClipboardDocumentListIcon
                : nextIncompleteStep.href === '/claims'
                  ? DocumentPlusIcon
                  : BanknotesIcon,
          tone: 'primary' as const,
        }
      : {
          name: 'Review live workflow',
          detail: 'The core setup is complete. Review the commercial pipeline.',
          href: '/claims',
          icon: ChartBarSquareIcon,
          tone: 'primary' as const,
        }

    return [
      nextAction,
      {
        name: 'Project register',
        detail: projects.length === 0 ? 'Create the first project' : 'Review the current project list',
        href: '/projects',
        icon: FolderIcon,
      },
      {
        name: 'Commercial workspace',
        detail: contracts.length === 0 ? 'Create the first contract' : 'Maintain contracts and BOQ revisions',
        href: '/boq-builder',
        icon: ClipboardDocumentListIcon,
      },
      {
        name: 'Claims management',
        detail: claims.length === 0 ? 'Submit the first claim' : 'Track claim progress and statuses',
        href: '/claims',
        icon: DocumentPlusIcon,
      },
      {
        name: 'Payment certificates',
        detail: certificates.length === 0 ? 'Issue the first certificate' : 'Review issued certificates',
        href: '/certificates',
        icon: BanknotesIcon,
      },
      {
        name: 'Workspace settings',
        detail: 'Manage member access and organization roles',
        href: '/settings',
        icon: UserPlusIcon,
      },
    ]
  }, [certificates.length, claims.length, contracts.length, nextIncompleteStep, projects.length])

  const summaryCards = [
    { name: 'Organizations', value: organizations.length, href: '/projects' },
    { name: 'Projects', value: projects.length, href: '/projects' },
    { name: 'Contracts', value: contracts.length, href: '/boq-builder' },
    { name: 'Claims', value: claims.length, href: '/claims' },
    { name: 'Certificates', value: certificates.length, href: '/certificates' },
  ]

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
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800">Quick Actions</h2>
          {nextIncompleteStep ? (
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary-700">
              Next: {nextIncompleteStep.name}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className={[
                'flex flex-col items-start rounded-xl p-5 text-left transition-all',
                action.tone === 'primary'
                  ? 'bg-stone-900 text-white hover:bg-stone-800'
                  : 'bg-stone-100/80 hover:bg-stone-200',
              ].join(' ')}
            >
              <div
                className={[
                  'mb-3 flex h-10 w-10 items-center justify-center rounded-lg shadow-sm',
                  action.tone === 'primary' ? 'bg-white/10 text-white' : 'bg-white text-stone-600',
                ].join(' ')}
              >
                <action.icon className="h-6 w-6" />
              </div>
              <h3 className={action.tone === 'primary' ? 'text-sm font-bold text-white' : 'text-sm font-bold text-stone-900'}>
                {action.name}
              </h3>
              <p className={action.tone === 'primary' ? 'mt-1 text-xs text-stone-300' : 'mt-1 text-xs text-stone-500'}>
                {action.detail}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10 rounded-xl bg-[#e3eae3] p-6">
        <div className="flex items-center justify-between gap-4">
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
          {summaryCards.map((card) => (
            <Link
              key={card.name}
              to={card.href}
              className="rounded-xl bg-stone-100/50 p-5 transition hover:bg-stone-200/80"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{card.name}</p>
              <p className="mt-3 text-2xl font-bold text-stone-900">{card.value}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary-700">
                Open
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
