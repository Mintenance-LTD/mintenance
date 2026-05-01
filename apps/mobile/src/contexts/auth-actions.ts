import { AuthService } from '../services/AuthService';
import { NotificationService } from '../services/NotificationService';
import { supabase } from '../config/supabase';
import type { User } from '@mintenance/types';
import { handleError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import {
  setUserContext,
  trackUserAction,
  addBreadcrumb,
  measureAsyncPerformance,
} from '../utils/sentryUtils';
import { captureException } from '../config/sentry';

import type { AuthSession, SignUpUserData } from './auth-types';
import {
  isTokenExpiredOrExpiring,
  saveSessionToSecureStore,
  loadSessionFromSecureStore,
  clearSessionFromSecureStore,
  clearAppCachesOnLogout,
} from './auth-session-manager';

/** Shared setter interface for auth state updates. */
interface AuthStateDispatch {
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
      try {
        await NotificationService.savePushToken(userId, token);
        addBreadcrumb('Push token registered for user', 'auth');
      } catch (saveErr) {
        // 2026-05-01 audit P0 (user_push_tokens=0): savePushToken failure
        // was previously silent (just logger.warn). Promote to Sentry
        // capture so we can see the prod rate. The retry hook
        // (useEnsurePushTokenRegistered) will pick this up on the next
        // foreground transition.
        const saveMsg =
          saveErr instanceof Error ? saveErr.message : String(saveErr);
        logger.warn('[AUTH] savePushToken failed during silent init', {
          userId,
          error: saveMsg,
        });
        // Breadcrumb context goes through Sentry tags via captureException
        // — the wrapper's addBreadcrumb is a 2-arg shim, full data lives
        // on the captured exception below.
        addBreadcrumb('Push token POST failed (silent path)', 'auth');
        captureException(saveErr as Error, {
          userId,
          source: 'initializePushNotifications.savePushToken',
          error: saveMsg,
        });
      }
    } else {
      // Token null on the silent path is the EXPECTED case for fresh
      // users (permission still 'undetermined' — PushSoftAskModal owns
      // the prompt). Drop a debug breadcrumb only; do NOT capture as
      // an exception — it's not unexpected and Sentry was getting
      // spammed with noise that drowned out real failures.
      addBreadcrumb(
        'Push token init returned null (expected for undetermined / simulator)',
        'auth'
      );
    }
  } catch (error) {
    logger.error('[AUTH] Push token registration failed', { userId, error });
    addBreadcrumb('Push token registration failed', 'auth');
    captureException(error as Error, {
      userId,
      source: 'initializePushNotifications',
    });
    // Don't rethrow — push failure must not block auth.
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
      const typedSession = persistedSession as AuthSession;
      dispatch.setSession(typedSession);
      logger.info('[AUTH] Using persisted session');

      // CRITICAL: Restore session to the Supabase client so that
      // supabase.auth.getSession() returns the persisted session.
      // Without this, getAuthToken() in mobileApiClient returns null
      // and every API call fails with 401.
      if (typedSession.access_token && typedSession.refresh_token) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: typedSession.access_token,
          refresh_token: typedSession.refresh_token,
        });
        if (setSessionError) {
          logger.warn(
            '[AUTH] Failed to restore session to Supabase client, will try refresh',
            {
              error: setSessionError.message,
            }
          );
        } else {
          logger.info('[AUTH] Session restored to Supabase client');
        }
      }

      const accessToken = typedSession?.access_token;
      if (accessToken && isTokenExpiredOrExpiring(accessToken)) {
        logger.info('[AUTH] Token expired or expiring soon, refreshing...');
        try {
          const refreshedData = (await AuthService.refreshToken()) as {
            session?: AuthSession;
          } | null;
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

    const activeSession =
      (await AuthService.getCurrentSession()) as AuthSession | null;
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
  biometricAuth: {
    biometricAvailable: boolean;
    isBiometricEnabled: () => Promise<boolean>;
    promptEnableBiometric: (user: User, session: AuthSession) => void;
  }
): Promise<void> => {
  dispatch.setLoading(true);
  trackUserAction('auth.sign_in_attempt', { email });

  try {
    const result = await measureAsyncPerformance(
      () => AuthService.signIn(email, password),
      'auth.sign_in',
      'auth'
    );

    const signedInUser = result?.user ?? (await AuthService.getCurrentUser());
    const authSession = (result?.session ??
      (await AuthService.getCurrentSession())) as AuthSession | null;

    dispatch.setUser(signedInUser);
    setUserContext(signedInUser);
    dispatch.setSession(authSession);

    if (signedInUser) {
      trackUserAction('auth.sign_in_success', {
        userId: signedInUser.id,
        role: signedInUser.role,
      });
      addBreadcrumb(`User signed in: ${signedInUser.email}`, 'auth');
      initializePushNotifications(signedInUser.id);

      // 2026-04-30 audit P1 (Authentication + signup side-effect
      // parity): web `/api/auth/register` initialises a contractor
      // trial post-signup. Mobile's direct `supabase.auth.signUp`
      // doesn't, so contractors who registered on mobile never got
      // a trial. Call the idempotent reconciliation endpoint here
      // — first sign-in for fresh mobile signups, every sign-in
      // thereafter (self-healing for the existing affected users).
      // Best-effort: a transient network failure here MUST NOT
      // block sign-in, so the call is fire-and-forget with a
      // visible warning if it errors.
      try {
        const { mobileApiClient } = await import('../utils/mobileApiClient');
        await mobileApiClient.post('/api/auth/post-signup-reconciliation', {
          role: signedInUser.role,
        });
      } catch (reconcileErr) {
        // eslint-disable-next-line no-console
        console.warn(
          '[AUTH] post-signup reconciliation failed (non-fatal):',
          reconcileErr
        );
      }

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
    trackUserAction('auth.sign_in_failed', {
      email,
      error: (error as Error).message,
    });
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
  biometricAuth: {
    biometricAvailable: boolean;
    promptEnableBiometric: (user: User, session: AuthSession) => void;
  }
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
    const authSession =
      (await AuthService.getCurrentSession()) as AuthSession | null;
    dispatch.setUser(newUser);
    setUserContext(newUser);
    dispatch.setSession(authSession);

    if (newUser) {
      trackUserAction('auth.sign_up_success', {
        userId: newUser.id,
        role: newUser.role,
      });
      addBreadcrumb(`New user registered: ${newUser.email}`, 'auth');

      // Audit P0 (2026-04-23): persistent `user_push_tokens = 0` in
      // production. The signUp flow never invoked push registration —
      // only signIn / restoreSession / signInWithBiometrics did. New
      // users had to wait until their next sign-in to even attempt
      // token registration. Silent path inside still bails when
      // `existingStatus !== 'granted'`, so the actual permission
      // grant must come from PushSoftAskModal — but at least the
      // attempt fires once permission lands without requiring a
      // sign-out / sign-in cycle.
      initializePushNotifications(newUser.id);

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
    trackUserAction('auth.sign_up_failed', {
      email,
      role: userData.role,
      error: (error as Error).message,
    });
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
