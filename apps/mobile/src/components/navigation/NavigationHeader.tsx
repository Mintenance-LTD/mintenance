/**
 * NavigationHeader Component
 *
 * Universal header component matching the web app's Header layout:
 * Left: Logo mark or back arrow
 * Center: Title + optional subtitle
 * Right: Notification bell (with badge) + user avatar initials
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const appIcon = require('../../../assets/icon.png');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';

interface NavigationHeaderProps {
  title: string;
  showMenuIcon?: boolean;
  showBackIcon?: boolean;
  rightIcon?: {
    name: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  onMenuPress?: () => void;
  onBackPress?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitle?: string;
  notificationCount?: number;
  onNotificationPress?: () => void;
  userInitials?: string;
  onUserPress?: () => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title,
  showMenuIcon = true,
  showBackIcon = false,
  rightIcon,
  onMenuPress,
  onBackPress,
  style,
  titleStyle,
  subtitle,
  notificationCount = 0,
  onNotificationPress,
  userInitials,
  onUserPress,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const showRightActions = !rightIcon && (onNotificationPress || userInitials);

  return (
    <View style={[styles.container, { paddingTop: insets.top }, style]}>
      <View style={styles.headerContent}>
        {/* Left Icon - Logo or Back */}
        {showBackIcon ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleBackPress}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="back-icon-button"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.logoContainer} testID="menu-icon-button">
            <Image source={appIcon} style={styles.logoIcon} />
          </View>
        )}

        {/* Title Section */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, titleStyle]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right Section - Notification + Avatar (matching web Header) */}
        {showRightActions ? (
          <View style={styles.rightActions}>
            {onNotificationPress && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onNotificationPress}
                accessibilityRole="button"
                accessibilityLabel={
                  notificationCount > 0
                    ? `Notifications, ${notificationCount} unread`
                    : 'Notifications'
                }
                testID="notification-button"
              >
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={theme.colors.textSecondary}
                />
                {notificationCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            {userInitials && (
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={onUserPress}
                accessibilityRole="button"
                accessibilityLabel="User profile"
                testID="user-avatar-button"
              >
                <Text style={styles.avatarText}>{userInitials}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : rightIcon ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={rightIcon.onPress}
            accessibilityRole="button"
            testID="right-icon-button"
          >
            <Ionicons
              name={rightIcon.name}
              size={24}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    minHeight: 56,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  iconPlaceholder: {
    width: 44,
    height: 44,
  },
  logoContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: theme.colors.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  avatarButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  avatarText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default NavigationHeader;
