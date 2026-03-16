import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface MenuItem {
  label: string;
  icon: string;
  onPress: () => void;
  accessibilityRole?: 'link' | 'button';
  accessibilityLabel?: string;
  iconColor?: string;
  iconBg?: string;
  badge?: number;
}

interface ProfileMenuSectionProps {
  title: string;
  items: MenuItem[];
}

export const ProfileMenuSection: React.FC<ProfileMenuSectionProps> = ({
  title,
  items,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.card}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.menuItem,
              index < items.length - 1 && styles.menuItemBorder,
            ]}
            onPress={item.onPress}
            accessibilityRole={item.accessibilityRole || 'button'}
            accessibilityLabel={item.accessibilityLabel || item.label}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconChip,
                { backgroundColor: item.iconBg ?? '#F7F7F7' },
              ]}
            >
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
                size={17}
                color={item.iconColor ?? theme.colors.textSecondary}
              />
            </View>
            <Text style={styles.menuText}>{item.label}</Text>
            {item.badge != null && item.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.badge > 99 ? '99+' : item.badge}
                </Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  badgeText: {
    color: theme.colors.textInverse,
    fontSize: 11,
    fontWeight: '700',
  },
});
