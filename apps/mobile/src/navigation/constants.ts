/**
 * Navigation Constants
 * 
 * Centralized navigation configuration and constants
 */

import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export const NAVIGATION_CONSTANTS = {
  TAB_BAR_HEIGHT: 60,
  TAB_BAR_PADDING: 8,
  ICON_SIZE: 24,
  ACTIVE_ICON_SIZE: 26,
};

export const TAB_CONFIG = {
  HomeTab: {
    icon: 'home-outline' as keyof typeof Ionicons.glyphMap,
    activeIcon: 'home' as keyof typeof Ionicons.glyphMap,
    label: 'Home',
  },
  JobsTab: {
    icon: 'briefcase-outline' as keyof typeof Ionicons.glyphMap,
    activeIcon: 'briefcase' as keyof typeof Ionicons.glyphMap,
    label: 'Jobs',
  },
  DiscoverTab: {
    icon: 'map-outline' as keyof typeof Ionicons.glyphMap,
    activeIcon: 'map' as keyof typeof Ionicons.glyphMap,
    label: 'Find Jobs',
  },
  AddTab: {
    icon: 'add-circle-outline' as keyof typeof Ionicons.glyphMap,
    activeIcon: 'add-circle' as keyof typeof Ionicons.glyphMap,
    label: '',
  },
  MessagingTab: {
    icon: 'chatbubbles-outline' as keyof typeof Ionicons.glyphMap,
    activeIcon: 'chatbubbles' as keyof typeof Ionicons.glyphMap,
    label: 'Messages',
  },
  ProfileTab: {
    icon: 'person-outline' as keyof typeof Ionicons.glyphMap,
    activeIcon: 'person' as keyof typeof Ionicons.glyphMap,
    label: 'Profile',
  },
};

export const TAB_STYLES = {
  tabBarStyle: {
    height: NAVIGATION_CONSTANTS.TAB_BAR_HEIGHT,
    paddingBottom: NAVIGATION_CONSTANTS.TAB_BAR_PADDING,
    paddingTop: NAVIGATION_CONSTANTS.TAB_BAR_PADDING,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 4,
  },
  tabBarIconStyle: {
    marginTop: 2,
  },
};
