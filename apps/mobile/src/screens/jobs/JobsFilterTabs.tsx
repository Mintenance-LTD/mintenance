import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { SortMode, FilterStatus, SORT_TABS, HOMEOWNER_TABS, CONTRACTOR_TABS } from './types';

interface JobsFilterTabsProps {
  isContractor: boolean;
  sortMode: SortMode;
  selectedFilter: FilterStatus;
  filterCounts: Record<FilterStatus, number>;
  onSortModeChange: (mode: SortMode) => void;
  onFilterChange: (filter: FilterStatus) => void;
}

export const JobsFilterTabs: React.FC<JobsFilterTabsProps> = ({
  isContractor,
  sortMode,
  selectedFilter,
  filterCounts,
  onSortModeChange,
  onFilterChange,
}) => {
  return (
    <View style={styles.tabContainer}>
      {isContractor ? (
        <>
          {/* Contractor filter tabs (In Progress, Bids Pending, Completed) */}
          <View style={styles.tabRow}>
            {CONTRACTOR_TABS.map((tab) => {
              const active = selectedFilter === tab.key;
              const count = filterCounts[tab.key];
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.sortTab, active && styles.sortTabActive]}
                  onPress={() => onFilterChange(tab.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={active ? theme.colors.textInverse : theme.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.sortTabText, active && styles.sortTabTextActive]}>
                    {tab.label}
                  </Text>
                  {count > 0 && tab.key !== 'all' && (
                    <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                      <Text style={[styles.countBadgeText, active && styles.countBadgeTextActive]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Sort tabs */}
          <View style={[styles.tabRow, { marginTop: 8 }]}>
            {SORT_TABS.map((tab) => {
              const active = sortMode === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.sortTab, active && styles.sortTabActive]}
                  onPress={() => onSortModeChange(tab.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={active ? theme.colors.textInverse : theme.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.sortTabText, active && styles.sortTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.tabRow}>
          {HOMEOWNER_TABS.map((tab) => {
            const active = selectedFilter === tab.key;
            const count = filterCounts[tab.key];
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.sortTab, active && styles.sortTabActive]}
                onPress={() => onFilterChange(tab.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={active ? theme.colors.textInverse : theme.colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.sortTabText, active && styles.sortTabTextActive]}>
                  {tab.label}
                </Text>
                {count > 0 && tab.key !== 'all' && (
                  <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                    <Text style={[styles.countBadgeText, active && styles.countBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    backgroundColor: theme.colors.surface,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  sortTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  sortTabActive: {
    backgroundColor: theme.colors.textPrimary,
  },
  sortTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  sortTabTextActive: {
    color: theme.colors.textInverse,
  },
  countBadge: {
    marginLeft: 5,
    backgroundColor: theme.colors.border,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  countBadgeTextActive: {
    color: theme.colors.textInverse,
  },
});
