import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { MeetingService } from '../services/MeetingService';
import { ContractorMeeting, LocationData, User, Job } from '../types';
import { theme } from '../theme';
import { logger } from '../utils/logger';

interface Props {
  route: {
    params: {
      contractorId: string;
      jobId: string;
      contractor?: User;
      job?: Job;
    };
  };
  navigation: any;
}

const MeetingScheduleScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useAuth();
  const { contractorId, jobId, contractor, job } = route.params;

  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [meetingType, setMeetingType] = useState<'site_visit' | 'consultation' | 'work_session'>('site_visit');
  const [duration, setDuration] = useState(60); // Default 60 minutes
  const [location, setLocation] = useState<LocationData | null>(null);
  const [notes, setNotes] = useState('');
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    initializeLocation();
  }, []);

  const initializeLocation = async () => {
    try {
      setLocationStatus('loading');
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setLocationStatus('error');
        Alert.alert(
          'Permission Required',
          'Location permission is needed to schedule meetings.',
          [{ text: 'OK' }]
        );
        return;
      }

      const locationResult = await Location.getCurrentPositionAsync({});
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
      });

      const address = reverseGeocode[0]
        ? `${reverseGeocode[0].streetNumber || ''} ${reverseGeocode[0].street || ''}, ${reverseGeocode[0].city || ''}`
        : 'Current Location';

      setLocation({
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
        address: address.trim(),
      });
      setLocationStatus('success');
    } catch (error) {
      logger.error('Error getting location:', error);
      setLocationStatus('error');
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    }
  };

  const meetingTypes = [
    {
      id: 'site_visit' as const,
      name: 'Site Visit',
      description: 'Contractor visits to assess the work',
      icon: 'home-outline',
      estimatedDuration: 60,
    },
    {
      id: 'consultation' as const,
      name: 'Consultation',
      description: 'Discuss project details and requirements',
      icon: 'chatbubbles-outline',
      estimatedDuration: 30,
    },
    {
      id: 'work_session' as const,
      name: 'Work Session',
      description: 'Scheduled work time',
      icon: 'hammer-outline',
      estimatedDuration: 120,
    },
  ];

  const durationOptions = [30, 60, 90, 120, 180];

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setSelectedTime(selectedTime);
    }
  };

  const combineDateAndTime = (date: Date, time: Date): Date => {
    const combined = new Date(date);
    combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return combined;
  };

  const handleScheduleMeeting = async () => {
    if (!user || !location) {
      Alert.alert('Error', 'Please ensure location access is granted.');
      return;
    }

    const meetingDateTime = combineDateAndTime(selectedDate, selectedTime);

    // Check if meeting is in the future
    if (meetingDateTime <= new Date()) {
      Alert.alert('Invalid Time', 'Please select a future date and time.');
      return;
    }

    try {
      setLoading(true);

      const meeting = await MeetingService.createMeeting({
        jobId,
        homeownerId: user.id,
        contractorId,
        scheduledDateTime: meetingDateTime.toISOString(),
        meetingType,
        location,
        duration,
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        'Meeting Scheduled!',
        `Your ${meetingTypes.find(t => t.id === meetingType)?.name.toLowerCase()} has been scheduled for ${meetingDateTime.toLocaleDateString()} at ${meetingDateTime.toLocaleTimeString()}.`,
        [
          {
            text: 'View Meeting',
            onPress: () => navigation.replace('MeetingDetails', { meetingId: meeting.id }),
          },
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      logger.error('Error scheduling meeting:', error);
      Alert.alert('Error', 'Failed to schedule meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Meeting</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contractor Info */}
        <View style={styles.contractorInfo}>
          <Ionicons name="person-circle" size={50} color={theme.colors.info} />
          <View style={styles.contractorDetails}>
            <Text style={styles.contractorName}>
              {contractor ? `${contractor.first_name} ${contractor.last_name}` : 'Contractor'}
            </Text>
            <Text style={styles.jobTitle}>
              {job ? job.title : 'Job Discussion'}
            </Text>
          </View>
        </View>

        {/* Meeting Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meeting Type</Text>
          <View style={styles.meetingTypes}>
            {meetingTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.meetingTypeCard,
                  meetingType === type.id && styles.meetingTypeCardSelected,
                ]}
                onPress={() => {
                  setMeetingType(type.id);
                  setDuration(type.estimatedDuration);
                }}
              >
                <Ionicons
                  name={type.icon as any}
                  size={24}
                  color={
                    meetingType === type.id
                      ? theme.colors.textInverse
                      : theme.colors.info
                  }
                />
                <Text
                  style={[
                    styles.meetingTypeName,
                    meetingType === type.id && styles.meetingTypeNameSelected,
                  ]}
                >
                  {type.name}
                </Text>
                <Text
                  style={[
                    styles.meetingTypeDescription,
                    meetingType === type.id && styles.meetingTypeDescriptionSelected,
                  ]}
                >
                  {type.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date</Text>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={24} color={theme.colors.info} />
            <Text style={styles.dateTimeText}>{formatDate(selectedDate)}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time</Text>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={24} color={theme.colors.info} />
            <Text style={styles.dateTimeText}>{formatTime(selectedTime)}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Duration Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duration</Text>
          <View style={styles.durationOptions}>
            {durationOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.durationButton,
                  duration === option && styles.durationButtonSelected,
                ]}
                onPress={() => setDuration(option)}
              >
                <Text
                  style={[
                    styles.durationButtonText,
                    duration === option && styles.durationButtonTextSelected,
                  ]}
                >
                  {option} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={24} color={theme.colors.info} />
            <View style={styles.locationInfo}>
              {locationStatus === 'loading' && (
                <ActivityIndicator size="small" color={theme.colors.info} />
              )}
              {locationStatus === 'success' && location && (
                <Text style={styles.locationText}>{location.address}</Text>
              )}
              {locationStatus === 'error' && (
                <Text style={styles.locationError}>Unable to get location</Text>
              )}
            </View>
            <TouchableOpacity onPress={initializeLocation}>
              <Ionicons name="refresh" size={20} color={theme.colors.info} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <View style={styles.notesContainer}>
            <Text style={styles.notesPlaceholder}>
              Add any specific instructions or requirements for the meeting...
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Schedule Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.scheduleButton, loading && styles.scheduleButtonDisabled]}
          onPress={handleScheduleMeeting}
          disabled={loading || !location}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <>
              <Ionicons name="calendar" size={20} color={theme.colors.textInverse} />
              <Text style={styles.scheduleButtonText}>Schedule Meeting</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Date/Time Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  contractorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  contractorDetails: {
    marginLeft: 15,
  },
  contractorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  jobTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  meetingTypes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meetingTypeCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  meetingTypeCardSelected: {
    backgroundColor: theme.colors.info,
    borderColor: theme.colors.info,
  },
  meetingTypeName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  meetingTypeNameSelected: {
    color: theme.colors.textInverse,
  },
  meetingTypeDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  meetingTypeDescriptionSelected: {
    color: theme.colors.textInverse,
    opacity: 0.9,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginLeft: 12,
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  durationButton: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  durationButtonSelected: {
    backgroundColor: theme.colors.info,
    borderColor: theme.colors.info,
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  durationButtonTextSelected: {
    color: theme.colors.textInverse,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  locationError: {
    fontSize: 16,
    color: theme.colors.error,
  },
  notesContainer: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    minHeight: 80,
  },
  notesPlaceholder: {
    fontSize: 16,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    backgroundColor: theme.colors.surface,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.info,
    padding: 16,
    borderRadius: 12,
  },
  scheduleButtonDisabled: {
    opacity: 0.5,
  },
  scheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textInverse,
    marginLeft: 8,
  },
});

export default MeetingScheduleScreen;