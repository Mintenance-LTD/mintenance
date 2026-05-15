/**
 * MeetingDetailsScreen — meeting info, map + live tracking,
 * contractor travel controls, action buttons, and updates timeline.
 *
 * Was a 664-line monolith. Split 2026-05-09 (AUDIT_PUNCH_LIST P2 #44g)
 * into shared utilities (`meeting-details/utils.ts`), Alert/Linking
 * action handlers (`meeting-details/actions.ts`), and 6 leaf
 * components under `meeting-details/components/`. Public behaviour
 * preserved.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import type {
  ContractorMeeting,
  MeetingUpdate,
  LocationData,
} from '@mintenance/types';

import { styles } from './meetingDetailsStyles';
import { useJobTravelTracking } from '../hooks/useJobTravelTracking';
import { useAuth } from '../contexts/AuthContext';
import { MeetingService } from '../services/MeetingService';
import type { ContractorLocation } from '../services/meeting/types';
import { logger } from '../utils/logger';
import { me } from '../design-system/mint-editorial';

import { calculateDistanceKm } from './meeting-details/utils';
import {
  callContractor,
  cancelMeeting,
  messageContractor,
  rescheduleMeeting,
} from './meeting-details/actions';
import type { MapRegion } from './meeting-details/components/MapPlaceholder';
import { MeetingInfoCard } from './meeting-details/components/MeetingInfoCard';
import { LocationMapSection } from './meeting-details/components/LocationMapSection';
import { TravelTrackingPanel } from './meeting-details/components/TravelTrackingPanel';
import { MeetingActionsRow } from './meeting-details/components/MeetingActionsRow';
import { UpdatesTimeline } from './meeting-details/components/UpdatesTimeline';

interface Props {
  route: { params: { meetingId: string } };
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

const MeetingDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { meetingId } = route.params;

  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<ContractorMeeting | null>(null);
  const [contractorLocation, setContractorLocation] =
    useState<ContractorLocation | null>(null);
  const [, setUserLocation] = useState<LocationData | null>(null);
  const [updates, setUpdates] = useState<MeetingUpdate[]>([]);
  const [region, setRegion] = useState<MapRegion | null>(null);

  const locationSubscription = useRef<{ unsubscribe: () => void } | null>(null);
  const meetingSubscription = useRef<{ unsubscribe: () => void } | null>(null);

  const travelTracking = useJobTravelTracking({
    meetingId,
    jobId: meeting?.job_id,
    destination:
      meeting?.latitude && meeting?.longitude
        ? { latitude: meeting.latitude, longitude: meeting.longitude }
        : { latitude: 0, longitude: 0 },
    onLocationUpdate: (location) => {
      setContractorLocation({
        id: 'tracking',
        contractorId: meeting?.contractor_id || '',
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: 10,
        timestamp: location.timestamp,
        isActive: true,
        meetingId,
      });
    },
    onArrival: () => {
      Alert.alert(
        'Arrived',
        'You have been marked as arrived at the meeting location'
      );
    },
  });

  useEffect(() => {
    const initializeScreen = async () => {
      try {
        setLoading(true);

        const meetingData = await MeetingService.getMeetingById(meetingId);
        if (!meetingData) {
          Alert.alert('Error', 'Meeting not found');
          navigation.goBack();
          return;
        }
        setMeeting(meetingData);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }

        setRegion({
          latitude: meetingData.latitude ?? 0,
          longitude: meetingData.longitude ?? 0,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });

        const contractorLoc = await MeetingService.getContractorLocation(
          meetingData.contractor_id
        );
        setContractorLocation(contractorLoc);

        const meetingUpdates =
          await MeetingService.getMeetingUpdates(meetingId);
        setUpdates(meetingUpdates);

        // Real-time subscriptions
        locationSubscription.current =
          MeetingService.subscribeToContractorLocation(
            meetingData.contractor_id,
            (location) => {
              if (location) setContractorLocation(location);
            }
          );
        meetingSubscription.current = MeetingService.subscribeToMeetingUpdates(
          meetingId,
          (updatedMeeting) => {
            if (updatedMeeting) setMeeting(updatedMeeting);
          }
        );
      } catch (error) {
        logger.error('Error initializing meeting details:', error);
        Alert.alert('Error', 'Failed to load meeting details');
      } finally {
        setLoading(false);
      }
    };

    initializeScreen();

    return () => {
      locationSubscription.current?.unsubscribe();
      meetingSubscription.current?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  if (loading || !meeting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={me.ink} />
        <Text style={styles.loadingText}>Loading meeting details...</Text>
      </View>
    );
  }

  const distanceKm =
    contractorLocation && meeting.latitude && meeting.longitude
      ? calculateDistanceKm(
          {
            latitude: contractorLocation.latitude,
            longitude: contractorLocation.longitude,
          },
          { latitude: meeting.latitude, longitude: meeting.longitude }
        )
      : null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meeting Details</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <MeetingInfoCard meeting={meeting} />

        <LocationMapSection
          meeting={meeting}
          region={region}
          contractorLocation={contractorLocation}
          distanceKm={distanceKm}
          etaMinutes={travelTracking.eta}
        />

        {user?.role === 'contractor' && meeting.status === 'scheduled' && (
          <TravelTrackingPanel travel={travelTracking} />
        )}

        <MeetingActionsRow
          onCall={() => callContractor(meeting)}
          onMessage={() => messageContractor(meeting, navigation)}
          onReschedule={() => rescheduleMeeting(meeting, meetingId, navigation)}
          onCancel={() =>
            cancelMeeting({
              meetingId,
              userId: user?.id || '',
              onCancelled: () => navigation.goBack(),
            })
          }
        />

        <UpdatesTimeline updates={updates} />
      </ScrollView>
    </View>
  );
};

export default MeetingDetailsScreen;
