import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MessagingScreen from '../../screens/MessagingScreen';
import { useAuth } from '../../contexts/AuthContext';
import { MessagingService } from '../../services/MessagingService';
import { useNetworkState } from '../../hooks/useNetworkState';

// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../services/MessagingService');
jest.mock('../../hooks/useNetworkState');
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock KeyboardAwareScrollView if it exists, otherwise use regular ScrollView
jest.doMock('react-native-keyboard-aware-scroll-view', () => ({
  KeyboardAwareScrollView: ({ children }: any) => {
    const React = require('react');
    const { ScrollView } = require('react-native');
    return React.createElement(ScrollView, { testID: 'keyboard-aware-scroll' }, children);
  },
}), { virtual: true });

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

const mockRoute = {
  params: {
    jobId: 'job123',
    otherUserId: 'user456',
    otherUserName: 'Jane Smith',
  },
};

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockMessagingService = MessagingService as jest.Mocked<typeof MessagingService>;
const mockUseNetworkState = useNetworkState as jest.MockedFunction<typeof useNetworkState>;

const mockMessages = [
  {
    id: 'msg1',
    jobId: 'job123',
    senderId: 'user123',
    receiverId: 'user456',
    content: 'Hello, I have a question about the job',
    timestamp: new Date('2024-01-15T10:00:00.000Z'),
    read: true,
  },
  {
    id: 'msg2',
    jobId: 'job123',
    senderId: 'user456',
    receiverId: 'user123',
    content: 'Sure, what would you like to know?',
    timestamp: new Date('2024-01-15T10:05:00.000Z'),
    read: false,
  },
  {
    id: 'msg3',
    jobId: 'job123',
    senderId: 'user123',
    receiverId: 'user456',
    content: 'When can you start the work?',
    timestamp: new Date('2024-01-15T10:10:00.000Z'),
    read: false,
  },
];

