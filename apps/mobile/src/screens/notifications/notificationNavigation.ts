/**
 * Notification press navigation logic.
 * Routes notification taps to the correct screen based on type and payload.
 */

import { NotificationData } from '../../services/NotificationService';

/**
 * Navigate to the appropriate screen based on notification type and data.
 * @param navigation - React Navigation object (typed as any due to nested navigator casting)
 * @param notification - The notification that was pressed
 */
export function navigateForNotification(
  navigation: any,
  notification: NotificationData
): void {
  const data = notification.data as Record<string, string> | undefined;
  // Support both camelCase and snake_case keys from notification payload
  const jobId = data?.jobId || data?.job_id;
  const conversationId = data?.conversationId || data?.conversation_id;
  const meetingId = data?.meetingId || data?.meeting_id;
  const senderId = data?.senderId || data?.sender_id;
  const senderName = data?.senderName || data?.sender_name;
  const jobTitle = data?.jobTitle || data?.job_title;

  switch (notification.type) {
    case 'job_update':
    case 'bid_accepted' as NotificationData['type']:
      if (jobId) {
        navigation.navigate('Main', {
          screen: 'JobsTab',
          params: { screen: 'JobDetails', params: { jobId } },
        });
      }
      break;
    case 'payment_received':
      navigation.navigate('Main', {
        screen: 'ProfileTab',
        params: { screen: 'PaymentHistory' },
      });
      break;
    case 'quote_sent':
      if (jobId) {
        navigation.navigate('Main', {
          screen: 'JobsTab',
          params: { screen: 'JobDetails', params: { jobId } },
        });
      }
      break;
    case 'bid_received':
      if (jobId) {
        navigation.navigate('Main', {
          screen: 'JobsTab',
          params: { screen: 'BidReview', params: { jobId } },
        });
      }
      break;
    case 'message_received':
      if (conversationId) {
        navigation.navigate('Main', {
          screen: 'MessagingTab',
          params: {
            screen: 'Messaging',
            params: {
              conversationId,
              jobTitle: jobTitle || '',
              recipientId: senderId || '',
              recipientName: senderName || '',
            },
          },
        });
      }
      break;
    case 'meeting_scheduled':
      if (meetingId) {
        navigation.navigate('Modal', {
          screen: 'MeetingDetails',
          params: { meetingId },
        });
      } else {
        navigation.navigate('Main', {
          screen: 'ProfileTab',
          params: { screen: 'Calendar' },
        });
      }
      break;
    default:
      // Navigate to home for unhandled notification types
      navigation.navigate('Main', { screen: 'HomeTab' });
      break;
  }
}
