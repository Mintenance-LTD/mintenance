import React from 'react';
import {
  TouchableOpacity,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type {
  BottomTabNavigationOptions,
  BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs';

/**
 * Creates a tab bar button with haptic feedback and accessibility props.
 */
function createTabBarButton(
  handleTabPress: () => void,
  accessibilityLabel: string,
  accessibilityHint: string,
  extraStyle?: ViewStyle
) {
  return ({ onPress, style, children }: BottomTabBarButtonProps) => (
    <TouchableOpacity
      onPress={(e) => {
        handleTabPress();
        onPress?.(e);
      }}
      accessibilityRole='tab'
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[style as ViewStyle, { minHeight: 44, minWidth: 44 }, extraStyle]}
    >
      {children}
    </TouchableOpacity>
  );
}

export function getHomeTabOptions(
  handleTabPress: () => void
): BottomTabNavigationOptions {
  return {
    tabBarLabel: 'Home',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name='home' size={size} color={color} />
    ),
    tabBarAccessibilityLabel: 'Home tab',
    tabBarButton: createTabBarButton(
      handleTabPress,
      'Home tab',
      'Navigate to home screen'
    ),
  };
}

export function getJobsTabOptions(
  handleTabPress: () => void
): BottomTabNavigationOptions {
  return {
    tabBarLabel: 'Jobs',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name='briefcase' size={size} color={color} />
    ),
    tabBarAccessibilityLabel: 'Jobs tab',
    tabBarButton: createTabBarButton(
      handleTabPress,
      'Jobs tab',
      'Navigate to jobs'
    ),
  };
}

export function getAddTabOptions(
  handleTabPress: () => void,
  userRole: string | undefined,
  fabIcon: React.ReactNode
): BottomTabNavigationOptions {
  return {
    tabBarLabel: '',
    tabBarIcon: () => fabIcon,
    tabBarAccessibilityLabel:
      userRole === 'homeowner'
        ? 'Create service request'
        : 'Find jobs near you',
    tabBarButton: ({ onPress, style, children }) => (
      <TouchableOpacity
        onPress={(e) => {
          handleTabPress();
          onPress?.(e);
        }}
        accessibilityRole='button'
        accessibilityLabel={
          userRole === 'homeowner'
            ? 'Create service request'
            : 'Find jobs near you'
        }
        style={[
          style as ViewStyle,
          {
            minHeight: 64,
            minWidth: 64,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        {children}
      </TouchableOpacity>
    ),
  };
}

export function getBusinessTabOptions(
  handleTabPress: () => void
): BottomTabNavigationOptions {
  return {
    tabBarLabel: 'Business',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name='grid' size={size} color={color} />
    ),
    tabBarAccessibilityLabel: 'Business tools tab',
    tabBarButton: createTabBarButton(
      handleTabPress,
      'Business tools',
      'Access invoices, quotes, finance, and other business tools'
    ),
  };
}

export function getMessagingTabOptions(
  handleTabPress: () => void,
  unreadMessageCount: number | undefined
): BottomTabNavigationOptions {
  return {
    tabBarLabel: 'Messages',
    tabBarBadge:
      unreadMessageCount && unreadMessageCount > 0
        ? unreadMessageCount
        : undefined,
    tabBarIcon: ({ color, size }) => (
      <Ionicons name='chatbubbles' size={size} color={color} />
    ),
    tabBarAccessibilityLabel: 'Messages tab',
    tabBarButton: createTabBarButton(
      handleTabPress,
      'Messages tab',
      'Navigate to messages and conversations'
    ),
  };
}

export function getProfileTabOptions(
  handleTabPress: () => void,
  unreadNotificationCount?: number
): BottomTabNavigationOptions {
  return {
    tabBarLabel: 'Profile',
    tabBarBadge:
      unreadNotificationCount && unreadNotificationCount > 0
        ? unreadNotificationCount
        : undefined,
    tabBarIcon: ({ color, size }) => (
      <Ionicons name='person' size={size} color={color} />
    ),
    tabBarAccessibilityLabel: 'Profile tab',
    tabBarButton: createTabBarButton(
      handleTabPress,
      'Profile tab',
      'Navigate to your profile and settings'
    ),
  };
}
