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
// SECURITY (2026-04-21 audit, P0):
//
// The previous implementation fetched another user's push token via
// `/api/notifications?action=get_push_token&user_id=<uuid>` and then POSTed
// directly to `https://exp.host/--/api/v2/push/send`. That endpoint has no
// recipient-auth, so any authenticated Mintenance user could have
// enumerated UUIDs and sent arbitrary push payloads to other users — a
// cross-user phishing primitive.
//
// The `get_push_token` API action does not exist on the web (the client
// call has been silently no-op'ing), so this is "dead code that reads
// as broken" rather than an actively exploitable hole today. Still
// stubbing the functions so:
//   (a) the attack surface is PERMANENTLY removed — future devs can't
//       re-enable by restoring the server action;
//   (b) the signature stays stable so callers (CallNotifier,
//       NotificationServiceExample) keep compiling;
//   (c) a warning breadcrumb makes the no-op visible in Sentry so the
//       replacement server-side channel is obvious when it's built.
//
// Server-side replacement path (to be built separately):
//   POST /api/notifications/send  → server-side NotificationService
//   resolves the recipient's stored push token from user_push_tokens
//   (RLS-guarded) and uses the Expo server-side API. Clients never
//   touch another user's token.

export async function sendPushNotification(
  userId: string,
  title: string,
  _body: string,
  _data?: unknown,
  type: NotificationData['type'] = 'system'
): Promise<void> {
  logger.warn(
    '[push-sender] client-side sendPushNotification is a no-op (2026-04-21 ' +
      'security fix). Route the send through a server endpoint that looks up ' +
      "the recipient's token from user_push_tokens.",
    { userId, type, title }
  );
  addBreadcrumb('Client-side push send refused', 'warning', {
    userId,
    type,
  });
}

export async function sendBulkNotification(
  userIds: string[],
  title: string,
  _body: string,
  _data?: unknown,
  type: NotificationData['type'] = 'system'
): Promise<void> {
  logger.warn(
    '[push-sender] client-side sendBulkNotification is a no-op (2026-04-21 ' +
      'security fix). See sendPushNotification for rationale.',
    { userCount: userIds.length, type, title }
  );
  addBreadcrumb('Client-side bulk push send refused', 'warning', {
    userCount: userIds.length,
    type,
  });
}
