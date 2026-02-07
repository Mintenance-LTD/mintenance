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
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.menuText}>{item.label}</Text>
          </View>
          <Ionicons name='chevron-forward' size={16} color='#C7C7CC' />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 20,
    ...theme.shadows.base,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: 17,
    color: theme.colors.textPrimary,
    marginLeft: 16,
    fontWeight: '500',
  },
});
