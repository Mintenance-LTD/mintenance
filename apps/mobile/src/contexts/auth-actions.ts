import { AuthService } from '../services/AuthService';
import { NotificationService } from '../services/NotificationService';
import type { User } from '@mintenance/types';
import { handleError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import {
  setUserContext,
  trackUserAction,
  addBreadcrumb,
  measureAsyncPerformance,
} from '../utils/sentryUtils';

import type { AuthSession, SignUpUserData } from './auth-types';
import {
  isTokenExpiredOrExpiring,
  saveSessionToSecureStore,
  loadSessionFromSecureStore,
  clearSessionFromSecureStore,
  clearAppCachesOnLogout,
} from './auth-session-manager';

/** Shared setter interface for auth state updates. */
export interface AuthStateDispatch {
  setUser: (user: User | null) => void;
  setSession: (session: AuthSession | null) => void;
  setLoading: (loading: boolean) => void;
}

export const initializePushNotifications = async (
  userId: string
): Promise<void> => {
  try {
    const token = await NotificationService.initialize();
    if (token) {
      await NotificationService.savePushToken(userId, token);
    }
  } catch (error) {
    logger.error('Failed to initialize push notifications:', error);
  }
};

/**
 * Restore a previously persisted session, refresh tokens if needed,
 * and fetch the current user from the server.
 */
export const restoreSession = async (
  dispatch: AuthStateDispatch
): Promise<void> => {
  try {
    const persistedSession = await loadSessionFromSecureStore();

    if (persistedSession) {
      dispatch.setSession(persistedSession as AuthSession);
      logger.info('[AUTH] Using persisted session');

      const accessToken = (persistedSession as AuthSession)?.access_token;
      if (accessToken && isTokenExpiredOrExpiring(accessToken)) {
        logger.info('[AUTH] Token expired or expiring soon, refreshing...');
        try {
          const refreshedData = await AuthService.refreshToken();
          if (refreshedData?.session) {
            dispatch.setSession(refreshedData.session);
            await saveSessionToSecureStore(refreshedData.session);
            logger.info('[AUTH] Token refreshed successfully');
          }
        } catch (refreshError) {
          logger.error('[AUTH] Token refresh failed:', refreshError);
          await clearSessionFromSecureStore();
          dispatch.setSession(null);
          dispatch.setUser(null);
          dispatch.setLoading(false);
          return;
        }
      }
    }

    const currentUser = await measureAsyncPerformance(
      () => AuthService.getCurrentUser(),
      'auth.check_user',
      'auth'
    );
    dispatch.setUser(currentUser);
    setUserContext(currentUser);

    const activeSession = await AuthService.getCurrentSession();
    if (activeSession) {
      dispatch.setSession(activeSession);
      await saveSessionToSecureStore(activeSession);
    }

    if (currentUser) {
      addBreadcrumb(`User session restored: ${currentUser.email}`, 'auth');
      initializePushNotifications(currentUser.id);
    }
  } catch (error) {
    handleError(error, 'Auth check');
  } finally {
    dispatch.setLoading(false);
  }
};

export const performSignIn = async (
  email: string,
  password: string,
  dispatch: AuthStateDispatch,
  biometricAuth: { biometricAvailable: boolean; isBiometricEnabled: () => Promise<boolean>; promptEnableBiometric: (user: User, session: AuthSession) => void }
): Promise<void> => {
  dispatch.setLoading(true);
  trackUserAction('auth.sign_in_attempt', { email });

  try {
    const result = await measureAsyncPerformance(
      () => AuthService.signIn(email, password),
      'auth.sign_in',
      'auth'
    );

    const signedInUser = result?.user ?? await AuthService.getCurrentUser();
    const authSession = result?.session ?? await AuthService.getCurrentSession();

    dispatch.setUser(signedInUser);
    setUserContext(signedInUser);
    dispatch.setSession(authSession);

    if (signedInUser) {
      trackUserAction('auth.sign_in_success', { userId: signedInUser.id, role: signedInUser.role });
      addBreadcrumb(`User signed in: ${signedInUser.email}`, 'auth');
      initializePushNotifications(signedInUser.id);

      if (
        biometricAuth.biometricAvailable &&
        authSession?.access_token &&
        authSession?.refresh_token &&
        !(await biometricAuth.isBiometricEnabled())
      ) {
        biometricAuth.promptEnableBiometric(signedInUser, authSession);
      }
    }
  } catch (error) {
    trackUserAction('auth.sign_in_failed', { email, error: (error as Error).message });
    throw error;
  } finally {
    dispatch.setLoading(false);
  }
};

export const performSignUp = async (
  email: string,
  password: string,
  userData: SignUpUserData,
  dispatch: AuthStateDispatch,
  biometricAuth: { biometricAvailable: boolean; promptEnableBiometric: (user: User, session: AuthSession) => void }
): Promise<void> => {
  dispatch.setLoading(true);
  trackUserAction('auth.sign_up_attempt', { email, role: userData.role });

  try {
    await measureAsyncPerformance(
      () => AuthService.signUp({ email, password, ...userData }),
      'auth.sign_up',
      'auth'
    );

    const newUser = await AuthService.getCurrentUser();
    const authSession = await AuthService.getCurrentSession();
    dispatch.setUser(newUser);
    setUserContext(newUser);
    dispatch.setSession(authSession);

    if (newUser) {
      trackUserAction('auth.sign_up_success', { userId: newUser.id, role: newUser.role });
      addBreadcrumb(`New user registered: ${newUser.email}`, 'auth');

      if (
        biometricAuth.biometricAvailable &&
        authSession?.access_token &&
        authSession?.refresh_token
      ) {
        setTimeout(() => {
          biometricAuth.promptEnableBiometric(newUser, authSession);
        }, 2000);
      }
    }
  } catch (error) {
    trackUserAction('auth.sign_up_failed', { email, role: userData.role, error: (error as Error).message });
    throw error;
  } finally {
    dispatch.setLoading(false);
  }
};

export const performSignOut = async (
  currentUser: User | null,
  dispatch: AuthStateDispatch
): Promise<void> => {
  try {
    trackUserAction('auth.sign_out_attempt', { userId: currentUser?.id });

    await measureAsyncPerformance(
      () => AuthService.signOut(),
      'auth.sign_out',
      'auth'
    );

    dispatch.setUser(null);
    setUserContext(null);
    dispatch.setSession(null);
    await clearSessionFromSecureStore();
    await clearAppCachesOnLogout();

    trackUserAction('auth.sign_out_success', { userId: currentUser?.id });
    addBreadcrumb('User signed out', 'auth');
  } catch (error) {
    trackUserAction('auth.sign_out_failed', {
      userId: currentUser?.id,
      error: (error as Error).message,
    });
    handleError(error, 'Sign out');
  }
};

export const performUpdateProfile = async (
  userId: string,
  userEmail: string,
  userData: Partial<User>,
  dispatch: Pick<AuthStateDispatch, 'setUser'>
): Promise<void> => {
  try {
    trackUserAction('auth.update_profile_attempt', { userId });

    const updatedUser = await measureAsyncPerformance(
      () => AuthService.updateUserProfile(userId, userData),
      'auth.update_profile',
      'auth'
    );

    dispatch.setUser(updatedUser);
    setUserContext(updatedUser);
    trackUserAction('auth.update_profile_success', { userId });
    addBreadcrumb(`Profile updated for user: ${userEmail}`, 'auth');
  } catch (error) {
    trackUserAction('auth.update_profile_failed', {
      userId,
      error: (error as Error).message,
    });
    handleError(error, 'Update profile');
    throw error;
  }
};
