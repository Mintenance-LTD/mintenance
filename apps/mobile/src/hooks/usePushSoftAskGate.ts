/**
 * usePushSoftAskGate — decides whether to show the push-notification
 * rationale modal (PushSoftAskModal) after a user has finished the
 * onboarding swiper.
 *
 * Why a soft-ask?
 * -----------------
 * iOS shows the system permission dialog AT MOST ONCE per install.
 * Until 2026-04-19, `NotificationService.initialize()` was called
 * silently from auth-actions on both `restoreSession` and
 * `performSignIn`, which meant the one-shot dialog was burned on
 * first launch before the user saw any rationale. Production metric:
 * `user_push_tokens` live row count = 0.
 *
 * The new flow:
 *   1. `auth-actions.initializePushNotifications()` still runs silently
 *      after sign-in BUT passes `promptIfUndetermined: false`, so the
 *      system dialog is NOT triggered for undetermined users.
 *   2. After onboarding completes (this hook fires), we show a
 *      soft-ask screen explaining why push is useful, with:
 *        - "Allow Notifications" — explicit CTA that finally calls
 *          `NotificationService.initialize({ promptIfUndetermined: true })`.
 *          This is the ONE place in the app that may fire the iOS
 *          system dialog.
 *        - "Not Now" — dismiss for 24 hours, then soft-ask again.
 *        - (If status is already 'denied') "Open Settings" — deep-link
 *          to the iOS/Android notification settings page.
 *
 * Gate rules:
 *   - User must be signed in.
 *   - User must have completed onboarding (swiper dismissed).
 *   - Current permission status must be 'undetermined' OR 'denied'.
 *     ('granted' = we're done; nothing to ask.)
 *   - Local dismiss timestamp must be null OR older than 24 hours.
 *
 * Note on cool-off divergence (AUDIT_PUNCH_LIST P2 #39, B2-P2-2):
 * push uses a **24h** cool-off; location + always-location both use
 * **7 days**. This is deliberate: push prompts are low-friction and
 * a same-next-day re-ask is fine, while location prompts are
 * higher-stakes (continuous tracking) so a weekly re-ask balances
 * reach with not-being-creepy. Don't unify without product input.
 *
 * Storage contract:
 *   - Key: `push_soft_ask_dismissed_at`
 *   - Value: ISO-8601 timestamp string when the user last dismissed.
 *     We store a timestamp, not a boolean, so we can re-nag after
 *     a cool-off period. A user who meaningfully declined can't
 *     be pestered constantly, but we also don't give up forever
 *     after a single "Not Now" tap.
 */

import { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/NotificationService';
import { logger } from '../utils/logger';
import { captureException } from '../config/sentry';

const STORAGE_KEY = 'push_soft_ask_dismissed_at';
// 24h cool-off after a "Not Now" tap (was 7 days). Live audit
// (2026-04-28) found `user_push_tokens = 0` in prod despite 6
// onboarding-complete users — the 7-day window meant a single
// dismissal effectively turned push off forever, since most users
// never re-encountered the modal at exactly the right state on day 8.
// 24h gives users a same-next-day re-prompt without being naggy.
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type PushPermissionStatus = 'undetermined' | 'denied' | 'granted';

export interface PushSoftAskGate {
  /** True when the modal should render. */
  shouldShow: boolean;
  /** Last-known OS permission status. */
  permissionStatus: PushPermissionStatus | null;
  /**
   * Fire the system permission dialog AND (if granted) register the
   * push token with the backend. Safe to call from button press.
   * Returns the resolved status so the caller can branch UI.
   */
  allowNotifications: () => Promise<PushPermissionStatus>;
  /** User tapped "Not Now". Sets a 24-hour cool-off. */
  dismiss: () => Promise<void>;
  /** Deep-link to OS notification settings (recovery from 'denied'). */
  openSystemSettings: () => Promise<void>;
}

function normalizeStatus(
  raw: Notifications.PermissionStatus | undefined
): PushPermissionStatus {
  if (raw === 'granted') return 'granted';
  if (raw === 'denied') return 'denied';
  return 'undetermined';
}

export function usePushSoftAskGate(): PushSoftAskGate {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [permissionStatus, setPermissionStatus] =
    useState<PushPermissionStatus | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      if (!user) {
        if (!cancelled) {
          setChecked(true);
          setShouldShow(false);
        }
        return;
      }

      // The soft-ask only makes sense AFTER the onboarding swiper has
      // dismissed. Otherwise we'd stack two modals on a fresh user.
      if (!user.onboarding_completed) {
        if (!cancelled) {
          setChecked(true);
          setShouldShow(false);
        }
        return;
      }

      try {
        const { status } = await Notifications.getPermissionsAsync();
        const normalized = normalizeStatus(status);
        if (!cancelled) setPermissionStatus(normalized);

        if (normalized === 'granted') {
          if (!cancelled) {
            setChecked(true);
            setShouldShow(false);
          }
          return;
        }

        // Respect the 24-hour cool-off after a "Not Now" dismissal.
        const dismissedAtRaw = await AsyncStorage.getItem(STORAGE_KEY);
        if (dismissedAtRaw) {
          const dismissedAt = Date.parse(dismissedAtRaw);
          if (
            Number.isFinite(dismissedAt) &&
            Date.now() - dismissedAt < COOLDOWN_MS
          ) {
            if (!cancelled) {
              setChecked(true);
              setShouldShow(false);
            }
            return;
          }
        }

        if (!cancelled) {
          setChecked(true);
          setShouldShow(true);
        }
      } catch (err) {
        // Any failure in the check path = do not show. Safer to
        // skip a soft-ask than to display on a broken state.
        logger.warn('usePushSoftAskGate: evaluation failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) {
          setChecked(true);
          setShouldShow(false);
        }
      }
    };

    evaluate();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const allowNotifications =
    useCallback(async (): Promise<PushPermissionStatus> => {
      if (!user?.id) return 'undetermined';

      try {
        // This is the ONE app code path that passes promptIfUndetermined=true.
        const token = await NotificationService.initialize({
          promptIfUndetermined: true,
        });

        // Re-read OS status so the UI reflects the real outcome.
        const { status } = await Notifications.getPermissionsAsync();
        const normalized = normalizeStatus(status);
        setPermissionStatus(normalized);

        if (token) {
          try {
            await NotificationService.savePushToken(user.id, token);
          } catch (err) {
            // 2026-05-01 audit P0 (user_push_tokens=0): the soft-ask
            // path got the token but the POST failed. Promote to
            // Sentry capture — without it we can't distinguish "user
            // tapped Allow but POST 5xx'd" from "user never tapped
            // Allow". The retry hook will re-attempt on next foreground.
            const errMsg = err instanceof Error ? err.message : String(err);
            logger.warn('usePushSoftAskGate: savePushToken failed', {
              userId: user.id,
              error: errMsg,
            });
            captureException(err as Error, {
              userId: user.id,
              source: 'usePushSoftAskGate.savePushToken',
            });
          }
        } else if (normalized === 'granted') {
          // 2026-05-01: status came back granted but Expo returned no
          // token. EAS / FCM / APNs config issue — capture so we can
          // see how often this happens in production.
          const reason =
            'usePushSoftAskGate: getExpoPushTokenAsync returned null despite granted permission';
          logger.warn(reason, { userId: user.id });
          captureException(new Error(reason), {
            userId: user.id,
            source: 'usePushSoftAskGate.allowNotifications',
          });
        }

        // Whatever the result, close the modal. Either we got granted,
        // or the user denied and we'll show the "Open Settings" recovery
        // path on the next soft-ask cycle (after cool-off).
        setShouldShow(false);

        // Record this attempt so we don't re-prompt for 24 hours.
        try {
          await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
        } catch {
          // Non-critical.
        }

        return normalized;
      } catch (err) {
        logger.error('usePushSoftAskGate: allowNotifications failed', {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
        setShouldShow(false);
        return 'undetermined';
      }
    }, [user]);

  const dismiss = useCallback(async () => {
    setShouldShow(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch (err) {
      logger.warn('usePushSoftAskGate: dismiss persist failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const openSystemSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (err) {
      logger.warn('usePushSoftAskGate: openSettings failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    // Closing the modal after a settings deep-link is correct; the
    // user will re-enter the app with a new permission status, which
    // the next mount of the gate will pick up.
    setShouldShow(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // Non-critical.
    }
  }, []);

  return {
    shouldShow: checked && shouldShow,
    permissionStatus,
    allowNotifications,
    dismiss,
    openSystemSettings,
  };
}
