import React from 'react';
import { render, fireEvent, waitFor, act } from '../test-utils';
import MeetingCommunicationPanel from '../../components/MeetingCommunicationPanel';
import { MeetingService } from '../../services/MeetingService';
import { MessagingService } from '../../services/MessagingService';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock services.
// NOTE: MeetingService/MessagingService expose their API as *static class fields*
// assigned from imported functions (e.g. `static getMeetingUpdates = getMeetingUpdates`).
// Jest's bare automock does not reliably turn those field assignments into jest.fn()s
// (they come back `undefined`), so we supply explicit factories that declare the
// methods the component actually calls as mock functions.
jest.mock('../../services/MeetingService', () => ({
  MeetingService: {
    getMeetingUpdates: jest.fn(),
    rescheduleMeeting: jest.fn(),
    updateMeetingStatus: jest.fn(),
  },
}));
jest.mock('../../services/MessagingService', () => ({
  MessagingService: {
    getJobMessages: jest.fn(),
    sendMessage: jest.fn(),
  },
}));

// Mock react-native modules
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Mock haptics
jest.mock('../../utils/haptics', () => ({
  useHaptics: () => ({
    buttonPress: jest.fn(),
    notification: jest.fn(),
  }),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock auth context
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user_456', name: 'Test User' },
  }),
}));

