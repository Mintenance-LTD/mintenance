import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MeetingCommunicationPanel from '../../components/MeetingCommunicationPanel';

// Mock react-native modules
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

// Mock haptics
jest.mock('../../utils/haptics', () => ({
  useHaptics: () => ({
    buttonPress: jest.fn(),
    notification: jest.fn(),
  }),
}));

// Mock i18n
jest.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    meetings: {
      startCall: () => 'Start Call',
      endCall: () => 'End Call',
      mute: () => 'Mute',
      unmute: () => 'Unmute',
      video: () => 'Video',
      noVideo: () => 'No Video',
      shareScreen: () => 'Share Screen',
      stopSharing: () => 'Stop Sharing',
      chat: () => 'Chat',
      participants: () => 'Participants',
    },
  }),
}));

// Mock meeting service
const mockMeetingService = {
  startCall: jest.fn(),
  endCall: jest.fn(),
  toggleMute: jest.fn(),
  toggleVideo: jest.fn(),
  shareScreen: jest.fn(),
  stopScreenShare: jest.fn(),
  sendChatMessage: jest.fn(),
  getParticipants: jest.fn(),
};

jest.mock('../../services/MeetingService', () => ({
  MeetingService: mockMeetingService,
}));

describe('MeetingCommunicationPanel', () => {
  const defaultProps = {
    meetingId: 'meeting_123',
    userId: 'user_456',
    onMeetingEnd: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMeetingService.getParticipants.mockResolvedValue([
      { id: 'user_456', name: 'Current User', isHost: true },
      { id: 'user_789', name: 'Other User', isHost: false },
    ]);
  });

  it('renders meeting controls correctly', () => {
    const { getByTestId, getByText } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    expect(getByTestId('meeting-panel')).toBeTruthy();
    expect(getByText('Start Call')).toBeTruthy();
    expect(getByTestId('mute-button')).toBeTruthy();
    expect(getByTestId('video-button')).toBeTruthy();
    expect(getByTestId('chat-button')).toBeTruthy();
  });

  it('starts a call when start call button is pressed', async () => {
    mockMeetingService.startCall.mockResolvedValue({ callId: 'call_123' });

    const { getByText, getByTestId } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    const startButton = getByText('Start Call');
    fireEvent.press(startButton);

    await waitFor(() => {
      expect(mockMeetingService.startCall).toHaveBeenCalledWith('meeting_123', 'user_456');
    });

    // Should show end call button after starting
    await waitFor(() => {
      expect(getByText('End Call')).toBeTruthy();
    });
  });

  it('ends a call and notifies parent component', async () => {
    mockMeetingService.startCall.mockResolvedValue({ callId: 'call_123' });
    mockMeetingService.endCall.mockResolvedValue(true);

    const onMeetingEnd = jest.fn();
    const { getByText } = render(
      <MeetingCommunicationPanel {...defaultProps} onMeetingEnd={onMeetingEnd} />
    );

    // Start call first
    fireEvent.press(getByText('Start Call'));
    await waitFor(() => expect(getByText('End Call')).toBeTruthy());

    // End call
    fireEvent.press(getByText('End Call'));

    await waitFor(() => {
      expect(mockMeetingService.endCall).toHaveBeenCalledWith('call_123');
      expect(onMeetingEnd).toHaveBeenCalledWith('meeting_123');
    });
  });

  it('toggles mute functionality', async () => {
    mockMeetingService.toggleMute.mockResolvedValue({ isMuted: true });

    const { getByTestId, getByText } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    const muteButton = getByTestId('mute-button');
    fireEvent.press(muteButton);

    await waitFor(() => {
      expect(mockMeetingService.toggleMute).toHaveBeenCalledWith('user_456');
    });

    // Should update button text
    await waitFor(() => {
      expect(getByText('Unmute')).toBeTruthy();
    });
  });

  it('toggles video functionality', async () => {
    mockMeetingService.toggleVideo.mockResolvedValue({ videoEnabled: false });

    const { getByTestId, getByText } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    const videoButton = getByTestId('video-button');
    fireEvent.press(videoButton);

    await waitFor(() => {
      expect(mockMeetingService.toggleVideo).toHaveBeenCalledWith('user_456');
    });

    // Should update button text
    await waitFor(() => {
      expect(getByText('No Video')).toBeTruthy();
    });
  });

  it('handles screen sharing', async () => {
    mockMeetingService.shareScreen.mockResolvedValue({ isSharing: true });

    const { getByTestId, getByText } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    const shareButton = getByTestId('screen-share-button');
    fireEvent.press(shareButton);

    await waitFor(() => {
      expect(mockMeetingService.shareScreen).toHaveBeenCalledWith('user_456');
    });

    // Should update to stop sharing
    await waitFor(() => {
      expect(getByText('Stop Sharing')).toBeTruthy();
    });

    // Test stopping screen share
    fireEvent.press(getByText('Stop Sharing'));

    await waitFor(() => {
      expect(mockMeetingService.stopScreenShare).toHaveBeenCalledWith('user_456');
    });
  });

  it('opens chat interface', async () => {
    const { getByTestId } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    const chatButton = getByTestId('chat-button');
    fireEvent.press(chatButton);

    await waitFor(() => {
      expect(getByTestId('chat-interface')).toBeTruthy();
    });
  });

  it('sends chat messages', async () => {
    mockMeetingService.sendChatMessage.mockResolvedValue(true);

    const { getByTestId, getByPlaceholderText } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    // Open chat
    fireEvent.press(getByTestId('chat-button'));

    await waitFor(() => {
      const messageInput = getByPlaceholderText('Type a message...');
      const sendButton = getByTestId('send-message-button');

      fireEvent.changeText(messageInput, 'Hello everyone!');
      fireEvent.press(sendButton);
    });

    await waitFor(() => {
      expect(mockMeetingService.sendChatMessage).toHaveBeenCalledWith(
        'meeting_123',
        'user_456',
        'Hello everyone!'
      );
    });
  });

  it('displays participants list', async () => {
    const { getByTestId, getByText } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    const participantsButton = getByTestId('participants-button');
    fireEvent.press(participantsButton);

    await waitFor(() => {
      expect(getByTestId('participants-list')).toBeTruthy();
      expect(getByText('Current User')).toBeTruthy();
      expect(getByText('Other User')).toBeTruthy();
    });
  });

  it('handles call errors gracefully', async () => {
    const callError = new Error('Call failed to start');
    mockMeetingService.startCall.mockRejectedValue(callError);

    const { getByText, queryByText } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    fireEvent.press(getByText('Start Call'));

    await waitFor(() => {
      // Should not show end call button on error
      expect(queryByText('End Call')).toBeNull();
      // Should still show start call button
      expect(getByText('Start Call')).toBeTruthy();
    });
  });

  it('disables controls during loading states', async () => {
    mockMeetingService.startCall.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ callId: 'call_123' }), 1000))
    );

    const { getByText, getByTestId } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    fireEvent.press(getByText('Start Call'));

    // Controls should be disabled during call setup
    const muteButton = getByTestId('mute-button');
    const videoButton = getByTestId('video-button');

    expect(muteButton.props.accessibilityState?.disabled).toBe(true);
    expect(videoButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('applies correct accessibility properties', () => {
    const { getByTestId } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    const muteButton = getByTestId('mute-button');
    const videoButton = getByTestId('video-button');
    const chatButton = getByTestId('chat-button');

    expect(muteButton.props.accessibilityLabel).toBe('Toggle microphone');
    expect(videoButton.props.accessibilityLabel).toBe('Toggle video');
    expect(chatButton.props.accessibilityLabel).toBe('Open chat');

    expect(muteButton.props.accessibilityRole).toBe('button');
    expect(videoButton.props.accessibilityRole).toBe('button');
    expect(chatButton.props.accessibilityRole).toBe('button');
  });

  it('handles empty participants list', async () => {
    mockMeetingService.getParticipants.mockResolvedValue([]);

    const { getByTestId, getByText } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    fireEvent.press(getByTestId('participants-button'));

    await waitFor(() => {
      expect(getByText('No participants')).toBeTruthy();
    });
  });

  it('handles missing meeting ID gracefully', () => {
    const { getByTestId } = render(
      <MeetingCommunicationPanel {...defaultProps} meetingId="" />
    );

    // Should still render but with disabled state
    const panel = getByTestId('meeting-panel');
    expect(panel.props.accessibilityState?.disabled).toBe(true);
  });

  it('cleans up resources on unmount', () => {
    const { unmount } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    // Component should unmount without errors
    expect(() => unmount()).not.toThrow();
  });

  it('handles rapid control interactions', async () => {
    mockMeetingService.toggleMute.mockResolvedValue({ isMuted: true });

    const { getByTestId } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    const muteButton = getByTestId('mute-button');

    // Rapid successive presses
    fireEvent.press(muteButton);
    fireEvent.press(muteButton);
    fireEvent.press(muteButton);

    await waitFor(() => {
      // Should handle debouncing or loading states to prevent excessive calls
      expect(mockMeetingService.toggleMute).toHaveBeenCalledTimes(1);
    });
  });
});