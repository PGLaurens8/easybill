import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import Brand from '../components/Brand'

// A shared, low-privilege demo login. Only shown when both values are configured for the deployment.
const demoEmail = import.meta.env.VITE_DEMO_EMAIL
const demoPassword = import.meta.env.VITE_DEMO_PASSWORD

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { signInWithPassword, user, isLoading, configurationError } = useAuth()

  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'

  useEffect(() => {
    setError(null)
  }, [email, password])

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  const signIn = async (signInEmail: string, signInPassword: string) => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (configurationError) {
        throw new Error(configurationError)
      }

      await signInWithPassword(signInEmail, signInPassword)
      navigate(redirectTo, { replace: true })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void signIn(email, password)
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f4f1e6] px-6 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_30px_90px_rgba(15,23,36,0.18)] backdrop-blur sm:p-10">
        <Brand
          className="justify-center"
          markClassName="h-16 w-16"
          textClassName="text-center text-slate-900"
          showTagline
        />
        <div className="mt-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sign in to QuantEasy</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Professional commercial control for quantity surveyors and contractors.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {configurationError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {configurationError} Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, in the frontend environment before deploying.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div>
            <label htmlFor="email" className="block text-sm font-medium leading-6 text-slate-900">
              Email address
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium leading-6 text-slate-900">
              Password
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || Boolean(configurationError)}
            className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {demoEmail && demoPassword ? (
          <div className="mt-6 border-t border-stone-200 pt-6 text-center">
            <p className="text-sm text-slate-600">Just looking around?</p>
            <button
              type="button"
              className="btn btn-secondary mt-3 w-full"
              disabled={isSubmitting || Boolean(configurationError)}
              onClick={() => void signIn(demoEmail, demoPassword)}
            >
              Try the demo
            </button>
            <p className="mt-2 text-xs text-slate-500">Signs in to a shared demo workspace. Don’t enter real data.</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
