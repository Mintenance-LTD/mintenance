/**
 * Custom Tab Bar Component
 *
 * Airbnb-inspired bottom tab bar with clean icon states,
 * thin active indicator line, and prominent center action button.
 */

import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Platform,
  View,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { NAVIGATION_CONSTANTS, TAB_CONFIG } from '../constants';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../theme';

const TabBadge: React.FC<{ badge: number | string | boolean | undefined }> = ({
  badge,
}) => {
  if (badge === undefined || badge === false || badge === 0 || badge === '') {
    return null;
  }

  if (badge === true) {
    return <View style={styles.badgeDot} />;
  }

  const numericValue = typeof badge === 'string' ? parseInt(badge, 10) : badge;
  if (typeof numericValue === 'number' && numericValue <= 0) {
    return null;
  }

  const displayText =
    typeof numericValue === 'number' && numericValue > 99
      ? '99+'
      : String(badge);

  return (
    <View style={styles.badgeContainer}>
      <Text style={styles.badgeText}>{displayText}</Text>
    </View>
  );
};

export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  return (
    <View
      style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 4) }]}
    >
      {/* Top border line */}
      <View style={styles.topBorder} />

      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          if (!descriptor) return null;
          const { options } = descriptor;
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const isFocused = state.index === index;
          const isAddTab = route.name === 'AddTab';
          const badge = options.tabBarBadge;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!event.defaultPrevented) {
              if (isFocused) {
                // Already on this tab — pop the nested stack back to its
                // root screen. `navigation.navigate(name, { screen: undefined })`
                // is a no-op (React Navigation requires a real screen name
                // in nested navigation actions), which left users stranded
                // on deep-stack screens like EditProfile and JobDetails —
                // tapping the tab did nothing and they thought they were
                // locked. Target the first route in the focused tab's
                // own stack state to actually pop back to root.
                const focusedRouteState = state.routes[index]?.state;
                const rootScreenName = focusedRouteState?.routes?.[0]?.name;
                if (
                  focusedRouteState &&
                  rootScreenName &&
                  // Only dispatch when the stack has pushed at least one
                  // screen on top of the root — otherwise this would loop
                  // the tab back to itself with no effect.
                  (focusedRouteState.index ?? 0) > 0
                ) {
                  (
                    navigation as unknown as {
                      navigate: (
                        name: string,
                        params: { screen: string }
                      ) => void;
                    }
                  ).navigate(route.name, { screen: rootScreenName });
                }
              } else {
                navigation.navigate(route.name);
              }
            }
          };

          // Center action tab — same style as other tabs, no protruding FAB
          if (isAddTab) {
            const isContractor = user?.role === 'contractor';
            const handleAddPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole='tab'
                accessibilityLabel={isContractor ? 'Find jobs' : 'Post a job'}
                onPress={handleAddPress}
                style={styles.tabItem}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.activeIndicator,
                    isFocused && styles.activeIndicatorVisible,
                  ]}
                />
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={
                      isContractor
                        ? isFocused
                          ? 'search'
                          : 'search-outline'
                        : isFocused
                          ? 'add-circle'
                          : 'add-circle-outline'
                    }
                    size={24}
                    color={isFocused ? '#222222' : '#B0B0B0'}
                  />
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isFocused ? '#222222' : '#B0B0B0' },
                    isFocused && styles.tabLabelActive,
                  ]}
                >
                  {isContractor ? 'Find Jobs' : 'Post Job'}
                </Text>
              </TouchableOpacity>
            );
          }

          const tabConfig = TAB_CONFIG[route.name as keyof typeof TAB_CONFIG];
          const iconName = isFocused ? tabConfig?.activeIcon : tabConfig?.icon;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole='tab'
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={
                (options as Record<string, unknown>).tabBarTestID as
                  | string
                  | undefined
              }
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              {/* Active indicator line */}
              <View
                style={[
                  styles.activeIndicator,
                  isFocused && styles.activeIndicatorVisible,
                ]}
              />

              <View style={styles.iconContainer}>
                {React.createElement(Ionicons, {
                  name: (iconName ||
                    'help-outline') as keyof typeof Ionicons.glyphMap,
                  size: 24,
                  color: isFocused ? '#222222' : '#B0B0B0',
                })}
                <TabBadge badge={badge} />
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? '#222222' : '#B0B0B0' },
                  isFocused && styles.tabLabelActive,
                ]}
              >
                {String(label)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  topBorder: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EBEBEB',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    paddingBottom: 2,
    minHeight: 52,
  },
  activeIndicator: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'transparent',
    marginBottom: 6,
  },
  activeIndicatorVisible: {
    backgroundColor: '#222222',
  },
  iconContainer: {
    position: 'relative',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    fontWeight: '600',
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#FF385C',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    textAlign: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF385C',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  addTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    paddingBottom: 2,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  addLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 4,
  },
});
