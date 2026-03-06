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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { theme } from '../../theme';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient as apiClient } from '../../utils/mobileApiClient';
import type { Property } from '@mintenance/types';

interface Props {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'Properties'>;
}

const PropertyCard: React.FC<{
  property: Property;
  onPress: () => void;
}> = ({ property, onPress }) => (
  <TouchableOpacity style={styles.propertyCard} onPress={onPress}>
    <View style={styles.cardHeader}>
      <Ionicons name="home-outline" size={24} color='#717171' />
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
          {property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)}
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

type SortOption = 'name' | 'date' | 'type';

export const PropertiesScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('name');

  const { data: properties, isLoading, error, refetch } = useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      const res = await apiClient.get<{ properties: Property[] }>('/api/properties');
      return res.properties || [];
    },
    enabled: !!user,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading properties..." />;
  }

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

  if (error) {
    return <ErrorView message="Failed to load properties" onRetry={refetch} />;
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
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.textPrimary} />
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
            <Ionicons name="home-outline" size={48} color='#717171' />
          </View>
          <Text style={styles.emptyTitle}>No Properties</Text>
          <Text style={styles.emptySubtitle}>
            Add your first property to start managing maintenance.
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddProperty')}
          >
            <Ionicons name="add" size={20} color="#fff" />
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
    backgroundColor: theme.colors.background,
  },
  listContainer: {
    padding: theme.spacing[4],
  },
  propertyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
    ...theme.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: theme.spacing[3],
  },
  propertyAddress: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  propertyLocation: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  propertyMeta: {
    flexDirection: 'row',
    marginTop: theme.spacing[2],
    paddingTop: theme.spacing[2],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing[4],
  },
  metaText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing[1],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[6],
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing[6],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[5],
    borderRadius: theme.borderRadius.xl,
  },
  addButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    marginLeft: theme.spacing[2],
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: 10,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  sortChipActive: {
    backgroundColor: theme.colors.textPrimary,
    borderColor: theme.colors.textPrimary,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  sortChipTextActive: {
    color: '#FFFFFF',
  },
});

export default PropertiesScreen;

