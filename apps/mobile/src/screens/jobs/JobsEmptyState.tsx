import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';
import {
  FilterStatus,
  HOMEOWNER_TABS,
  EMPTY_MESSAGES,
  SortMode,
} from './types';

interface JobsEmptyStateProps {
  isContractor: boolean;
  selectedFilter: FilterStatus;
  onClearSearch: () => void;
  onSortModeChange: (mode: SortMode) => void;
  onAddJob: () => void;
}

export const JobsEmptyState: React.FC<JobsEmptyStateProps> = ({
  isContractor,
  selectedFilter,
  onClearSearch,
  onSortModeChange,
  onAddJob,
}) => {
  const emptyMsg = !isContractor
    ? EMPTY_MESSAGES[selectedFilter]
    : EMPTY_MESSAGES.all;

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons
          name={
            !isContractor && selectedFilter !== 'all'
              ? (HOMEOWNER_TABS.find((t) => t.key === selectedFilter)?.icon ??
                'search-outline')
              : 'search-outline'
          }
          size={32}
          color={me.brand}
        />
      </View>
      <Text style={styles.emptyTitle}>{emptyMsg.title}</Text>
      <Text style={styles.emptyDescription}>{emptyMsg.desc}</Text>
      {isContractor && (
        <View style={styles.emptySuggestions}>
          <TouchableOpacity
            style={styles.emptySuggestionRow}
            onPress={onClearSearch}
          >
            <Ionicons name='refresh-outline' size={16} color={me.brand} />
            <Text style={styles.emptySuggestionText}>Clear search filters</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.emptySuggestionRow}
            onPress={() => onSortModeChange('newest')}
          >
            <Ionicons name='time-outline' size={16} color={me.brand} />
            <Text style={styles.emptySuggestionText}>Browse newest jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.emptySuggestionRow}
            onPress={() => onSortModeChange('map')}
          >
            <Ionicons name='map-outline' size={16} color={me.brand} />
            <Text style={styles.emptySuggestionText}>Explore jobs on map</Text>
          </TouchableOpacity>
        </View>
      )}
      {!isContractor && (
        <TouchableOpacity style={styles.emptyCtaBtn} onPress={onAddJob}>
          <Ionicons name='add-circle-outline' size={18} color={me.onBrand} />
          <Text style={styles.emptyCtaText}>Post a Job</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: me.ink,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: me.ink2,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginTop: 8,
  },
  emptySuggestions: {
    marginTop: 24,
    width: '100%',
    gap: 12,
  },
  emptySuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: me.surface,
    borderRadius: 14,
    ...me.shadow.card,
  },
  emptySuggestionText: { fontSize: 14, fontWeight: '600', color: me.ink },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: me.brand,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
  },
  emptyCtaText: { fontSize: 15, fontWeight: '700', color: me.onBrand },
});
