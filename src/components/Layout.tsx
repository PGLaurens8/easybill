import { Fragment, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Dialog, Transition } from '@headlessui/react'
import {
  HomeIcon,
  FolderIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'

import { useAppContext } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import Brand from './Brand'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'BOQ Builder', href: '/boq-builder', icon: ClipboardDocumentListIcon },
  { name: 'Claims', href: '/claims', icon: UserGroupIcon },
  { name: 'Materials', href: '/materials', icon: ClipboardDocumentListIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { organizations, selectedOrganizationId, setSelectedOrganizationId } = useAppContext()
  const { signOut, user } = useAuth()

  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `group flex gap-x-3 rounded-xl px-3 py-2.5 text-sm font-semibold leading-6 transition-all ${
      isActive
        ? 'bg-white/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
        : 'text-slate-200 hover:bg-white/8 hover:text-white'
    }`

  return (
    <div className="min-h-screen text-gray-900">
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="flex grow flex-col gap-y-6 overflow-y-auto border-r border-white/10 bg-[radial-gradient(circle_at_top,_rgba(71,111,162,0.22),transparent_35%),linear-gradient(180deg,#0f1724_0%,#152133_50%,#1b2a22_100%)] px-6 pb-6 pt-4 text-gray-100 shadow-2xl">
                  <div className="flex h-16 shrink-0 items-center">
                    <Brand markClassName="h-10 w-10" textClassName="text-left text-stone-50" />
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {navigation.map((item) => (
                            <li key={item.name}>
                              <NavLink
                                to={item.href}
                                className={navLinkClassName}
                                onClick={() => setSidebarOpen(false)}
                              >
                                <item.icon
                                  className="h-6 w-6 shrink-0 text-primary-200"
                                  aria-hidden="true"
                                />
                                {item.name}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                  <div className="glass-panel rounded-2xl px-4 py-4 text-sm text-slate-200">
                    <p className="eyebrow text-primary-200">Workflow</p>
                    <p className="mt-2">Projects first, then contracts, BOQ revisions, claims, and exports.</p>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-6 overflow-y-auto border-r border-white/10 bg-[radial-gradient(circle_at_top,_rgba(71,111,162,0.22),transparent_35%),linear-gradient(180deg,#0f1724_0%,#152133_50%,#1b2a22_100%)] px-6 pb-6 pt-4 text-gray-100 shadow-xl">
          <div className="flex h-16 shrink-0 items-center">
            <Brand markClassName="h-10 w-10" textClassName="text-left text-stone-50" />
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <NavLink
                        to={item.href}
                        className={navLinkClassName}
                      >
                        <item.icon
                          className="h-6 w-6 shrink-0 text-primary-200"
                          aria-hidden="true"
                        />
                        {item.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
          <div className="glass-panel rounded-2xl px-4 py-4 text-sm text-slate-200">
            <p className="eyebrow text-primary-200">Recommended Order</p>
            <p className="mt-2">Create the organization and project first. Contracts and BOQ revisions feed claims.</p>
          </div>
        </div>
      </div>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-white/10 bg-slate-950/72 px-4 shadow-[0_10px_40px_rgba(7,12,20,0.28)] backdrop-blur-xl sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 rounded-md p-2.5 text-slate-200 transition-colors hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-white/12 lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <div className="lg:hidden">
                <Brand markClassName="h-9 w-9" textClassName="text-left text-slate-100" />
              </div>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="hidden min-w-56 lg:block">
                <label htmlFor="organization" className="sr-only">
                  Active organization
                </label>
                <select
                  id="organization"
                  value={selectedOrganizationId ?? ''}
                  onChange={(event) => setSelectedOrganizationId(event.target.value)}
                  className="input border-white/12 bg-white/8 py-2 text-sm text-slate-100"
                >
                  {organizations.length === 0 ? (
                    <option value="">No organizations yet</option>
                  ) : (
                    organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="flex items-center gap-x-3 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 shadow-sm">
                <div className="h-8 w-8 rounded-full border border-primary-400/30 bg-primary-500/16 text-center text-sm font-semibold leading-8 text-primary-100">
                  {user?.email?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold leading-5 text-slate-100">
                    {user?.email ?? 'Signed-in user'}
                  </p>
                  <p className="text-xs text-slate-400">Supabase session</p>
                </div>
                <button type="button" className="btn btn-secondary border-white/12 bg-white/6 py-1.5 text-sm text-slate-100 hover:bg-white/12" onClick={() => void signOut()}>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
} 
