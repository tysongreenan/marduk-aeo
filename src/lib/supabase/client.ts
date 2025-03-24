import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Make sure environment variables are present
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

/**
 * Creates a Supabase client for server-side operations with service role permissions
 * This client has full database access and should only be used in server contexts
 * 
 * @returns Typed Supabase client with service role permissions
 */
export const createServerClient = () => {
  // Make sure the service role key is only used on the server
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

/**
 * Creates a Supabase client for browser-side operations with anonymous permissions
 * This client is safe to use in client components and has RLS policies applied
 * 
 * @returns Typed Supabase client with anonymous permissions
 */
export const createBrowserClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Helper function to get Edge Function URL prefix for the current Supabase project
 * 
 * @returns Edge Function URL prefix
 */
export const getEdgeFunctionUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Convert from https://project-ref.supabase.co to https://project-ref.supabase.co/functions/v1
  return `${url}/functions/v1`
} 