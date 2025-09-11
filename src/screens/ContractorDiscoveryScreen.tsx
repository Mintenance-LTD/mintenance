import React, { useState, useEffect } from 'react';
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
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { ContractorService } from '../services/ContractorService';
import { ContractorProfile, LocationData } from '../types';
import ContractorMapView from '../components/ContractorMapView';
import ContractorDiscoverView from '../components/ContractorDiscoverView';
import { theme } from '../theme';

// Removed unused screen height calculation

type ViewMode = 'map' | 'discover';

const ContractorDiscoveryScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [contractors, setContractors] = useState<ContractorProfile[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('discover');
  const [selectedService, setSelectedService] = useState<string | null>(null);

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
      const nearbyContractors = await ContractorService.getNearbyContractors(
        location,
        25 // 25km radius
      );
      setContractors(nearbyContractors);
    } catch (error) {
      logger.error('Error loading contractors:', error);
      Alert.alert('Error', 'Failed to load contractors. Please try again.');
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
    { id: null, name: 'All', icon: 'grid-outline', color: '#8E8E93' },
    {
      id: 'plumbing',
      name: 'Plumbing',
      icon: 'water-outline',
      color: theme.colors.info,
    },
    {
      id: 'electrical',
      name: 'Electrical',
      icon: 'flash-outline',
      color: '#FF9500',
    },
    { id: 'hvac', name: 'HVAC', icon: 'thermometer-outline', color: '#4CD964' },
    {
      id: 'general',
      name: 'General',
      icon: 'hammer-outline',
      color: '#5856D6',
    },
    {
      id: 'appliance',
      name: 'Appliance',
      icon: 'home-outline',
      color: '#FF3B30',
    },
  ];

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

  const filteredContractors = filterContractorsByService(selectedService);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {viewMode === 'map' ? 'Contractor Map' : 'Discover Contractors'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {filteredContractors.length} contractors found
        </Text>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === 'discover' && styles.toggleButtonActive,
          ]}
          onPress={() => setViewMode('discover')}
        >
          <Ionicons
            name='person-outline'
            size={20}
            color={
              viewMode === 'discover'
                ? theme.colors.textInverse
                : theme.colors.info
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
        >
          <Ionicons
            name='map-outline'
            size={20}
            color={
              viewMode === 'map' ? theme.colors.textInverse : theme.colors.info
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
          >
            <Ionicons
              name={filter.icon as any}
              size={16}
              color={selectedService === filter.id ? '#fff' : filter.color}
            />
            <Text
              style={[
                styles.filterText,
                {
                  color: selectedService === filter.id ? '#fff' : filter.color,
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
              // Handle contractor selection - could navigate to profile or show details
              logger.debug('Selected contractor:', {
                firstName: contractor.firstName,
                lastName: contractor.lastName,
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: theme.colors.info,
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 8,
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
    backgroundColor: theme.colors.info,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.info,
    marginLeft: 6,
  },
  toggleTextActive: {
    color: '#fff',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.info,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ContractorDiscoveryScreen;
