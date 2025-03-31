import { createClient } from '@supabase/supabase-js';

// These environment variables should be set in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. Using mock client instead.'
  );
}

// Create a mock Supabase client
const createMockClient = () => {
  // Mock user data
  const mockUser = {
    id: 'mock-user-id',
    email: 'mock@example.com',
    user_metadata: {
      organization_id: 'mock-org-id',
      role: 'user'
    }
  };

  // Mock session data
  const mockSession = {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Date.now() + 3600000, // 1 hour from now
    user: mockUser
  };

  return {
    auth: {
      getSession: async () => ({
        data: { session: mockSession },
        error: null
      }),
      getUser: async () => ({
        data: { user: mockUser },
        error: null
      }),
      signInWithPassword: async () => ({
        data: { session: mockSession, user: mockUser },
        error: null
      }),
      signUp: async () => ({
        data: { session: mockSession, user: mockUser },
        error: null
      }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } }
      })
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: {}, error: null }),
          order: () => ({
            limit: () => ({
              execute: async () => ({ data: [], error: null })
            })
          }),
          execute: async () => ({ data: [], error: null })
        }),
        order: () => ({ 
          execute: async () => ({ data: [], error: null }),
          limit: () => ({
            execute: async () => ({ data: [], error: null })
          })
        })
      }),
      insert: () => ({
        select: () => ({
          execute: async () => ({ data: [{ id: 'mock-id' }], error: null })
        })
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            execute: async () => ({ data: [{ id: 'mock-id' }], error: null })
          })
        })
      }),
      delete: () => ({
        eq: () => ({
          execute: async () => ({ error: null })
        })
      })
    })
  };
};

/**
 * Creates and exports a Supabase client.
 * In development with missing credentials, this uses a mock client.
 */
export const supabase = (!supabaseUrl || !supabaseAnonKey) 
  ? createMockClient() 
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce', // More secure auth flow
      },
    });

/**
 * Utility function to get the current user
 * @returns The current user or null if not authenticated
 */
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * Utility function to check if a user is authenticated
 * @returns Boolean indicating if user is authenticated
 */
export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session !== null;
};

/**
 * Utility function to handle logout
 */
export const handleLogout = async () => {
  await supabase.auth.signOut();
  window.location.href = '/login';
};

/**
 * Helper to get auth token - useful for debugging but should not be used to store token
 * as Supabase handles this securely
 */
export const getAuthToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}; 