describe('MessagingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: {
        id: 'user123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'homeowner',
        phone: '555-1234',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      signOut: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn(),
      loading: false,
      session: null,
    });

    mockUseNetworkState.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });

    mockMessagingService.getMessages.mockResolvedValue(mockMessages);
    mockMessagingService.sendMessage.mockResolvedValue({
      id: 'new-msg',
      jobId: 'job123',
      senderId: 'user123',
      receiverId: 'user456',
      content: 'New message',
      timestamp: new Date(),
      read: false,
    });
    mockMessagingService.markAsRead.mockResolvedValue(undefined);
    mockMessagingService.subscribeToMessages.mockReturnValue({
      unsubscribe: jest.fn(),
    });
  });

  it('should render messaging screen with conversation', async () => {
    const { getByText, getByTestId } = render(
      <MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    expect(getByTestId('messaging-header')).toBeTruthy();
    expect(getByText('Jane Smith')).toBeTruthy();

    await waitFor(() => {
      expect(getByText('Hello, I have a question about the job')).toBeTruthy();
      expect(getByText('Sure, what would you like to know?')).toBeTruthy();
      expect(getByText('When can you start the work?')).toBeTruthy();
    });
  });

  it('should load messages on component mount', async () => {
    render(<MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />);

    await waitFor(() => {
      expect(mockMessagingService.getMessages).toHaveBeenCalledWith('job123', 'user123', 'user456');
    });
  });

  it('should send message when send button is pressed', async () => {
    const { getByTestId } = render(
      <MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    const messageInput = getByTestId('message-input');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(messageInput, 'Test message');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith({
        jobId: 'job123',
        senderId: 'user123',
        receiverId: 'user456',
        content: 'Test message',
      });
    });
  });

  it('should clear input after sending message', async () => {
    const { getByTestId } = render(
      <MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    const messageInput = getByTestId('message-input');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(messageInput, 'Test message');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(messageInput.props.value).toBe('');
    });
  });

  it('should not send empty messages', () => {
    const { getByTestId } = render(
      <MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    const sendButton = getByTestId('send-button');
    fireEvent.press(sendButton);

    expect(mockMessagingService.sendMessage).not.toHaveBeenCalled();
  });

  it('should handle send message error', async () => {
    mockMessagingService.sendMessage.mockRejectedValue(new Error('Failed to send'));

    const { getByTestId, getByText } = render(
      <MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    const messageInput = getByTestId('message-input');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(messageInput, 'Test message');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(getByText('Failed to send message')).toBeTruthy();
    });
  });

  it('should mark messages as read when received', async () => {
    render(<MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />);

    await waitFor(() => {
      expect(mockMessagingService.markAsRead).toHaveBeenCalledWith('msg2');
      expect(mockMessagingService.markAsRead).toHaveBeenCalledWith('msg3');
    });
  });

  it('should subscribe to real-time messages', () => {
    render(<MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />);

    expect(mockMessagingService.subscribeToMessages).toHaveBeenCalledWith(
      'job123',
      expect.any(Function)
    );
  });

  it('should display offline indicator when disconnected', () => {
    mockUseNetworkState.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    });

    const { getByText } = render(
      <MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    expect(getByText('Offline')).toBeTruthy();
  });

  it('should show loading state initially', () => {
    mockMessagingService.getMessages.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { getByTestId } = render(
      <MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    expect(getByTestId('loading-messages')).toBeTruthy();
  });

  it('should handle messages loading error', async () => {
    mockMessagingService.getMessages.mockRejectedValue(new Error('Failed to load messages'));

    const { getByText } = render(
      <MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    await waitFor(() => {
      expect(getByText('Failed to load messages')).toBeTruthy();
    });
  });

  it('should differentiate sent and received messages visually', async () => {
    const { getByTestId } = render(
      <MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    await waitFor(() => {
      expect(getByTestId('sent-message-msg1')).toBeTruthy();
      expect(getByTestId('received-message-msg2')).toBeTruthy();
    });
  });

  it('should show message timestamps', async () => {
    const { getByText } = render(
      <MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    await waitFor(() => {
      expect(getByText(/10:00/)).toBeTruthy();
      expect(getByText(/10:05/)).toBeTruthy();
    });
  });

  it('should navigate back when back button is pressed', () => {
    const { getByTestId } = render(
      <MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('should scroll to bottom when new message is added', async () => {
    const { getByTestId } = render(
      <MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    const messageInput = getByTestId('message-input');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(messageInput, 'New message');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(getByTestId('keyboard-aware-scroll')).toBeTruthy();
    });
  });

  it('should handle long messages correctly', async () => {
    const longMessage = 'This is a very long message that should wrap correctly and be displayed properly in the message bubble without breaking the layout or causing any visual issues.';

    mockMessagingService.getMessages.mockResolvedValue([
      {
        id: 'long-msg',
        jobId: 'job123',
        senderId: 'user456',
        receiverId: 'user123',
        content: longMessage,
        timestamp: new Date(),
        read: false,
      },
    ]);

    const { getByText } = render(
      <MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    await waitFor(() => {
      expect(getByText(longMessage)).toBeTruthy();
    });
  });

  it('should show typing indicator when available', () => {
    const { queryByTestId } = render(
      <MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    // Typing indicator would be shown based on real-time events
    expect(queryByTestId('typing-indicator')).toBeNull(); // Not typing initially
  });

  it('should handle retry sending failed messages', async () => {
    // Simulate a failed message that needs retry
    mockMessagingService.sendMessage
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        id: 'retry-msg',
        jobId: 'job123',
        senderId: 'user123',
        receiverId: 'user456',
        content: 'Retry message',
        timestamp: new Date(),
        read: false,
      });

    const { getByTestId, getByText } = render(
      <MessagingScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    const messageInput = getByTestId('message-input');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(messageInput, 'Retry message');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(getByText('Failed to send message')).toBeTruthy();
    });

    // Click retry button
    const retryButton = getByTestId('retry-button');
    fireEvent.press(retryButton);

    await waitFor(() => {
      expect(mockMessagingService.sendMessage).toHaveBeenCalledTimes(2);
    });
  });
});