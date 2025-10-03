/**
 * Biometric Authentication Hook
 * 
 * Handles all biometric authentication logic including:
 * - Checking availability
 * - Enabling/disabling biometric auth
 * - Signing in with biometrics
 */

import { useState, useCallback } from 'react';
import { BiometricService } from '../services/BiometricService';
import { AuthService } from '../services/AuthService';
import { User } from '../types';
import { logger } from '../utils/logger';
import { trackUserAction, addBreadcrumb } from './sentryUtils';

export interface BiometricAuthHook {
  biometricAvailable: boolean;
  signInWithBiometrics: () => Promise<void>;
  isBiometricAvailable: () => Promise<boolean>;
  isBiometricEnabled: () => Promise<boolean>;
  enableBiometric: (user: User, session: any) => Promise<void>;
  disableBiometric: () => Promise<void>;
  promptEnableBiometric: (user: User, session: any) => void;
}

export const useBiometricAuth = (): BiometricAuthHook => {
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const checkBiometricAvailability = useCallback(async () => {
    try {
      const available = await BiometricService.isAvailable();
      setBiometricAvailable(available);
    } catch (error) {
      logger.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  }, []);

  const signInWithBiometrics = useCallback(async () => {
    try {
      const credentials = await BiometricService.authenticate();
      if (!credentials) {
        return;
      }

      const { user: restoredUser, session: restoredSession } =
        await AuthService.restoreSessionFromBiometricTokens({
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken,
        });

      if (!restoredUser || restoredUser.email !== credentials.email) {
        throw new Error('Biometric credentials do not match current user');
      }

      trackUserAction('auth.biometric_sign_in_success', {
        userId: restoredUser.id,
      });
      addBreadcrumb('User signed in with biometrics', 'auth');

      return { user: restoredUser, session: restoredSession };
    } catch (error) {
      trackUserAction('auth.biometric_sign_in_failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }, []);

  const isBiometricAvailable = useCallback(async (): Promise<boolean> => {
    return BiometricService.isAvailable();
  }, []);

  const isBiometricEnabled = useCallback(async (): Promise<boolean> => {
    return BiometricService.isBiometricEnabled();
  }, []);

  const enableBiometric = useCallback(async (user: User, session: any): Promise<void> => {
    if (!session?.access_token || !session?.refresh_token) {
      throw new Error('Unable to enable biometric authentication without an active session');
    }

    await BiometricService.enableBiometric(user.email, {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
  }, []);

  const disableBiometric = useCallback(async (): Promise<void> => {
    await BiometricService.disableBiometric();
  }, []);

  const promptEnableBiometric = useCallback((user: User, session: any) => {
    if (!biometricAvailable || !session?.access_token || !session?.refresh_token) {
      return;
    }

    setTimeout(() => {
      void BiometricService.promptEnableBiometric(
        user.email,
        async () => {
          const latestSession = (await AuthService.getCurrentSession()) ?? session;

          if (!latestSession?.access_token || !latestSession?.refresh_token) {
            throw new Error('Session tokens are required to enable biometric authentication');
          }

          await BiometricService.enableBiometric(user.email, {
            accessToken: latestSession.access_token,
            refreshToken: latestSession.refresh_token,
          });
        }
      );
    }, 1000);
  }, [biometricAvailable]);

  return {
    biometricAvailable,
    signInWithBiometrics,
    isBiometricAvailable,
    isBiometricEnabled,
    enableBiometric,
    disableBiometric,
    promptEnableBiometric,
    checkBiometricAvailability,
  };
};
