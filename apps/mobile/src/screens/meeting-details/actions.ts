import { Alert, Linking } from 'react-native';
import type { ContractorMeeting } from '@mintenance/types';
import { goToMessagingThread } from '../../navigation/hooks';
import { MeetingService } from '../../services/MeetingService';

/**
 * Side-effect handlers for the "Actions" row on the
 * MeetingDetailsScreen. Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44g).
 */

interface NavigationLike {
  goBack: () => void;
  navigate: (screen: string, params?: Record<string, unknown>) => void;
}

export function callContractor(meeting: ContractorMeeting | null): void {
  if (meeting?.contractor?.phone) {
    Linking.openURL(`tel:${meeting.contractor.phone}`);
  } else {
    Alert.alert(
      'No Phone Number',
      'Phone number not available for this contractor'
    );
  }
}

export function messageContractor(
  meeting: ContractorMeeting | null,
  navigation: NavigationLike
): void {
  if (meeting?.job_id) {
    // 2026-04-30 audit P1: replaces nested `as never` casts.
    goToMessagingThread(navigation, {
      conversationId: meeting.job_id,
      recipientId: meeting.contractor_id,
    });
  }
}

export function rescheduleMeeting(
  meeting: ContractorMeeting | null,
  meetingId: string,
  navigation: NavigationLike
): void {
  Alert.alert(
    'Reschedule Meeting',
    'Would you like to reschedule this meeting?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reschedule',
        onPress: () =>
          navigation.navigate('MeetingSchedule', {
            contractorId: meeting?.contractor_id,
            jobId: meeting?.job_id,
            rescheduleMeetingId: meetingId,
          }),
      },
    ]
  );
}

export function cancelMeeting(args: {
  meetingId: string;
  userId: string;
  onCancelled: () => void;
}): void {
  const { meetingId, userId, onCancelled } = args;
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
              userId,
              'Cancelled by homeowner'
            );
            Alert.alert('Meeting Cancelled', 'The meeting has been cancelled.');
            onCancelled();
          } catch {
            Alert.alert('Error', 'Failed to cancel meeting');
          }
        },
      },
    ]
  );
}
