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
import { theme } from '../../../theme';

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
const useHomeNavigation = (
  navigation: AnyNavigation
): HomeNavigationActions => {
  const haptics = useHaptics();
  const coordinator = new HomeNavigationCoordinator(navigation, haptics);

  return {
    openServiceRequest: coordinator.openServiceRequest,
    openJobsList: coordinator.openJobsList,
    openInbox: coordinator.openInbox,
    openConversation: coordinator.openConversation,
    openMeetingSchedule: coordinator.openMeetingSchedule,
    openJobDetails: coordinator.openJobDetails,
    openProfileScreen: coordinator.openProfileScreen,
    openSettingsScreen: coordinator.openSettingsScreen,
    openNotificationSettings: coordinator.openNotificationSettings,
    openPaymentMethods: coordinator.openPaymentMethods,
    openSupport: coordinator.openSupport,
  };
};

/**
 * Navigation route definitions for type safety
 */
type HomeNavigationRoutes = {
  ServiceRequest: { params?: Record<string, unknown> };
  JobsList: undefined;
  MessagesList: undefined;
  Messaging: { params: Record<string, unknown> };
  MeetingSchedule: undefined;
  JobDetails: { jobId: string };
  Profile: undefined;
  Settings: undefined;
  NotificationSettings: undefined;
  PaymentMethods: undefined;
  HelpCenter: undefined;
};

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
const generateQuickActions = (
  userRole: 'homeowner' | 'contractor',
  navigation: HomeNavigationActions
): QuickAction[] => {
  const commonActions: QuickAction[] = [
    {
      id: 'messages',
      title: 'Messages',
      subtitle: 'View conversations',
      icon: 'chatbubbles-outline',
      color: '#3B82F6',
      action: navigation.openInbox,
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Account preferences',
      icon: 'settings-outline',
      color: theme.colors.textTertiary,
      action: navigation.openSettingsScreen,
    },
  ];

  if (userRole === 'homeowner') {
    return [
      {
        id: 'post_job',
        title: 'Post Job',
        subtitle: 'Create service request',
        icon: 'add-circle-outline',
        color: theme.colors.accent,
        action: () => navigation.openServiceRequest(),
      },
      {
        id: 'my_jobs',
        title: 'My Jobs',
        subtitle: 'Active projects',
        icon: 'briefcase-outline',
        color: '#3B82F6',
        action: navigation.openJobsList,
      },
      ...commonActions,
    ];
  } else {
    return [
      {
        id: 'browse_jobs',
        title: 'Browse Jobs',
        subtitle: 'Find opportunities',
        icon: 'search-outline',
        color: theme.colors.primary,
        action: navigation.openJobsList,
      },
      {
        id: 'schedule_meeting',
        title: 'Schedule Meeting',
        subtitle: 'Meet with clients',
        icon: 'calendar-outline',
        color: theme.colors.accent,
        action: navigation.openMeetingSchedule,
      },
      ...commonActions,
    ];
  }
};
