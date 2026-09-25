import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { supabase, supabaseConfigError } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  session: Session | null
  accessToken: string | null
  isLoading: boolean
  configurationError: string | null
  signInWithPassword: (email: string, password: string) => Promise<void>
  /** Resolves to true when Supabase has emailed a confirmation link (the user is not signed in yet). */
  signUpWithPassword: (email: string, password: string) => Promise<boolean>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    if (!supabase) {
      setIsLoading(false)
      return () => {
        active = false
      }
    }

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          throw error
        }

        if (!active) {
          return
        }

        setSession(data.session)
        setUser(data.session?.user ?? null)
      })
      .catch((error) => {
        console.error('Failed to initialize Supabase auth session.', error)

        if (!active) {
          return
        }

        setSession(null)
        setUser(null)
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      accessToken: session?.access_token ?? null,
      isLoading,
      configurationError: supabaseConfigError,
      async signInWithPassword(email: string, password: string) {
        if (!supabase) {
          throw new Error(supabaseConfigError ?? 'Supabase client is unavailable.')
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
          throw error
        }
      },
      async signUpWithPassword(email: string, password: string) {
        if (!supabase) {
          throw new Error(supabaseConfigError ?? 'Supabase client is unavailable.')
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + '/' },
        })

        if (error) {
          throw error
        }

        return !data.session
      },
      async signInWithGoogle() {
        if (!supabase) {
          throw new Error(supabaseConfigError ?? 'Supabase client is unavailable.')
        }

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/',
          },
        })

        if (error) {
          throw error
        }
      },
      async signOut() {
        if (!supabase) {
          throw new Error(supabaseConfigError ?? 'Supabase client is unavailable.')
        }

        const { error } = await supabase.auth.signOut()

        if (error) {
          throw error
        }
      },
    }),
    [isLoading, session, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
