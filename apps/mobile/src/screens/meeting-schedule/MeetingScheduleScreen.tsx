/**
 * MeetingScheduleScreen Container
 *
 * Main container for meeting scheduling with date/time and location.
 *
 * @filesize Target: <100 lines
 * @compliance MVVM - Thin container
 */

import React from 'react';
import { ScrollView, StyleSheet, TextInput, View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, LoadingSpinner } from '../../components/shared';
import { useMeetingScheduleViewModel } from './viewmodels/MeetingScheduleViewModel';
import {
  MeetingHeader,
  DateTimeSelector,
  MeetingTypeSelector,
  LocationPicker,
  ScheduleActions,
} from './components';
import type { User, Job } from '@mintenance/types';

interface Props {
  route: {
    params: {
      contractorId: string;
      jobId?: string;
      contractor?: User;
      job?: Job;
    };
  };
  navigation: { goBack: () => void };
}

export const MeetingScheduleScreen: React.FC<Props> = ({ route, navigation }) => {
  const { contractorId, jobId, contractor, job } = route.params;

  const viewModel = useMeetingScheduleViewModel(contractorId, jobId ?? '', contractor, job);

  if (viewModel.loading) {
    return <LoadingSpinner message="Scheduling meeting..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Schedule Meeting"
        onBackPress={() => navigation.goBack()}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <MeetingHeader contractor={contractor} job={job} />

        <DateTimeSelector
          selectedDate={viewModel.selectedDate}
          selectedTime={viewModel.selectedTime}
          showDatePicker={viewModel.showDatePicker}
          showTimePicker={viewModel.showTimePicker}
          onDateChange={viewModel.setSelectedDate}
          onTimeChange={viewModel.setSelectedTime}
          onShowDatePicker={viewModel.setShowDatePicker}
          onShowTimePicker={viewModel.setShowTimePicker}
        />

        <MeetingTypeSelector
          meetingTypes={viewModel.meetingTypes}
          selectedType={viewModel.meetingType}
          duration={viewModel.duration}
          onTypeSelect={viewModel.setMeetingType}
          onDurationChange={viewModel.setDuration}
        />

        <LocationPicker
          location={viewModel.location}
          locationStatus={viewModel.locationStatus}
          onRetry={viewModel.initializeLocation}
        />

        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Additional Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={viewModel.notes}
            onChangeText={viewModel.setNotes}
            placeholder="Add any additional details about the meeting..."
            placeholderTextColor="#B0B0B0"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <ScheduleActions
        loading={viewModel.loading}
        onSchedule={viewModel.scheduleMeeting}
        onCancel={() => navigation.goBack()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  notesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B0B0B0',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  notesInput: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#222222',
    minHeight: 100,
  },
});

export default MeetingScheduleScreen;
