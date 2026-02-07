import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { AuthService } from '../services/AuthService';
import type { User } from '@mintenance/types';
import { logger } from '../utils/logger';
import { setUserContext } from '../utils/sentryUtils';
import { useBiometricAuth } from '../hooks/useBiometricAuth';

import type { AuthContextType, AuthProviderProps, AuthSession } from './auth-types';
import {
  saveSessionToSecureStore,
  clearSessionFromSecureStore,
} from './auth-session-manager';
import {
  restoreSession,
  performSignIn,
  performSignUp,
  performSignOut,
  performUpdateProfile,
  initializePushNotifications,
} from './auth-actions';

// Re-export types so existing consumers keep working
export type { AuthContextType, AuthSession, SignUpUserData } from './auth-types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const biometricAuth = useBiometricAuth();
  const dispatch = useMemo(() => ({ setUser, setSession, setLoading }), []);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const initialize = async (): Promise<void> => {
      if (mounted) {
        await restoreSession(dispatch);
        await biometricAuth.checkBiometricAvailability();
      }

      const subscription = AuthService.onAuthStateChange(
        async (event: string, newSession: unknown) => {
          if (!mounted) return;
          logger.info('[AUTH] Auth state changed:', { event, hasSession: !!newSession });

          if (event === 'TOKEN_REFRESHED' && newSession) {
            setSession(newSession as AuthSession);
            await saveSessionToSecureStore(newSession);
          }

          if (event === 'SIGNED_OUT') {
            setUser(null);
            setSession(null);
            await clearSessionFromSecureStore();
          }

          if (event === 'SIGNED_IN' && newSession) {
            const currentUser = await AuthService.getCurrentUser();
            setUser(currentUser);
            setSession(newSession as AuthSession);
            setUserContext(currentUser);
            await saveSessionToSecureStore(newSession);
          }
        }
      );

      unsubscribe = () => {
        subscription?.data?.subscription?.unsubscribe();
      };
    };

    initialize().catch(error => {
      if (mounted) logger.error('Failed to initialize auth:', error);
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(
    (email: string, password: string) =>
      performSignIn(email, password, dispatch, biometricAuth),
    [dispatch, biometricAuth]
  );

  const signUp = useCallback(
    (email: string, password: string, userData: { firstName: string; lastName: string; role: 'homeowner' | 'contractor' }) =>
      performSignUp(email, password, userData, dispatch, biometricAuth),
    [dispatch, biometricAuth]
  );

  const signOut = useCallback(
    () => performSignOut(user, dispatch),
    [user, dispatch]
  );

  const updateProfile = useCallback(
    async (userData: Partial<User>) => {
      if (!user) throw new Error('User must be signed in to update profile');
      await performUpdateProfile(user.id, user.email ?? '', userData, dispatch);
    },
    [user, dispatch]
  );

  const signInWithBiometrics = useCallback(async () => {
    setLoading(true);
    try {
      const result = await biometricAuth.signInWithBiometrics();
      if (result) {
        setUser(result.user);
        setUserContext(result.user);
        setSession(result.session);
        initializePushNotifications(result.user.id);
      }
    } finally {
      setLoading(false);
    }
  }, [biometricAuth]);

  const enableBiometric = useCallback(async () => {
    if (!user) throw new Error('User must be signed in to enable biometric authentication');

    let activeSession = session;
    if (!activeSession?.access_token || !activeSession?.refresh_token) {
      activeSession = await AuthService.getCurrentSession();
      setSession(activeSession);
    }
    await biometricAuth.enableBiometric(user, activeSession);
  }, [user, session, biometricAuth]);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      signInWithBiometrics,
      isBiometricAvailable: () => biometricAuth.isBiometricAvailable(),
      isBiometricEnabled: () => biometricAuth.isBiometricEnabled(),
      enableBiometric,
      disableBiometric: () => biometricAuth.disableBiometric(),
    }),
    [user, session, loading, signIn, signUp, signOut, updateProfile, signInWithBiometrics, enableBiometric, biometricAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
