/**
 * PropertiesScreen - List homeowner's properties with CRUD support
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { Property } from '@mintenance/types';
import { theme } from '../../theme';

interface Props {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'Properties'>;
}

const PROPERTY_ICON_BG: Record<string, string> = {
  house: theme.colors.primaryLight,
  flat: '#DBEAFE',
  bungalow: theme.colors.accentLight,
  maisonette: '#EDE9FE',
  other: theme.colors.backgroundSecondary,
};

const PROPERTY_ICON_COLOR: Record<string, string> = {
  house: theme.colors.primary,
  flat: '#3B82F6',
  bungalow: theme.colors.accent,
  maisonette: '#8B5CF6',
  other: theme.colors.textSecondary,
};

const PropertyCard: React.FC<{
  property: Property;
  onPress: () => void;
}> = ({ property, onPress }) => {
  const pType = property.property_type ?? 'other';
  return (
    <TouchableOpacity style={styles.propertyCard} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={[styles.propertyIconWrap, { backgroundColor: PROPERTY_ICON_BG[pType] || theme.colors.backgroundSecondary }]}>
          <Ionicons name="home-outline" size={20} color={PROPERTY_ICON_COLOR[pType] || theme.colors.textSecondary} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.propertyAddress} numberOfLines={1}>
            {property.property_name}
          </Text>
          <Text style={styles.propertyLocation} numberOfLines={2}>
            {property.address}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
      </View>
      <View style={styles.propertyMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="business-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.metaText}>
            {(property.property_type ?? '').charAt(0).toUpperCase() + (property.property_type ?? '').slice(1)}
          </Text>
        </View>
        {property.bedrooms != null && (
          <View style={styles.metaItem}>
            <Ionicons name="bed-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>{property.bedrooms} bed</Text>
          </View>
        )}
        {property.bathrooms != null && (
          <View style={styles.metaItem}>
            <Ionicons name="water-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>{property.bathrooms} bath</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

type SortOption = 'name' | 'date' | 'type';

export const PropertiesScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('name');

  const { data: properties, isLoading, error, refetch } = useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await mobileApiClient.get<{ properties: Property[] }>(
        `/api/properties?owner_id=${user.id}`
      );
      return response.properties ?? [];
    },
    enabled: !!user?.id,
    retry: 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    placeholderData: (prev: Property[] | undefined) => prev,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const sortedProperties = React.useMemo(() => {
    if (!properties) return [];
    const sorted = [...properties];
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => (a.property_name || '').localeCompare(b.property_name || ''));
      case 'date':
        return sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      case 'type':
        return sorted.sort((a, b) => (a.property_type || '').localeCompare(b.property_type || ''));
      default:
        return sorted;
    }
  }, [properties, sortBy]);

  if (isLoading) {
    return <LoadingSpinner message="Loading properties..." />;
  }

  if (error) {
    return <ErrorView message="Failed to load properties" onRetry={() => { refetch(); }} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="My Properties"
        rightComponent={
          <TouchableOpacity
            onPress={() => navigation.navigate('AddProperty')}
            accessibilityLabel="Add property"
          >
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Sort options */}
      {properties && properties.length > 1 && (
        <View style={styles.sortRow}>
          {([
            { key: 'name' as SortOption, label: 'Name' },
            { key: 'date' as SortOption, label: 'Date Added' },
            { key: 'type' as SortOption, label: 'Type' },
          ]).map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortChip, sortBy === opt.key && styles.sortChipActive]}
              onPress={() => setSortBy(opt.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: sortBy === opt.key }}
            >
              <Text style={[styles.sortChipText, sortBy === opt.key && styles.sortChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!properties || properties.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="home-outline" size={32} color={theme.colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Properties</Text>
          <Text style={styles.emptySubtitle}>
            Add your first property to start managing maintenance.
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddProperty')}
          >
            <Ionicons name="add" size={20} color={theme.colors.textInverse} />
            <Text style={styles.addButtonText}>Add Property</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedProperties}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.id })}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  listContainer: {
    padding: 16,
  },
  propertyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  propertyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  propertyAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  propertyLocation: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  propertyMeta: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    gap: 8,
  },
  addButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  sortChipActive: {
    backgroundColor: theme.colors.primary,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  sortChipTextActive: {
    color: theme.colors.textInverse,
  },
});

export default PropertiesScreen;
