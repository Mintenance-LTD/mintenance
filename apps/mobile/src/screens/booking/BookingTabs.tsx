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
          accessibilityRole="button"
          accessibilityLabel={`${tab.name} tab with ${tab.count} bookings`}
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
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.textInverse,
  },
  badge: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
});
