/**
 * Custom Tab Bar Component
 * 
 * Handles the bottom tab bar rendering and styling
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { NAVIGATION_CONSTANTS, TAB_CONFIG, TAB_STYLES } from '../constants';
import { theme } from '../../theme';

export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.tabBar,
      TAB_STYLES.tabBarStyle,
      { paddingBottom: Math.max(insets.bottom, NAVIGATION_CONSTANTS.TAB_BAR_PADDING) }
    ]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const tabConfig = TAB_CONFIG[route.name as keyof typeof TAB_CONFIG];
        const iconName = isFocused ? tabConfig?.activeIcon : tabConfig?.icon;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tabItem}
          >
            {React.createElement(Ionicons as any, {
              name: (iconName || 'help-outline') as any,
              size: isFocused ? NAVIGATION_CONSTANTS.ACTIVE_ICON_SIZE : NAVIGATION_CONSTANTS.ICON_SIZE,
              color: isFocused ? theme.colors.primary : theme.colors.textSecondary,
              style: TAB_STYLES.tabBarIconStyle,
            })}
            <Text style={[
              TAB_STYLES.tabBarLabelStyle,
              { color: isFocused ? theme.colors.primary : theme.colors.textSecondary }
            ]}>
              {String(label)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
});
