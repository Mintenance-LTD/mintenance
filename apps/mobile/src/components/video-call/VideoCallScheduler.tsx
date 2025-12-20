import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../theme';
import { VideoCallService } from '../../services/VideoCallService';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';
import { haptics } from '../../utils/haptics';

interface VideoCallSchedulerProps {
  jobId: string;
  otherUserId: string;
  otherUserName: string;
  isVisible: boolean;
  onClose: () => void;
  onScheduled: (callId: string, scheduledTime: Date) => void;
}

interface ScheduleOption {
  id: string;
  label: string;
  time: Date;
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
  const [selectedTime, setSelectedTime] = useState<Date>(new Date(Date.now() + 30 * 60 * 1000)); // 30 minutes from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [callType, setCallType] = useState<'consultation' | 'update' | 'review'>('consultation');

  // Generate quick schedule options
  const getQuickOptions = useCallback((): ScheduleOption[] => {
    const now = new Date();
    const options: ScheduleOption[] = [
      {
        id: 'in_15',
        label: 'In 15 minutes',
        time: new Date(now.getTime() + 15 * 60 * 1000),
      },
      {
        id: 'in_30',
        label: 'In 30 minutes',
        time: new Date(now.getTime() + 30 * 60 * 1000),
      },
      {
        id: 'in_1hr',
        label: 'In 1 hour',
        time: new Date(now.getTime() + 60 * 60 * 1000),
      },
      {
        id: 'tomorrow_9am',
        label: 'Tomorrow at 9 AM',
        time: (() => {
          const tomorrow = new Date(now);
          tomorrow.setDate(now.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);
          return tomorrow;
        })(),
      },
    ];

    return options.filter(option => option.time > now);
  }, []);

  const formatDateTime = useCallback((date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dateToCheck = new Date(date.getFullYear(), date.getMonth(), date.getDate());

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
      hour12: true
    });

    return `${dateStr} at ${timeStr}`;
  }, []);

  const handleQuickSelect = useCallback((option: ScheduleOption) => {
    haptics.impact('light');
    setSelectedTime(option.time);
  }, []);

  const handleScheduleCall = useCallback(async () => {
    if (!user) return;

    const now = new Date();
    if (selectedTime <= now) {
      Alert.alert('Invalid Time', 'Please select a future time for the call.');
      return;
    }

    setIsScheduling(true);

    try {
      await haptics.impact('medium');

      const participants = [
        {
          userId: user.id,
          displayName: user.first_name + ' ' + (user.last_name || ''),
          role: 'host' as const,
        },
        {
          userId: otherUserId,
          displayName: otherUserName,
          role: 'participant' as const,
        },
      ];

      const scheduledCall = await VideoCallService.scheduleCall(
        jobId,
        user.id,
        participants,
        selectedTime,
        callType,
        {
          title: `${callType.charAt(0).toUpperCase() + callType.slice(1)} call`,
          description: `Scheduled video call between ${user.first_name} and ${otherUserName}`,
          estimatedDuration: 30 * 60, // 30 minutes
        }
      );

      if (scheduledCall.success && scheduledCall.data) {
        logger.info('Video call scheduled successfully', {
          callId: scheduledCall.data.id,
          scheduledTime: selectedTime,
          callType,
        });

        onScheduled(scheduledCall.data.id, selectedTime);
        onClose();

        Alert.alert(
          'Call Scheduled',
          `Your ${callType} call with ${otherUserName} has been scheduled for ${formatDateTime(selectedTime)}.`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(scheduledCall.error || 'Failed to schedule call');
      }
    } catch (error) {
      logger.error('Failed to schedule video call:', error);
      Alert.alert(
        'Scheduling Failed',
        'Unable to schedule the video call. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
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

  const onDateChange = useCallback((event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    setShowTimePicker(Platform.OS === 'ios');

    if (date) {
      setSelectedTime(date);
    }
  }, []);

  const callTypeOptions = [
    { value: 'consultation', label: 'Consultation', icon: 'chatbubbles' },
    { value: 'update', label: 'Project Update', icon: 'refresh' },
    { value: 'review', label: 'Review & Feedback', icon: 'star' },
  ] as const;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule Video Call</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Participant Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participants</Text>
            <View style={styles.participantCard}>
              <View style={styles.participantRow}>
                <View style={styles.participantAvatar}>
                  <Ionicons name="person" size={20} color={theme.colors.primary} />
                </View>
                <Text style={styles.participantName}>You</Text>
                <View style={styles.hostBadge}>
                  <Text style={styles.hostBadgeText}>Host</Text>
                </View>
              </View>
              <View style={styles.participantRow}>
                <View style={styles.participantAvatar}>
                  <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
                </View>
                <Text style={styles.participantName}>{otherUserName}</Text>
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
                    haptics.impact('light');
                    setCallType(option.value);
                  }}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={20}
                    color={
                      callType === option.value
                        ? theme.colors.surface
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
                onPress={() => {
                  haptics.impact('light');
                  setShowDatePicker(true);
                }}
              >
                <Ionicons name="calendar" size={20} color={theme.colors.primary} />
                <Text style={styles.dateTimeButtonText}>
                  {formatDateTime(selectedTime)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Selected Time Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="time" size={20} color={theme.colors.primary} />
                <Text style={styles.summaryTitle}>Scheduled for</Text>
              </View>
              <Text style={styles.summaryDateTime}>{formatDateTime(selectedTime)}</Text>
              <Text style={styles.summaryType}>
                {callTypeOptions.find(opt => opt.value === callType)?.label}
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
        {showDatePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'compact' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>
    </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  participantCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  hostBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hostBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.surface,
  },
  callTypeContainer: {
    gap: 8,
  },
  callTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  callTypeOptionSelected: {
    backgroundColor: theme.colors.primary,
  },
  callTypeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  callTypeLabelSelected: {
    color: theme.colors.surface,
  },
  quickOptionsContainer: {
    gap: 8,
  },
  quickOption: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  quickOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  quickOptionLabelSelected: {
    color: theme.colors.primary,
  },
  quickOptionTime: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  quickOptionTimeSelected: {
    color: theme.colors.primary,
  },
  customTimeContainer: {
    gap: 8,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  dateTimeButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  summaryContainer: {
    marginTop: 24,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  summaryDateTime: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  summaryType: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  scheduleButton: {
    backgroundColor: theme.colors.primary,
  },
  scheduleButtonDisabled: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  scheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.surface,
  },
});

export default VideoCallScheduler;