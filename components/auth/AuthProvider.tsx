'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { createBrowserClient } from '@/lib/supabase/client'

// Create auth context
type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  
  // Initialize the Supabase client
  const supabase = createBrowserClient()
  
  // Check for session on mount and setup listener
  useEffect(() => {
    const setupAuth = async () => {
      // Get initial session
      const { data: { session: initialSession } } = await supabase.auth.getSession()
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      setIsLoading(false)
      
      // Listen for auth changes
      const { data: { subscription } } = await supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession)
          setUser(newSession?.user ?? null)
        }
      )
      
      // Cleanup on unmount
      return () => {
        subscription.unsubscribe()
      }
    }
    
    setupAuth()
  }, [supabase.auth])
  
  // Auth methods
  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    const result = await supabase.auth.signInWithPassword({ email, password })
    setIsLoading(false)
    return { error: result.error }
  }
  
  const signUp = async (email: string, password: string) => {
    setIsLoading(true)
    const result = await supabase.auth.signUp({ email, password })
    setIsLoading(false)
    return { error: result.error }
  }
  
  const signOut = async () => {
    await supabase.auth.signOut()
  }
  
  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut
  }
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 