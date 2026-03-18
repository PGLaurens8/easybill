import { 
  PlusIcon, 
  UserPlusIcon, 
  DocumentPlusIcon, 
  ShoppingCartIcon, 
  ChartBarSquareIcon,
  MicrophoneIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const quickActions = [
    { name: 'Create BOQ', detail: 'Create a new Bill of Quantities', icon: PlusIcon },
    { name: 'Add Subcontractor', detail: 'Register a new subcontractor', icon: UserPlusIcon },
    { name: 'Create Claim', detail: 'Submit a new progress claim', icon: DocumentPlusIcon },
    { name: 'Order Materials', detail: 'Place a new material order', icon: ShoppingCartIcon },
    { name: 'View Reports', detail: 'Access project reports', icon: ChartBarSquareIcon },
  ]

  const processFlow = [
    { name: 'Site Preparation', detail: 'Clear and prepare the construction site', duration: '2 weeks', status: 'completed' },
    { name: 'Foundation Work', detail: 'Excavation and foundation construction', duration: '4 weeks', status: 'active' },
    { name: 'Structural Work', detail: 'Building the main structure', duration: '8 weeks', status: 'pending' },
    { name: 'Building Enclosure', detail: 'Roofing and external walls', duration: '6 weeks', status: 'pending' },
    { name: 'Interior Work', detail: 'Internal finishes and fixtures', duration: '12 weeks', status: 'pending' },
    { name: 'Final Touches', detail: 'Landscaping and final inspections', duration: '4 weeks', status: 'pending' },
  ]

  return (
    <div className="max-w-5xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">Dashboard</h1>
        <p className="mt-2 text-stone-600 font-medium">Welcome to your construction project management dashboard</p>
      </header>

      <section className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <button
              key={action.name}
              className="flex flex-col items-start rounded-xl bg-stone-100/80 p-5 text-left transition-all hover:bg-stone-200"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <action.icon className="h-6 w-6 text-stone-600" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">{action.name}</h3>
              <p className="mt-1 text-xs text-stone-500">{action.detail}</p>
            </button>
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
              <p className="text-xs text-stone-600">Use voice commands to quickly perform actions</p>
            </div>
          </div>
          <button className="h-8 w-8 rounded-full bg-white/50 p-1 text-stone-600 transition-colors hover:bg-white">
            <MicrophoneIcon className="h-6 w-6" />
          </button>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 mb-4">Project Process Flow</h2>
        <div className="space-y-4 rounded-xl bg-stone-100/50 p-6">
          {processFlow.map((step, idx) => (
            <div key={step.name} className="relative flex items-start gap-4 pb-4 last:pb-0">
              {idx !== processFlow.length - 1 && (
                <div className="absolute left-2.5 top-6 h-full w-px bg-stone-300" />
              )}
              <div className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step.status === 'completed' ? 'bg-green-500 text-white' : 
                step.status === 'active' ? 'bg-blue-100 text-blue-600' : 'bg-stone-200 text-stone-500'
              }`}>
                {step.status === 'completed' ? <CheckCircleIcon className="h-5 w-5" /> : idx + 1}
              </div>
              <div className="flex flex-1 items-start justify-between gap-4">
                <div>
                  <h4 className={`text-sm font-bold ${step.status === 'pending' ? 'text-stone-400' : 'text-stone-900'}`}>{step.name}</h4>
                  <p className="mt-1 text-xs text-stone-500">{step.detail}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-stone-600">{step.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 mb-4">Recent Activity</h2>
        <div className="rounded-xl bg-stone-100/50 p-8 text-center">
          <p className="text-sm text-stone-500 italic">No recent activity to display</p>
        </div>
      </section>
    </div>
  )
}
