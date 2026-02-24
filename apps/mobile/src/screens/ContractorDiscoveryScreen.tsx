import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { logger } from '../utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { ContractorService } from '../services/ContractorService';
import { ContractorProfile, LocationData } from '@mintenance/types';
import ContractorMapView from '../components/ContractorMapView';
import ContractorDiscoverView from '../components/ContractorDiscoverView';
import { theme } from '../theme';
import type { RootStackParamList } from '../navigation/types';

// Default fallback location (London) when permission denied
const DEFAULT_LOCATION: LocationData = { latitude: 51.5074, longitude: -0.1278 };

type ViewMode = 'map' | 'discover';

const ContractorDiscoveryScreen: React.FC = () => {
  const { user } = useAuth();
  const rootNavigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [contractors, setContractors] = useState<ContractorProfile[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('discover');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    initializeLocation();
    return () => { isMounted.current = false; };
  }, []);

  const initializeLocation = useCallback(async () => {
    try {
      // Check existing permission first (non-prompting)
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      let finalStatus = existing;

      // Only prompt if not yet determined
      if (existing !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      if (!isMounted.current) return;

      if (finalStatus !== 'granted') {
        setLocationDenied(true);
        // Fall back to default location so the screen still works
        setUserLocation(DEFAULT_LOCATION);
        await loadNearbyContractors(DEFAULT_LOCATION);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
      });

      if (!isMounted.current) return;

      const userLocationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(userLocationData);
      await loadNearbyContractors(userLocationData);
    } catch (error) {
      logger.error('Error getting location:', error);
      if (!isMounted.current) return;
      // Fall back to default location instead of crashing
      setUserLocation(DEFAULT_LOCATION);
      await loadNearbyContractors(DEFAULT_LOCATION);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const loadNearbyContractors = async (location: LocationData) => {
    if (!user) return;

    try {
      const nearbyContractors = await ContractorService.getNearbyContractors(
        location,
        25 // 25km radius
      );
      if (isMounted.current) setContractors(nearbyContractors);
    } catch (error) {
      logger.error('Error loading contractors:', error);
      if (isMounted.current) setContractors([]);
    }
  };

  const filterContractorsByService = (service: string | null) => {
    if (!service) return contractors;

    return contractors.filter((contractor) =>
      contractor.skills.some((skill) =>
        skill.skillName.toLowerCase().includes(service.toLowerCase())
      )
    );
  };

  const serviceFilters = [
    { id: null, name: 'All', icon: 'grid-outline', color: theme.colors.textSecondary },
    {
      id: 'plumbing',
      name: 'Plumbing',
      icon: 'water-outline',
      color: theme.colors.plumbing,
    },
    {
      id: 'electrical',
      name: 'Electrical',
      icon: 'flash-outline',
      color: theme.colors.electrical,
    },
    { id: 'hvac', name: 'HVAC', icon: 'thermometer-outline', color: theme.colors.hvac },
    {
      id: 'general',
      name: 'General',
      icon: 'hammer-outline',
      color: theme.colors.handyman,
    },
    {
      id: 'appliance',
      name: 'Appliance',
      icon: 'home-outline',
      color: theme.colors.appliance,
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={theme.colors.primary} accessibilityLabel='Loading contractors' />
        <Text style={styles.loadingText}>Finding contractors near you...</Text>
      </View>
    );
  }

  if (!userLocation) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name='location-outline' size={48} color={theme.colors.textTertiary} />
        <Text style={styles.errorText}>Unable to access your location</Text>
        <Text style={styles.errorSubtext}>
          Enable location in your device settings to find contractors near you.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={initializeLocation}
          accessibilityRole='button'
          accessibilityLabel='Try again to get your location'
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredContractors = filterContractorsByService(selectedService);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole='header'>
          {viewMode === 'map' ? 'Contractor Map' : 'Discover Contractors'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {filteredContractors.length} contractors found
        </Text>
      </View>

      {locationDenied && (
        <View style={styles.locationBanner}>
          <Ionicons name='location-outline' size={16} color={theme.colors.warning} />
          <Text style={styles.locationBannerText}>
            Showing results for default area. Enable location for nearby results.
          </Text>
        </View>
      )}

      {/* View Mode Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === 'discover' && styles.toggleButtonActive,
          ]}
          onPress={() => setViewMode('discover')}
          accessibilityRole='tab'
          accessibilityLabel='Discover view'
          accessibilityState={{ selected: viewMode === 'discover' }}
        >
          <Ionicons
            name='person-outline'
            size={20}
            color={
              viewMode === 'discover'
                ? theme.colors.textInverse
                : theme.colors.primary
            }
          />
          <Text
            style={[
              styles.toggleText,
              viewMode === 'discover' && styles.toggleTextActive,
            ]}
          >
            Discover
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === 'map' && styles.toggleButtonActive,
          ]}
          onPress={() => setViewMode('map')}
          accessibilityRole='tab'
          accessibilityLabel='Map view'
          accessibilityState={{ selected: viewMode === 'map' }}
        >
          <Ionicons
            name='map-outline'
            size={20}
            color={
              viewMode === 'map' ? theme.colors.textInverse : theme.colors.primary
            }
          />
          <Text
            style={[
              styles.toggleText,
              viewMode === 'map' && styles.toggleTextActive,
            ]}
          >
            Map
          </Text>
        </TouchableOpacity>
      </View>

      {/* Service Filters */}
      <View style={styles.filtersContainer}>
        {serviceFilters.map((filter) => (
          <TouchableOpacity
            key={filter.id || 'all'}
            style={[
              styles.filterButton,
              { borderColor: filter.color },
              selectedService === filter.id && {
                backgroundColor: filter.color,
              },
            ]}
            onPress={() => setSelectedService(filter.id)}
            accessibilityRole='button'
            accessibilityLabel={`Filter by ${filter.name}`}
            accessibilityState={{ selected: selectedService === filter.id }}
          >
            <Ionicons
              name={filter.icon as unknown}
              size={16}
              color={selectedService === filter.id ? theme.colors.white : filter.color}
            />
            <Text
              style={[
                styles.filterText,
                {
                  color: selectedService === filter.id ? theme.colors.white : filter.color,
                },
              ]}
            >
              {filter.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content Views */}
      <View style={styles.contentContainer}>
        {viewMode === 'map' ? (
          <ContractorMapView
            userLocation={userLocation}
            contractors={filteredContractors}
          />
        ) : (
          <ContractorDiscoverView
            contractors={filteredContractors}
            onContractorSelect={(contractor) => {
              rootNavigation.navigate('Modal', {
                screen: 'ContractorProfile',
                params: {
                  contractorId: contractor.id,
                  contractorName: `${contractor.firstName} ${contractor.lastName}`,
                },
              });
            }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.white,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    margin: 20,
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 6,
  },
  toggleTextActive: {
    color: theme.colors.white,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    backgroundColor: theme.colors.white,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warningLight || '#FFF8E1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  locationBannerText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ContractorDiscoveryScreen;
