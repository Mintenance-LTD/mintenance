import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { theme } from '../theme';
import { useHaptics } from '../utils/haptics';
import { useAuth } from '../contexts/AuthContext';
import { ContractorService } from '../services/ContractorService';
import { ContractorProfile } from '../types';

interface ContractorMapParams {
  contractorId?: string;
  initialRegion?: Region;
}

interface Props {
  route?: RouteProp<{ params: ContractorMapParams }>;
  navigation: StackNavigationProp<any>;
}

interface ContractorLocation {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  address: string;
  distance: string;
  pricing: string;
  verified: boolean;
  responseTime: string;
  phone?: string;
  profileImageUrl?: string;
  skills: string[];
}

const ContractorMapScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useAuth();
  const haptics = useHaptics();
  const mapRef = useRef<MapView>(null);
  const { contractorId, initialRegion } = route?.params || {};

  const [region, setRegion] = useState<Region>(
    initialRegion || {
      latitude: 40.7128,
      longitude: -74.006,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    }
  );
  const [userLocation, setUserLocation] =
    useState<Location.LocationObject | null>(null);
  const [contractors, setContractors] = useState<ContractorLocation[]>([]);
  const [selectedContractor, setSelectedContractor] =
    useState<ContractorLocation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadNearbyContractors();
    }
  }, [userLocation]);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Please enable location services to find contractors near you.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };

      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadNearbyContractors = async () => {
    setLoading(true);
    try {
      if (!user || !userLocation) {
        setLoading(false);
        return;
      }

      const location = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      };

      // Get real contractors from database
      const contractorsData = await ContractorService.getNearbyContractors(
        location,
        25
      );

      // Transform contractor profiles to ContractorLocation format
      const contractorLocations: ContractorLocation[] = contractorsData.map(
        (contractor) => ({
          id: contractor.id,
          name: `${contractor.firstName} ${contractor.lastName}`.trim(),
          specialty:
            contractor.skills[0]?.skillName ||
            contractor.bio?.split('.')[0] ||
            'Professional Contractor',
          rating: contractor.rating || 4.5,
          coordinate: {
            latitude: contractor.latitude || 40.7128,
            longitude: contractor.longitude || -74.006,
          },
          address: contractor.address || 'Location not specified',
          distance: `${contractor.distance?.toFixed(1) || '0.0'} km`,
          pricing: 'Contact for pricing',
          verified: (contractor.totalJobsCompleted ?? 0) > 0,
          responseTime:
            (contractor.rating ?? 0) >= 4.5 ? '< 30 min' : '< 1 hour',
          phone: contractor.phone,
          profileImageUrl: contractor.profileImageUrl,
          skills: contractor.skills.map((skill) => skill.skillName),
        })
      );

      setContractors(contractorLocations);

      // If specific contractor ID provided, focus on them
      if (contractorId) {
        const targetContractor = contractorLocations.find(
          (c) => c.id === contractorId
        );
        if (targetContractor) {
          setSelectedContractor(targetContractor);
          mapRef.current?.animateToRegion(
            {
              ...targetContractor.coordinate,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            1000
          );
        }
      }
    } catch (error) {
      console.error('Error loading contractors:', error);
      Alert.alert('Error', 'Failed to load nearby contractors');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerPress = (contractor: ContractorLocation) => {
    haptics.buttonPress();
    setSelectedContractor(contractor);

    mapRef.current?.animateToRegion(
      {
        latitude: contractor.coordinate.latitude,
        longitude: contractor.coordinate.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      1000
    );
  };

  const handleGetDirections = (contractor: ContractorLocation) => {
    haptics.buttonPress();

    const { latitude, longitude } = contractor.coordinate;
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q=',
    });
    const latLng = `${latitude},${longitude}`;
    const label = contractor.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Unable to open maps application');
      });
    }
  };

  const handleContactContractor = (contractor: ContractorLocation) => {
    haptics.buttonPress();

    Alert.alert(
      'Contact Contractor',
      `Would you like to contact ${contractor.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => handleCall(contractor) },
        { text: 'Message', onPress: () => handleMessage(contractor) },
        { text: 'Book Service', onPress: () => handleBookService(contractor) },
      ]
    );
  };

  const handleCall = (contractor: ContractorLocation) => {
    // In a real app, this would use the contractor's phone number
    Linking.openURL('tel:+1234567890');
  };

  const handleMessage = (contractor: ContractorLocation) => {
    navigation.navigate('Chat', { contractorId: contractor.id });
  };

  const handleBookService = (contractor: ContractorLocation) => {
    navigation.navigate('ServiceBooking', {
      contractorId: contractor.id,
      contractorName: contractor.name,
    });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // In a real app, this would filter contractors based on search
    if (query.trim()) {
      const filtered = contractors.filter(
        (contractor) =>
          contractor.name.toLowerCase().includes(query.toLowerCase()) ||
          contractor.specialty.toLowerCase().includes(query.toLowerCase()) ||
          contractor.address.toLowerCase().includes(query.toLowerCase())
      );
      // Could update map to show only filtered results
    }
  };

  const handleMyLocation = () => {
    haptics.buttonPress();

    if (userLocation) {
      const newRegion = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      mapRef.current?.animateToRegion(newRegion, 1000);
    } else {
      initializeLocation();
    }
  };

  const renderContractorDetails = () => {
    if (!selectedContractor) return null;

    const contractor = selectedContractor;

    return (
      <View style={styles.contractorDetails}>
        <View style={styles.contractorHeader}>
          <View style={styles.contractorInfo}>
            <View style={styles.contractorNameRow}>
              <Text style={styles.contractorName}>{contractor.name}</Text>
              {contractor.verified && (
                <Ionicons
                  name='checkmark-circle'
                  size={16}
                  color={theme.colors.secondary}
                />
              )}
            </View>
            <Text style={styles.contractorSpecialty}>
              {contractor.specialty}
            </Text>
            <View style={styles.contractorMeta}>
              <View style={styles.ratingContainer}>
                <Ionicons name='star' size={14} color='#FFD700' />
                <Text style={styles.rating}>{contractor.rating}</Text>
              </View>
              <Text style={styles.metaDivider}>•</Text>
              <Text style={styles.distance}>{contractor.distance}</Text>
              <Text style={styles.metaDivider}>•</Text>
              <Text style={styles.responseTime}>{contractor.responseTime}</Text>
            </View>
            <Text style={styles.contractorAddress}>{contractor.address}</Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedContractor(null)}
          >
            <Ionicons
              name='close'
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.contractorPricing}>
          <View style={styles.pricingInfo}>
            <Ionicons
              name='cash-outline'
              size={16}
              color={theme.colors.secondary}
            />
            <Text style={styles.pricingText}>{contractor.pricing}</Text>
          </View>
          <View style={styles.estimateInfo}>
            <Ionicons
              name='time-outline'
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.estimateText}>35 km/50min</Text>
          </View>
        </View>

        <View style={styles.contractorActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleContactContractor(contractor)}
          >
            <Ionicons
              name='chatbubble-outline'
              size={18}
              color={theme.colors.primary}
            />
            <Text style={styles.actionButtonText}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleCall(contractor)}
          >
            <Ionicons
              name='call-outline'
              size={18}
              color={theme.colors.primary}
            />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.directionsButton]}
            onPress={() => handleGetDirections(contractor)}
          >
            <Ionicons name='navigate-outline' size={18} color='#fff' />
            <Text
              style={[styles.actionButtonText, styles.directionsButtonText]}
            >
              Directions
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Ionicons name='search' size={20} color={theme.colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder='Search Salon, Specialist...'
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        <TouchableOpacity style={styles.filterButton}>
          <Ionicons
            name='options-outline'
            size={20}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {contractors.map((contractor) => (
          <Marker
            key={contractor.id}
            coordinate={contractor.coordinate}
            onPress={() => handleMarkerPress(contractor)}
          >
            <View
              style={[
                styles.markerContainer,
                selectedContractor?.id === contractor.id &&
                  styles.selectedMarker,
              ]}
            >
              <View style={styles.marker}>
                <Ionicons
                  name='person'
                  size={20}
                  color={
                    selectedContractor?.id === contractor.id
                      ? '#fff'
                      : theme.colors.primary
                  }
                />
              </View>
              {contractor.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name='checkmark' size={8} color='#fff' />
                </View>
              )}
            </View>
          </Marker>
        ))}
      </MapView>

      {/* My Location Button */}
      <TouchableOpacity
        style={styles.myLocationButton}
        onPress={handleMyLocation}
      >
        <Ionicons name='locate' size={24} color={theme.colors.primary} />
      </TouchableOpacity>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
          <Text style={styles.loadingText}>Finding nearby contractors...</Text>
        </View>
      )}

      {/* Contractor Details Bottom Sheet */}
      {renderContractorDetails()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.background,
    gap: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...theme.shadows.base,
  },
  selectedMarker: {
    transform: [{ scale: 1.2 }],
    backgroundColor: theme.colors.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.textInverse,
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.base,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  contractorDetails: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    ...theme.shadows.lg,
  },
  contractorHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  contractorInfo: {
    flex: 1,
  },
  contractorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  contractorName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  contractorSpecialty: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  contractorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  metaDivider: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  distance: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  responseTime: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  contractorAddress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  closeButton: {
    padding: 4,
  },
  contractorPricing: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
  },
  pricingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pricingText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  estimateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  estimateText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  contractorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  directionsButton: {
    backgroundColor: theme.colors.primary,
  },
  directionsButtonText: {
    color: theme.colors.textInverse,
  },
});

export default ContractorMapScreen;
