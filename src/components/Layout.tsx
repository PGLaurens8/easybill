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
  const {
    error,
    isBootstrapping,
    organizations,
    selectedOrganization,
    selectedOrganizationId,
    setSelectedOrganizationId,
  } = useAppContext()
  const { user } = useAuth()

  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `group flex gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium leading-6 transition-all ${
      isActive
        ? 'bg-[#3a473a] text-white'
        : 'text-stone-300 hover:bg-[#3a473a]/50 hover:text-white'
    }`

  return (
    <div className="min-h-screen bg-[#f4f1e6]">
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
            <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-sm" />
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
                <div className="flex grow flex-col gap-y-6 overflow-y-auto bg-[#242d24] px-6 pb-6 pt-4 text-white">
                  <div className="flex h-16 shrink-0 items-center">
                    <Brand markClassName="h-10 w-10" textClassName="text-left text-white" />
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
                                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                                {item.name}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-6 overflow-y-auto bg-[#242d24] px-6 pb-6 pt-4 text-white">
          <div className="flex h-16 shrink-0 items-center">
            <Brand markClassName="h-10 w-10" textClassName="text-left text-white" />
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <NavLink to={item.href} className={navLinkClassName}>
                        <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        {item.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 bg-transparent px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 rounded-md p-2.5 text-stone-600 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <div className="lg:hidden">
                <Brand markClassName="h-8 w-8" textClassName="text-left text-stone-900" />
              </div>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="hidden min-w-48 lg:block">
                <select
                  id="organization"
                  value={selectedOrganizationId ?? ''}
                  onChange={(event) => setSelectedOrganizationId(event.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-stone-700 focus:outline-none"
                  disabled={organizations.length === 0}
                >
                  {organizations.length === 0 ? (
                    <option value="">No organization yet</option>
                  ) : null}
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-x-3">
                <div className="hidden text-right lg:block">
                  <p className="text-xs font-semibold text-stone-900">{user?.email?.split('@')[0]}</p>
                  <p className="text-[11px] text-stone-500">
                    {selectedOrganization?.name || (isBootstrapping ? 'Loading workspace...' : 'Setup required')}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-stone-200">
                  <img
                    className="h-full w-full rounded-full object-cover"
                    src={`https://picsum.photos/seed/${user?.id}/100`}
                    alt=""
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="py-8">
          <div className="px-4 sm:px-6 lg:px-8">
            {error ? (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <p className="font-semibold">Workspace failed to load</p>
                <p className="mt-1">{error}</p>
              </div>
            ) : null}

            {!isBootstrapping && organizations.length === 0 && !error ? (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold">Setup required</p>
                <p className="mt-1">Create your first organization on the Projects page before using the rest of the workspace.</p>
              </div>
            ) : null}

            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
