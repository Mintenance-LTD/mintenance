/**
 * React Hook for Authentication
 * Works with both Next.js and React Native
 */
import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { logger } from '@mintenance/shared';
import { UnifiedAuthService, AuthTokens, SignUpData, AuthCredentials } from '../core/UnifiedAuthService';
export interface AuthContextValue {
  user: unknown | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: AuthCredentials) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUser: (data: Record<string, unknown>) => Promise<void>;
  // Mobile-specific
  signInWithBiometric?: () => Promise<void>;
  enableBiometric?: () => Promise<void>;
  disableBiometric?: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export interface AuthProviderProps {
  children: ReactNode;
  auth: UnifiedAuthService;
  onAuthStateChange?: (user: unknown | null) => void;
}
/**
 * Authentication Provider Component
 */
export function AuthProvider({ children, auth, onAuthStateChange }: AuthProviderProps) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);
  // Notify on auth state changes
  useEffect(() => {
    if (onAuthStateChange) {
      onAuthStateChange(user);
    }
  }, [user, onAuthStateChange]);
  /**
   * Initialize authentication state
   */
  async function initializeAuth() {
    try {
      setIsLoading(true);
      // Platform-specific initialization
      if ('restoreSession' in auth) {
        // Mobile: Restore from SecureStore
        const tokens = await (auth as any).restoreSession();
        if (tokens) {
          setUser(tokens.user);
        }
      } else if (typeof window !== 'undefined') {
        // Web: Get current user from cookies
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      }
    } catch (error) {
      logger.error('Failed to initialize auth:', error);
    } finally {
      setIsLoading(false);
    }
  }
  /**
   * Sign in user
   */
  async function signIn(credentials: AuthCredentials) {
    try {
      setIsLoading(true);
      const tokens = await auth.signIn(credentials);
      setUser(tokens.user);
      // Platform-specific post-sign-in
      if (typeof window !== 'undefined' && !('restoreSession' in auth)) {
        // Web: Redirect or update UI
        window.location.href = '/dashboard';
      }
    } catch (error) {
      logger.error('Sign in failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }
  /**
   * Sign up user
   */
  async function signUp(data: SignUpData) {
    try {
      setIsLoading(true);
      const tokens = await auth.signUp(data);
      setUser(tokens.user);
      // Platform-specific post-sign-up
      if (typeof window !== 'undefined' && !('restoreSession' in auth)) {
        // Web: Redirect to onboarding
        window.location.href = '/onboarding';
      }
    } catch (error) {
      logger.error('Sign up failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }
  /**
   * Sign out user
   */
  async function signOut() {
    try {
      setIsLoading(true);
      await auth.signOut(user?.id, '');
      setUser(null);
      // Platform-specific post-sign-out
      if (typeof window !== 'undefined' && !('restoreSession' in auth)) {
        // Web: Redirect to home
        window.location.href = '/';
      }
    } catch (error) {
      logger.error('Sign out failed:', error);
    } finally {
      setIsLoading(false);
    }
  }
  /**
   * Refresh access token
   */
  async function refreshToken() {
    try {
      const tokens = await auth.refreshAccessToken('');
      setUser(tokens.user);
    } catch (error) {
      logger.error('Token refresh failed:', error);
      // Force sign out if refresh fails
      await signOut();
    }
  }
  /**
   * Update user profile
   */
  async function updateUser(data: Record<string, unknown>) {
    try {
      setIsLoading(true);
      // Implementation depends on backend API
      // This is a placeholder
      const updatedUser = { ...user, ...(data as any) };
      setUser(updatedUser);
    } catch (error) {
      logger.error('Update user failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }
  /**
   * Sign in with biometric (mobile only)
   */
  async function signInWithBiometric() {
    if (!('signInWithBiometric' in auth)) {
      throw new Error('Biometric authentication not available');
    }
    try {
      setIsLoading(true);
      const tokens = await (auth as any).signInWithBiometric();
      setUser(tokens.user);
    } catch (error) {
      logger.error('Biometric sign in failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }
  /**
   * Enable biometric authentication (mobile only)
   */
  async function enableBiometric() {
    if (!('enableBiometric' in auth)) {
      throw new Error('Biometric authentication not available');
    }
    try {
      await (auth as any).enableBiometric();
    } catch (error) {
      logger.error('Failed to enable biometric:', error);
      throw error;
    }
  }
  /**
   * Disable biometric authentication (mobile only)
   */
  async function disableBiometric() {
    if (!('disableBiometric' in auth)) {
      throw new Error('Biometric authentication not available');
    }
    try {
      await (auth as any).disableBiometric();
    } catch (error) {
      logger.error('Failed to disable biometric:', error);
      throw error;
    }
  }
  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    refreshToken,
    updateUser,
    // Mobile-specific (optional)
    signInWithBiometric: 'signInWithBiometric' in auth ? signInWithBiometric : undefined,
    enableBiometric: 'enableBiometric' in auth ? enableBiometric : undefined,
    disableBiometric: 'disableBiometric' in auth ? disableBiometric : undefined,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
/**
 * HOC to require authentication
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function WithAuthComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading) {
      return <div>Loading...</div>;
    }
    if (!isAuthenticated) {
      // Platform-specific redirect
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return null;
    }
    return <Component {...props} />;
  };
}