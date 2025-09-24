import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
} from 'react-native';
import { logger } from '../utils/logger';

// Platform-specific Map imports - Use web-compatible fallbacks
interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// Web-compatible fallback components (react-native-maps removed for web compatibility)
const MapView = ({ children, ...props }: any) => (
  <View style={{ flex: 1, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
    <Text>Map view available on mobile devices</Text>
    {children}
  </View>
);

const Marker = ({ children, ...props }: any) => <View {...props}>{children}</View>;
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { ContractorService } from '../services/ContractorService';
import { ContractorProfile, LocationData } from '../types';
import ContractorCard from '../components/ContractorCard';
import SearchBar from '../components/SearchBar';
import AdvancedSearchFilters from '../components/advanced-search/AdvancedSearchFilters';
import { useAdvancedSearch } from '../hooks/useAdvancedSearch';
import { ContractorSearchResult } from '../types/search';
import { theme } from '../theme';

const { height: screenHeight } = Dimensions.get('window');
const MAP_HEIGHT = screenHeight * 0.4;
const CARDS_HEIGHT = screenHeight * 0.6;

const FindContractorsScreen: React.FC = () => {
  const { user } = useAuth();
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [region, setRegion] = useState<Region>({
    latitude: 40.7128,
    longitude: -74.006,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Initialize advanced search with location-based initial filters
  const {
    searchState,
    search,
    applyFilters,
    clearSearch,
    loadMore,
    updateFilter,
    getSuggestions,
  } = useAdvancedSearch({
    searchType: 'contractors',
    initialFilters: {
      location: {
        radius: 25,
        unit: 'miles',
        coordinates: userLocation,
      },
    },
    autoSearch: true,
  });

  useEffect(() => {
    initializeLocation();
  }, []);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to find contractors near you.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const userLocationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(userLocationData);
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      await loadNearbyContractors(userLocationData);
    } catch (error) {
      logger.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyContractors = async (location: LocationData) => {
    if (!user) return;

    try {
      const nearbyContractors = await ContractorService.getUnmatchedContractors(
        user.id,
        location
      );
      setContractors(nearbyContractors);
    } catch (error) {
      logger.error('Error loading contractors:', error);
      Alert.alert('Error', 'Failed to load contractors. Please try again.');
    }
  };

  const handleContractorAction = async (action: 'like' | 'pass') => {
    if (!user || currentContractorIndex >= contractors.length) return;

    const contractor = contractors[currentContractorIndex];

    try {
      await ContractorService.recordContractorMatch(
        user.id,
        contractor.id,
        action
      );

      if (action === 'like') {
        Alert.alert(
          'Match!',
          `You liked ${contractor.firstName} ${contractor.lastName}. They've been added to your favorites.`,
          [{ text: 'Great!' }]
        );
      }

      // Move to next contractor
      if (currentContractorIndex < contractors.length - 1) {
        setCurrentContractorIndex(currentContractorIndex + 1);
      } else {
        // No more contractors
        Alert.alert(
          'All Done!',
          "You've reviewed all available contractors in your area. Check back later for new contractors.",
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      logger.error('Error recording match:', error);
      Alert.alert('Error', 'Failed to record your choice. Please try again.');
    }
  };

  const getCurrentContractor = (): ContractorProfile | null => {
    return currentContractorIndex < contractors.length
      ? contractors[currentContractorIndex]
      : null;
  };

  const handleMapMarkerPress = (contractorId: string) => {
    const contractorIndex = contractors.findIndex((c) => c.id === contractorId);
    if (contractorIndex !== -1) {
      setCurrentContractorIndex(contractorIndex);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={theme.colors.info} />
        <Text style={styles.loadingText}>Finding contractors near you...</Text>
      </View>
    );
  }

  if (!userLocation) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to access your location</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={initializeLocation}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Update user location in search filters when location changes
  useEffect(() => {
    if (userLocation) {
      updateFilter('location', {
        ...searchState.filters.location,
        coordinates: userLocation,
      });
    }
  }, [userLocation, updateFilter]);

  const handleSearch = async (query: string) => {
    await search(query);
  };

  const handleFilterPress = () => {
    setShowFilters(true);
  };

  const handleApplyFilters = async (filters: any) => {
    await applyFilters(filters);
  };

  const renderContractor = ({ item }: { item: ContractorSearchResult }) => (
    <ContractorCard
      contractor={{
        id: item.id,
        firstName: item.name.split(' ')[0],
        lastName: item.name.split(' ').slice(1).join(' '),
        bio: item.description,
        skills: item.skills,
        hourlyRate: item.hourlyRate,
        rating: item.rating,
        reviewCount: item.reviewCount,
        profileImageUrl: item.profileImage,
        verified: item.verified,
        latitude: 0, // Would come from search result
        longitude: 0,
      }}
      onContact={() => {
        // Handle contact action
      }}
      onViewProfile={() => {
        // Handle view profile action
      }}
    />
  );

  const renderMapView = () => (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
      >
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title='Your Location'
            pinColor='blue'
          />
        )}
        {searchState.results.map((contractor: ContractorSearchResult) => (
          <Marker
            key={contractor.id}
            coordinate={{
              latitude: contractor.location?.distance || 0, // Would need proper coordinates
              longitude: contractor.location?.distance || 0,
            }}
            title={contractor.name}
            description={contractor.description}
          />
        ))}
      </MapView>
    </View>
  );

  const renderListView = () => (
    <FlatList
      data={searchState.results}
      renderItem={renderContractor}
      keyExtractor={(item) => item.id}
      onEndReached={loadMore}
      onEndReachedThreshold={0.1}
      ListFooterComponent={
        searchState.loading ? <ActivityIndicator size="large" style={{ padding: 20 }} /> : null
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header with Search */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Contractors</Text>
        <SearchBar
          placeholder="Search by skills, name, or service..."
          value={searchState.query}
          onChangeText={handleSearch}
          onFilterPress={handleFilterPress}
          showFilterButton={true}
          loading={searchState.loading}
          suggestions={searchState.suggestions.map(s => s.text)}
          onSuggestionPress={handleSearch}
        />

        {/* Results Info */}
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {searchState.total > 0
              ? `${searchState.total} contractors found`
              : searchState.query ? 'No contractors found' : 'Enter search terms or apply filters'
            }
          </Text>

          {/* View Toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
              onPress={() => setViewMode('list')}
            >
              <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
                List
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
              onPress={() => setViewMode('map')}
            >
              <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>
                Map
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        {viewMode === 'map' ? renderMapView() : renderListView()}
      </View>

      {/* Error State */}
      {searchState.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{searchState.error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => search(searchState.query)}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Advanced Filters Modal */}
      <AdvancedSearchFilters
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleApplyFilters}
        initialFilters={searchState.filters}
        loading={searchState.loading}
      />
    </View>
  );
};

// Update styles for the new layout
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  resultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  resultsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  toggleTextActive: {
    color: theme.colors.surface,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FindContractorsScreen;
