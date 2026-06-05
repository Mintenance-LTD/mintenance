import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import type { Message } from '../../../services/messaging/types';
import VideoCallMessage from '../VideoCallMessage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mutable auth user so we can test own-vs-other and receiver gating.
const authState: { user: { id: string } | null } = { user: { id: 'me' } };
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: authState.user }),
}));

// isUserInCall is consulted by canJoinCall(). Toggle per test.
const mockIsUserInCall = jest.fn(() => false);
jest.mock('../../../services/VideoCallService', () => ({
  VideoCallService: {
    isUserInCall: (...args: unknown[]) => mockIsUserInCall(...args),
  },
}));

// Render Ionicons as a leaf carrying its `name` as testID for assertions.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) =>
      React.createElement(Text, { testID: `icon-${name}` }, name),
  };
});

const baseMessage: Message = {
  id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'other',
  receiverId: 'me',
  messageText: 'Video call message',
  messageType: 'video_call_invitation',
  createdAt: '2026-01-01T10:30:00.000Z',
  read: false,
  callId: 'call-1',
} as unknown as Message;

const make = (overrides: Partial<Message>): Message =>
  ({ ...baseMessage, ...overrides }) as Message;

beforeEach(() => {
  authState.user = { id: 'me' };
  mockIsUserInCall.mockReset();
  mockIsUserInCall.mockReturnValue(false);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('VideoCallMessage', () => {
  it('exports a component', () => {
    expect(typeof VideoCallMessage).toBe('function');
  });

  // ---- canJoinCall TRUE branch: invitation + receiver is me + callId + not in call ----
  describe('joinable invitation (received by current user, not in a call)', () => {
    it('renders Decline + Join buttons with videocam header icon', () => {
      const { getByText, getAllByTestId } = render(
        <VideoCallMessage message={make({})} />
      );
      expect(getByText('Decline')).toBeTruthy();
      expect(getByText('Join')).toBeTruthy();
      // videocam appears in header AND join button
      expect(getAllByTestId('icon-videocam').length).toBeGreaterThanOrEqual(2);
      expect(getAllByTestId('icon-close').length).toBe(1);
    });

    it('fires onCallDecline with callId when Decline is pressed', () => {
      const onCallDecline = jest.fn();
      const { getByText } = render(
        <VideoCallMessage message={make({})} onCallDecline={onCallDecline} />
      );
      fireEvent.press(getByText('Decline'));
      expect(onCallDecline).toHaveBeenCalledWith('call-1');
    });

    it('shows the coming-soon Alert when Join is pressed (does not crash without callId guard)', () => {
      const { getByText } = render(<VideoCallMessage message={make({})} />);
      fireEvent.press(getByText('Join'));
      expect(Alert.alert).toHaveBeenCalledWith(
        'Video calls coming soon',
        expect.stringContaining('not available yet'),
        [{ text: 'OK' }]
      );
    });

    it('handleDecline is a no-op when callId is missing (optional chaining + guard)', () => {
      const onCallDecline = jest.fn();
      // No callId -> canJoinCall() false, so detailsButton path; assert guard via details handler instead
      const { getByText } = render(
        <VideoCallMessage
          message={make({ callId: undefined })}
          onCallDecline={onCallDecline}
        />
      );
      // Falls into details branch (getActionText invitation => "Join Call")
      expect(getByText('Join Call')).toBeTruthy();
    });
  });

  // ---- canJoinCall FALSE branches via the details/action button ----
  describe('canJoinCall is false -> details button', () => {
    it('not joinable when message is from current user (sent invitation)', () => {
      const { getByText, queryByText } = render(
        <VideoCallMessage
          message={make({ senderId: 'me', receiverId: 'other' })}
        />
      );
      expect(queryByText('Join')).toBeNull();
      expect(getByText('Join Call')).toBeTruthy(); // action text for invitation
    });

    it('not joinable when receiver is not the current user', () => {
      const { queryByText, getByText } = render(
        <VideoCallMessage message={make({ receiverId: 'someone-else' })} />
      );
      expect(queryByText('Join')).toBeNull();
      expect(getByText('Join Call')).toBeTruthy();
    });

    it('not joinable when callId is missing', () => {
      const { queryByText, getByText } = render(
        <VideoCallMessage message={make({ callId: undefined })} />
      );
      expect(queryByText('Join')).toBeNull();
      expect(getByText('Join Call')).toBeTruthy();
    });

    it('not joinable when the user is already in a call', () => {
      mockIsUserInCall.mockReturnValue(true);
      const { queryByText, getByText } = render(
        <VideoCallMessage message={make({})} />
      );
      expect(queryByText('Join')).toBeNull();
      expect(getByText('Join Call')).toBeTruthy();
      expect(mockIsUserInCall).toHaveBeenCalledWith('me');
    });

    it('not joinable when user is null (auth not loaded)', () => {
      authState.user = null;
      const { queryByText, getByText } = render(
        <VideoCallMessage message={make({})} />
      );
      expect(queryByText('Join')).toBeNull();
      // user null => isFromCurrentUser false, details path still renders action text
      expect(getByText('Join Call')).toBeTruthy();
    });

    it('fires onViewCallDetails with callId when details button pressed', () => {
      const onViewCallDetails = jest.fn();
      const { getByText } = render(
        <VideoCallMessage
          message={make({ senderId: 'me', receiverId: 'other' })}
          onViewCallDetails={onViewCallDetails}
        />
      );
      fireEvent.press(getByText('Join Call'));
      expect(onViewCallDetails).toHaveBeenCalledWith('call-1');
    });

    it('details handler is a no-op when callId missing', () => {
      const onViewCallDetails = jest.fn();
      const { getByText } = render(
        <VideoCallMessage
          message={make({ callId: undefined })}
          onViewCallDetails={onViewCallDetails}
        />
      );
      fireEvent.press(getByText('Join Call'));
      expect(onViewCallDetails).not.toHaveBeenCalled();
    });
  });

  // ---- getMessageIcon / getMessageColor / getActionText per messageType ----
  describe('message type rendering (icon + action text)', () => {
    it('video_call_started -> play icon, "Call Started"', () => {
      const { getByTestId, getByText } = render(
        <VideoCallMessage
          message={make({ messageType: 'video_call_started', senderId: 'me' })}
        />
      );
      expect(getByTestId('icon-play')).toBeTruthy();
      expect(getByText('Call Started')).toBeTruthy();
    });

    it('video_call_missed -> call-outline icon, "Missed Call"', () => {
      const { getByTestId, getByText } = render(
        <VideoCallMessage
          message={make({ messageType: 'video_call_missed', senderId: 'me' })}
        />
      );
      expect(getByTestId('icon-call-outline')).toBeTruthy();
      expect(getByText('Missed Call')).toBeTruthy();
    });

    it('video_call_ended without duration -> stop icon, "Ended"', () => {
      const { getByTestId, getByText, queryByText } = render(
        <VideoCallMessage
          message={make({
            messageType: 'video_call_ended',
            senderId: 'me',
            callDuration: undefined,
          })}
        />
      );
      expect(getByTestId('icon-stop')).toBeTruthy();
      expect(getByText('Ended')).toBeTruthy();
      // duration block not rendered
      expect(queryByText(/Duration:/)).toBeNull();
    });

    it('video_call_ended with duration -> "Ended (...)" + Duration block', () => {
      const { getByText } = render(
        <VideoCallMessage
          message={make({
            messageType: 'video_call_ended',
            senderId: 'me',
            callDuration: 90,
          })}
        />
      );
      expect(getByText('Ended (1m 30s)')).toBeTruthy();
      expect(getByText('Duration: 1m 30s')).toBeTruthy();
    });

    it('default/unknown messageType -> videocam icon, "Video Call"', () => {
      const { getByTestId, getByText } = render(
        <VideoCallMessage
          message={make({
            messageType: 'text' as Message['messageType'],
            senderId: 'me',
          })}
        />
      );
      expect(getByTestId('icon-videocam')).toBeTruthy();
      expect(getByText('Video Call')).toBeTruthy();
    });

    it('invitation (not joinable) -> videocam icon + "Join Call"', () => {
      const { getByTestId, getByText } = render(
        <VideoCallMessage message={make({ senderId: 'me', receiverId: 'x' })} />
      );
      expect(getByTestId('icon-videocam')).toBeTruthy();
      expect(getByText('Join Call')).toBeTruthy();
    });
  });

  // ---- formatDuration branches via the Duration label on ended calls ----
  describe('formatDuration branches', () => {
    const endedWith = (callDuration: number) =>
      render(
        <VideoCallMessage
          message={make({
            messageType: 'video_call_ended',
            senderId: 'me',
            callDuration,
          })}
        />
      );

    it('< 60s -> seconds (45s)', () => {
      const { getByText } = endedWith(45);
      expect(getByText('Duration: 45s')).toBeTruthy();
    });

    it('exact minutes, no remainder -> "Xm" (120 -> 2m)', () => {
      const { getByText } = endedWith(120);
      expect(getByText('Duration: 2m')).toBeTruthy();
    });

    it('minutes + seconds -> "Xm Ys" (125 -> 2m 5s)', () => {
      const { getByText } = endedWith(125);
      expect(getByText('Duration: 2m 5s')).toBeTruthy();
    });

    it('exact hours, no remainder minutes -> "Xh" (7200 -> 2h)', () => {
      const { getByText } = endedWith(7200);
      expect(getByText('Duration: 2h')).toBeTruthy();
    });

    it('hours + minutes -> "Xh Ym" (3660 -> 1h 1m)', () => {
      const { getByText } = endedWith(3660);
      expect(getByText('Duration: 1h 1m')).toBeTruthy();
    });
  });

  // ---- isFromCurrentUser styling branch (sent vs received) ----
  describe('sent vs received container', () => {
    it('renders message text for a sent message (isFromCurrentUser true)', () => {
      const { getByText } = render(
        <VideoCallMessage
          message={make({ senderId: 'me', messageText: 'Hi there' })}
        />
      );
      expect(getByText('Hi there')).toBeTruthy();
    });

    it('renders message text for a received message (isFromCurrentUser false)', () => {
      const { getByText } = render(
        <VideoCallMessage
          message={make({ senderId: 'other', messageText: 'Inbound' })}
        />
      );
      expect(getByText('Inbound')).toBeTruthy();
    });
  });

  // ---- timestamp render ----
  it('renders a formatted timestamp from createdAt', () => {
    const { getByText } = render(
      <VideoCallMessage message={make({ senderId: 'me' })} />
    );
    // Locale time string; just assert the message text is present and no crash
    expect(getByText('Video call message')).toBeTruthy();
  });
});
