/**
 * Tab Header Component
 *
 * Displays navigation header and tab controls for booking status screen.
 * Focused component with single responsibility.
 *
 * @filesize Target: <150 lines
 * @compliance Architecture principles - Single responsibility
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BookingStatus, TabInfo } from '../viewmodels/BookingViewModel';

interface TabHeaderProps {
  activeTab: BookingStatus;
  tabs: TabInfo[];
  onTabPress: (tab: BookingStatus) => void;
  onBackPress: () => void;
  onSearchPress: () => void;
}

export const TabHeader: React.FC<TabHeaderProps> = ({
  activeTab,
  tabs,
  onTabPress,
  onBackPress,
  onSearchPress,
}) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      {/* Navigation Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={onBackPress} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#222222" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Bookings</Text>

        <TouchableOpacity onPress={onSearchPress} style={styles.headerButton}>
          <Ionicons name="search" size={24} color="#222222" />
        </TouchableOpacity>
      </View>

      {/* Tab Controls */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => onTabPress(tab.id as BookingStatus)}
            activeOpacity={0.7}
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
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomColor: '#222222',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#717171',
    marginRight: 6,
  },
  activeTabText: {
    color: '#222222',
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
