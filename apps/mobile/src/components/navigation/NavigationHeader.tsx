/**
 * NavigationHeader Component
 *
 * Universal header with notification bell + avatar that opens
 * a profile/actions dropdown when tapped.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';

const appIcon = require('../../../assets/icon.png');

export interface HeaderMenuItem {
  label: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  onPress: () => void;
}

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
  userName?: string;
  userRole?: string;
  /** Items rendered in the avatar dropdown */
  menuItems?: HeaderMenuItem[];
  /** Fallback when no menuItems — navigates to profile tab */
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
  userName,
  userRole,
  menuItems,
  onUserPress,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleAvatarPress = () => {
    if (menuItems && menuItems.length > 0) {
      setDropdownOpen(true);
    } else {
      onUserPress?.();
    }
  };

  const handleItemPress = (item: HeaderMenuItem) => {
    setDropdownOpen(false);
    item.onPress();
  };

  const showRightActions = !rightIcon && (onNotificationPress || userInitials);

  return (
    <>
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            backgroundColor: theme.colors.surface,
          },
          style,
        ]}
      >
        <View style={styles.headerContent}>
          {/* Left — logo or back */}
          {showBackIcon ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleBackPress}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              testID="back-icon-button"
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.logoContainer} testID="menu-icon-button">
              <Image source={appIcon} style={styles.logoIcon} />
            </View>
          )}

          {/* Title */}
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

          {/* Right — bell + avatar */}
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
                  onPress={handleAvatarPress}
                  accessibilityRole="button"
                  accessibilityLabel="Open profile menu"
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
              <Ionicons name={rightIcon.name} size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
        </View>
      </View>

      {/* Dropdown modal */}
      {menuItems && menuItems.length > 0 && (
        <Modal
          visible={dropdownOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDropdownOpen(false)}
        >
          {/* Backdrop */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setDropdownOpen(false)}
          />

          {/* Dropdown card — top-right below header */}
          <View style={[styles.dropdownCard, { top: insets.top + 62 }]}>
            {/* User info row */}
            {(userName || userRole) && (
              <View style={styles.dropdownHeader}>
                <View style={styles.dropdownAvatar}>
                  <Text style={styles.dropdownAvatarText}>{userInitials || '?'}</Text>
                </View>
                <View style={styles.dropdownUserInfo}>
                  {userName && (
                    <Text style={styles.dropdownUserName} numberOfLines={1}>
                      {userName}
                    </Text>
                  )}
                  {userRole && (
                    <Text style={styles.dropdownUserRole}>{userRole}</Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.dropdownDivider} />

            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.dropdownItem,
                    index === menuItems.length - 1 && styles.dropdownItemLast,
                  ]}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dropdownItemIcon, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.icon} size={17} color={item.iconColor} />
                  </View>
                  <View style={styles.dropdownItemText}>
                    <Text style={styles.dropdownItemLabel}>{item.label}</Text>
                    {item.subtitle && (
                      <Text style={styles.dropdownItemSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 0,
    // Subtle shadow instead of border (Airbnb-style)
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 56,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  iconPlaceholder: { width: 44, height: 44 },
  logoContainer: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  logoIcon: { width: 32, height: 32, borderRadius: 8 },
  titleContainer: { flex: 1, paddingHorizontal: 12, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 1 },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  avatarText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  // Dropdown
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  dropdownCard: {
    position: 'absolute',
    right: 12,
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
    maxHeight: 420,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  dropdownAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownAvatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  dropdownUserInfo: { flex: 1 },
  dropdownUserName: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  dropdownUserRole: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  dropdownDivider: { height: 1, backgroundColor: theme.colors.borderLight },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dropdownItemLast: { borderBottomWidth: 0 },
  dropdownItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemText: { flex: 1 },
  dropdownItemLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  dropdownItemSubtitle: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
});

export default NavigationHeader;
