import React from 'react';
import { render, fireEvent, waitFor, act } from '../test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MessagingScreen from '../../screens/MessagingScreen';
import { useAuth } from '../../contexts/AuthContext';
import {
  useJobMessages,
  useSendMessage,
  useMarkMessagesAsRead,
  useRealTimeMessages,
} from '../../hooks/useMessaging';
import type { Message } from '../../services/MessagingService';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// The shared react-native mock stubs FlatList as a host string, so it never
// invokes renderItem and message rows never render. Override FlatList here to
// actually render its data via renderItem (and ListEmptyComponent when empty)
// so we can assert on message content.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const React = require('react');
  const FlatList = ({
    data = [],
    renderItem,
    keyExtractor,
    ListEmptyComponent,
    testID,
  }: any) => {
    if ((!data || data.length === 0) && ListEmptyComponent) {
      return React.createElement(
        actual.View,
        { testID },
        React.isValidElement(ListEmptyComponent)
          ? ListEmptyComponent
          : React.createElement(ListEmptyComponent)
      );
    }
    return React.createElement(
      actual.View,
      { testID },
      (data || []).map((item: any, index: number) =>
        React.createElement(
          React.Fragment,
          { key: keyExtractor ? keyExtractor(item, index) : index },
          renderItem ? renderItem({ item, index }) : null
        )
      )
    );
  };
  return { ...actual, FlatList };
});

// Mock dependencies
jest.mock('../../contexts/AuthContext');

// The screen consumes React Query hooks from useMessaging, not the
// MessagingService class directly. Mock the hook layer so we can drive
// loading / error / data and observe the send + mark-as-read mutations.
jest.mock('../../hooks/useMessaging');

// VideoCallScheduler pulls in VideoCallService → CallManager. The screen only
// uses useVideoCall for callbacks + scheduler visibility; stub it.
jest.mock('../../screens/messaging/hooks/useVideoCall', () => ({
  useVideoCall: () => ({
    isVideoCallActive: false,
    activeCallId: null,
    showScheduler: false,
    setShowScheduler: jest.fn(),
    startVideoCall: jest.fn(),
    handleCallAccept: jest.fn(),
    handleCallDecline: jest.fn(),
    handleCallEnd: jest.fn(),
    handleCallError: jest.fn(),
    handleCallScheduled: jest.fn(),
  }),
}));

// VideoCallScheduler renders nothing meaningful for these tests; keep it inert
// so we don't depend on the video-call backend.
jest.mock('../../components/video-call/VideoCallScheduler', () => () => null);

// The screen uses supabase realtime channels for the typing indicator
// (channel.on().subscribe() / channel.send() / supabase.removeChannel). The
// shared chainable mock doesn't model the full channel chain, so provide a
// complete one here.
jest.mock('../../config/supabase', () => {
  const channel = {
    on: jest.fn(() => channel),
    subscribe: jest.fn(() => channel),
    send: jest.fn(() => Promise.resolve()),
    unsubscribe: jest.fn(),
  };
  const supabase = {
    channel: jest.fn(() => channel),
    removeChannel: jest.fn(),
    from: jest.fn(),
  };
  return { supabase, default: supabase };
});

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  getParent: jest.fn(() => ({ navigate: jest.fn() })),
};

// New route param contract (post Mint Editorial redesign):
// conversationId / recipientId / recipientName / jobTitle.
const mockRoute = {
  params: {
    conversationId: 'job123',
    jobTitle: 'Fix the boiler',
    recipientId: 'user456',
    recipientName: 'Jane Smith',
  },
};

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseJobMessages = useJobMessages as jest.MockedFunction<
  typeof useJobMessages
>;
const mockUseSendMessage = useSendMessage as jest.MockedFunction<
  typeof useSendMessage
>;
const mockUseMarkMessagesAsRead = useMarkMessagesAsRead as jest.MockedFunction<
  typeof useMarkMessagesAsRead
>;
const mockUseRealTimeMessages = useRealTimeMessages as jest.MockedFunction<
  typeof useRealTimeMessages
>;

