/**
 * PropertiesScreen - List homeowner's properties with CRUD support
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import {
  ScreenHeader,
  LoadingSpinner,
  ErrorView,
} from '../../components/shared';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../config/supabase';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { Property } from '@mintenance/types';
import { theme } from '../../theme';
import { styles } from './PropertiesStyles';

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
  isFavorite: boolean;
  onToggleFavorite: () => void;
}> = ({ property, onPress, isFavorite, onToggleFavorite }) => {
  const pType = property.property_type ?? 'other';
  return (
    <TouchableOpacity style={styles.propertyCard} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.propertyIconWrap,
            {
              backgroundColor:
                PROPERTY_ICON_BG[pType] || theme.colors.backgroundSecondary,
            },
          ]}
        >
          <Ionicons
            name='home-outline'
            size={20}
            color={PROPERTY_ICON_COLOR[pType] || theme.colors.textSecondary}
          />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.propertyAddress} numberOfLines={1}>
            {property.property_name}
          </Text>
          <Text style={styles.propertyLocation} numberOfLines={2}>
            {property.address}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onToggleFavorite}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorite ? '#EF4444' : theme.colors.textTertiary}
          />
        </TouchableOpacity>
        <Ionicons
          name='chevron-forward'
          size={20}
          color={theme.colors.textTertiary}
          style={{ marginLeft: 4 }}
        />
      </View>
      <View style={styles.propertyMeta}>
        <View style={styles.metaItem}>
          <Ionicons
            name='business-outline'
            size={14}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.metaText}>
            {(property.property_type ?? '').charAt(0).toUpperCase() +
              (property.property_type ?? '').slice(1)}
          </Text>
        </View>
        {property.bedrooms != null && (
          <View style={styles.metaItem}>
            <Ionicons
              name='bed-outline'
              size={14}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.metaText}>{property.bedrooms} bed</Text>
          </View>
        )}
        {property.bathrooms != null && (
          <View style={styles.metaItem}>
            <Ionicons
              name='water-outline'
              size={14}
              color={theme.colors.textSecondary}
            />
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
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Load favorites from server on mount
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('property_favorites')
      .select('property_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data?.length) {
          setFavoriteIds(new Set(data.map((f: { property_id: string }) => f.property_id)));
        }
      });
  }, [user?.id]);

  const {
    data: properties,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error: queryError } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (queryError) throw new Error(queryError.message);
      return (data ?? []) as Property[];
    },
    enabled: !!user?.id,
    retry: 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    placeholderData: (prev: Property[] | undefined) => prev,
  });

  const toggleFavorite = async (propertyId: string) => {
    const isFav = favoriteIds.has(propertyId);
    // Optimistic update
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });
    try {
      if (isFav) {
        await mobileApiClient.delete(
          `/api/properties/favorites?property_id=${propertyId}`
        );
      } else {
        await mobileApiClient.post('/api/properties/favorites', {
          property_id: propertyId,
        });
      }
    } catch {
      // Revert on error
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(propertyId);
        else next.delete(propertyId);
        return next;
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const sortedProperties = React.useMemo(() => {
    if (!properties) return [];
    let filtered = [...properties];
    if (showFavoritesOnly) {
      filtered = filtered.filter((p) => favoriteIds.has(p.id));
    }
    switch (sortBy) {
      case 'name':
        return filtered.sort((a, b) =>
          (a.property_name || '').localeCompare(b.property_name || '')
        );
      case 'date':
        return filtered.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        );
      case 'type':
        return filtered.sort((a, b) =>
          (a.property_type || '').localeCompare(b.property_type || '')
        );
      default:
        return filtered;
    }
  }, [properties, sortBy, showFavoritesOnly, favoriteIds]);

  if (isLoading) {
    return <LoadingSpinner message='Loading properties...' />;
  }

  if (error) {
    return (
      <ErrorView
        message='Failed to load properties'
        onRetry={() => {
          refetch();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screenLabel}>
        <Text style={styles.screenLabelText}>PROPERTY MANAGEMENT</Text>
      </View>
      <ScreenHeader
        title='My Properties'
        rightComponent={
          <TouchableOpacity
            onPress={() => navigation.navigate('AddProperty')}
            accessibilityLabel='Add property'
          >
            <Ionicons
              name='add-circle-outline'
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        }
      />

      {/* Sort & filter options */}
      {properties && properties.length > 1 && (
        <View style={styles.sortRow}>
          {[
            { key: 'name' as SortOption, label: 'Name' },
            { key: 'date' as SortOption, label: 'Date Added' },
            { key: 'type' as SortOption, label: 'Type' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.sortChip,
                sortBy === opt.key && styles.sortChipActive,
              ]}
              onPress={() => setSortBy(opt.key)}
              accessibilityRole='button'
              accessibilityState={{ selected: sortBy === opt.key }}
            >
              <Text
                style={[
                  styles.sortChipText,
                  sortBy === opt.key && styles.sortChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.sortChip, showFavoritesOnly && styles.favChipActive]}
            onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
            accessibilityRole='button'
            accessibilityState={{ selected: showFavoritesOnly }}
          >
            <Ionicons
              name={showFavoritesOnly ? 'heart' : 'heart-outline'}
              size={14}
              color={showFavoritesOnly ? '#EF4444' : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      )}

      {!properties || properties.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons
              name='home-outline'
              size={32}
              color={theme.colors.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>No Properties</Text>
          <Text style={styles.emptySubtitle}>
            Add your first property to start managing maintenance.
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddProperty')}
          >
            <Ionicons name='add' size={20} color={theme.colors.textInverse} />
            <Text style={styles.addButtonText}>Add Property</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedProperties}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={() =>
                navigation.navigate('PropertyDetail', { propertyId: item.id })
              }
              isFavorite={favoriteIds.has(item.id)}
              onToggleFavorite={() => toggleFavorite(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

export default PropertiesScreen;
