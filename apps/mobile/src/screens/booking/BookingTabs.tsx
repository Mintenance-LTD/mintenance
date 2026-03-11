/**
 * BookingTabs Component
 * 
 * Displays the tab navigation for different booking statuses
 * (upcoming, completed, cancelled).
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { BookingStatus, Booking } from './BookingStatusScreen';

interface BookingTabsProps {
  activeTab: BookingStatus;
  onTabChange: (tab: BookingStatus) => void;
  bookings: Booking[];
}

export const BookingTabs: React.FC<BookingTabsProps> = ({
  activeTab,
  onTabChange,
  bookings,
}) => {
  const tabs = [
    { 
      id: 'upcoming' as BookingStatus, 
      name: 'Upcoming', 
      count: bookings.filter(b => b.status === 'upcoming').length 
    },
    { 
      id: 'completed' as BookingStatus, 
      name: 'Completed', 
      count: bookings.filter(b => b.status === 'completed').length 
    },
    { 
      id: 'cancelled' as BookingStatus, 
      name: 'Cancelled', 
      count: bookings.filter(b => b.status === 'cancelled').length 
    },
  ];

  return (
    <View style={styles.tabsContainer}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tab,
            activeTab === tab.id && styles.activeTab,
          ]}
          onPress={() => onTabChange(tab.id)}
          accessibilityRole="tab"
          accessibilityLabel={`${tab.name} tab, ${tab.count} bookings`}
          accessibilityState={{ selected: activeTab === tab.id }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === tab.id && styles.activeTabText,
            ]}
          >
            {tab.name}
          </Text>
          {tab.count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tab.count}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.textInverse,
  },
  badge: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
  },
});
