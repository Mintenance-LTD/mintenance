import { useState, useEffect, useRef } from 'react';
import { Alert, Platform, Linking } from 'react-native';
import * as Location from 'expo-location';
import { StackNavigationProp } from '@react-navigation/stack';
import { logger } from '../services/logger';
import { useAuth } from '../contexts/AuthContext';
import { ContractorService } from '../services/ContractorService';
import { Region } from '../components/map/MapViewWrapper';

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

interface UseContractorMapProps {
  contractorId?: string;
  initialRegion?: Region;
  navigation: StackNavigationProp<any>;
}

export const useContractorMap = ({ contractorId, initialRegion, navigation }: UseContractorMapProps) => {
  const { user } = useAuth();
  const mapRef = useRef<any>(null);

  const [region, setRegion] = useState<Region>(
    initialRegion || {
      latitude: 40.7128,
      longitude: -74.006,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    }
  );
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [contractors, setContractors] = useState<ContractorLocation[]>([]);
  const [selectedContractor, setSelectedContractor] = useState<ContractorLocation | null>(null);
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
      logger.error('Error getting location', error);
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
      logger.error('Error loading contractors', error);
      Alert.alert('Error', 'Failed to load nearby contractors');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerPress = (contractor: ContractorLocation) => {
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

  const handleCall = (_contractor: ContractorLocation) => {
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
      // Could update map to show only filtered results
      // const filtered = contractors.filter((c) =>
      //   c.name.toLowerCase().includes(query.toLowerCase()) ||
      //   c.specialty.toLowerCase().includes(query.toLowerCase()) ||
      //   c.address.toLowerCase().includes(query.toLowerCase())
      // );
    }
  };

  const handleMyLocation = () => {
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

  return {
    mapRef,
    region,
    setRegion,
    contractors,
    selectedContractor,
    setSelectedContractor,
    searchQuery,
    loading,
    handleMarkerPress,
    handleGetDirections,
    handleContactContractor,
    handleCall,
    handleMessage,
    handleBookService,
    handleSearch,
    handleMyLocation,
  };
};
