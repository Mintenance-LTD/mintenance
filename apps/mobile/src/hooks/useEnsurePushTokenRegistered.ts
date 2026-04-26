/**
 * useEnsurePushTokenRegistered — silent retry for push-token registration.
 *
 * Audit P0 (2026-04-23, persistent across 3+ cycles): live database
 * shows `user_push_tokens = 0` despite the endpoint being correct
 * (verified 2026-04-17), Sentry breadcrumbs being wired (2026-04-21),
 * and the soft-ask modal being mounted (2026-04-19). The remaining
 * gap is a recovery hole: any time the silent path inside
 * `auth-actions.initializePushNotifications` fails (network race,
 * Expo throw, transient Supabase 5xx), the token is permanently lost
 * for that session — no retry, ever.
 *
 * What this hook does:
 *   1. On mount (signed-in user only) AND on every AppState 'active'
 *      transition, check the OS permission status.
 *   2. If permission is `granted`, attempt `getExpoPushTokenAsync` +
 *      `savePushToken`. The `savePushToken` endpoint is an upsert with
 *      `onConflict: 'user_id,push_token'`, so calling idempotently is
 *      cheap — no duplicate rows.
 *   3. If permission is `undetermined` or `denied`, do NOTHING (the
 *      PushSoftAskModal is the explicit-CTA path; we never silently
 *      prompt — that would burn the iOS one-shot dialog).
 *
 * Why a separate hook (instead of fixing inside auth-actions)?
 *   - auth-actions fires once on sign-in / sign-up / restore. AppState
 *     foreground recovery isn't its job.
 *   - The soft-ask modal handles the prompt; this hook handles the
 *     "permission is granted but the token never landed" case. They
 *     are complementary, not overlapping.
 *
 * Key safety properties:
 *   - Never prompts the iOS dialog — passes `promptIfUndetermined: false`.
 *   - One in-flight attempt at a time per user (registrationLock).
 *   - Errors are swallowed and logged; never surface to the UI.
 *   - Session-scoped success flag (registeredForUserId) prevents
 *     spamming the endpoint on every foreground while still allowing
 *     a foreground retry after a previous failure.
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/NotificationService';
import { logger } from '../utils/logger';
import { addBreadcrumb } from '../config/sentry';

export function useEnsurePushTokenRegistered(): void {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Track which user we've successfully registered for, so we don't
  // re-hit the endpoint on every foreground after success. A failed
  // attempt does NOT set this — that's how foreground retries work.
  const registeredForUserId = useRef<string | null>(null);

  // Lock to prevent two concurrent attempts (e.g. mount + immediate
  // foreground transition) from racing each other.
  const inFlight = useRef<boolean>(false);

  useEffect(() => {
    if (!userId) {
      registeredForUserId.current = null;
      return;
    }

    let cancelled = false;

    const tryRegister = async (trigger: 'mount' | 'foreground') => {
      if (cancelled) return;
      if (registeredForUserId.current === userId) return;
      if (inFlight.current) return;

      inFlight.current = true;
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          // PushSoftAskModal is the prompt path. We do not prompt here.
          if (trigger === 'mount') {
            addBreadcrumb(
              'Push token retry skipped — permission not granted',
              'auth',
              { userId, status }
            );
          }
          return;
        }

        // Permission is granted but our DB shows no token for this
        // device — the silent-init path in auth-actions either
        // returned null (Expo throw) or the savePushToken POST
        // failed. Re-attempt both steps. Pass `promptIfUndetermined:
        // false` defensively; the OS status check above already
        // confirmed `granted`, but if there's a race we must not
        // burn the iOS one-shot dialog.
        const token = await NotificationService.initialize({
          promptIfUndetermined: false,
        });
        if (cancelled) return;
        if (!token) {
          // Expo failed to mint a token even though OS says granted.
          // Likely an EAS / FCM / APNs config issue in the build —
          // tag the breadcrumb so production diagnosis is clearer.
          logger.warn(
            '[push-retry] getExpoPushTokenAsync returned null despite granted permission',
            { userId, trigger }
          );
          addBreadcrumb('Push token retry — Expo returned null', 'auth', {
            userId,
            trigger,
            level: 'warning',
          });
          return;
        }

        await NotificationService.savePushToken(userId, token);
        if (cancelled) return;

        registeredForUserId.current = userId;
        addBreadcrumb(
          'Push token registration confirmed via retry hook',
          'auth',
          {
            userId,
            trigger,
          }
        );
      } catch (error) {
        // Swallow — foreground retry will try again.
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(
          '[push-retry] attempt failed (will retry on next foreground)',
          {
            userId,
            trigger,
            error: message,
          }
        );
        addBreadcrumb('Push token retry failed (will retry)', 'auth', {
          userId,
          trigger,
          error: message,
          level: 'warning',
        });
      } finally {
        inFlight.current = false;
      }
    };

    // Initial attempt on mount (slight delay so auth-actions's own
    // initializePushNotifications has a chance to land first; we
    // are the safety net, not the primary path).
    const mountTimer = setTimeout(() => {
      void tryRegister('mount');
    }, 1500);

    const handleAppStateChange = (next: AppStateStatus) => {
      if (next === 'active') {
        void tryRegister('foreground');
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      cancelled = true;
      clearTimeout(mountTimer);
      subscription.remove();
    };
  }, [userId]);
}
