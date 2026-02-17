import * as Notifications from 'expo-notifications';
import { logger } from '../../utils/logger';
import * as sentry from '../../config/sentry';
import type { NotificationData, NotificationDeepLinkData, DeepLinkParams, NavigationRef, QueuedNotification } from './types';

function addBreadcrumb(
  message: string,
  level: 'info' | 'warning' | 'error' | 'debug',
  data?: Record<string, unknown>
): void {
  const breadcrumbData = data ? { ...data, level } : { level };
  sentry.addBreadcrumb(message, 'notification', breadcrumbData);
}

export function getDeepLinkParams(
  type: NotificationData['type'],
  data: unknown
): DeepLinkParams | null {
  const deepLinkData = data as NotificationDeepLinkData | undefined;

  switch (type) {
    case 'job_update':
      if (deepLinkData?.jobId) {
        return {
          screen: 'Main',
          params: {
            screen: 'JobsTab',
            params: { screen: 'JobDetails', params: { jobId: deepLinkData.jobId } },
          },
        };
      }
      break;

    case 'bid_received':
      if (deepLinkData?.jobId) {
        return {
          screen: 'Main',
          params: {
            screen: 'JobsTab',
            params: { screen: 'JobDetails', params: { jobId: deepLinkData.jobId } },
          },
        };
      }
      break;

    case 'message_received':
      if (deepLinkData?.conversationId) {
        return {
          screen: 'Main',
          params: {
            screen: 'MessagingTab',
            params: {
              screen: 'Messaging',
              params: {
                conversationId: deepLinkData.conversationId,
                jobTitle: deepLinkData.jobTitle,
                recipientId: deepLinkData.senderId,
                recipientName: deepLinkData.senderName,
              },
            },
          },
        };
      }
      break;

    case 'meeting_scheduled':
      if (deepLinkData?.meetingId) {
        return {
          screen: 'Modal',
          params: { screen: 'MeetingDetails', params: { meetingId: deepLinkData.meetingId } },
        };
      }
      break;

    case 'payment_received':
      if (deepLinkData?.jobId) {
        return {
          screen: 'Main',
          params: {
            screen: 'JobsTab',
            params: { screen: 'JobDetails', params: { jobId: deepLinkData.jobId } },
          },
        };
      }
      break;

    case 'quote_sent':
      if (deepLinkData?.quoteId || deepLinkData?.jobId) {
        return {
          screen: 'Main',
          params: {
            screen: 'JobsTab',
            params: { screen: 'JobDetails', params: { jobId: deepLinkData.jobId } },
          },
        };
      }
      break;

    case 'system':
      return { screen: 'Main', params: { screen: 'HomeTab' } };

    default:
      logger.warn('Unknown notification type', { type });
      return null;
  }

  return null;
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
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return false;
}

export async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  navigationRef: NavigationRef,
  queueNotificationFn: (notification: Notifications.Notification) => Promise<void>,
  markAsReadFn: (id: string) => Promise<void>
): Promise<void> {
  const data = response.notification.request.content.data as NotificationDeepLinkData | undefined;
  const type = data?.type;
  const actionIdentifier = response.actionIdentifier;

  logger.info('Processing notification tap', { type, data });

  if (!navigationRef) {
    logger.warn('Navigation not ready, queuing notification for later processing');
    await queueNotificationFn(response.notification);
    return;
  }

  if (!navigationRef.isReady()) {
    logger.warn('Navigation not ready, waiting...');
    await waitForNavigation(navigationRef, 3000);
  }

  if (!type) {
    logger.warn('No notification type found in data');
    return;
  }

  // Mark as read
  if (data?.notificationId) {
    await markAsReadFn(data.notificationId).catch(error => {
      logger.error('Failed to mark notification as read', error);
    });
  }

  const deepLinkParams = getDeepLinkParams(type, data);

  if (!deepLinkParams) {
    logger.warn('No deep link configured for notification type', { type });
    return;
  }

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
  queueNotificationFn: (notification: Notifications.Notification) => Promise<void>,
  markAsReadFn: (id: string) => Promise<void>
): Promise<void> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      logger.info('Processing notification from killed state', {
        type: response.notification.request.content.data?.type,
      });
      await handleNotificationResponse(response, navigationRef, queueNotificationFn, markAsReadFn);
    }
  } catch (error) {
    logger.error('Failed to process last notification response', error);
  }
}
