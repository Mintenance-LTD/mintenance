import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { AuthService } from '../services/AuthService';
import { NotificationService } from '../services/NotificationService';
import { BiometricService } from '../services/BiometricService';
import { User } from '../types';
import { handleError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

// Safe Sentry imports
let sentryFunctions: any = {};
try {
  const sentry = require('../config/sentry');
  sentryFunctions = {
    setUserContext: sentry.setUserContext || (() => {}),
    trackUserAction: sentry.trackUserAction || (() => {}),
    addBreadcrumb: sentry.addBreadcrumb || (() => {}),
    measureAsyncPerformance:
      sentry.measureAsyncPerformance || ((fn: any) => fn()),
  };
} catch (error) {
  console.log('Sentry not available, using no-op functions');
  sentryFunctions = {
    setUserContext: () => {},
    trackUserAction: () => {},
    addBreadcrumb: () => {},
    measureAsyncPerformance: (fn: any) => fn(),
  };
}

const {
  setUserContext,
  trackUserAction,
  addBreadcrumb,
  measureAsyncPerformance,
} = sentryFunctions;

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
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    // Check for existing session
    checkUser();

    // Check biometric availability
    checkBiometricAvailability();

    // Listen for auth changes
    const setupAuthListener = async () => {
      const session = await AuthService.getCurrentSession();
      // In a real app, you'd set up auth state change listener here
    };

    setupAuthListener();
  }, []);

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

  const checkBiometricAvailability = async () => {
    try {
      const available = await BiometricService.isAvailable();
      setBiometricAvailable(available);
    } catch (error) {
      logger.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
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

      if (user) {
        addBreadcrumb(`User session restored: ${user.email}`, 'auth');
        initializePushNotifications(user.id);
      }
    } catch (error) {
      handleError(error, 'Auth check');
    } finally {
      // Ensure loading always clears for tests even if microtasks are queued
      setLoading(false);
      setTimeout(() => setLoading(false), 0);
      Promise.resolve().then(() => setLoading(false));
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

      // If signIn returns user data directly, use it
      let user;
      if (result?.user) {
        user = result.user;
      } else {
        // Fallback to getCurrentUser if needed
        user = await AuthService.getCurrentUser();
      }

      setUser(user);
      setUserContext(user);

      if (user) {
        trackUserAction('auth.sign_in_success', {
          userId: user.id,
          role: user.role,
        });
        addBreadcrumb(`User signed in: ${user.email}`, 'auth');
        initializePushNotifications(user.id);

        // Prompt for biometric setup if available and not already enabled
        if (
          biometricAvailable &&
          !(await BiometricService.isBiometricEnabled())
        ) {
          // Wait a bit to let the UI settle
          setTimeout(() => {
            BiometricService.promptEnableBiometric(
              user.email,
              async (email, sessionToken) => {
                await BiometricService.enableBiometric(email, sessionToken);
              }
            );
          }, 1000);
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
      setTimeout(() => setLoading(false), 0);
      Promise.resolve().then(() => setLoading(false));
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
      setUser(user);
      setUserContext(user);

      if (user) {
        trackUserAction('auth.sign_up_success', {
          userId: user.id,
          role: user.role,
        });
        addBreadcrumb(`New user registered: ${user.email}`, 'auth');

        // Prompt for biometric setup for new users if available
        if (biometricAvailable) {
          setTimeout(() => {
            BiometricService.promptEnableBiometric(
              user.email,
              async (email, sessionToken) => {
                await BiometricService.enableBiometric(email, sessionToken);
              }
            );
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
      setTimeout(() => setLoading(false), 0);
      Promise.resolve().then(() => setLoading(false));
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
    try {
      const credentials = await BiometricService.authenticate();
      if (credentials) {
        // In a real app, you'd validate the stored session token
        // For now, we'll simulate successful authentication
        const user = await AuthService.getCurrentUser();
        if (user && user.email === credentials.email) {
          setUser(user);
          setUserContext(user);
          trackUserAction('auth.biometric_sign_in_success', {
            userId: user.id,
          });
          addBreadcrumb('User signed in with biometrics', 'auth');
          setLoading(false);
          setTimeout(() => setLoading(false), 0);
        } else {
          throw new Error('Biometric credentials do not match current user');
        }
      }
    } catch (error) {
      trackUserAction('auth.biometric_sign_in_failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  };

  const isBiometricAvailable = async (): Promise<boolean> => {
    return BiometricService.isAvailable();
  };

  const isBiometricEnabled = async (): Promise<boolean> => {
    return BiometricService.isBiometricEnabled();
  };

  const enableBiometric = async (): Promise<void> => {
    if (!user) {
      throw new Error(
        'User must be signed in to enable biometric authentication'
      );
    }

    const sessionToken = 'secure_session_token'; // Get actual session token
    await BiometricService.enableBiometric(user.email, sessionToken);
  };

  const disableBiometric = async (): Promise<void> => {
    await BiometricService.disableBiometric();
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile: async (userData: Partial<User>) => {
      // Placeholder implementation
      if (user) {
        setUser({ ...user, ...userData });
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
