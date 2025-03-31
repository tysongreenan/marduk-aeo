import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthSession, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { AuthState, UserRoles } from '../types';

// Context type with auth state and methods
interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: Error | null, user: SupabaseUser | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  token: null,
  error: null,
  loading: true,
  role: UserRoles.User,
  permissions: [],
  lastActivity: Date.now(),
  signIn: async () => ({ error: new Error('AuthContext not initialized') }),
  signUp: async () => ({ error: new Error('AuthContext not initialized'), user: null }),
  signOut: async () => {},
  resetPassword: async () => ({ error: new Error('AuthContext not initialized') }),
  updatePassword: async () => ({ error: new Error('AuthContext not initialized') }),
});

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    error: null,
    loading: true,
    role: UserRoles.User,
    permissions: [],
    lastActivity: Date.now(),
  });

  // Function to get permissions based on user metadata
  const getPermissions = (user: SupabaseUser | null): string[] => {
    if (!user) return [];
    // Get permissions from user metadata - customize based on your needs
    const userRole = (user.user_metadata?.role as string) || 'user';
    
    switch (userRole) {
      case 'admin':
        return ['read', 'write', 'delete', 'admin'];
      case 'editor':
        return ['read', 'write', 'delete'];
      case 'user':
      default:
        return ['read'];
    }
  };

  // Update auth state with user and session
  const updateAuthState = (session: AuthSession | null) => {
    const user = session?.user || null;
    const token = session?.access_token || null;
    const role = (user?.user_metadata?.role as UserRoles) || UserRoles.User;
    
    // Convert Supabase user to our app's User type if needed
    // This is a simplified example - adapt as needed for your User type
    const appUser = user ? {
      ...user,
      // Add required fields from your User type that aren't in SupabaseUser
      organization_id: user.user_metadata?.organization_id || '',
      role: user.user_metadata?.role || 'user',
    } : null;
    
    setAuthState({
      isAuthenticated: !!session,
      user: appUser,
      token,
      error: null,
      loading: false,
      role,
      permissions: getPermissions(user),
      lastActivity: Date.now(),
    });
  };

  // Listen for auth changes
  useEffect(() => {
    // Set initial loading state
    setAuthState(prev => ({ ...prev, loading: true }));

    // Get initial session
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      updateAuthState(session);
    };

    initializeAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Supabase auth event: ${event}`);
      updateAuthState(session);
    });

    // Activity tracker for session security
    const activityHandler = () => {
      setAuthState(prev => ({ ...prev, lastActivity: Date.now() }));
    };

    // Track user activity for session management
    window.addEventListener('click', activityHandler);
    window.addEventListener('keypress', activityHandler);
    window.addEventListener('scroll', activityHandler);
    window.addEventListener('mousemove', activityHandler);

    return () => {
      // Clean up the auth listener and activity tracking
      subscription?.unsubscribe();
      window.removeEventListener('click', activityHandler);
      window.removeEventListener('keypress', activityHandler);
      window.removeEventListener('scroll', activityHandler);
      window.removeEventListener('mousemove', activityHandler);
    };
  }, []);

  // Session timeout checker
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
    const WARNING_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    let timeoutId: number;
    let warningId: number = 0; // Initialize with default value
    
    const checkSessionTimeout = () => {
      const now = Date.now();
      const timeSinceActivity = now - authState.lastActivity;
      
      if (timeSinceActivity >= SESSION_TIMEOUT) {
        // Auto sign out after session timeout
        signOut();
      } else if (timeSinceActivity >= SESSION_TIMEOUT - WARNING_TIME) {
        // Show warning when session is about to expire
        console.warn('Your session is about to expire. Please save your work.');
        // Here you could trigger a modal/notification
      }
      
      timeoutId = window.setTimeout(checkSessionTimeout, 60000); // Check every minute
    };

    timeoutId = window.setTimeout(checkSessionTimeout, 60000);
    
    return () => {
      window.clearTimeout(timeoutId);
      if (warningId) window.clearTimeout(warningId);
    };
  }, [authState.isAuthenticated, authState.lastActivity]);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setAuthState(prev => ({ ...prev, error: error.message, loading: false }));
        return { error };
      }
      
      return { error: null };
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, error: error.message, loading: false }));
      return { error };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {},
        },
      });
      
      if (error) {
        setAuthState(prev => ({ ...prev, error: error.message, loading: false }));
        return { error, user: null };
      }
      
      return { error: null, user: data.user };
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, error: error.message, loading: false }));
      return { error, user: null };
    }
  };

  // Sign out
  const signOut = async () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    await supabase.auth.signOut();
    // Auth state will be updated by the onAuthStateChange listener
  };

  // Password reset request
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        setAuthState(prev => ({ ...prev, error: error.message }));
        return { error };
      }
      
      return { error: null };
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, error: error.message }));
      return { error };
    }
  };

  // Update password
  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });
      
      if (error) {
        setAuthState(prev => ({ ...prev, error: error.message }));
        return { error };
      }
      
      return { error: null };
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, error: error.message }));
      return { error };
    }
  };

  const value = {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 