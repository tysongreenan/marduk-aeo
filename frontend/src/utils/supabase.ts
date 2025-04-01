import { createClient } from '@supabase/supabase-js';

// These environment variables should be set in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const bypassEnvCheck = import.meta.env.VITE_BYPASS_ENV_CHECK === 'true';

// Validate environment variables and determine if we should use mock
const shouldUseMock = 
  (!supabaseUrl || !supabaseAnonKey) || // Missing credentials
  (supabaseUrl?.includes('your-project-ref') || supabaseAnonKey?.includes('your-anon-key')) || // Default placeholder values
  bypassEnvCheck; // Explicitly using mock in development

if (shouldUseMock) {
  console.warn(
    'Using mock Supabase client for development. To use real authentication, set proper Supabase credentials in .env'
  );
}

// Create a mock Supabase client
const createMockClient = () => {
  // Mock user data for demo
  const mockUser = {
    id: 'demo-user-123',
    email: 'demo@example.com',
    user_metadata: {
      organization_id: 'Acme Corporation',
      role: 'Admin'
    }
  };

  // Mock session data
  const mockSession = {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Date.now() + 3600000, // 1 hour from now
    user: mockUser
  };

  console.log('📣 USING MOCK CLIENT - Demo mode activated');

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
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        console.log(`Login attempt: ${email}`);
        
        // Accept demo credentials for investor testing
        if (email === 'demo@example.com' && password === 'password123') {
          console.log('Demo login successful!');
          return { data: { session: mockSession, user: mockUser }, error: null };
        }
        
        // Accept test credentials if configured
        const testEmail = import.meta.env.VITE_DASHBOARD_USERNAME;
        const testPassword = import.meta.env.VITE_DASHBOARD_PASSWORD;
        
        if (email === testEmail && password === testPassword) {
          console.log('Test credentials accepted!');
          return { data: { session: mockSession, user: mockUser }, error: null };
        }
        
        // Return error for invalid credentials
        return { 
          data: { session: null, user: null }, 
          error: { message: 'Invalid login credentials' } 
        };
      },
      signUp: async (credentials: any) => {
        console.log('Mock signup:', credentials);
        return { data: { session: mockSession, user: mockUser }, error: null };
      },
      signOut: async () => ({ error: null }),
      onAuthStateChange: (callback: any) => {
        // Immediately trigger with mock session
        callback('SIGNED_IN', mockSession);
        return {
          data: { subscription: { unsubscribe: () => {} } }
        };
      }
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
    }),
    functions: {
      invoke: async () => ({
        data: { message: "Success" },
        error: null
      })
    }
  };
};

/**
 * Creates and exports a Supabase client.
 * In development with missing credentials, this uses a mock client.
 */
export const supabase = shouldUseMock
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