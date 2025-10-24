import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { AuthService } from '../services/AuthService';
import { NotificationService } from '../services/NotificationService';
import { User } from '../types';
import { handleError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { setUserContext, trackUserAction, addBreadcrumb, measureAsyncPerformance } from '../utils/sentryUtils';
import { useBiometricAuth } from '../hooks/useBiometricAuth';

interface AuthContextType {
  user: User | null;
  session: any | null; // Add session for compatibility with tests
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

      // Set up auth state listener
      const { data } = await AuthService.getCurrentSession();
      if (data && mounted) {
        // Subscribe to auth state changes
        // In production, set up real-time listener here
        // Example: const { data: { subscription } } = supabase.auth.onAuthStateChange(...)
        // unsubscribe = () => subscription?.unsubscribe();
      }
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


  const checkUser = async () => {
    try {
      const user = await measureAsyncPerformance(
        () => AuthService.getCurrentUser(),
        'auth.check_user',
        'auth'
      );
      setUser(user);
      setUserContext(user);

      const activeSession = await AuthService.getCurrentSession();
      setSession(activeSession);

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
