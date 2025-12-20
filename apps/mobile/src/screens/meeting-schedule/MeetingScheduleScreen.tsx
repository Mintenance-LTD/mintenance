/**
 * MeetingScheduleScreen Container
 * 
 * Main container for meeting scheduling with date/time and location.
 * 
 * @filesize Target: <100 lines
 * @compliance MVVM - Thin container
 */

import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, TextInput, View, Text } from 'react-native';
import { theme } from '../../theme';
import { ScreenHeader, LoadingSpinner } from '../../components/shared';
import { useMeetingScheduleViewModel } from './viewmodels/MeetingScheduleViewModel';
import {
  MeetingHeader,
  DateTimeSelector,
  MeetingTypeSelector,
  LocationPicker,
  ScheduleActions,
} from './components';

interface Props {
  route: {
    params: {
      contractorId: string;
      jobId: string;
      contractor?: any;
      job?: any;
    };
  };
  navigation: any;
}

export const MeetingScheduleScreen: React.FC<Props> = ({ route, navigation }) => {
  const { contractorId, jobId, contractor, job } = route.params;
  
  const viewModel = useMeetingScheduleViewModel(contractorId, jobId, contractor, job);

  if (viewModel.loading) {
    return <LoadingSpinner message="Scheduling meeting..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Schedule Meeting"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

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
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  notesContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  notesLabel: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
    minHeight: 100,
  },
});

export default MeetingScheduleScreen;
