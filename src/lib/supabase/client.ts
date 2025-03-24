import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Safe environment variable access with validation
const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    console.warn('NEXT_PUBLIC_SUPABASE_URL is not set')
    return ''
  }
  // Validate URL format
  try {
    new URL(url)
    return url
  } catch (error) {
    console.error('Invalid NEXT_PUBLIC_SUPABASE_URL format:', url)
    return ''
  }
}

const getAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
    return ''
  }
  // Basic key format validation
  if (!key.match(/^ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)) {
    console.error('Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY format')
    return ''
  }
  return key
}

const getServiceRoleKey = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is not set')
    return ''
  }
  // Basic key format validation
  if (!key.match(/^ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)) {
    console.error('Invalid SUPABASE_SERVICE_ROLE_KEY format')
    return ''
  }
  return key
}

// Mock client factory with improved error handling
const createMockClient = (clientType: 'server' | 'browser') => {
  const errorMessage = `Supabase ${clientType} client not initialized - environment variables missing or invalid`
  
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          data: [],
          error: new Error(errorMessage)
        }),
        data: [],
        error: new Error(errorMessage)
      })
    }),
    auth: {
      getSession: async () => ({ 
        data: { session: null },
        error: new Error(errorMessage)
      }),
      signInWithPassword: async () => ({
        data: { session: null },
        error: new Error(errorMessage)
      }),
      signUp: async () => ({
        data: { session: null },
        error: new Error(errorMessage)
      }),
      signOut: async () => {},
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } }
      })
    },
    functions: {
      invoke: async () => ({
        data: null,
        error: new Error(errorMessage)
      })
    }
  } as any // This is acceptable for mock client during build
}

/**
 * Creates a Supabase client for server-side operations with service role permissions
 * This client has full database access and should only be used in server contexts
 * 
 * @returns Typed Supabase client with service role permissions
 */
export const createServerClient = () => {
  const url = getSupabaseUrl()
  const serviceKey = getServiceRoleKey()

  if (!url || !serviceKey) {
    return createMockClient('server')
  }

  try {
    return createClient<Database>(url, serviceKey)
  } catch (error) {
    console.error('Error creating Supabase server client:', error)
    return createMockClient('server')
  }
}

/**
 * Creates a Supabase client for browser-side operations with anonymous permissions
 * This client is safe to use in client components and has RLS policies applied
 * 
 * @returns Typed Supabase client with anonymous permissions
 */
export const createBrowserClient = () => {
  const url = getSupabaseUrl()
  const anonKey = getAnonKey()

  if (!url || !anonKey) {
    return createMockClient('browser')
  }

  try {
    return createClient<Database>(url, anonKey)
  } catch (error) {
    console.error('Error creating Supabase browser client:', error)
    return createMockClient('browser')
  }
}

/**
 * Helper function to get Edge Function URL prefix for the current Supabase project
 * 
 * @returns Edge Function URL prefix
 */
export const getEdgeFunctionUrl = () => {
  const url = getSupabaseUrl()
  if (!url) {
    console.warn('Cannot generate Edge Function URL - NEXT_PUBLIC_SUPABASE_URL is not set')
    return ''
  }
  return `${url}/functions/v1`
} 