const mockMessages: Message[] = [
  {
    id: 'msg1',
    jobId: 'job123',
    senderId: 'user123',
    receiverId: 'user456',
    messageText: 'Hello, I have a question about the job',
    messageType: 'text',
    read: true,
    createdAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: 'msg2',
    jobId: 'job123',
    senderId: 'user456',
    receiverId: 'user123',
    messageText: 'Sure, what would you like to know?',
    messageType: 'text',
    read: false,
    createdAt: '2024-01-15T10:05:00.000Z',
  },
  {
    id: 'msg3',
    jobId: 'job123',
    senderId: 'user123',
    receiverId: 'user456',
    messageText: 'When can you start the work?',
    messageType: 'text',
    read: false,
    createdAt: '2024-01-15T10:10:00.000Z',
  },
];

let mockMutateAsync: jest.Mock;
let mockMarkMutate: jest.Mock;

// The screen calls useQueryClient() directly (for optimistic cache writes),
// so it must render inside a real QueryClientProvider. Data still comes from
// the mocked useJobMessages hook.
function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MessagingScreen
        route={mockRoute as any}
        navigation={mockNavigation as any}
      />
    </QueryClientProvider>
  );
}

function setMessagesQuery(
  overrides: Partial<ReturnType<typeof useJobMessages>> = {}
) {
  mockUseJobMessages.mockReturnValue({
    data: mockMessages,
    isLoading: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useJobMessages>);
}

describe('MessagingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: {
        id: 'user123',
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'homeowner',
        phone: '555-1234',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      signOut: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn(),
      loading: false,
      session: null,
    } as unknown as ReturnType<typeof useAuth>);

    mockMutateAsync = jest.fn().mockResolvedValue({
      id: 'new-msg',
      jobId: 'job123',
      senderId: 'user123',
      receiverId: 'user456',
      messageText: 'New message',
      messageType: 'text',
      read: false,
      createdAt: new Date().toISOString(),
    });
    mockMarkMutate = jest.fn();

    mockUseSendMessage.mockReturnValue({
      mutateAsync: mockMutateAsync,
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSendMessage>);

    mockUseMarkMessagesAsRead.mockReturnValue({
      mutate: mockMarkMutate,
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useMarkMessagesAsRead>);

    // No-op realtime subscription hook.
    mockUseRealTimeMessages.mockImplementation(() => undefined);

    setMessagesQuery();
  });

  it('should render messaging screen with conversation', async () => {
    const { getByText } = renderScreen();

    // Header shows the recipient name.
    expect(getByText('Jane Smith')).toBeTruthy();

    await waitFor(() => {
      expect(getByText('Hello, I have a question about the job')).toBeTruthy();
      expect(getByText('Sure, what would you like to know?')).toBeTruthy();
      expect(getByText('When can you start the work?')).toBeTruthy();
    });
  });

  it('should load messages for the conversation on mount', async () => {
    renderScreen();

    await waitFor(() => {
      expect(mockUseJobMessages).toHaveBeenCalledWith('job123');
    });
  });

  it('should send message when send button is pressed', async () => {
    const { getByPlaceholderText, getByLabelText } = renderScreen();

    const messageInput = getByPlaceholderText('Type a message...');
    const sendButton = getByLabelText('Send message');

    await act(async () => {
      fireEvent.changeText(messageInput, 'Test message');
    });
    await act(async () => {
      fireEvent.press(sendButton);
    });

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        jobId: 'job123',
        receiverId: 'user456',
        messageText: 'Test message',
        senderId: 'user123',
        messageType: 'text',
      });
    });
  });

  it('should clear input after sending message', async () => {
    const { getByPlaceholderText, getByLabelText } = renderScreen();

    const messageInput = getByPlaceholderText('Type a message...');
    const sendButton = getByLabelText('Send message');

    await act(async () => {
      fireEvent.changeText(messageInput, 'Test message');
    });
    await act(async () => {
      fireEvent.press(sendButton);
    });

    await waitFor(() => {
      expect(messageInput.props.value).toBe('');
    });
  });

  it('should not send empty messages', async () => {
    const { getByLabelText } = renderScreen();

    const sendButton = getByLabelText('Send message');
    await act(async () => {
      fireEvent.press(sendButton);
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('should handle send message error', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Failed to send'));

    const { getByPlaceholderText, getByLabelText, getByText } = renderScreen();

    const messageInput = getByPlaceholderText('Type a message...');
    const sendButton = getByLabelText('Send message');

    await act(async () => {
      fireEvent.changeText(messageInput, 'Test message');
    });
    await act(async () => {
      fireEvent.press(sendButton);
    });

    await waitFor(() => {
      expect(
        getByText('Failed to send message. Please try again.')
      ).toBeTruthy();
    });
  });

  it('should mark messages as read when there are unread messages', async () => {
    renderScreen();

    await waitFor(() => {
      expect(mockMarkMutate).toHaveBeenCalledWith({
        jobId: 'job123',
        userId: 'user123',
      });
    });
  });

  it('should subscribe to real-time messages', () => {
    renderScreen();

    expect(mockUseRealTimeMessages).toHaveBeenCalledWith(
      'job123',
      expect.any(Function),
      expect.any(Function),
      true
    );
  });

  it('should show loading state initially', () => {
    setMessagesQuery({ data: undefined, isLoading: true });

    const { getByText } = renderScreen();

    expect(getByText('Loading messages...')).toBeTruthy();
  });

  it('should handle messages loading error', async () => {
    setMessagesQuery({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load messages'),
    });

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Failed to load messages')).toBeTruthy();
    });
  });

  it('should differentiate sent and received messages by their text', async () => {
    const { getByText } = renderScreen();

    await waitFor(() => {
      // sent by current user (user123)
      expect(getByText('When can you start the work?')).toBeTruthy();
      // received from other user (user456)
      expect(getByText('Sure, what would you like to know?')).toBeTruthy();
    });
  });

  it('should show message timestamps', async () => {
    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText(/10:00/)).toBeTruthy();
      expect(getByText(/10:05/)).toBeTruthy();
    });
  });

  it('should navigate back when back button is pressed', async () => {
    const { getByLabelText } = renderScreen();

    const backButton = getByLabelText('Go back');
    await act(async () => {
      fireEvent.press(backButton);
    });

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('should handle long messages correctly', async () => {
    const longMessage =
      'This is a very long message that should wrap correctly and be displayed properly in the message bubble without breaking the layout or causing any visual issues.';

    setMessagesQuery({
      data: [
        {
          id: 'long-msg',
          jobId: 'job123',
          senderId: 'user456',
          receiverId: 'user123',
          messageText: longMessage,
          messageType: 'text',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText(longMessage)).toBeTruthy();
    });
  });

  it('should not show typing indicator initially', () => {
    const { queryByText } = renderScreen();

    // The typing indicator (TypingIndicator) renders the other user's name
    // with "is typing". Not present until a realtime broadcast arrives.
    expect(queryByText(/is typing/i)).toBeNull();
  });

  it('should retry sending after a failed send', async () => {
    mockMutateAsync
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        id: 'retry-msg',
        jobId: 'job123',
        senderId: 'user123',
        receiverId: 'user456',
        messageText: 'Retry message',
        messageType: 'text',
        read: false,
        createdAt: new Date().toISOString(),
      });

    const { getByPlaceholderText, getByLabelText, getByText } = renderScreen();

    const messageInput = getByPlaceholderText('Type a message...');
    const sendButton = getByLabelText('Send message');

    await act(async () => {
      fireEvent.changeText(messageInput, 'Retry message');
    });
    await act(async () => {
      fireEvent.press(sendButton);
    });

    // After the failure, the composer surfaces an error banner and restores
    // the text so the user can resend.
    await waitFor(() => {
      expect(
        getByText('Failed to send message. Please try again.')
      ).toBeTruthy();
    });
    expect(messageInput.props.value).toBe('Retry message');

    // Resend.
    await act(async () => {
      fireEvent.press(sendButton);
    });

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(2);
    });
  });
});
