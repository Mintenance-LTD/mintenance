/**
 * MeetingSchedule ViewModel
 * 
 * Business logic for meeting scheduling.
 * Handles date/time selection, location services, and meeting creation.
 * 
 * @filesize Target: <150 lines
 * @compliance MVVM - Business logic only
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { logger } from '../../../utils/logger';
import { useAuth } from '../../../contexts/AuthContext';
import { MeetingService } from '../../../services/MeetingService';
import type { ContractorMeeting, LocationData, User, Job } from '../../../types';

export type MeetingType = 'site_visit' | 'consultation' | 'work_session';

export interface MeetingTypeOption {
  id: MeetingType;
  name: string;
  description: string;
  icon: string;
  estimatedDuration: number;
}

export interface MeetingScheduleState {
  loading: boolean;
  selectedDate: Date;
  selectedTime: Date;
  showDatePicker: boolean;
  showTimePicker: boolean;
  meetingType: MeetingType;
  duration: number;
  location: LocationData | null;
  notes: string;
  locationStatus: 'loading' | 'success' | 'error';
  meetingTypes: MeetingTypeOption[];
}

export interface MeetingScheduleActions {
  setSelectedDate: (date: Date) => void;
  setSelectedTime: (time: Date) => void;
  setShowDatePicker: (show: boolean) => void;
  setShowTimePicker: (show: boolean) => void;
  setMeetingType: (type: MeetingType) => void;
  setDuration: (duration: number) => void;
  setNotes: (notes: string) => void;
  initializeLocation: () => Promise<void>;
  scheduleMeeting: () => Promise<void>;
  goBack: () => void;
}

export interface MeetingScheduleViewModel extends MeetingScheduleState, MeetingScheduleActions {}

/**
 * Custom hook providing Meeting Schedule screen logic
 */
export const useMeetingScheduleViewModel = (
  contractorId: string,
  jobId: string,
  _contractor?: User,
  _job?: Job
): MeetingScheduleViewModel => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [meetingType, setMeetingType] = useState<MeetingType>('site_visit');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [notes, setNotes] = useState('');
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const meetingTypes: MeetingTypeOption[] = [
    {
      id: 'site_visit',
      name: 'Site Visit',
      description: 'Contractor visits to assess the work',
      icon: 'home-outline',
      estimatedDuration: 60,
    },
    {
      id: 'consultation',
      name: 'Consultation',
      description: 'Discuss project details and requirements',
      icon: 'chatbubbles-outline',
      estimatedDuration: 30,
    },
    {
      id: 'work_session',
      name: 'Work Session',
      description: 'Actual work or installation session',
      icon: 'construct-outline',
      estimatedDuration: 120,
    },
  ];

  const initializeLocation = useCallback(async () => {
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
  }, []);

  const scheduleMeeting = useCallback(async () => {
    if (!user || !location) {
      Alert.alert('Error', 'Missing required information to schedule meeting.');
      return;
    }

    setLoading(true);
    try {
      const meetingData: Omit<ContractorMeeting, 'id' | 'created_at' | 'updated_at'> = {
        contractorId,
        clientId: user.id,
        job_id: jobId,
        meeting_type: meetingType,
        scheduled_date: selectedDate.toISOString(),
        scheduled_time: selectedTime.toISOString(),
        duration_minutes: duration,
        location: location,
        notes: notes,
        status: 'scheduled',
      };

      await MeetingService.createMeeting(meetingData);
      Alert.alert('Success', 'Meeting scheduled successfully!');
      logger.info('Meeting scheduled', { contractorId, jobId, meetingType });
    } catch (error) {
      logger.error('Failed to schedule meeting:', error);
      Alert.alert('Error', 'Failed to schedule meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, location, contractorId, jobId, meetingType, selectedDate, selectedTime, duration, notes]);

  const goBack = useCallback(() => {
    logger.info('Navigating back from MeetingSchedule');
  }, []);

  useEffect(() => {
    initializeLocation();
  }, [initializeLocation]);

  return {
    // State
    loading,
    selectedDate,
    selectedTime,
    showDatePicker,
    showTimePicker,
    meetingType,
    duration,
    location,
    notes,
    locationStatus,
    meetingTypes,

    // Actions
    setSelectedDate,
    setSelectedTime,
    setShowDatePicker,
    setShowTimePicker,
    setMeetingType,
    setDuration,
    setNotes,
    initializeLocation,
    scheduleMeeting,
    goBack,
  };
};
