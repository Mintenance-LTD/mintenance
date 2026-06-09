/**
 * Deep linking configuration for React Navigation.
 *
 * Maps URL patterns and push notification data payloads to navigation screens.
 * Used by AppNavigator's NavigationContainer.
 */

import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';
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
 *   mintenance://profile             -> Profile tab
 *   https://mintenance.co.uk/jobs/X  -> JobDetails (universal link)
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
            // 2026-05-26 audit-57 P2: the TeamAccess invite flow opens
            // `mintenance://profile/subscription` when a non-Agency
            // homeowner hits the 402 upgrade gate. Without this entry
            // the URL fails to resolve and the "View plans" CTA dies
            // silently. Subscription is the registered screen name in
            // ProfileNavigator (SafeSubscriptionScreen wrapper).
            Subscription: 'profile/subscription',
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
// LINKING OPTIONS
// ============================================================================
//
// 2026-05-26 audit-54 P1: notification taps are NOT bridged through
// React Navigation linking anymore. NotificationService owns the
// notification-tap path via NotificationDeepLink + the canonical
// notificationRoutingTable. This file is the URL-only deep-link
// configuration (custom scheme + universal links).

export const linking: LinkingOptions<RootStackParamList> = {
  // 2026-06-08: universal-link host migrated from the legacy mintenance.app
  // to the canonical UK product domain mintenance.co.uk (matches the
  // config/legal.ts + Settings/Profile migration). Must stay in lockstep with
  // the iOS associatedDomains + Android intentFilters in app.config.js and the
  // server-hosted .well-known association files on mintenance.co.uk. Requires
  // an EAS/native rebuild to take effect.
  prefixes: [
    'mintenance://',
    'https://mintenance.co.uk',
    'https://www.mintenance.co.uk',
  ],
  config: linkingConfig,

  /**
   * Return only standard URL deep-links (universal links / custom scheme).
   *
   * 2026-05-26 audit-54 P1: previously this also queried
   * `Notifications.getLastNotificationResponseAsync()` and converted
   * the response via the stale `notificationToDeepLinkUrl` switch.
   * Cold-start notification taps are now handled by
   * NotificationService's `processLastNotificationResponse` path
   * which routes through the canonical notificationRoutingTable.
   * Keeping the same logic in two places (URL bridge here +
   * navigation listener there) produced non-deterministic taps.
   */
  async getInitialURL(): Promise<string | null> {
    const url = await Linking.getInitialURL();
    if (url) {
      logger.info('DeepLink', `App opened from URL: ${url}`);
    }
    return url;
  },

  /**
   * Subscribe to standard URL deep-link events ONLY.
   *
   * 2026-05-26 audit-54 P1: previously this also registered an
   * `addNotificationResponseReceivedListener` and routed taps through
   * the stale `notificationToDeepLinkUrl` switch (no support for many
   * new notification types — review, contractor tracking, tenant
   * linking, verification outcomes, etc.). That conflicted with
   * NotificationService.registerListeners which uses the canonical
   * notificationRoutingTable. Two listeners for the same event meant
   * one consumer could route to a generic job screen while the other
   * tried the newer table — non-deterministic on every tap.
   *
   * The routing table is now the single source of truth for
   * notification taps; this subscribe only forwards real URL events
   * (custom scheme + universal links) to React Navigation.
   */
  subscribe(listener: (url: string) => void) {
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      logger.info('DeepLink', `URL event received: ${url}`);
      listener(url);
    });
    return () => {
      urlSubscription.remove();
    };
  },
};
