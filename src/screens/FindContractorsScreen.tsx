import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { logger } from '../utils/logger';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { ContractorService } from '../services/ContractorService';
import { ContractorProfile, LocationData } from '../types';
import ContractorCard from '../components/ContractorCard';
import { theme } from '../theme';

const { height: screenHeight } = Dimensions.get('window');
const MAP_HEIGHT = screenHeight * 0.4;
const CARDS_HEIGHT = screenHeight * 0.6;

const FindContractorsScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [contractors, setContractors] = useState<ContractorProfile[]>([]);
  const [currentContractorIndex, setCurrentContractorIndex] = useState(0);
  const [region, setRegion] = useState<Region>({
    latitude: 40.7128,
    longitude: -74.006,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
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

  const currentContractor = getCurrentContractor();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Contractors</Text>
        <Text style={styles.headerSubtitle}>
          {contractors.length > 0
            ? `${currentContractorIndex + 1} of ${contractors.length}`
            : 'No contractors available'}
        </Text>
      </View>

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

          {contractors.map((contractor) => (
            <Marker
              key={contractor.id}
              coordinate={{
                latitude: contractor.latitude!,
                longitude: contractor.longitude!,
              }}
              title={`${contractor.firstName} ${contractor.lastName}`}
              description={contractor.bio || 'Contractor'}
              pinColor={
                contractor.id === currentContractor?.id ? 'red' : 'orange'
              }
              onPress={() => handleMapMarkerPress(contractor.id)}
            />
          ))}
        </MapView>
      </View>

      <View style={styles.cardsContainer}>
        {currentContractor ? (
          <ContractorCard
            contractor={currentContractor}
            onLike={() => handleContractorAction('like')}
            onPass={() => handleContractorAction('pass')}
          />
        ) : (
          <View style={styles.noContractorsContainer}>
            <Text style={styles.noContractorsTitle}>All Done!</Text>
            <Text style={styles.noContractorsText}>
              You've reviewed all available contractors in your area. Check back
              later for new contractors.
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() =>
                userLocation && loadNearbyContractors(userLocation)
              }
            >
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  header: {
    backgroundColor: theme.colors.info,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.textInverse,
    opacity: 0.9,
    marginTop: 4,
  },
  mapContainer: {
    height: MAP_HEIGHT,
  },
  map: {
    flex: 1,
  },
  cardsContainer: {
    height: CARDS_HEIGHT,
    padding: 20,
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
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  noContractorsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 40,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noContractorsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 15,
  },
  noContractorsText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  refreshButton: {
    backgroundColor: theme.colors.info,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FindContractorsScreen;
