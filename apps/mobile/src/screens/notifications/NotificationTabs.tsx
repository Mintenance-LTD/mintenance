/**
 * NotificationTabs Component
 *
 * Scrollable horizontal filter tab bar for notification categories.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { theme } from '../../theme';
import { FILTER_TABS, FilterTab } from './notificationConfig';

interface NotificationTabsProps {
  activeTab: FilterTab;
  unreadCount: number;
  onTabChange: (tab: FilterTab) => void;
}

export const NotificationTabs: React.FC<NotificationTabsProps> = ({
  activeTab,
  unreadCount,
  onTabChange,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsWrapper}
      contentContainerStyle={styles.tabsRow}
    >
      {FILTER_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const count = tab.key === 'unread' ? unreadCount : undefined;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onTabChange(tab.key)}
            accessibilityRole='tab'
            accessibilityLabel={`Filter ${tab.label}${count != null && count > 0 ? `, ${count} notifications` : ''}`}
            accessibilityState={{ selected: isActive }}
          >
            <View style={styles.tabInner}>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {count != null && count > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {count > 99 ? '99+' : count}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabsWrapper: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    flexShrink: 0,
    minHeight: 52,
  },
  tabsRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
