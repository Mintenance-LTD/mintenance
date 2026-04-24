import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';
import * as sentry from '../../config/sentry';

import type { NotificationData } from './types';

// NOTE: NotificationCRUD, NotificationPreferencesManager imports were
// previously consumed by the now-stubbed sendPushNotification(). Removed
// here because the client-side send is a no-op (see 2026-04-21 security
// fix below). If the functions are needed again in a future server-side
// routed flow, re-add them at that point.

type BreadcrumbFn = (
  message: string,
  level: 'info' | 'warning' | 'error' | 'debug',
  data?: Record<string, unknown>
) => void;

const addBreadcrumb: BreadcrumbFn = (message, level, data) => {
  const breadcrumbData = data ? { ...data, level } : { level };
  sentry.addBreadcrumb(message, 'notification', breadcrumbData);
};

// ---------------------------------------------------------------------------
// Android notification channels
// ---------------------------------------------------------------------------

async function setupAndroidChannels(): Promise<void> {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#10B981',
  });

  await Notifications.setNotificationChannelAsync('job-updates', {
    name: 'Job Updates',
    description: 'Notifications about job status changes',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0F172A',
  });

  await Notifications.setNotificationChannelAsync('bid-notifications', {
    name: 'Bid Notifications',
    description: 'Notifications about new bids and bid updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#10B981',
  });

  await Notifications.setNotificationChannelAsync('meeting-reminders', {
    name: 'Meeting Reminders',
    description: 'Reminders about upcoming meetings',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F59E0B',
  });

  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    description: 'Direct messages between homeowners and contractors',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#10B981',
  });

  await Notifications.setNotificationChannelAsync('payments', {
    name: 'Payments',
    description: 'Payment confirmations and escrow updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#10B981',
  });

  addBreadcrumb('Android notification channels created', 'info', {
    channels: [
      'default',
      'job-updates',
      'bid-notifications',
      'meeting-reminders',
      'messages',
      'payments',
    ],
  });
}

// ---------------------------------------------------------------------------
// Initialization (push token registration)
// ---------------------------------------------------------------------------

/**
 * Request push-notification permissions, obtain an Expo push token, and
 * configure Android notification channels.
 *
 * @param deviceOverride - optional override for `Device.isDevice` (used in tests)
 * @param options.promptIfUndetermined - when true, fire the system
 *   permission dialog if current status is 'undetermined'. Default
 *   `false` so silent call-sites (auth-actions on signIn /
 *   restoreSession) NEVER burn the iOS one-shot for first-time users.
 *   Only the explicit PushSoftAskModal CTA should pass `true`.
 * @returns the Expo push token string, or `null` if unavailable
 */
