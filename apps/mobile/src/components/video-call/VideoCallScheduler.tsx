import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';
import haptics from '../../utils/haptics';
import { theme } from '../../theme';
import {
  getQuickOptions,
  type ScheduleOption,
} from './phoneCallScheduleOptions';
import { styles } from './VideoCallScheduler.styles';

// A request identifier, not a credential; stable across network retries.
const requestId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });

interface VideoCallSchedulerProps {
  jobId: string;
  otherUserId: string;
  otherUserName: string;
  isVisible: boolean;
  onClose: () => void;
  onScheduled: (callId: string, scheduledTime: Date) => void;
}

const VideoCallScheduler: React.FC<VideoCallSchedulerProps> = ({
  jobId,
  otherUserId,
  otherUserName,
  isVisible,
  onClose,
  onScheduled,
}) => {
  const { user } = useAuth();
  const pendingRequest = useRef<{ key: string; id: string } | null>(null);
  const busy = useRef(false);
  const [arrangedCalls, setArrangedCalls] = useState<
    { id: string; scheduled_at: string }[]
  >([]);
  const [callsError, setCallsError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (isVisible) {
      setCallsError(false);
      mobileApiClient
        .get<{ calls: { id: string; scheduled_at: string }[] }>(
          `/api/phone-calls?jobId=${encodeURIComponent(jobId)}`
        )
        .then((data) => {
          if (!cancelled) setArrangedCalls(data.calls);
        })
        .catch(() => {
          if (!cancelled) setCallsError(true);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [isVisible, jobId]);
  const cancelArrangedCall = async (id: string) => {
    try {
      await mobileApiClient.delete(
        `/api/phone-calls?id=${encodeURIComponent(id)}`
      );
      setArrangedCalls((calls) => calls.filter((call) => call.id !== id));
      Alert.alert(
        'Call cancelled',
        'The call reminder has been cancelled. Let the other person know in your conversation.'
      );
    } catch {
      Alert.alert('Could not cancel', 'Please try again.');
    }
  };
  const [selectedTime, setSelectedTime] = useState<Date>(
    new Date(Date.now() + 30 * 60 * 1000)
  ); // 30 minutes from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [callType, setCallType] = useState<
    'consultation' | 'update' | 'review'
  >('consultation');

  const formatDateTime = useCallback((date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dateToCheck = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    let dateStr = '';
    if (dateToCheck.getTime() === today.getTime()) {
      dateStr = 'Today';
    } else if (dateToCheck.getTime() === tomorrow.getTime()) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = date.toLocaleDateString();
    }

    const timeStr = date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `${dateStr} at ${timeStr}`;
  }, []);

  const handleQuickSelect = useCallback((option: ScheduleOption) => {
    haptics.light();
    setSelectedTime(option.time);
  }, []);

  const handleScheduleCall = useCallback(async () => {
    if (!user || busy.current) return;

    const now = new Date();
    if (selectedTime <= now) {
      Alert.alert('Invalid Time', 'Please select a future time for the call.');
      return;
    }

    busy.current = true;
    setIsScheduling(true);

    try {
      await haptics.medium();

      const key = JSON.stringify([
        user.id,
        jobId,
        otherUserId,
        selectedTime.toISOString(),
        callType,
      ]);
      if (pendingRequest.current?.key !== key)
        pendingRequest.current = { key, id: requestId() };
      const scheduledCall = await mobileApiClient.post<{ id: string }>(
        '/api/phone-calls',
        {
          requestId: pendingRequest.current.id,
          jobId,
          otherUserId,
          scheduledTime: selectedTime.toISOString(),
          purpose: callType,
        }
      );

      if (scheduledCall?.id) {
        logger.info('Phone call scheduled successfully', {
          callId: scheduledCall.id,
          scheduledTime: selectedTime,
          callType,
        });

        onScheduled(scheduledCall.id, selectedTime);
        onClose();

        Alert.alert(
          'Call Scheduled',
          `Your phone call with ${otherUserName || 'the other participant'} is arranged for ${formatDateTime(selectedTime)}. Both of you will receive reminders, subject to your notification settings. Agree the phone number in chat.`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Failed to schedule call');
      }
    } catch (error) {
      logger.error('Failed to schedule phone call:', error);
      Alert.alert(
        'Scheduling Failed',
        'Unable to schedule the call. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      busy.current = false;
      setIsScheduling(false);
    }
  }, [
    user,
    selectedTime,
    callType,
    jobId,
    otherUserId,
    otherUserName,
    onScheduled,
    onClose,
    formatDateTime,
  ]);

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      setShowTimePicker(event.type === 'set' && !showTimePicker);
    }
    if (event.type === 'set' && date) setSelectedTime(date);
  };

  const callTypeOptions = [
    { value: 'consultation', label: 'Consultation', icon: 'chatbubbles' },
    { value: 'update', label: 'Project Update', icon: 'refresh' },
    { value: 'review', label: 'Review & Feedback', icon: 'star' },
  ] as const;

  return (
    <Modal
      visible={isVisible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name='close' size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Arrange a phone call</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>A reminder to call by phone</Text>
            <Text>
              Agree the time and phone number in your conversation. Mintenance
              reminds both people around the scheduled time; it does not start a
              call. Reminders can take a few minutes and follow your
              notification settings.
            </Text>
          </View>
          {callsError && (
            <Text>
              Could not load your arranged calls. Close and reopen to retry.
            </Text>
          )}
          {arrangedCalls.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Arranged calls</Text>
              {arrangedCalls.map((call) => (
                <View key={call.id} style={styles.participantRow}>
                  <Text style={styles.participantName}>
                    {formatDateTime(new Date(call.scheduled_at))}
                  </Text>
                  <TouchableOpacity
                    accessibilityRole='button'
                    accessibilityLabel='Cancel arranged call'
                    onPress={() =>
                      Alert.alert(
                        'Cancel this call?',
                        'Both participants’ reminders will be stopped.',
                        [
                          { text: 'Keep call', style: 'cancel' },
                          {
                            text: 'Cancel call',
                            style: 'destructive',
                            onPress: () => cancelArrangedCall(call.id),
                          },
                        ]
                      )
                    }
                  >
                    <Text>Cancel call</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          {/* Participant Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participants</Text>
            <View style={styles.participantCard}>
              <View style={styles.participantRow}>
                <View style={styles.participantAvatar}>
                  <Ionicons
                    name='person'
                    size={20}
                    color={theme.colors.textPrimary}
                  />
                </View>
                <Text style={styles.participantName}>You</Text>
                <View style={styles.hostBadge}>
                  <Text style={styles.hostBadgeText}>Host</Text>
                </View>
              </View>
              <View style={styles.participantRow}>
                <View style={styles.participantAvatar}>
                  <Ionicons
                    name='person'
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </View>
                <Text style={styles.participantName}>
                  {otherUserName || 'Other participant'}
                </Text>
              </View>
            </View>
          </View>

          {/* Call Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Call Type</Text>
            <View style={styles.callTypeContainer}>
              {callTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.callTypeOption,
                    callType === option.value && styles.callTypeOptionSelected,
                  ]}
                  onPress={() => {
                    haptics.light();
                    setCallType(option.value);
                  }}
                >
                  <Ionicons
                    name={option.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={
                      callType === option.value
                        ? theme.colors.textInverse
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.callTypeLabel,
                      callType === option.value && styles.callTypeLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quick Schedule Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Schedule</Text>
            <View style={styles.quickOptionsContainer}>
              {getQuickOptions().map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.quickOption,
                    selectedTime.getTime() === option.time.getTime() &&
                      styles.quickOptionSelected,
                  ]}
                  onPress={() => handleQuickSelect(option)}
                >
                  <Text
                    style={[
                      styles.quickOptionLabel,
                      selectedTime.getTime() === option.time.getTime() &&
                        styles.quickOptionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.quickOptionTime,
                      selectedTime.getTime() === option.time.getTime() &&
                        styles.quickOptionTimeSelected,
                    ]}
                  >
                    {formatDateTime(option.time)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom Date/Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Time</Text>
            <View style={styles.customTimeContainer}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                accessibilityLabel='Choose call date and time'
                onPress={() => {
                  haptics.light();
                  setShowDatePicker(true);
                }}
              >
                <Ionicons
                  name='calendar'
                  size={20}
                  color={theme.colors.textPrimary}
                />
                <Text style={styles.dateTimeButtonText}>
                  {formatDateTime(selectedTime)}
                </Text>
                <Ionicons
                  name='chevron-forward'
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Selected Time Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons
                  name='time'
                  size={20}
                  color={theme.colors.textPrimary}
                />
                <Text style={styles.summaryTitle}>Scheduled for</Text>
              </View>
              <Text style={styles.summaryDateTime}>
                {formatDateTime(selectedTime)}
              </Text>
              <Text style={styles.summaryType}>
                {callTypeOptions.find((opt) => opt.value === callType)?.label}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.scheduleButton,
              isScheduling && styles.scheduleButtonDisabled,
            ]}
            onPress={handleScheduleCall}
            disabled={isScheduling}
          >
            <Text style={styles.scheduleButtonText}>
              {isScheduling ? 'Scheduling...' : 'Schedule Call'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date/Time Pickers */}
        {(showDatePicker || showTimePicker) && (
          <DateTimePicker
            testID='call-date-time-picker'
            value={selectedTime}
            mode={
              Platform.OS === 'ios'
                ? 'datetime'
                : showTimePicker
                  ? 'time'
                  : 'date'
            }
            display={Platform.OS === 'ios' ? 'compact' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>
    </Modal>
  );
};

export default VideoCallScheduler;
