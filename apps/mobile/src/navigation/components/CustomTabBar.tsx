/**
 * Custom Tab Bar Component
 *
 * Handles the bottom tab bar rendering and styling.
 * The center "AddTab" renders as a prominent Post a Job button.
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { NAVIGATION_CONSTANTS, TAB_CONFIG, TAB_STYLES } from '../constants';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../theme';

export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  return (
    <View style={[
      styles.tabBar,
      TAB_STYLES.tabBarStyle,
      {
        paddingBottom: Math.max(insets.bottom, NAVIGATION_CONSTANTS.TAB_BAR_PADDING),
        backgroundColor: theme.colors.surface,
        borderTopColor: theme.colors.border,
      }
    ]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;

        const isFocused = state.index === index;
        const isAddTab = route.name === 'AddTab';

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

        // Center (+) button — emits tabPress so AppNavigator listener can handle it
        if (isAddTab) {
          const handleAddPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            // If listener didn't prevent default, fall back to navigation
            if (!event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel="Post a job"
              onPress={handleAddPress}
              style={styles.addTabContainer}
            >
              <View style={styles.addButton}>
                <Ionicons name="add" size={24} color={theme.colors.textInverse} />
              </View>
            </TouchableOpacity>
          );
        }

        const tabConfig = TAB_CONFIG[route.name as keyof typeof TAB_CONFIG];
        const iconName = isFocused ? tabConfig?.activeIcon : tabConfig?.icon;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tabItem}
          >
            {React.createElement(Ionicons, {
              name: (iconName || 'help-outline') as keyof typeof Ionicons.glyphMap,
              size: isFocused ? NAVIGATION_CONSTANTS.ACTIVE_ICON_SIZE : NAVIGATION_CONSTANTS.ICON_SIZE,
              color: isFocused ? theme.colors.primary : '#808080',
              style: TAB_STYLES.tabBarIconStyle,
            })}
            <Text style={[
              TAB_STYLES.tabBarLabelStyle,
              { color: isFocused ? theme.colors.primary : '#808080' }
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
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minHeight: 48,
  },
  addTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});
