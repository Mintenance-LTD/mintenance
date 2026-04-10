/**
 * Deep linking configuration for React Navigation.
 *
 * Maps URL patterns and push notification data payloads to navigation screens.
 * Used by AppNavigator's NavigationContainer.
 */

import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';
import type { NotificationDeepLinkData } from '../services/notifications/types';
import { logger } from '../utils/logger';

// ============================================================================
// LINKING CONFIG — URL → Screen mapping
// ============================================================================

/**
 * Maps URL paths to React Navigation screens.
 *
 * Supported URL patterns:
 *   mintenance://jobs/:jobId       -> JobDetails screen
 *   mintenance://messages/:id      -> Messaging screen
 *   mintenance://contractors/:id   -> ContractorProfile modal
 *   mintenance://notifications     -> Notifications modal
 *   mintenance://profile           -> Profile tab
 *   https://mintenance.app/jobs/X  -> JobDetails (universal link)
 *
 * Push notification deep links are bridged via getInitialURL and subscribe
 * below, converting notification data into navigation URLs that React
 * Navigation can resolve through this same config.
 */
const linkingConfig: LinkingOptions<RootStackParamList>['config'] = {
  screens: {
    Main: {
      screens: {
        HomeTab: 'home',
        JobsTab: {
          screens: {
            JobsList: 'jobs',
            JobDetails: 'jobs/:jobId',
            JobPayment: 'payment/:jobId',
            ContractView: 'contracts/:jobId',
            BidSubmission: 'jobs/:jobId/bid',
            BidReview: 'jobs/:jobId/bids',
            PhotoReview: 'jobs/:jobId/photos',
            ReviewSubmission: 'jobs/:jobId/review',
          },
        },
        AddTab: 'add',
        MessagingTab: {
          screens: {
            MessagesList: 'messages',
            Messaging: 'messages/:conversationId',
          },
        },
        ProfileTab: {
          screens: {
            ProfileMain: 'profile',
            Properties: 'properties',
            PropertyDetail: 'properties/:propertyId',
          },
        },
      },
    },
    Auth: {
      screens: {
        Login: 'login',
        Register: 'register',
        ForgotPassword: 'forgot-password',
        ResetPassword: 'reset-password',
      },
    },
    Modal: {
      screens: {
        ServiceRequest: 'request',
        ContractorProfile: 'contractors/:contractorId',
        Notifications: 'notifications',
      },
    },
    BookingDetails: 'bookings/:bookingId',
  },
};

// ============================================================================
// NOTIFICATION → DEEP LINK URL MAPPER
// ============================================================================

/**
 * Converts a push notification's data payload into a deep link URL that
 * React Navigation can resolve through the linking config above.
 *
 * Returns null if the notification does not contain actionable deep link data.
 */
function notificationToDeepLinkUrl(
  data: NotificationDeepLinkData | undefined
): string | null {
  if (!data?.type) return null;

  switch (data.type) {
    case 'job_update':
    case 'bid_received':
    case 'bid_rejected':
    case 'payment_received':
    case 'payment_released':
    case 'quote_sent':
    case 'contract_created':
    case 'contract_signed':
    case 'job_completed':
    case 'job_started':
    case 'review_requested':
      if (data.jobId) return `mintenance://jobs/${data.jobId}`;
      break;
    case 'message_received':
      if (data.conversationId)
        return `mintenance://messages/${data.conversationId}`;
      break;
    case 'meeting_scheduled':
      if (data.meetingId) return `mintenance://notifications`;
      return null;
    case 'system':
      return 'mintenance://home';
    default:
      // Unknown notification types fall back to notifications screen
      return null;
  }
  return null;
}

// ============================================================================
// LINKING OPTIONS — combines config + notification bridging
// ============================================================================

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'mintenance://',
    'https://mintenance.app',
    'https://www.mintenance.app',
  ],
  config: linkingConfig,

  /**
   * Custom getInitialURL bridges push notifications with URL-based deep linking.
   * When the app is opened from a killed state by tapping a notification, this
   * converts the notification data into a URL that React Navigation can resolve.
   * Falls back to Linking.getInitialURL() for standard URL deep links.
   */
  async getInitialURL(): Promise<string | null> {
    // 1. Check if the app was opened via a push notification tap (killed state)
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        const data = response.notification.request.content.data as
          | NotificationDeepLinkData
          | undefined;
        const deepLinkUrl = notificationToDeepLinkUrl(data);
        if (deepLinkUrl) {
          logger.info(
            'DeepLink',
            `App opened from notification: ${deepLinkUrl}`
          );
          return deepLinkUrl;
        }
      }
    } catch (error) {
      logger.warn('DeepLink', 'Failed to get last notification response');
    }

    // 2. Fall back to standard URL deep link (universal link / custom scheme)
    const url = await Linking.getInitialURL();
    if (url) {
      logger.info('DeepLink', `App opened from URL: ${url}`);
    }
    return url;
  },

  /**
   * Custom subscribe bridges real-time notification taps with React Navigation's
   * linking system. When the user taps a notification while the app is in the
   * foreground or background, this converts the notification into a URL event
   * that React Navigation handles like any other deep link.
   */
  subscribe(listener: (url: string) => void) {
    // 1. Listen for standard URL deep links (custom scheme + universal links)
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      logger.info('DeepLink', `URL event received: ${url}`);
      listener(url);
    });

    // 2. Listen for notification tap events and convert to URL deep links
    const notificationSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | NotificationDeepLinkData
          | undefined;
        const deepLinkUrl = notificationToDeepLinkUrl(data);
        if (deepLinkUrl) {
          logger.info('DeepLink', `Notification tap -> ${deepLinkUrl}`);
          listener(deepLinkUrl);
        }
      });

    // Return cleanup function
    return () => {
      urlSubscription.remove();
      notificationSubscription.remove();
    };
  },
};