export async function initializePushNotifications(
  deviceOverride: boolean | null,
  options: { promptIfUndetermined?: boolean } = {}
): Promise<string | null> {
  const { promptIfUndetermined = false } = options;
  try {
    const isDevice =
      deviceOverride !== null ? deviceOverride : (Device.isDevice as boolean);

    if (!isDevice) {
      logger.warn('Push notifications only work on physical devices');
      addBreadcrumb(
        'Push notifications only work on physical devices',
        'warning'
      );
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      // Audit 2026-04-19 / R5 deferred #5: silent call-sites MUST NOT
      // prompt — that burns the one-shot iOS dialog for every new user
      // before we've shown them rationale. Only the soft-ask modal
      // should trigger the system dialog.
      if (!promptIfUndetermined) {
        logger.info(
          'Push permission not granted and promptIfUndetermined=false; deferring to soft-ask'
        );
        addBreadcrumb(
          'Push permission deferred (no prompt, soft-ask gated)',
          'info',
          { existingStatus }
        );
        return null;
      }
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.warn('Push notification permission not granted');
      addBreadcrumb('Push notification permission denied', 'warning');
      return null;
    }

    // On Android, attempt to get the native FCM device token first.
    // This confirms that google-services.json is loaded and Firebase is initialized.
    if (Platform.OS === 'android') {
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        logger.info('FCM device token obtained', { type: deviceToken.type });
        addBreadcrumb('FCM device token obtained', 'info', {
          type: deviceToken.type,
        });
      } catch (fcmError) {
        const fcmMsg =
          fcmError instanceof Error ? fcmError.message : String(fcmError);
        // Non-fatal: Expo Push still works via Expo's FCM sender key as fallback
        logger.warn('FCM device token unavailable — using Expo push fallback', {
          error: fcmMsg,
        });
        addBreadcrumb(
          'FCM device token unavailable (Expo fallback)',
          'warning',
          { error: fcmMsg }
        );
      }
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      logger.warn('EAS project ID not found in config, using fallback');
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || '1ee95edc-0cc1-4775-b52e-4af46f9e51d0',
    });

    logger.info('Expo push token obtained', { token: token.data });
    addBreadcrumb('Notification Service initialized', 'info', {
      token: token.data,
    });

    if (Platform.OS === 'android') {
      await setupAndroidChannels();
    }

    return token.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isFirebaseError =
      errorMessage.includes('Firebase') ||
      errorMessage.includes('FCM') ||
      errorMessage.includes('FirebaseApp') ||
      errorMessage.includes('not initialized');

    if (isFirebaseError) {
      logger.warn(
        'Push notifications unavailable — Firebase/FCM not configured. ' +
          'Ensure google-services.json is provided via EAS Secrets for production builds.',
        { error: errorMessage }
      );
      addBreadcrumb(
        'Push notifications unavailable (no FCM config)',
        'warning',
        { error: errorMessage }
      );
    } else {
      logger.error('Failed to initialize push notifications', error);
      addBreadcrumb('Failed to initialize push notifications', 'error', {
        error: errorMessage,
      });
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Token persistence
// ---------------------------------------------------------------------------

export async function savePushToken(
  userId: string,
  token: string
): Promise<void> {
  try {
    // Correct endpoint + payload shape for /api/user/push-token.
    // Platform must be 'ios' or 'android' per the server-side zod schema.
    const platform: 'ios' | 'android' =
      Platform.OS === 'android' ? 'android' : 'ios';
    await mobileApiClient.post('/api/user/push-token', {
      pushToken: token,
      platform,
    });

    logger.info('Push token saved successfully', { userId });
    addBreadcrumb('Push token saved', 'info', {
      userId,
      platform,
    });
  } catch (error) {
    logger.error('Failed to save push token', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    addBreadcrumb('Failed to save push token', 'error', {
      userId,
      error: errorMessage,
    });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Sending push notifications
// ---------------------------------------------------------------------------
//
// SECURITY (2026-04-21 audit, P0 — replaced 2026-04-24):
//
// Original flaw (pre-2026-04-21): the implementation fetched another
// user's push token via `/api/notifications?action=get_push_token&user_id=...`
// then POSTed directly to `https://exp.host/--/api/v2/push/send`. That
// let any authenticated Mintenance user enumerate UUIDs and send
// arbitrary push payloads to anyone — a cross-user phishing primitive.
//
// Interim fix (2026-04-21): both senders stubbed to no-op so the attack
// surface was removed. This also silently dropped legitimate CTA pushes
// (video-call invitations from CallNotifier, new-bid / new-message
// prompts). Tracked as audit P1 item #13.
//
// Current implementation (2026-04-24 — this file): forwards to the
// server-side endpoint `POST /api/notifications/send`, which:
//   1. Re-authenticates the caller (session cookie or bearer token)
//   2. Verifies caller has a legitimate business relationship with the
//      recipient (shared video_calls row, job, or bid)
//   3. Runs the full NotificationService.createNotification() pipeline
//      server-side — user_notification_preferences, quiet hours, Expo
//      push, retry queue
// The client never touches another user's push token. A 403 from the
// endpoint means the sender has no legitimate reason to push to the
// target and the client logs the refusal instead of retrying.

const DEFAULT_NOTIFICATION_TYPE: NotificationData['type'] = 'system';

async function dispatchPushViaServer(
  recipientId: string,
  title: string,
  body: string,
  data: unknown,
  type: NotificationData['type']
): Promise<void> {
  try {
    const response = await mobileApiClient.post<{
      success: boolean;
      notificationId: string | null;
      suppressed?: boolean;
    }>('/api/notifications/send', {
      recipientId,
      type,
      title,
      body,
      data: isRecord(data) ? data : undefined,
    });

    if (response.suppressed) {
      addBreadcrumb('Push send suppressed by recipient preferences', 'info', {
        recipientId,
        type,
      });
      return;
    }

    addBreadcrumb('Push send dispatched', 'info', {
      recipientId,
      type,
      notificationId: response.notificationId ?? undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // 403 means "no business relationship" — caller should not have
    // attempted this send. Log as warning so it surfaces in Sentry but
    // does not pollute error dashboards.
    const isForbidden = /\b403\b/.test(message);
    if (isForbidden) {
      logger.warn(
        '[push-sender] server refused push — no business relationship with recipient',
        { recipientId, type, title }
      );
      addBreadcrumb('Push send refused (403)', 'warning', {
        recipientId,
        type,
      });
      return;
    }
    logger.error('[push-sender] server push dispatch failed', error, {
      recipientId,
      type,
    });
    addBreadcrumb('Push send dispatch failed', 'error', {
      recipientId,
      type,
      error: message,
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: unknown,
  type: NotificationData['type'] = DEFAULT_NOTIFICATION_TYPE
): Promise<void> {
  if (!userId) {
    logger.warn('[push-sender] sendPushNotification skipped — missing userId', {
      type,
      title,
    });
    return;
  }
  await dispatchPushViaServer(userId, title, body, data, type);
}

export async function sendBulkNotification(
  userIds: string[],
  title: string,
  body: string,
  data?: unknown,
  type: NotificationData['type'] = DEFAULT_NOTIFICATION_TYPE
): Promise<void> {
  if (userIds.length === 0) return;

  // Fan-out serially so one failure doesn't abort the batch — each
  // dispatchPushViaServer already swallows its own errors. Small
  // concurrency cap (5) to avoid bursting past the endpoint's 30/min
  // rate limit for a caller fan-out to a meeting with many guests.
  const BATCH_SIZE = 5;
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((recipientId) =>
        dispatchPushViaServer(recipientId, title, body, data, type)
      )
    );
  }

  addBreadcrumb('Bulk push dispatch completed', 'info', {
    userCount: userIds.length,
    type,
  });
}
