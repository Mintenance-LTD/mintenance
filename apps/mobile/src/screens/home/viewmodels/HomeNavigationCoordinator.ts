/**
 * Home Navigation Coordinator
 *
 * Handles all navigation logic for the Home screen.
 * Separates navigation concerns from business logic.
 *
 * @filesize Target: <150 lines
 * @compliance Architecture principles - Coordinator pattern
 */

import { NavigationProp } from '@react-navigation/native';
import { useHaptics } from '../../../utils/haptics';
import { me } from '../../../design-system/mint-editorial';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNavigation = NavigationProp<Record<string, object | undefined>>;

interface HomeNavigationActions {
  openServiceRequest: (params?: Record<string, unknown>) => void;
  openJobsList: () => void;
  openInbox: () => void;
  openConversation: (params: Record<string, unknown>) => void;
  openMeetingSchedule: () => void;
  openJobDetails: (jobId: string) => void;
  openProfileScreen: () => void;
  openSettingsScreen: () => void;
  openNotificationSettings: () => void;
  openPaymentMethods: () => void;
  openSupport: () => void;
}

/**
 * Navigation coordinator for Home screen
 */
export class HomeNavigationCoordinator implements HomeNavigationActions {
  private navigation: AnyNavigation;
  private haptics: ReturnType<typeof useHaptics>;

  constructor(
    navigation: AnyNavigation,
    haptics: ReturnType<typeof useHaptics>
  ) {
    this.navigation = navigation;
    this.haptics = haptics;
  }

  openServiceRequest = (params?: Record<string, unknown>) => {
    this.haptics.light();
    this.navigation.getParent?.()?.navigate('Modal', {
      screen: 'ServiceRequest',
      params,
    });
  };

  openJobsList = () => {
    this.haptics.selection();
    this.navigation.navigate('JobsTab', { screen: 'JobsList' });
  };

  openInbox = () => {
    this.haptics.selection();
    this.navigation.navigate('MessagingTab', { screen: 'MessagesList' });
  };

  openConversation = (params: Record<string, unknown>) => {
    this.haptics.selection();
    this.navigation.navigate('MessagingTab', {
      screen: 'Messaging',
      params,
    });
  };

  openMeetingSchedule = () => {
    this.haptics.light();
    // 2026-04-30 audit: the MeetingSchedule modal requires a
    // `contractorId` param that the dashboard doesn't have. Until we
    // build a contractor-picker entry point, route to the BookingStatus
    // screen so the user lands on something real (their existing
    // appointments) instead of crashing on a missing-param navigation.
    this.navigation.navigate('ProfileTab', { screen: 'BookingStatus' });
  };

  openJobDetails = (jobId: string) => {
    this.haptics.selection();
    this.navigation.navigate('JobsTab', {
      screen: 'JobDetails',
      params: { jobId },
    });
  };

  openProfileScreen = () => {
    this.haptics.selection();
    this.navigation.navigate('ProfileTab', { screen: 'ProfileMain' });
  };

  openSettingsScreen = () => {
    this.haptics.selection();
    // Audit step 9 (2026-04-29): point at canonical screen.
    // `NotificationSettings` is the legacy SMS/category-matrix
    // surface; `NotificationPreferences` is the user_notification_
    // preferences-backed canonical one.
    this.navigation.navigate('ProfileTab', {
      screen: 'NotificationPreferences',
    });
  };

  openNotificationSettings = () => {
    this.haptics.light();
    // 2026-04-30 audit: NotificationPreferences is registered under the
    // profile stack, not the modal stack. Sending the user to the modal
    // navigator with this screen name was a runtime crash.
    this.navigation.navigate('ProfileTab', {
      screen: 'NotificationPreferences',
    });
  };

  openPaymentMethods = () => {
    this.haptics.selection();
    this.navigation.navigate('ProfileTab', { screen: 'PaymentMethods' });
  };

  openSupport = () => {
    this.haptics.selection();
    // 2026-04-30 audit: HelpCenter is a profile-stack screen, not modal.
    this.navigation.navigate('ProfileTab', {
      screen: 'HelpCenter',
    });
  };
}

/**
 * Custom hook for Home navigation
 */


/**
 * Navigation route definitions for type safety
 */


/**
 * Quick action definitions for the dashboard
 */
interface QuickAction {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  color: string;
  action: () => void;
}

/**
 * Generate quick actions based on user role
 */
