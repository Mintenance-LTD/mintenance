import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../utils/logger';
import * as sentry from '../../config/sentry';
import type { QueuedNotification } from './types';

const NOTIFICATION_QUEUE_KEY = '@mintenance/notification_queue';
const LAST_NOTIFICATION_ID_KEY = '@mintenance/last_notification_id';

function addBreadcrumb(
  message: string,
  level: 'info' | 'warning' | 'error' | 'debug',
  data?: Record<string, unknown>
): void {
  const breadcrumbData = data ? { ...data, level } : { level };
  sentry.addBreadcrumb(message, 'notification', breadcrumbData);
}

let notificationQueue: QueuedNotification[] = [];

export function getQueue(): QueuedNotification[] {
  return notificationQueue;
}

export async function queueNotification(
  notification: Notifications.Notification
): Promise<void> {
  try {
    const queuedNotification: QueuedNotification = {
      id: notification.request.identifier,
      notification,
      receivedAt: new Date().toISOString(),
      processed: false,
    };

    notificationQueue.push(queuedNotification);

    await AsyncStorage.setItem(
      NOTIFICATION_QUEUE_KEY,
      JSON.stringify(notificationQueue)
    );

    await AsyncStorage.setItem(
      LAST_NOTIFICATION_ID_KEY,
      notification.request.identifier
    );

    logger.info('Notification queued', {
      id: queuedNotification.id,
      queueLength: notificationQueue.length,
    });
    addBreadcrumb('Notification queued', 'info', {
      id: queuedNotification.id,
      type: notification.request.content.data?.type,
    });
  } catch (error) {
    logger.error('Failed to queue notification', error);
  }
}

export async function processNotificationQueue(): Promise<void> {
  try {
    const queueData = await AsyncStorage.getItem(NOTIFICATION_QUEUE_KEY);
    const queuedNotifications: QueuedNotification[] = queueData
      ? JSON.parse(queueData)
      : [];
    const unprocessed = queuedNotifications.filter(q => !q.processed);

    addBreadcrumb('Processing notification queue', 'info', {
      queueSize: queuedNotifications.length,
      unprocessedCount: unprocessed.length,
    });

    for (const queued of unprocessed) {
      queued.processed = true;
    }

    await AsyncStorage.setItem(
      NOTIFICATION_QUEUE_KEY,
      JSON.stringify(queuedNotifications)
    );

    addBreadcrumb('Notification queue processed', 'info', {
      processedCount: unprocessed.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addBreadcrumb('Failed to process notification queue', 'error', {
      error: errorMessage,
    });
  }
}

async function processQueue(): Promise<void> {
  const unprocessed = notificationQueue.filter(q => !q.processed);

  if (unprocessed.length === 0) return;

  logger.info('Processing queued notifications', { count: unprocessed.length });

  for (const queued of unprocessed) {
    queued.processed = true;
    logger.info('Processed queued notification', {
      id: queued.id,
      type: queued.notification.request.content.data?.type,
      receivedAt: queued.receivedAt,
    });
  }

  await AsyncStorage.setItem(
    NOTIFICATION_QUEUE_KEY,
    JSON.stringify(notificationQueue)
  );

  // Clear old processed notifications (keep last 50)
  notificationQueue = notificationQueue
    .filter(q => !q.processed)
    .concat(notificationQueue.filter(q => q.processed).slice(-50));

  await AsyncStorage.setItem(
    NOTIFICATION_QUEUE_KEY,
    JSON.stringify(notificationQueue)
  );
}

export async function loadNotificationQueue(): Promise<void> {
  try {
    const queueData = await AsyncStorage.getItem(NOTIFICATION_QUEUE_KEY);

    if (queueData) {
      notificationQueue = JSON.parse(queueData);
      logger.info('Loaded notification queue', {
        count: notificationQueue.length,
      });
      await processQueue();
    }
  } catch (error) {
    logger.error('Failed to load notification queue', error);
  }
}

async function getQueuedNotifications(): Promise<QueuedNotification[]> {
  try {
    const queueData = await AsyncStorage.getItem(NOTIFICATION_QUEUE_KEY);
    if (!queueData) return [];
    const parsed = JSON.parse(queueData) as QueuedNotification[];
    return parsed.filter(q => !q.processed);
  } catch (error) {
    logger.error('Failed to get queued notifications', error);
    return [];
  }
}

export async function processQueuedNotifications(
  handleResponseFn: (response: Notifications.NotificationResponse) => Promise<void>
): Promise<void> {
  try {
    const queuedNotifications = await getQueuedNotifications();

    if (queuedNotifications.length === 0) return;

    logger.info(`Processing ${queuedNotifications.length} queued notifications`);

    for (const notification of queuedNotifications) {
      try {
        const response: Notifications.NotificationResponse = {
          notification: notification.notification,
          actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
        };
        await handleResponseFn(response);
      } catch (error) {
        logger.error('Failed to process queued notification', error);
      }
    }

    await AsyncStorage.removeItem(NOTIFICATION_QUEUE_KEY);
  } catch (error) {
    logger.error('Failed to process notification queue', error);
  }
}

export async function clearAll(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
    notificationQueue = [];
    await AsyncStorage.removeItem(NOTIFICATION_QUEUE_KEY);
    await AsyncStorage.removeItem(LAST_NOTIFICATION_ID_KEY);
    logger.info('All notifications cleared');
  } catch (error) {
    logger.error('Failed to clear notifications', error);
  }
}
