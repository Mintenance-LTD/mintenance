import * as SecureStore from 'expo-secure-store';
import { logger } from '../utils/logger';

const SESSION_KEY = 'mintenance_session';
const SESSION_EXPIRY_KEY = 'mintenance_session_expiry';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TOKEN_REFRESH_THRESHOLD_SECONDS = 300; // 5 minutes

/**
 * Parse a JWT payload to extract claims such as expiration.
 * Returns null if the token is malformed.
 */
export const parseJWT = (token: string): { exp?: number } | null => {
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

/**
 * Check whether an access token is expired or expiring within the threshold.
 */
export const isTokenExpiredOrExpiring = (accessToken: string): boolean => {
  const payload = parseJWT(accessToken);
  if (!payload?.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now + TOKEN_REFRESH_THRESHOLD_SECONDS;
};

/**
 * Persist a session object to SecureStore with an expiry timestamp.
 */
export const saveSessionToSecureStore = async (
  sessionData: unknown
): Promise<void> => {
  try {
    if (!sessionData) return;

    await SecureStore.setItemAsync(
      SESSION_KEY,
      JSON.stringify(sessionData)
    );

    const expiryTime = Date.now() + SESSION_DURATION_MS;
    await SecureStore.setItemAsync(
      SESSION_EXPIRY_KEY,
      expiryTime.toString()
    );

    logger.info('[AUTH] Session persisted to SecureStore');
  } catch (error) {
    logger.error('[AUTH] Failed to persist session:', error);
  }
};

/**
 * Load a previously persisted session from SecureStore.
 * Returns null if no session exists or if the session has expired.
 */
export const loadSessionFromSecureStore = async (): Promise<unknown | null> => {
  try {
    const sessionJson = await SecureStore.getItemAsync(SESSION_KEY);
    const expiryTime = await SecureStore.getItemAsync(SESSION_EXPIRY_KEY);

    if (!sessionJson || !expiryTime) {
      logger.info('[AUTH] No persisted session found');
      return null;
    }

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

/**
 * Remove all session data from SecureStore.
 */
export const clearSessionFromSecureStore = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await SecureStore.deleteItemAsync(SESSION_EXPIRY_KEY);
    logger.info('[AUTH] Session cleared from SecureStore');
  } catch (error) {
    logger.error('[AUTH] Failed to clear session:', error);
  }
};

/**
 * Clear application caches and offline queues on logout.
 */
export const clearAppCachesOnLogout = async (): Promise<void> => {
  try {
    const { queryClient } = await import('../lib/queryClient');
    const { OfflineManager } = await import('../services/OfflineManager');
    queryClient.clear();
    OfflineManager.clearQueue();
    logger.info('Cleared cache and offline queue on logout');
  } catch (error) {
    logger.warn('Could not clear cache on logout:', error);
  }
};
