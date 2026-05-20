import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';
import {
  SortMode,
  FilterStatus,
  SORT_TABS,
  HOMEOWNER_TABS,
  CONTRACTOR_TABS,
} from './types';

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
          {/* Contractor filter tabs — single-line horizontal scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollRow}
          >
            {CONTRACTOR_TABS.map((tab) => {
              const active = selectedFilter === tab.key;
              const count = filterCounts[tab.key];
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.sortTab, active && styles.sortTabActive]}
                  onPress={() => onFilterChange(tab.key)}
                  accessibilityRole='button'
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={tab.icon}
                    size={13}
                    color={active ? me.onBrand : me.ink2}
                    style={{ marginRight: 3 }}
                  />
                  <Text
                    style={[
                      styles.sortTabText,
                      active && styles.sortTabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {count > 0 && tab.key !== 'all' && (
                    <View
                      style={[
                        styles.countBadge,
                        active && styles.countBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.countBadgeText,
                          active && styles.countBadgeTextActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {/* Sort tabs — compact second row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.scrollRow, { marginTop: 6 }]}
          >
            {SORT_TABS.map((tab) => {
              const active = sortMode === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.sortTab, active && styles.sortTabActive]}
                  onPress={() => onSortModeChange(tab.key)}
                  accessibilityRole='button'
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={tab.icon}
                    size={13}
                    color={active ? me.onBrand : me.ink2}
                    style={{ marginRight: 3 }}
                  />
                  <Text
                    style={[
                      styles.sortTabText,
                      active && styles.sortTabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollRow}
        >
          {HOMEOWNER_TABS.map((tab) => {
            const active = selectedFilter === tab.key;
            const count = filterCounts[tab.key];
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.sortTab, active && styles.sortTabActive]}
                onPress={() => onFilterChange(tab.key)}
                accessibilityRole='button'
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={tab.icon}
                  size={13}
                  color={active ? me.onBrand : me.ink2}
                  style={{ marginRight: 3 }}
                />
                <Text
                  style={[
                    styles.sortTabText,
                    active && styles.sortTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {count > 0 && tab.key !== 'all' && (
                  <View
                    style={[
                      styles.countBadge,
                      active && styles.countBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.countBadgeText,
                        active && styles.countBadgeTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    backgroundColor: me.surface,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  scrollRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 6,
  },
  sortTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: me.bg2,
  },
  sortTabActive: {
    backgroundColor: me.ink,
  },
  sortTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink2,
  },
  sortTabTextActive: {
    color: me.onBrand,
  },
  countBadge: {
    marginLeft: 5,
    backgroundColor: me.line,
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
    color: me.ink2,
  },
  countBadgeTextActive: {
    color: me.onBrand,
  },
});
