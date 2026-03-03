/**
 * Navigation Constants
 * 
 * Centralized navigation configuration and constants
 */

import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export const NAVIGATION_CONSTANTS = {
  TAB_BAR_HEIGHT: 64,
  TAB_BAR_PADDING: 8,
  ICON_SIZE: 22,
  ACTIVE_ICON_SIZE: 24,
};

export const TAB_CONFIG = {
  HomeTab: {
    icon: 'home-outline' as keyof typeof Ionicons.glyphMap,
    activeIcon: 'home' as keyof typeof Ionicons.glyphMap,
    label: 'Home',
  },
  JobsTab: {
    icon: 'receipt-outline' as keyof typeof Ionicons.glyphMap,
    activeIcon: 'receipt' as keyof typeof Ionicons.glyphMap,
    label: 'Invoices',
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
    borderTopWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: '400' as const,
    marginTop: 2,
  },
  tabBarIconStyle: {
    marginTop: 2,
  },
};
