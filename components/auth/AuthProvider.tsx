'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createBrowserClient } from '../../src/lib/supabase/client'
import { Session, User, AuthError, AuthChangeEvent } from '@supabase/supabase-js'

// Create context
interface AuthContextType {
  user: User | null
  isLoading: boolean
  isEnvironmentReady: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEnvironmentReady, setIsEnvironmentReady] = useState(false)
  
  // Check if environment variables are set
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    setIsEnvironmentReady(!!supabaseUrl && !!supabaseAnonKey)
  }, [])
  
  // Initialize Supabase client and set up auth state listener
  useEffect(() => {
    if (!isEnvironmentReady) {
      setIsLoading(false)
      return
    }
    
    const supabase = createBrowserClient()
    
    // Set initial user
    const initUser = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setUser(data.session?.user || null)
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user || null)
      }
    )

    // Cleanup on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [isEnvironmentReady])

  // Sign in function
  const signIn = async (email: string, password: string) => {
    if (!isEnvironmentReady) {
      return { error: new Error('Supabase environment not configured') as unknown as AuthError }
    }
    
    const supabase = createBrowserClient()
    return await supabase.auth.signInWithPassword({ email, password })
  }
  
  // Sign up function
  const signUp = async (email: string, password: string) => {
    if (!isEnvironmentReady) {
      return { error: new Error('Supabase environment not configured') as unknown as AuthError }
    }
    
    const supabase = createBrowserClient()
    return await supabase.auth.signUp({ email, password })
  }
  
  // Sign out function
  const signOut = async () => {
    if (!isEnvironmentReady) {
      return
    }
    
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
  }

  // Context value
  const value = {
    user,
    isLoading,
    isEnvironmentReady,
    signIn,
    signUp,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 