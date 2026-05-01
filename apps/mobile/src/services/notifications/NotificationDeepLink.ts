import * as Notifications from 'expo-notifications';
import { logger } from '../../utils/logger';
import * as sentry from '../../config/sentry';
import { routeForNotification } from './notificationRoutingTable';
import type {
  NotificationData,
  NotificationDeepLinkData,
  DeepLinkParams,
  NavigationRef,
  QueuedNotification,
} from './types';

function addBreadcrumb(
  message: string,
  level: 'info' | 'warning' | 'error' | 'debug',
  data?: Record<string, unknown>
): void {
  const breadcrumbData = data ? { ...data, level } : { level };
  sentry.addBreadcrumb(message, 'notification', breadcrumbData);
}

/**
 * 2026-04-30 audit P1: delegates to the shared routing table so OS-tap
 * navigation matches the in-app inbox tap exactly. Previously this
 * file owned its own switch statement that disagreed with
 * `notificationNavigation.ts` on bid_received and meeting_scheduled.
 *
 * 2026-04-30 audit P1 follow-up: `routeForNotification` is now
 * total — it returns the in-app inbox fallback for unknown types
 * rather than `null`. We log the fallback for diagnosability but
 * still always navigate, matching the documented contract.
 */
function getDeepLinkParams(
  type: NotificationData['type'] | undefined,
  data: unknown
): DeepLinkParams {
  const route = routeForNotification(type, data);
  if (route.screen === 'Modal' && route.params?.screen === 'Notifications') {
    logger.warn('Routing notification to inbox fallback', { type });
  }
  return route as DeepLinkParams;
}

async function waitForNavigation(
  navigationRef: NavigationRef,
  timeoutMs: number = 3000
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (navigationRef?.isReady()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

export async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  navigationRef: NavigationRef,
  queueNotificationFn: (
    notification: Notifications.Notification
  ) => Promise<void>,
  markAsReadFn: (id: string) => Promise<void>
): Promise<void> {
  const data = response.notification.request.content.data as
    | NotificationDeepLinkData
    | undefined;
  const type = data?.type;
  const actionIdentifier = response.actionIdentifier;

  logger.info('Processing notification tap', { type, data });

  if (!navigationRef) {
    logger.warn(
      'Navigation not ready, queuing notification for later processing'
    );
    await queueNotificationFn(response.notification);
    return;
  }

  if (!navigationRef.isReady()) {
    logger.warn('Navigation not ready, waiting...');
    await waitForNavigation(navigationRef, 3000);
  }

  // 2026-05-01 audit follow-up: the previous version returned early when
  // `type` was missing, which silently dropped the OS-tap path. The
  // documented contract is "unknown / missing types fall back to the
  // in-app inbox". `routeForNotification` is now total and handles the
  // missing case (returns NOTIFICATIONS_FALLBACK), so we log + continue
  // instead of dropping the tap.
  if (!type) {
    logger.warn(
      'No notification type found in data; falling back to inbox via routing table'
    );
  }

  // Mark as read
  if (data?.notificationId) {
    await markAsReadFn(data.notificationId).catch((error) => {
      logger.error('Failed to mark notification as read', error);
    });
  }

  const deepLinkParams = getDeepLinkParams(type, data);

  try {
    navigationRef.navigate(deepLinkParams.screen, deepLinkParams.params);
    logger.info('Navigated to screen', deepLinkParams);
    addBreadcrumb('Notification response handled', 'info', {
      type,
      actionIdentifier,
      navigatedTo: deepLinkParams.screen,
    });
  } catch (error) {
    logger.error('Navigation failed', error);
  }
}

export async function processLastNotificationResponse(
  navigationRef: NavigationRef,
  queueNotificationFn: (
    notification: Notifications.Notification
  ) => Promise<void>,
  markAsReadFn: (id: string) => Promise<void>
): Promise<void> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      logger.info('Processing notification from killed state', {
        type: response.notification.request.content.data?.type,
      });
      await handleNotificationResponse(
        response,
        navigationRef,
        queueNotificationFn,
        markAsReadFn
      );
    }
  } catch (error) {
    logger.error('Failed to process last notification response', error);
  }
}
