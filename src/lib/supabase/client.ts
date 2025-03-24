import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Safe environment variable access
const getSupabaseUrl = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

const getAnonKey = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

const getServiceRoleKey = () => {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

/**
 * Creates a Supabase client for server-side operations with service role permissions
 * This client has full database access and should only be used in server contexts
 * 
 * @returns Typed Supabase client with service role permissions
 */
export const createServerClient = () => {
  // If environment variables aren't available (during build), return a mock client
  if (!getSupabaseUrl() || !getServiceRoleKey()) {
    console.warn('Missing Supabase environment variables for server client')
    // Return a dummy client during build
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                data: [],
                error: null
              }),
              data: [],
              error: null
            }),
            limit: () => ({
              data: [],
              error: null
            }),
            single: () => ({
              data: null,
              error: null
            }),
            data: [],
            error: null
          }),
          in: () => ({
            data: [],
            error: null
          }),
          data: [],
          error: null
        })
      }),
      auth: {
        getSession: async () => ({ data: { session: null } }),
        signOut: async () => {},
      },
      functions: {
        invoke: async () => ({ data: null, error: null })
      }
    } as any
  }

  return createClient<Database>(
    getSupabaseUrl(),
    getServiceRoleKey()
  )
}

/**
 * Creates a Supabase client for browser-side operations with anonymous permissions
 * This client is safe to use in client components and has RLS policies applied
 * 
 * @returns Typed Supabase client with anonymous permissions
 */
export const createBrowserClient = () => {
  // If environment variables aren't available (during build), return a mock client
  if (!getSupabaseUrl() || !getAnonKey()) {
    console.warn('Missing Supabase environment variables for browser client')
    // Return a dummy client during build
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            data: [],
            error: null
          }),
          data: [],
          error: null
        })
      }),
      auth: {
        getSession: async () => ({ data: { session: null } }),
        signInWithPassword: async () => ({ data: { session: null }, error: null }),
        signUp: async () => ({ data: { session: null }, error: null }),
        signOut: async () => {},
        onAuthStateChange: async () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      functions: {
        invoke: async () => ({ data: null, error: null })
      }
    } as any
  }

  return createClient<Database>(
    getSupabaseUrl(),
    getAnonKey()
  )
}

/**
 * Helper function to get Edge Function URL prefix for the current Supabase project
 * 
 * @returns Edge Function URL prefix
 */
export const getEdgeFunctionUrl = () => {
  const url = getSupabaseUrl()
  // Return a safe value if URL is not available during build
  if (!url) return ''
  // Convert from https://project-ref.supabase.co to https://project-ref.supabase.co/functions/v1
  return `${url}/functions/v1`
} 