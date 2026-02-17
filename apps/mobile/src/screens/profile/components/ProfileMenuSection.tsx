import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface MenuItem {
  label: string;
  icon: string;
  onPress: () => void;
  accessibilityRole?: 'link' | 'button';
  accessibilityLabel?: string;
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
      <Text style={styles.sectionTitle} accessibilityRole='header'>{title}</Text>
      {items.map((item) => (
        <TouchableOpacity
          key={item.label}
          style={styles.menuItem}
          onPress={item.onPress}
          accessibilityRole={item.accessibilityRole || 'button'}
          accessibilityLabel={item.accessibilityLabel || item.label}
        >
          <View style={styles.menuItemLeft}>
            <View style={styles.menuIconContainer}>
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={theme.colors.textPrimary}
              />
            </View>
            <Text style={styles.menuText}>{item.label}</Text>
          </View>
          <Ionicons name='chevron-forward' size={16} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginLeft: 12,
  },
});
