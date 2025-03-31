'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { createBrowserClient } from '@/lib/supabase/client'

// Define auth context type with improved error handling
interface AuthContextType {
  user: User | null
  loading: boolean
  error: Error | null
  isEnvironmentReady: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

// Create auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  isEnvironmentReady: false,
  signIn: async () => ({ error: new Error('AuthContext not initialized') }),
  signUp: async () => ({ error: new Error('AuthContext not initialized') }),
  signOut: async () => {},
})

// Check if environment is properly configured
const checkEnvironment = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Missing required environment variables for authentication')
    return false
  }

  try {
    new URL(url) // Validate URL format
    if (!key.match(/^ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)) {
      console.error('Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY format')
      return false
    }
    return true
  } catch (e) {
    console.error('Invalid NEXT_PUBLIC_SUPABASE_URL format:', url)
    return false
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isEnvironmentReady, setIsEnvironmentReady] = useState(false)

  useEffect(() => {
    // Check environment configuration
    const envReady = checkEnvironment()
    setIsEnvironmentReady(envReady)
    if (!envReady) {
      setError(new Error('Authentication environment not properly configured'))
      setLoading(false)
      return
    }

    // Initialize Supabase client
    const supabase = createBrowserClient()

    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        setUser(session?.user ?? null)
      } catch (e) {
        console.error('Error getting initial session:', e)
        setError(e instanceof Error ? e : new Error('Unknown error during session initialization'))
      } finally {
        setLoading(false)
      }
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null)
        setError(null) // Clear any previous errors on successful auth state change
      }
    )

    initSession()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!isEnvironmentReady) {
      return { error: new Error('Authentication environment not properly configured') }
    }

    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return { error: null }
    } catch (e) {
      console.error('Sign in error:', e)
      return { error: e instanceof Error ? e : new Error('Unknown error during sign in') }
    }
  }

  const signUp = async (email: string, password: string) => {
    if (!isEnvironmentReady) {
      return { error: new Error('Authentication environment not properly configured') }
    }

    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      return { error: null }
    } catch (e) {
      console.error('Sign up error:', e)
      return { error: e instanceof Error ? e : new Error('Unknown error during sign up') }
    }
  }

  const signOut = async () => {
    if (!isEnvironmentReady) {
      console.warn('Cannot sign out - authentication environment not properly configured')
      return
    }

    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
    } catch (e) {
      console.error('Sign out error:', e)
      setError(e instanceof Error ? e : new Error('Unknown error during sign out'))
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      isEnvironmentReady,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context with proper error handling
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 