import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJobTravelTracking } from '../hooks/useJobTravelTracking';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { MeetingService } from '../services/MeetingService';
import {
  ContractorMeeting,
  ContractorLocation,
  MeetingUpdate,
  LocationData,
} from '@mintenance/types';
import { theme } from '../theme';
import { logger } from '../utils/logger';

// Web-compatible fallback components (react-native-maps removed for web compatibility)
interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const MapView = ({ children, ...props }: unknown) => (
  <View style={{ flex: 1, backgroundColor: theme.colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Map view available on mobile devices</Text>
    {children}
  </View>
);

const Marker = ({ children, ...props }: unknown) => <View {...props}>{children}</View>;
const Polyline = ({ children, ...props }: unknown) => <View {...props}>{children}</View>;

interface Props {
  route: {
    params: {
      meetingId: string;
    };
  };
  navigation: unknown;
}

const MeetingDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { meetingId } = route.params;

  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<ContractorMeeting | null>(null);
  const [contractorLocation, setContractorLocation] = useState<ContractorLocation | null>(null);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [updates, setUpdates] = useState<MeetingUpdate[]>([]);
  const [region, setRegion] = useState<Region | null>(null);

  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<unknown>(null);
  const meetingSubscription = useRef<unknown>(null);

  // Travel tracking hook (for contractors)
  const travelTracking = useJobTravelTracking({
    meetingId,
    jobId: meeting?.job_id,
    destination: meeting?.latitude && meeting?.longitude
      ? {
          latitude: meeting.latitude,
          longitude: meeting.longitude,
        }
      : { latitude: 0, longitude: 0 },
    onLocationUpdate: (location) => {
      // Update contractor location state when tracking
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
      Alert.alert('Arrived', 'You have been marked as arrived at the meeting location');
    },
  });

  useEffect(() => {
    initializeScreen();

    return () => {
      // Cleanup subscriptions
      if (locationSubscription.current) {
        locationSubscription.current.unsubscribe();
      }
      if (meetingSubscription.current) {
        meetingSubscription.current.unsubscribe();
      }
    };
  }, []);

  const initializeScreen = async () => {
    try {
      setLoading(true);

      // Load meeting details
      const meetingData = await MeetingService.getMeetingById(meetingId);
      if (!meetingData) {
        Alert.alert('Error', 'Meeting not found');
        navigation.goBack();
        return;
      }
      setMeeting(meetingData);

      // Get user location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }

      // Set initial map region
      setRegion({
        latitude: meetingData.location.latitude,
        longitude: meetingData.location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Load contractor location
      const contractorLoc = await MeetingService.getContractorLocation(meetingData.contractorId);
      setContractorLocation(contractorLoc);

      // Load meeting updates
      const meetingUpdates = await MeetingService.getMeetingUpdates(meetingId);
      setUpdates(meetingUpdates);

      // Subscribe to real-time updates
      setupRealTimeSubscriptions(meetingData.contractorId);
    } catch (error) {
      logger.error('Error initializing meeting details:', error);
      Alert.alert('Error', 'Failed to load meeting details');
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeSubscriptions = (contractorId: string) => {
    // Subscribe to contractor location updates
    locationSubscription.current = MeetingService.subscribeToContractorLocation(
      contractorId,
      (location) => {
        if (location) {
          setContractorLocation(location);
        }
      }
    );

    // Subscribe to meeting updates
    meetingSubscription.current = MeetingService.subscribeToMeetingUpdates(
      meetingId,
      (updatedMeeting) => {
        if (updatedMeeting) {
          setMeeting(updatedMeeting);
        }
      }
    );
  };

  const handleCallContractor = () => {
    if (meeting?.contractor?.phone) {
      Linking.openURL(`tel:${meeting.contractor.phone}`);
    } else {
      Alert.alert('No Phone Number', 'Phone number not available for this contractor');
    }
  };

  const handleMessageContractor = () => {
    if (meeting?.job_id) {
      navigation.navigate('MessagingTab' as never, {
        screen: 'Messaging',
        params: {
          conversationId: meeting.job_id,
          recipientId: meeting.contractor_id,
        },
      } as never);
    }
  };

  const handleReschedule = () => {
    Alert.alert(
      'Reschedule Meeting',
      'Would you like to reschedule this meeting?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reschedule',
          onPress: () => navigation.navigate('MeetingSchedule', {
            contractorId: meeting?.contractor_id,
            jobId: meeting?.job_id,
            rescheduleMeetingId: meetingId,
          }),
        },
      ]
    );
  };

  const handleCancelMeeting = () => {
    Alert.alert(
      'Cancel Meeting',
      'Are you sure you want to cancel this meeting?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await MeetingService.updateMeetingStatus(
                meetingId,
                'cancelled',
                user?.id || '',
                'Cancelled by homeowner'
              );
              Alert.alert('Meeting Cancelled', 'The meeting has been cancelled.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel meeting');
            }
          },
        },
      ]
    );
  };

  const calculateDistance = (loc1: LocationData, loc2: LocationData): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (loc2.latitude - loc1.latitude) * (Math.PI / 180);
    const dLon = (loc2.longitude - loc1.longitude) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(loc1.latitude * (Math.PI / 180)) *
        Math.cos(loc2.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getStatusColor = (status: ContractorMeeting['status']): string => {
    switch (status) {
      case 'scheduled':
        return theme.colors.primary;
      case 'confirmed':
        return theme.colors.success;
      case 'in_progress':
        return theme.colors.warning;
      case 'completed':
        return theme.colors.success;
      case 'cancelled':
        return theme.colors.error;
      case 'rescheduled':
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  const formatMeetingTime = (dateTime: string): string => {
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatUpdateTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading || !meeting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading meeting details...</Text>
      </View>
    );
  }

  const distance = contractorLocation && meeting.location
    ? calculateDistance(
        {
          latitude: contractorLocation.latitude,
          longitude: contractorLocation.longitude,
        },
        meeting.location
      )
    : null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meeting Details</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Meeting Info */}
        <View style={styles.meetingInfo}>
          <View style={styles.meetingHeader}>
            <View style={styles.meetingTitleContainer}>
              <Text style={styles.meetingTitle}>
                {meeting.meetingType.replace('_', ' ').toUpperCase()}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(meeting.status) }]}>
                <Text style={styles.statusText}>
                  {meeting.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.meetingTime}>
              {formatMeetingTime(meeting.scheduledDateTime)}
            </Text>
          </View>

          <View style={styles.participantInfo}>
            <View style={styles.participant}>
              <Ionicons name="person-circle" size={40} color={theme.colors.primary} />
              <View>
                <Text style={styles.participantName}>
                  {meeting.contractor
                    ? `${meeting.contractor.first_name} ${meeting.contractor.last_name}`
                    : 'Contractor'}
                </Text>
                <Text style={styles.participantRole}>Contractor</Text>
              </View>
            </View>
          </View>

          {meeting.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesTitle}>Notes</Text>
              <Text style={styles.notesText}>{meeting.notes}</Text>
            </View>
          )}
        </View>

        {/* Map */}
        <View style={styles.mapSection}>
          <Text style={styles.sectionTitle}>Location & Tracking</Text>
          <View style={styles.mapContainer}>
            {region && (
              <MapView
                ref={mapRef}
                style={styles.map}
                region={region}
                showsUserLocation={true}
                showsMyLocationButton={false}
              >
                {/* Meeting Location Marker */}
                <Marker
                  coordinate={{
                    latitude: meeting.location.latitude,
                    longitude: meeting.location.longitude,
                  }}
                  title="Meeting Location"
                  description={meeting.location.address}
                  pinColor={theme.colors.primary}
                />

                {/* Contractor Location Marker */}
                {contractorLocation && (
                  <Marker
                    coordinate={{
                      latitude: contractorLocation.latitude,
                      longitude: contractorLocation.longitude,
                    }}
                    title="Contractor Location"
                    description="Live location"
                    pinColor={theme.colors.success}
                  >
                    <View style={styles.contractorMarker}>
                      <Ionicons name="car" size={20} color={theme.colors.textInverse} />
                    </View>
                  </Marker>
                )}

                {/* Route Line */}
                {contractorLocation && (
                  <Polyline
                    coordinates={[
                      {
                        latitude: contractorLocation.latitude,
                        longitude: contractorLocation.longitude,
                      },
                      {
                        latitude: meeting.location.latitude,
                        longitude: meeting.location.longitude,
                      },
                    ]}
                    strokeColor={theme.colors.primary}
                    strokeWidth={3}
                    lineDashPattern={[5, 10]}
                  />
                )}
              </MapView>
            )}

            {/* Location Info Overlay */}
            <View style={styles.locationOverlay}>
              {contractorLocation && distance && (
                <View style={styles.distanceInfo}>
                  <Ionicons name="location" size={16} color={theme.colors.primary} />
                  <Text style={styles.distanceText}>
                    {distance.toFixed(1)} km away
                  </Text>
                  {travelTracking.eta !== null ? (
                    <Text style={styles.estimatedTime}>
                      ETA: {travelTracking.eta} mins
                    </Text>
                  ) : (
                    <Text style={styles.estimatedTime}>
                      ~{Math.round(distance * 2)} mins
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Travel Tracking (Contractor Only) */}
        {user?.role === 'contractor' && meeting?.status === 'scheduled' && (
          <View style={styles.travelTrackingSection}>
            <Text style={styles.sectionTitle}>Travel Tracking</Text>
            {!travelTracking.isTracking ? (
              <TouchableOpacity
                style={[styles.travelButton, styles.startTravelButton]}
                onPress={travelTracking.startTracking}
                disabled={travelTracking.error !== null}
              >
                <Ionicons name="navigate" size={24} color={theme.colors.white} />
                <Text style={styles.travelButtonText}>Start Traveling</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.trackingActiveContainer}>
                <View style={styles.etaDisplay}>
                  <Ionicons name="time" size={20} color={theme.colors.primary} />
                  <Text style={styles.etaText}>
                    ETA: {travelTracking.eta ? `${travelTracking.eta} minutes` : 'Calculating...'}
                  </Text>
                </View>
                <View style={styles.trackingButtons}>
                  <TouchableOpacity
                    style={[styles.travelButton, styles.arrivedButton]}
                    onPress={travelTracking.markArrived}
                  >
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.white} />
                    <Text style={styles.travelButtonText}>Mark Arrived</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.travelButton, styles.stopTravelButton]}
                    onPress={travelTracking.stopTracking}
                  >
                    <Ionicons name="stop-circle" size={20} color={theme.colors.white} />
                    <Text style={styles.travelButtonText}>Stop</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {travelTracking.error && (
              <Text style={styles.errorText}>{travelTracking.error}</Text>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCallContractor}
            >
              <Ionicons name="call" size={20} color={theme.colors.success} />
              <Text style={styles.actionButtonText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleMessageContractor}
            >
              <Ionicons name="chatbubble" size={20} color={theme.colors.primary} />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleReschedule}
            >
              <Ionicons name="calendar" size={20} color={theme.colors.warning} />
              <Text style={styles.actionButtonText}>Reschedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCancelMeeting}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.error} />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Updates Timeline */}
        {updates.length > 0 && (
          <View style={styles.updatesSection}>
            <Text style={styles.sectionTitle}>Updates</Text>
            {updates.map((update) => (
              <View key={update.id} style={styles.updateItem}>
                <View style={styles.updateIcon}>
                  <Ionicons
                    name={
                      update.updateType === 'schedule_change'
                        ? 'calendar'
                        : update.updateType === 'location_update'
                        ? 'location'
                        : update.updateType === 'status_change'
                        ? 'checkmark-circle'
                        : 'notifications'
                    }
                    size={16}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.updateContent}>
                  <Text style={styles.updateMessage}>{update.message}</Text>
                  <Text style={styles.updateTime}>
                    {formatUpdateTime(update.timestamp)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  meetingInfo: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  meetingHeader: {
    marginBottom: 16,
  },
  meetingTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  meetingTime: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  participantInfo: {
    marginBottom: 16,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 12,
  },
  participantRole: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 12,
  },
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: 16,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  mapSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  contractorMarker: {
    backgroundColor: theme.colors.success,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  distanceInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 4,
  },
  estimatedTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  travelTrackingSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  travelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  startTravelButton: {
    backgroundColor: theme.colors.primary,
  },
  arrivedButton: {
    backgroundColor: theme.colors.success,
    flex: 1,
    marginRight: 8,
  },
  stopTravelButton: {
    backgroundColor: theme.colors.error,
    flex: 1,
    marginLeft: 8,
  },
  travelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
  trackingActiveContainer: {
    gap: 12,
  },
  etaDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  etaText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  trackingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.error,
    textAlign: 'center',
  },
  updatesSection: {
    marginBottom: 20,
  },
  updateItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  updateIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  updateContent: {
    flex: 1,
  },
  updateMessage: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  updateTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});

export default MeetingDetailsScreen;