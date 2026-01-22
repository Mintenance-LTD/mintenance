import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthService } from '../services/AuthService';
import { NotificationService } from '../services/NotificationService';
import type { User } from '@mintenance/types';
import { handleError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { setUserContext, trackUserAction, addBreadcrumb, measureAsyncPerformance } from '../utils/sentryUtils';
import { useBiometricAuth } from '../hooks/useBiometricAuth';

// SECURITY: SecureStore keys for session persistence
const SESSION_KEY = 'mintenance_session';
const SESSION_EXPIRY_KEY = 'mintenance_session_expiry';

// TOKEN EXPIRATION FIX: Parse JWT payload to check expiration
const parseJWT = (token: string): { exp?: number } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64Url);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null | null; // Add session for compatibility with tests
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    userData: {
      firstName: string;
      lastName: string;
      role: 'homeowner' | 'contractor';
    }
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  // Biometric methods
  signInWithBiometrics: () => Promise<void>;
  isBiometricAvailable: () => Promise<boolean>;
  isBiometricEnabled: () => Promise<boolean>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  const biometricAuth = useBiometricAuth();

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const initialize = async () => {
      // Check for existing session only if mounted
      if (mounted) {
        await checkUser();
        await biometricAuth.checkBiometricAvailability();
      }

      // TOKEN EXPIRATION FIX: Set up auth state listener for session changes
      const authStateSubscription = AuthService.onAuthStateChange(async (event: string, session: unknown) => {
        if (!mounted) return;

        logger.info('[AUTH] Auth state changed:', { event, hasSession: !!session });

        // Handle token refresh events
        if (event === 'TOKEN_REFRESHED') {
          setSession(session);
          if (session) {
            await saveSessionToSecureStore(session);
            logger.info('[AUTH] Token auto-refreshed and persisted');
          }
        }

        // Handle signed out (expired token, manual signout, etc.)
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          await clearSessionFromSecureStore();
          logger.info('[AUTH] User signed out, session cleared');
        }

        // Handle signed in
        if (event === 'SIGNED_IN' && session) {
          const user = await AuthService.getCurrentUser();
          setUser(user);
          setSession(session);
          setUserContext(user);
          await saveSessionToSecureStore(session);
          logger.info('[AUTH] User signed in, session persisted');
        }
      });

      unsubscribe = () => {
        authStateSubscription?.data?.subscription?.unsubscribe();
      };
    };

    initialize().catch(error => {
      if (mounted) {
        logger.error('Failed to initialize auth:', error);
      }
    });

    // Cleanup function
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []); // Empty deps - only run once on mount

  const initializePushNotifications = async (userId: string) => {
    try {
      const token = await NotificationService.initialize();
      if (token) {
        await NotificationService.savePushToken(userId, token);
      }
    } catch (error) {
      logger.error('Failed to initialize push notifications:', error);
    }
  };

  // SECURITY FIX: Persist session to SecureStore
  const saveSessionToSecureStore = async (sessionData: unknown) => {
    try {
      if (!sessionData) return;

      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(sessionData));

      // Store expiry time (sessions valid for 7 days)
      const expiryTime = Date.now() + (7 * 24 * 60 * 60 * 1000);
      await SecureStore.setItemAsync(SESSION_EXPIRY_KEY, expiryTime.toString());

      logger.info('[AUTH] Session persisted to SecureStore');
    } catch (error) {
      logger.error('[AUTH] Failed to persist session:', error);
    }
  };

  // SECURITY FIX: Load session from SecureStore
  const loadSessionFromSecureStore = async () => {
    try {
      const sessionJson = await SecureStore.getItemAsync(SESSION_KEY);
      const expiryTime = await SecureStore.getItemAsync(SESSION_EXPIRY_KEY);

      if (!sessionJson || !expiryTime) {
        logger.info('[AUTH] No persisted session found');
        return null;
      }

      // Check if session expired
      const now = Date.now();
      const expiry = parseInt(expiryTime, 10);

      if (now > expiry) {
        logger.warn('[AUTH] Persisted session expired, clearing');
        await clearSessionFromSecureStore();
        return null;
      }

      const session = JSON.parse(sessionJson);
      logger.info('[AUTH] Session restored from SecureStore');
      return session;
    } catch (error) {
      logger.error('[AUTH] Failed to load session:', error);
      return null;
    }
  };

  // SECURITY FIX: Clear session from SecureStore
  const clearSessionFromSecureStore = async () => {
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      await SecureStore.deleteItemAsync(SESSION_EXPIRY_KEY);
      logger.info('[AUTH] Session cleared from SecureStore');
    } catch (error) {
      logger.error('[AUTH] Failed to clear session:', error);
    }
  };

  const checkUser = async () => {
    try {
      // SECURITY FIX: Try to restore session from SecureStore first
      const persistedSession = await loadSessionFromSecureStore();

      if (persistedSession) {
        setSession(persistedSession);
        logger.info('[AUTH] Using persisted session');

        // TOKEN EXPIRATION FIX: Check if access token is expired
        if (persistedSession.access_token) {
          const tokenPayload = parseJWT(persistedSession.access_token);
          const now = Math.floor(Date.now() / 1000);

          // Token expires in less than 5 minutes or already expired
          if (tokenPayload?.exp && tokenPayload.exp < now + 300) {
            logger.info('[AUTH] Token expired or expiring soon, refreshing...');

            try {
              const refreshedData = await AuthService.refreshToken();
              if (refreshedData?.session) {
                setSession(refreshedData.session);
                await saveSessionToSecureStore(refreshedData.session);
                logger.info('[AUTH] Token refreshed successfully');
              }
            } catch (refreshError) {
              logger.error('[AUTH] Token refresh failed:', refreshError);
              // Clear invalid session
              await clearSessionFromSecureStore();
              setSession(null);
              setUser(null);
              setLoading(false);
              return;
            }
          }
        }
      }

      const user = await measureAsyncPerformance(
        () => AuthService.getCurrentUser(),
        'auth.check_user',
        'auth'
      );
      setUser(user);
      setUserContext(user);

      const activeSession = await AuthService.getCurrentSession();

      // SECURITY FIX: Persist session to SecureStore
      if (activeSession) {
        setSession(activeSession);
        await saveSessionToSecureStore(activeSession);
      }

      if (user) {
        addBreadcrumb(`User session restored: ${user.email}`, 'auth');
        initializePushNotifications(user.id);
      }
    } catch (error) {
      handleError(error, 'Auth check');
    } finally {
      // FIXED: Use single state update to prevent race conditions
      // The triple state update was causing infinite re-renders and stuck loading states
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    trackUserAction('auth.sign_in_attempt', { email });

    try {
      const result = await measureAsyncPerformance(
        () => AuthService.signIn(email, password),
        'auth.sign_in',
        'auth'
      );

      let user;
      let authSession = result?.session ?? null;
      if (result?.user) {
        user = result.user;
      } else {
        user = await AuthService.getCurrentUser();
      }

      if (!authSession) {
        authSession = await AuthService.getCurrentSession();
      }

      setUser(user);
      setUserContext(user);
      setSession(authSession);

      if (user) {
        trackUserAction('auth.sign_in_success', {
          userId: user.id,
          role: user.role,
        });
        addBreadcrumb(`User signed in: ${user.email}`, 'auth');
        initializePushNotifications(user.id);

        if (
          biometricAuth.biometricAvailable &&
          authSession?.access_token &&
          authSession?.refresh_token &&
          !(await biometricAuth.isBiometricEnabled())
        ) {
          biometricAuth.promptEnableBiometric(user, authSession);
        }
      }
    } catch (error) {
      trackUserAction('auth.sign_in_failed', {
        email,
        error: (error as Error).message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: {
      firstName: string;
      lastName: string;
      role: 'homeowner' | 'contractor';
    }
  ) => {
    setLoading(true);
    trackUserAction('auth.sign_up_attempt', {
      email,
      role: userData.role,
    });

    try {
      await measureAsyncPerformance(
        () =>
          AuthService.signUp({
            email,
            password,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
          }),
        'auth.sign_up',
        'auth'
      );

      const user = await AuthService.getCurrentUser();
      const authSession = await AuthService.getCurrentSession();
      setUser(user);
      setUserContext(user);
      setSession(authSession);

      if (user) {
        trackUserAction('auth.sign_up_success', {
          userId: user.id,
          role: user.role,
        });
        addBreadcrumb(`New user registered: ${user.email}`, 'auth');

        if (
          biometricAuth.biometricAvailable &&
          authSession?.access_token &&
          authSession?.refresh_token
        ) {
          setTimeout(() => {
            biometricAuth.promptEnableBiometric(user, authSession);
          }, 2000); // Wait a bit longer for new users
        }
      }
    } catch (error) {
      trackUserAction('auth.sign_up_failed', {
        email,
        role: userData.role,
        error: (error as Error).message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const currentUser = user;
      trackUserAction('auth.sign_out_attempt', {
        userId: currentUser?.id,
      });

      await measureAsyncPerformance(
        () => AuthService.signOut(),
        'auth.sign_out',
        'auth'
      );

      setUser(null);
      setUserContext(null);
      setSession(null);

      // SECURITY FIX: Clear persisted session from SecureStore
      await clearSessionFromSecureStore();

      // Clear query cache and offline queue when user logs out
      try {
        const { queryClient } = await import('../lib/queryClient');
        const { OfflineManager } = await import('../services/OfflineManager');
        queryClient.clear();
        OfflineManager.clearQueue();
        logger.info('User logged out, cleared cache and offline queue');
      } catch (e) {
        logger.warn('Could not clear cache on logout:', e);
      }

      trackUserAction('auth.sign_out_success', {
        userId: currentUser?.id,
      });
      addBreadcrumb('User signed out', 'auth');
    } catch (error) {
      trackUserAction('auth.sign_out_failed', {
        userId: user?.id,
        error: (error as Error).message,
      });
      handleError(error, 'Sign out');
    }
  };

  // Biometric authentication methods
  const signInWithBiometrics = async () => {
    setLoading(true);
    try {
      const result = await biometricAuth.signInWithBiometrics();
      if (result) {
        setUser(result.user);
        setUserContext(result.user);
        setSession(result.session);
        initializePushNotifications(result.user.id);
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const isBiometricAvailable = async (): Promise<boolean> => {
    return biometricAuth.isBiometricAvailable();
  };

  const isBiometricEnabled = async (): Promise<boolean> => {
    return biometricAuth.isBiometricEnabled();
  };

  const enableBiometric = async (): Promise<void> => {
    if (!user) {
      throw new Error(
        'User must be signed in to enable biometric authentication'
      );
    }

    let activeSession = session;
    if (!activeSession?.access_token || !activeSession?.refresh_token) {
      activeSession = await AuthService.getCurrentSession();
      setSession(activeSession);
    }

    await biometricAuth.enableBiometric(user, activeSession);
  };

  const disableBiometric = async (): Promise<void> => {
    await biometricAuth.disableBiometric();
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile: async (userData: Partial<User>) => {
      if (!user) {
        throw new Error('User must be signed in to update profile');
      }

      try {
        trackUserAction('auth.update_profile_attempt', {
          userId: user.id,
        });

        const updatedUser = await measureAsyncPerformance(
          () => AuthService.updateUserProfile(user.id, userData),
          'auth.update_profile',
          'auth'
        );

        setUser(updatedUser);
        setUserContext(updatedUser);

        trackUserAction('auth.update_profile_success', {
          userId: user.id,
        });
        addBreadcrumb(`Profile updated for user: ${user.email}`, 'auth');
      } catch (error) {
        trackUserAction('auth.update_profile_failed', {
          userId: user.id,
          error: (error as Error).message,
        });
        handleError(error, 'Update profile');
        throw error;
      }
    },
    // Biometric methods
    signInWithBiometrics,
    isBiometricAvailable,
    isBiometricEnabled,
    enableBiometric,
    disableBiometric,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