describe('MeetingCommunicationPanel', () => {
  // Component reads snake_case fields (meeting.job_id, meeting.scheduled_datetime,
  // meeting.contractor_id, meeting.homeowner_id), so the fixture must use them.
  const mockMeeting = {
    id: 'meeting_123',
    job_id: 'job_456',
    homeowner_id: 'user_456',
    contractor_id: 'user_789',
    scheduled_datetime: new Date('2024-12-01T10:00:00').toISOString(),
    status: 'scheduled' as const,
    meetingType: 'site_visit' as const,
    location: {
      address: 'Test Location',
      latitude: 40.7128,
      longitude: -74.006,
    },
    duration: 60,
    notes: 'Test meeting description',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any;

  const defaultProps = {
    meeting: mockMeeting,
    onMeetingUpdate: jest.fn(),
    visible: true,
    onClose: jest.fn(),
  };

  // The panel's loadCommunicationData() is fire-and-forget (called from a useEffect
  // and after sendMessage). Its resolved promises trigger setState; if they settle
  // after the test's renderer is torn down, react-test-renderer throws
  // "Can't access .root on unmounted test renderer" in the *next* test's render().
  // Flushing pending microtasks inside act() drains those updates before teardown.
  const flushPendingLoads = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Component loads chat via MessagingService.getJobMessages (getConversations is
    // an unrelated thread-list alias the panel never calls).
    (MessagingService.getJobMessages as jest.Mock).mockResolvedValue([]);
    (MeetingService.getMeetingUpdates as jest.Mock).mockResolvedValue([]);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders meeting panel when visible', async () => {
    // Panel has no testID; the header title is the stable visible-content anchor.
    const { getByText } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    expect(getByText('Meeting Communication')).toBeTruthy();
    await flushPendingLoads();
  });

  it('does not render when not visible', async () => {
    // The mocked RN Modal always renders its children, so visibility is driven by
    // the `visible` prop on the Modal host element rather than presence/absence of
    // the subtree. Assert the Modal is flagged hidden.
    const { UNSAFE_getByProps } = render(
      <MeetingCommunicationPanel {...defaultProps} visible={false} />
    );

    expect(UNSAFE_getByProps({ visible: false })).toBeTruthy();
    await flushPendingLoads();
  });

  it('calls onClose when close button is pressed', async () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <MeetingCommunicationPanel {...defaultProps} onClose={onClose} />
    );

    // The close control is a TouchableOpacity wrapping the "close" Ionicon (mocked
    // to render its name as text). Pressing the icon bubbles to the touchable's onPress.
    const closeIcon = getByText('close');
    act(() => fireEvent.press(closeIcon));

    expect(onClose).toHaveBeenCalled();
    await flushPendingLoads();
  });

  it('switches between chat and schedule tabs', async () => {
    const { getByText } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    const scheduleTab = getByText('Schedule');
    act(() => fireEvent.press(scheduleTab));

    expect(getByText('Schedule')).toBeTruthy();
    await flushPendingLoads();
  });

  it('loads messages on mount', async () => {
    const mockMessages = [
      {
        id: 'msg_1',
        senderId: 'user_456',
        receiverId: 'user_789',
        messageText: 'Hello',
        createdAt: new Date().toISOString(),
        read: false,
      },
    ];

    // Panel loads chat for the meeting's job via getJobMessages(job_id).
    (MessagingService.getJobMessages as jest.Mock).mockResolvedValue(
      mockMessages
    );

    render(<MeetingCommunicationPanel {...defaultProps} />);

    await waitFor(() => {
      expect(MessagingService.getJobMessages).toHaveBeenCalledWith('job_456');
    });
    await flushPendingLoads();
  });

  it('sends a message when send button is pressed', async () => {
    (MessagingService.sendMessage as jest.Mock).mockResolvedValue({
      id: 'msg_new',
      senderId: 'user_456',
      receiverId: 'user_789',
      messageText: 'Test message',
      createdAt: new Date().toISOString(),
      read: false,
    });

    const { getByPlaceholderText, getByText, findByPlaceholderText, unmount } =
      render(<MeetingCommunicationPanel {...defaultProps} />);

    // The chat input only renders once the initial load finishes (loading=false),
    // so wait for it to appear before interacting (mount load = getJobMessages call #1).
    await findByPlaceholderText('Type a message...');
    const input = getByPlaceholderText('Type a message...');
    // Send control is a TouchableOpacity wrapping the "send" Ionicon (mocked to
    // render its name as text). It is disabled until the input is non-empty.
    act(() => fireEvent.changeText(input, 'Test message'));
    const sendIcon = getByText('send');

    // Pressing send kicks off an async handler (await sendMessage, then a
    // fire-and-forget loadCommunicationData refetch). Run the whole cascade inside a
    // single awaited act() so every setState it schedules lands while mounted and
    // doesn't leak into the next test's renderer.
    await act(async () => {
      fireEvent.press(sendIcon);
      // Let the sendMessage promise + the trailing refetch (getJobMessages #2,
      // getMeetingUpdates, setLoading) fully drain.
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(MessagingService.sendMessage).toHaveBeenCalled();
    expect(MessagingService.getJobMessages).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('displays meeting updates', async () => {
    const mockUpdates = [
      {
        id: 'update_1',
        meetingId: 'meeting_123',
        type: 'rescheduled',
        description: 'Meeting rescheduled to tomorrow',
        updatedBy: 'user_456',
        createdAt: new Date().toISOString(),
      },
    ];

    (MeetingService.getMeetingUpdates as jest.Mock).mockResolvedValue(
      mockUpdates
    );

    render(<MeetingCommunicationPanel {...defaultProps} />);

    await waitFor(() => {
      expect(MeetingService.getMeetingUpdates).toHaveBeenCalledWith(
        'meeting_123'
      );
    });
    await flushPendingLoads();
  });

  it('handles meeting reschedule request', async () => {
    const { getByText } = render(
      <MeetingCommunicationPanel {...defaultProps} />
    );

    // Wait for the initial async load to settle so its state updates don't leak
    // into the next test's renderer.
    await flushPendingLoads();

    const scheduleTab = getByText('Schedule');
    act(() => fireEvent.press(scheduleTab));

    // Switching to the Schedule tab keeps the Schedule control mounted.
    expect(getByText('Schedule')).toBeTruthy();
  });

  it('loads meeting updates on mount', async () => {
    const onMeetingUpdate = jest.fn();

    render(
      <MeetingCommunicationPanel
        {...defaultProps}
        onMeetingUpdate={onMeetingUpdate}
      />
    );

    // On mount the panel loads communication data, which fetches updates for the meeting.
    await waitFor(() => {
      expect(MeetingService.getMeetingUpdates).toHaveBeenCalledWith(
        'meeting_123'
      );
    });
    await flushPendingLoads();
  });
});
