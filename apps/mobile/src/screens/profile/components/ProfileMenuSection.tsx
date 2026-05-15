import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

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
      <Text style={styles.sectionTitle} accessibilityRole='header'>
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
                { backgroundColor: item.iconBg ?? me.bg2 },
              ]}
            >
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
                size={17}
                color={item.iconColor ?? me.ink2}
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
            <Ionicons name='chevron-forward' size={14} color={me.ink3} />
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
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: me.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.card,
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
    borderBottomColor: me.line,
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
    color: me.ink,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: me.errFg,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  badgeText: {
    color: me.onBrand,
    fontSize: 11,
    fontWeight: '700',
  },
});
