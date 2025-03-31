import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Creates a Supabase client for server-side operations with service role permissions
 * This client has full database access and should only be used in server contexts
 */
export const createServerClient = () => {
  return createClient<Database>(supabaseUrl, supabaseServiceKey)
}

/**
 * Creates a Supabase client for browser-side operations with anonymous permissions
 * This client is safe to use in client components and has RLS policies applied
 */
export const createBrowserClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}

/**
 * Helper function to get Edge Function URL prefix for the current Supabase project
 */
export const getEdgeFunctionUrl = () => {
  return `${supabaseUrl}/functions/v1`
} 