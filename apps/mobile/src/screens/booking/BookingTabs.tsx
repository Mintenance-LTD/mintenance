/**
 * BookingTabs Component
 *
 * Airbnb-style segmented tab bar for booking statuses.
 * Dark active state, soft backgrounds, clean badges.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BookingStatus, Booking } from './BookingStatusScreen';
import { me } from '../../design-system/mint-editorial';

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
      count: bookings.filter((b) => b.status === 'upcoming').length,
    },
    {
      id: 'completed' as BookingStatus,
      name: 'Completed',
      count: bookings.filter((b) => b.status === 'completed').length,
    },
    {
      id: 'cancelled' as BookingStatus,
      name: 'Cancelled',
      count: bookings.filter((b) => b.status === 'cancelled').length,
    },
  ];

  return (
    <View style={styles.tabsContainer}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.7}
            accessibilityRole='tab'
            accessibilityLabel={`${tab.name} tab, ${tab.count} bookings`}
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.tabText, isActive && styles.activeTabText]}>
              {tab.name}
            </Text>
            {tab.count > 0 && (
              <View style={[styles.badge, isActive && styles.activeBadge]}>
                <Text
                  style={[styles.badgeText, isActive && styles.activeBadgeText]}
                >
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: me.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 4,
    ...me.shadow.card,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 5,
  },
  activeTab: {
    backgroundColor: me.ink,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink2,
  },
  activeTabText: {
    color: me.onBrand,
  },
  badge: {
    backgroundColor: me.bg2,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  activeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: me.ink2,
  },
  activeBadgeText: {
    color: me.onBrand,
  },
});
