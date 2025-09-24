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

export interface HomeNavigationActions {
  openContractorDiscovery: (params: Record<string, unknown>) => void;
  openFindContractors: () => void;
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
  private navigation: NavigationProp<any>;
  private haptics: ReturnType<typeof useHaptics>;

  constructor(
    navigation: NavigationProp<any>,
    haptics: ReturnType<typeof useHaptics>
  ) {
    this.navigation = navigation;
    this.haptics = haptics;
  }

  /**
   * Navigate to contractor discovery with Tinder-style interface
   */
  openContractorDiscovery = (params: Record<string, unknown>) => {
    this.haptics.impact('light');
    this.navigation.getParent?.()?.navigate('Modal', {
      screen: 'ContractorDiscovery',
      params,
    });
  };

  /**
   * Navigate to find contractors screen
   */
  openFindContractors = () => {
    this.haptics.impact('light');
    this.navigation.getParent?.()?.navigate('Modal', {
      screen: 'FindContractors'
    });
  };

  /**
   * Navigate to service request screen
   */
  openServiceRequest = (params?: Record<string, unknown>) => {
    this.haptics.impact('light');
    this.navigation.getParent?.()?.navigate('Modal', {
      screen: 'ServiceRequest',
      params,
    });
  };

  /**
   * Navigate to jobs list
   */
  openJobsList = () => {
    this.haptics.selection();
    this.navigation.navigate('JobsTab', { screen: 'JobsList' });
  };

  /**
   * Navigate to inbox/messages list
   */
  openInbox = () => {
    this.haptics.selection();
    this.navigation.navigate('MessagingTab', { screen: 'MessagesList' });
  };

  /**
   * Navigate to specific conversation
   */
  openConversation = (params: Record<string, unknown>) => {
    this.haptics.selection();
    this.navigation.navigate('MessagingTab', {
      screen: 'Messaging',
      params,
    });
  };

  /**
   * Navigate to meeting schedule screen
   */
  openMeetingSchedule = () => {
    this.haptics.impact('light');
    this.navigation.getParent?.()?.navigate('Modal', {
      screen: 'MeetingSchedule'
    });
  };

  /**
   * Navigate to job details
   */
  openJobDetails = (jobId: string) => {
    this.haptics.selection();
    this.navigation.navigate('JobsTab', {
      screen: 'JobDetails',
      params: { jobId },
    });
  };

  /**
   * Navigate to profile screen
   */
  openProfileScreen = () => {
    this.haptics.selection();
    this.navigation.navigate('ProfileTab', { screen: 'Profile' });
  };

  /**
   * Navigate to settings screen
   */
  openSettingsScreen = () => {
    this.haptics.selection();
    this.navigation.navigate('ProfileTab', { screen: 'Settings' });
  };

  /**
   * Navigate to notification settings
   */
  openNotificationSettings = () => {
    this.haptics.impact('light');
    this.navigation.getParent?.()?.navigate('Modal', {
      screen: 'NotificationSettings'
    });
  };

  /**
   * Navigate to payment methods
   */
  openPaymentMethods = () => {
    this.haptics.selection();
    this.navigation.navigate('ProfileTab', { screen: 'PaymentMethods' });
  };

  /**
   * Navigate to support/help screen
   */
  openSupport = () => {
    this.haptics.selection();
    this.navigation.getParent?.()?.navigate('Modal', {
      screen: 'HelpCenter'
    });
  };
}

/**
 * Custom hook for Home navigation
 */
export const useHomeNavigation = (
  navigation: NavigationProp<any>
): HomeNavigationActions => {
  const haptics = useHaptics();
  const coordinator = new HomeNavigationCoordinator(navigation, haptics);

  return {
    openContractorDiscovery: coordinator.openContractorDiscovery,
    openFindContractors: coordinator.openFindContractors,
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
export type HomeNavigationRoutes = {
  ContractorDiscovery: { params?: Record<string, unknown> };
  FindContractors: undefined;
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
export interface QuickAction {
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
export const generateQuickActions = (
  userRole: 'homeowner' | 'contractor',
  navigation: HomeNavigationActions
): QuickAction[] => {
  const commonActions: QuickAction[] = [
    {
      id: 'messages',
      title: 'Messages',
      subtitle: 'View conversations',
      icon: 'chatbubbles-outline',
      color: '#007AFF',
      action: navigation.openInbox,
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Account preferences',
      icon: 'settings-outline',
      color: '#8E8E93',
      action: navigation.openSettingsScreen,
    },
  ];

  if (userRole === 'homeowner') {
    return [
      {
        id: 'find_contractors',
        title: 'Find Contractors',
        subtitle: 'Discover professionals',
        icon: 'search-outline',
        color: '#34C759',
        action: navigation.openFindContractors,
      },
      {
        id: 'post_job',
        title: 'Post Job',
        subtitle: 'Create service request',
        icon: 'add-circle-outline',
        color: '#FF9500',
        action: () => navigation.openServiceRequest(),
      },
      {
        id: 'my_jobs',
        title: 'My Jobs',
        subtitle: 'Active projects',
        icon: 'briefcase-outline',
        color: '#5856D6',
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
        color: '#34C759',
        action: navigation.openJobsList,
      },
      {
        id: 'schedule_meeting',
        title: 'Schedule Meeting',
        subtitle: 'Meet with clients',
        icon: 'calendar-outline',
        color: '#FF9500',
        action: navigation.openMeetingSchedule,
      },
      {
        id: 'contractor_discovery',
        title: 'Network',
        subtitle: 'Connect with peers',
        icon: 'people-outline',
        color: '#5856D6',
        action: () => navigation.openContractorDiscovery({}),
      },
      ...commonActions,
    ];
  }
};