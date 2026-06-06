/**
 * MessagingScreen branch-coverage suite.
 *
 * Strategy: the screen under test is NOT mocked. We mock only externals —
 * the messaging hooks (to drive loading/empty/error/messages + send
 * success/error), useAuth (homeowner vs contractor vs null), useVideoCall,
 * the heavy child components (rendered as lightweight stubs exposing their
 * callbacks via testIDs so we can fire every screen branch), expo-image-picker,
 * mobileApiClient, logger, and a supabase mock with a working realtime channel.
 *
 * Note: every variable referenced inside a jest.mock() factory is prefixed
 * with `mock` (jest hoisting rule) and lives on the single `mockShared` bag.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Single shared bag for all factory-referenced state (mock-prefixed → allowed)
// ---------------------------------------------------------------------------
const mockShared: {
  rawMessages: unknown;
  loading: boolean;
  error: unknown;
  user: unknown;
  sendPending: boolean;
  mutateAsync: jest.Mock;
  markMutate: jest.Mock;
  setQueryData: jest.Mock;
  getQueryData: jest.Mock;
  channelSend: jest.Mock;
  removeChannel: jest.Mock;
  realtimeOnNew: ((msg: unknown) => void) | null;
  typingHandler: ((payload: unknown) => void) | null;
  showScheduler: boolean;
  setShowScheduler: jest.Mock;
  handleCallAccept: jest.Mock;
  handleCallDecline: jest.Mock;
  handleCallScheduled: jest.Mock;
  postFormData: jest.Mock;
  post: jest.Mock;
  videoSendMessage: ((p: unknown) => Promise<void>) | null;
} = {
  rawMessages: [],
  loading: false,
  error: null,
  user: null,
  sendPending: false,
  mutateAsync: jest.fn(),
  markMutate: jest.fn(),
  setQueryData: jest.fn(),
  getQueryData: jest.fn(() => undefined),
  channelSend: jest.fn(() => Promise.resolve()),
  removeChannel: jest.fn(),
  realtimeOnNew: null,
  typingHandler: null,
  showScheduler: false,
  setShowScheduler: jest.fn(),
  handleCallAccept: jest.fn(),
  handleCallDecline: jest.fn(),
  handleCallScheduled: jest.fn(),
  postFormData: jest.fn(() => Promise.resolve({ urls: ['http://img/1.jpg'] })),
  post: jest.fn(() => Promise.resolve({})),
  videoSendMessage: null,
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
// The RN mock renders FlatList as an inert string component (no children),
// so data items + ListEmptyComponent never appear. Override FlatList to a
// functional component that actually renders items / the empty component.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const React2 = require('react');
  const FlatListMock = React2.forwardRef(
    (
      props: {
        data?: unknown[];
        renderItem?: (info: {
          item: unknown;
          index: number;
        }) => React.ReactNode;
        keyExtractor?: (item: unknown, i: number) => string;
        ListEmptyComponent?: React.ReactNode;
        onContentSizeChange?: () => void;
      },
      ref: unknown
    ) => {
      React2.useImperativeHandle(ref, () => ({ scrollToEnd: jest.fn() }));
      // Drive the onContentSizeChange branch on mount.
      React2.useEffect(() => {
        props.onContentSizeChange?.();
      }, []);
      const data = props.data ?? [];
      if (data.length === 0) {
        return React2.createElement(
          React2.Fragment,
          null,
          props.ListEmptyComponent ?? null
        );
      }
      return React2.createElement(
        React2.Fragment,
        null,
        data.map((item, index) =>
          React2.createElement(
            React2.Fragment,
            {
              key: props.keyExtractor ? props.keyExtractor(item, index) : index,
            },
            props.renderItem ? props.renderItem({ item, index }) : null
          )
        )
      );
    }
  );
  return { ...actual, FlatList: FlatListMock };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 10, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../config/supabase', () => {
  const mkChannel = () => {
    const ch: Record<string, unknown> = {};
    ch.on = jest.fn((_e: string, _f: unknown, cb: (p: unknown) => void) => {
      mockShared.typingHandler = cb;
      return ch;
    });
    ch.subscribe = jest.fn(() => ch);
    ch.send = (...a: unknown[]) => mockShared.channelSend(...a);
    return ch;
  };
  return {
    supabase: {
      channel: jest.fn(() => mkChannel()),
      removeChannel: (...a: unknown[]) => mockShared.removeChannel(...a),
    },
  };
});

jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    post: (...a: unknown[]) => mockShared.post(...a),
    postFormData: (...a: unknown[]) => mockShared.postFormData(...a),
  },
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockShared.user }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueryData: (...a: unknown[]) => mockShared.setQueryData(...a),
    getQueryData: (...a: unknown[]) => mockShared.getQueryData(...a),
  }),
}));

jest.mock('../../lib/queryClient', () => ({
  queryKeys: {
    messages: {
      conversation: (id: string) => ['messages', 'conversation', id],
      conversations: () => ['messages', 'conversations'],
    },
  },
}));

jest.mock('../../hooks/useMessaging', () => ({
  useJobMessages: () => ({
    data: mockShared.rawMessages,
    isLoading: mockShared.loading,
    error: mockShared.error,
  }),
  useSendMessage: () => ({
    mutateAsync: (...a: unknown[]) => mockShared.mutateAsync(...a),
    get isPending() {
      return mockShared.sendPending;
    },
  }),
  useMarkMessagesAsRead: () => ({
    mutate: (...a: unknown[]) => mockShared.markMutate(...a),
  }),
  useRealTimeMessages: (_jobId: string, onNew: (m: unknown) => void) => {
    mockShared.realtimeOnNew = onNew;
  },
}));

jest.mock('../messaging/hooks/useVideoCall', () => ({
  useVideoCall: (opts: { sendMessage?: (p: unknown) => Promise<void> }) => {
    // capture the wrapped sendMessage so a test can invoke it directly
    mockShared.videoSendMessage = opts.sendMessage ?? null;
    return {
      showScheduler: mockShared.showScheduler,
      setShowScheduler: mockShared.setShowScheduler,
      handleCallAccept: mockShared.handleCallAccept,
      handleCallDecline: mockShared.handleCallDecline,
      handleCallScheduled: mockShared.handleCallScheduled,
    };
  },
}));

jest.mock('../../components/responsive', () => {
  const React2 = require('react');
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React2.createElement(React2.Fragment, null, children),
    useResponsive: () => ({ isDesktop: false }),
  };
});

// Heavy child stubs exposing callbacks via testIDs
jest.mock('../messaging/components/ChatHeader', () => {
  const React2 = require('react');
  const { Text: T, TouchableOpacity: TO } = require('react-native');
  return {
    ChatHeader: (
      props: Record<string, () => void> & { onSendQuote?: () => void }
    ) =>
      React2.createElement(
        React2.Fragment,
        null,
        React2.createElement(
          TO,
          { testID: 'hdr-back', onPress: props.onGoBack },
          React2.createElement(T, null, 'back')
        ),
        React2.createElement(
          TO,
          { testID: 'hdr-schedule', onPress: props.onScheduleCall },
          React2.createElement(T, null, 'sched')
        ),
        React2.createElement(
          TO,
          { testID: 'hdr-video', onPress: props.onStartVideoCall },
          React2.createElement(T, null, 'video')
        ),
        React2.createElement(
          TO,
          { testID: 'hdr-job', onPress: props.onViewJobDetails },
          React2.createElement(T, null, 'job')
        ),
        props.onSendQuote
          ? React2.createElement(
              TO,
              { testID: 'hdr-quote', onPress: props.onSendQuote },
              React2.createElement(T, null, 'quote')
            )
          : null
      ),
  };
});

jest.mock('../messaging/components/MessageBubble', () => {
  const React2 = require('react');
  const { Text: T, TouchableOpacity: TO } = require('react-native');
  return {
    MessageBubble: (props: {
      item: { id: string; messageText: string };
      isFromCurrentUser: boolean;
      showDateSeparator?: string;
      onRetry: (m: unknown) => void;
    }) =>
      React2.createElement(
        TO,
        {
          testID: `bubble-${props.item.id}`,
          onPress: () => props.onRetry(props.item),
        },
        React2.createElement(
          T,
          null,
          `${props.isFromCurrentUser ? 'ME' : 'OTHER'}:${props.item.messageText}:${props.showDateSeparator ?? 'NOSEP'}`
        )
      ),
  };
});

jest.mock('../messaging/components/MessageComposer', () => {
  const React2 = require('react');
  const { Text: T, TextInput, TouchableOpacity: TO } = require('react-native');
  return {
    MessageComposer: (props: {
      value: string;
      onChangeText: (v: string) => void;
      onSend: () => void;
      onAttach: () => void;
      isSending: boolean;
      error?: string | null;
    }) =>
      React2.createElement(
        React2.Fragment,
        null,
        React2.createElement(TextInput, {
          testID: 'composer-input',
          value: props.value,
          onChangeText: props.onChangeText,
        }),
        React2.createElement(
          TO,
          { testID: 'composer-send', onPress: props.onSend },
          React2.createElement(T, null, 'send')
        ),
        React2.createElement(
          TO,
          { testID: 'composer-attach', onPress: props.onAttach },
          React2.createElement(T, null, 'attach')
        ),
        props.error
          ? React2.createElement(T, { testID: 'composer-error' }, props.error)
          : null
      ),
  };
});

jest.mock('../messaging/components/MessagingStates', () => {
  const React2 = require('react');
  const { Text: T, TouchableOpacity: TO } = require('react-native');
  return {
    MessagingLoading: () =>
      React2.createElement(T, { testID: 'state-loading' }, 'loading'),
    MessagingError: (props: { onRetry: () => void }) =>
      React2.createElement(
        TO,
        { testID: 'state-error', onPress: props.onRetry },
        React2.createElement(T, null, 'error')
      ),
    MessagingEmpty: (props: { onQuickMessage: (t: string) => void }) =>
      React2.createElement(
        TO,
        {
          testID: 'state-empty',
          onPress: () => props.onQuickMessage('quick hi'),
        },
        React2.createElement(T, null, 'empty')
      ),
  };
});

jest.mock('../MessagingScreen/TypingIndicator', () => {
  const React2 = require('react');
  const { Text: T } = require('react-native');
  return {
    TypingIndicator: () =>
      React2.createElement(T, { testID: 'typing' }, 'typing...'),
  };
});

jest.mock('../MessagingScreen/QuickQuoteModal', () => {
  const React2 = require('react');
  const { Text: T, TextInput, TouchableOpacity: TO } = require('react-native');
  return {
    QuickQuoteModal: (props: {
      visible: boolean;
      quoteAmount: string;
      quoteDescription: string;
      onSend: () => void;
      onClose: () => void;
      onOpenFullQuote: () => void;
      onChangeAmount: (v: string) => void;
      onChangeDescription: (v: string) => void;
    }) =>
      props.visible
        ? React2.createElement(
            React2.Fragment,
            null,
            React2.createElement(TextInput, {
              testID: 'quote-amount',
              value: props.quoteAmount,
              onChangeText: props.onChangeAmount,
            }),
            React2.createElement(TextInput, {
              testID: 'quote-desc',
              value: props.quoteDescription,
              onChangeText: props.onChangeDescription,
            }),
            React2.createElement(
              TO,
              { testID: 'quote-send', onPress: props.onSend },
              React2.createElement(T, null, 'qsend')
            ),
            React2.createElement(
              TO,
              { testID: 'quote-close', onPress: props.onClose },
              React2.createElement(T, null, 'qclose')
            ),
            React2.createElement(
              TO,
              { testID: 'quote-full', onPress: props.onOpenFullQuote },
              React2.createElement(T, null, 'qfull')
            )
          )
        : null,
  };
});

jest.mock('../../components/video-call/VideoCallScheduler', () => {
  const React2 = require('react');
  const { Text: T, TouchableOpacity: TO } = require('react-native');
  return {
    __esModule: true,
    default: (props: { onClose: () => void; onScheduled: () => void }) =>
      React2.createElement(
        TO,
        { testID: 'vcs-close', onPress: props.onClose },
        React2.createElement(T, null, 'vc-close')
      ),
  };
});

// Import after mocks
import MessagingScreen from '../MessagingScreen';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const HOMEOWNER = { id: 'user-1', role: 'homeowner', first_name: 'Hank' };
const CONTRACTOR = { id: 'user-1', role: 'contractor', first_name: 'Carla' };

const baseParams = {
  conversationId: 'job-1',
  jobTitle: 'Fix sink',
  recipientId: 'user-2',
  recipientName: 'Bob',
};

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  getParent: jest.fn(() => ({ navigate: jest.fn() })),
} as never;

const makeRoute = (params: Record<string, unknown> = {}) =>
  ({
    key: 'k',
    name: 'Messaging',
    params: { ...baseParams, ...params },
  }) as never;

const renderScreen = (params: Record<string, unknown> = {}) =>
  render(
    <MessagingScreen navigation={mockNavigation} route={makeRoute(params)} />
  );

const msg = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  jobId: 'job-1',
  senderId: 'user-1',
  receiverId: 'user-2',
  messageText: 'hello',
  messageType: 'text',
  read: true,
  createdAt: '2026-06-01T10:00:00.000Z',
  deliveryStatus: 'sent',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockShared.rawMessages = [];
  mockShared.loading = false;
  mockShared.error = null;
  mockShared.user = HOMEOWNER;
  mockShared.sendPending = false;
  mockShared.realtimeOnNew = null;
  mockShared.typingHandler = null;
  mockShared.showScheduler = false;
  mockShared.videoSendMessage = null;
  mockShared.mutateAsync.mockResolvedValue(undefined);
  mockShared.getQueryData.mockReturnValue(undefined);
  mockShared.postFormData.mockResolvedValue({ urls: ['http://img/1.jpg'] });
  mockShared.post.mockResolvedValue({});
  (
    ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
  ).mockResolvedValue({ status: 'granted' });
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///photo.png' }],
  });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('MessagingScreen — early returns', () => {
  it('renders loading state', () => {
    mockShared.loading = true;
    const { getByTestId } = renderScreen();
    expect(getByTestId('state-loading')).toBeTruthy();
  });

  it('renders error state and goes back on retry', () => {
    mockShared.error = new Error('boom');
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('state-error'));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});

describe('MessagingScreen — empty thread', () => {
  it('renders empty state and sends a quick message', async () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('state-empty')).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByTestId('state-empty'));
    });
    expect(mockShared.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        messageText: 'quick hi',
        messageType: 'text',
        senderId: 'user-1',
      })
    );
  });

  it('falls back to empty array when rawMessages is not an array', () => {
    mockShared.rawMessages = { not: 'array' };
    const { getByTestId } = renderScreen();
    expect(getByTestId('state-empty')).toBeTruthy();
  });
});

describe('MessagingScreen — message list rendering', () => {
  it('renders own (ME) and other (OTHER) bubbles with date separators', () => {
    mockShared.rawMessages = [
      msg({
        id: 'm1',
        senderId: 'user-1',
        messageText: 'mine',
        createdAt: '2026-06-01T10:00:00Z',
      }),
      msg({
        id: 'm2',
        senderId: 'user-2',
        messageText: 'theirs',
        createdAt: '2026-06-02T10:00:00Z',
      }),
    ];
    const { getByTestId } = renderScreen();
    expect(getByTestId('bubble-m1')).toBeTruthy();
    expect(getByTestId('bubble-m2')).toBeTruthy();
    expect(getByTestId('bubble-m1').props.children.props.children).toContain(
      'ME:mine'
    );
    expect(getByTestId('bubble-m2').props.children.props.children).toContain(
      'OTHER:theirs'
    );
  });

  it('marks messages as read when there are unread inbound messages', async () => {
    mockShared.rawMessages = [
      msg({ id: 'm1', read: false, receiverId: 'user-1', senderId: 'user-2' }),
    ];
    renderScreen();
    await waitFor(() =>
      expect(mockShared.markMutate).toHaveBeenCalledWith({
        jobId: 'job-1',
        userId: 'user-1',
      })
    );
  });

  it('does not mark as read when all messages are read', async () => {
    mockShared.rawMessages = [
      msg({ id: 'm1', read: true, receiverId: 'user-1' }),
    ];
    renderScreen();
    await act(async () => {});
    expect(mockShared.markMutate).not.toHaveBeenCalled();
  });
});

describe('MessagingScreen — send message', () => {
  it('sends typed text successfully', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('composer-input'), 'typed msg');
    await act(async () => {
      fireEvent.press(getByTestId('composer-send'));
    });
    expect(mockShared.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        messageText: 'typed msg',
        jobId: 'job-1',
        receiverId: 'user-2',
      })
    );
  });

  it('ignores send when text is empty / whitespace', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('composer-input'), '   ');
    await act(async () => {
      fireEvent.press(getByTestId('composer-send'));
    });
    expect(mockShared.mutateAsync).not.toHaveBeenCalled();
  });

  it('ignores send while a send is already pending', async () => {
    mockShared.sendPending = true;
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('composer-input'), 'hi');
    await act(async () => {
      fireEvent.press(getByTestId('composer-send'));
    });
    expect(mockShared.mutateAsync).not.toHaveBeenCalled();
  });

  it('on send error with no matching temp msg, shows composer error', async () => {
    mockShared.mutateAsync.mockRejectedValueOnce(new Error('net'));
    mockShared.getQueryData.mockReturnValue([]);
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('composer-input'), 'will fail');
    await act(async () => {
      fireEvent.press(getByTestId('composer-send'));
    });
    await waitFor(() => expect(getByTestId('composer-error')).toBeTruthy());
  });

  it('on send error with matching temp msg, marks it failed', async () => {
    mockShared.mutateAsync.mockRejectedValueOnce(new Error('net'));
    mockShared.getQueryData.mockReturnValue([
      {
        id: 'temp_message_99',
        senderId: 'user-1',
        messageText: 'optimistic fail',
      },
    ]);
    const { getByTestId, queryByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('composer-input'), 'optimistic fail');
    await act(async () => {
      fireEvent.press(getByTestId('composer-send'));
    });
    await waitFor(() => expect(mockShared.setQueryData).toHaveBeenCalled());
    expect(queryByTestId('composer-error')).toBeNull();
  });
});

describe('MessagingScreen — retry message', () => {
  it('retries a failed bubble successfully', async () => {
    const failed = msg({
      id: 'temp_message_1',
      deliveryStatus: 'failed',
      messageText: 'retry me',
    });
    mockShared.rawMessages = [failed];
    mockShared.getQueryData.mockReturnValue([failed]);
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('bubble-temp_message_1'));
    });
    expect(mockShared.setQueryData).toHaveBeenCalled();
    expect(mockShared.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ messageText: 'retry me', messageType: 'text' })
    );
  });

  it('marks retry failed again when send rejects', async () => {
    const failed = msg({
      id: 'temp_message_2',
      deliveryStatus: 'failed',
      messageText: 'retry fail',
    });
    mockShared.rawMessages = [failed];
    mockShared.mutateAsync.mockRejectedValueOnce(new Error('still down'));
    mockShared.getQueryData.mockReturnValue([
      { id: 'temp_message_55', messageText: 'retry fail' },
    ]);
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('bubble-temp_message_2'));
    });
    await waitFor(() => expect(mockShared.setQueryData).toHaveBeenCalled());
  });
});

describe('MessagingScreen — composer typing + error clearing', () => {
  it('broadcasts typing on input and clears existing composer error', async () => {
    mockShared.mutateAsync.mockRejectedValueOnce(new Error('net'));
    mockShared.getQueryData.mockReturnValue([]);
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('composer-input'), 'fail it');
    await act(async () => {
      fireEvent.press(getByTestId('composer-send'));
    });
    await waitFor(() => expect(getByTestId('composer-error')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(getByTestId('composer-input'), 'new text');
    });
    expect(mockShared.channelSend).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'broadcast', event: 'typing' })
    );
  });

  it('does not broadcast typing for empty input', async () => {
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.changeText(getByTestId('composer-input'), '');
    });
    expect(mockShared.channelSend).not.toHaveBeenCalled();
  });

  it('handles a rejected typing broadcast (catch branch)', async () => {
    mockShared.channelSend.mockRejectedValueOnce(new Error('rt down'));
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.changeText(getByTestId('composer-input'), 'hi there');
    });
    await waitFor(() => expect(mockShared.channelSend).toHaveBeenCalled());
  });

  it('debounces repeated typing broadcasts (pending guard)', async () => {
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.changeText(getByTestId('composer-input'), 'a');
      fireEvent.changeText(getByTestId('composer-input'), 'ab');
    });
    // second keystroke hits the typingBroadcastRef early-return guard
    expect(mockShared.channelSend).toHaveBeenCalledTimes(1);
  });
});

describe('MessagingScreen — typing indicator (realtime broadcast)', () => {
  it('shows typing indicator when other user broadcasts typing', async () => {
    const { getByTestId, queryByTestId } = renderScreen();
    expect(queryByTestId('typing')).toBeNull();
    await act(async () => {
      mockShared.typingHandler?.({ payload: { userId: 'user-2' } });
    });
    await waitFor(() => expect(getByTestId('typing')).toBeTruthy());
  });

  it('ignores own typing broadcast', async () => {
    const { queryByTestId } = renderScreen();
    await act(async () => {
      mockShared.typingHandler?.({ payload: { userId: 'user-1' } });
    });
    expect(queryByTestId('typing')).toBeNull();
  });
});

describe('MessagingScreen — realtime incoming message', () => {
  it('marks as read when an inbound message arrives from the other user', async () => {
    renderScreen();
    await act(async () => {
      mockShared.realtimeOnNew?.({ senderId: 'user-2' });
    });
    expect(mockShared.markMutate).toHaveBeenCalledWith({
      jobId: 'job-1',
      userId: 'user-1',
    });
  });

  it('does not mark as read when own message echoes back', async () => {
    renderScreen();
    mockShared.markMutate.mockClear();
    await act(async () => {
      mockShared.realtimeOnNew?.({ senderId: 'user-1' });
    });
    expect(mockShared.markMutate).not.toHaveBeenCalled();
  });
});

describe('MessagingScreen — attach image', () => {
  it('uploads and sends an image message (urls path)', async () => {
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('composer-attach'));
    });
    await waitFor(() =>
      expect(mockShared.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          messageType: 'image',
          attachmentUrl: 'http://img/1.jpg',
        })
      )
    );
  });

  it('falls back to public_url when urls is absent', async () => {
    mockShared.postFormData.mockResolvedValueOnce({
      public_url: 'http://pub/x.jpg',
    });
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('composer-attach'));
    });
    await waitFor(() =>
      expect(mockShared.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ attachmentUrl: 'http://pub/x.jpg' })
      )
    );
  });

  it('alerts and aborts when permission is denied', async () => {
    (
      ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValueOnce({ status: 'denied' });
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('composer-attach'));
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Permission Required',
      expect.any(String)
    );
    expect(mockShared.mutateAsync).not.toHaveBeenCalled();
  });

  it('aborts when picker is canceled', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      assets: [],
    });
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('composer-attach'));
    });
    expect(mockShared.mutateAsync).not.toHaveBeenCalled();
  });

  it('shows composer error when upload throws', async () => {
    mockShared.postFormData.mockRejectedValueOnce(new Error('upload fail'));
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('composer-attach'));
    });
    await waitFor(() => expect(getByTestId('composer-error')).toBeTruthy());
  });
});

describe('MessagingScreen — header actions', () => {
  it('schedule call opens scheduler', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('hdr-schedule'));
    expect(mockShared.setShowScheduler).toHaveBeenCalledWith(true);
  });

  it('start video call shows coming-soon alert', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('hdr-video'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Video calls coming soon',
      expect.any(String)
    );
  });

  it('view job details navigates to parent JobsTab', () => {
    const parentNav = { navigate: jest.fn() };
    (mockNavigation.getParent as jest.Mock).mockReturnValue(parentNav);
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('hdr-job'));
    expect(parentNav.navigate).toHaveBeenCalledWith(
      'JobsTab',
      expect.objectContaining({ screen: 'JobDetails' })
    );
  });

  it('header back goes back', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('hdr-back'));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('does NOT expose quote action for homeowner', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('hdr-quote')).toBeNull();
  });

  it('exposes quote action for contractor and opens modal', () => {
    mockShared.user = CONTRACTOR;
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('hdr-quote'));
    expect(getByTestId('quote-send')).toBeTruthy();
  });
});

describe('MessagingScreen — quick quote modal', () => {
  const openModal = () => {
    mockShared.user = CONTRACTOR;
    const utils = renderScreen();
    fireEvent.press(utils.getByTestId('hdr-quote'));
    return utils;
  };

  it('guards empty amount (no API call)', async () => {
    const utils = openModal();
    await act(async () => {
      fireEvent.press(utils.getByTestId('quote-send'));
    });
    expect(mockShared.post).not.toHaveBeenCalled();
  });

  it('alerts on invalid (non-positive) amount', async () => {
    const utils = openModal();
    fireEvent.changeText(utils.getByTestId('quote-amount'), 'abc');
    await act(async () => {
      fireEvent.press(utils.getByTestId('quote-send'));
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Invalid Amount',
      expect.any(String)
    );
    expect(mockShared.post).not.toHaveBeenCalled();
  });

  it('sends a valid quote with description (API + message)', async () => {
    const utils = openModal();
    fireEvent.changeText(utils.getByTestId('quote-amount'), '£150.50');
    fireEvent.changeText(utils.getByTestId('quote-desc'), 'Labour only');
    await act(async () => {
      fireEvent.press(utils.getByTestId('quote-send'));
    });
    await waitFor(() =>
      expect(mockShared.post).toHaveBeenCalledWith(
        '/api/contractor/quotes',
        expect.objectContaining({
          total_amount: 150.5,
          notes: 'Labour only',
          status: 'sent',
        })
      )
    );
    expect(mockShared.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        messageText: expect.stringContaining('Quote sent'),
      })
    );
  });

  it('sends a valid quote without description (notes null)', async () => {
    const utils = openModal();
    fireEvent.changeText(utils.getByTestId('quote-amount'), '99');
    await act(async () => {
      fireEvent.press(utils.getByTestId('quote-send'));
    });
    await waitFor(() =>
      expect(mockShared.post).toHaveBeenCalledWith(
        '/api/contractor/quotes',
        expect.objectContaining({ total_amount: 99, notes: null })
      )
    );
  });

  it('alerts on quote API failure', async () => {
    mockShared.post.mockRejectedValueOnce(new Error('quote down'));
    const utils = openModal();
    fireEvent.changeText(utils.getByTestId('quote-amount'), '50');
    await act(async () => {
      fireEvent.press(utils.getByTestId('quote-send'));
    });
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String))
    );
  });

  it('closes modal', () => {
    const utils = openModal();
    fireEvent.press(utils.getByTestId('quote-close'));
    expect(utils.queryByTestId('quote-send')).toBeNull();
  });

  it('opens full quote screen and closes modal', () => {
    const utils = openModal();
    fireEvent.press(utils.getByTestId('quote-full'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateQuote', {
      jobId: 'job-1',
    });
  });
});

describe('MessagingScreen — sendMessageAsync wrapper (via useVideoCall)', () => {
  it('strips call metadata and forwards a text message', async () => {
    renderScreen();
    expect(typeof mockShared.videoSendMessage).toBe('function');
    await act(async () => {
      await mockShared.videoSendMessage?.({
        jobId: 'job-1',
        receiverId: 'user-2',
        messageText: 'call started',
        senderId: 'user-1',
        messageType: 'call',
        callId: 'c1',
        callDuration: 30,
        scheduledTime: 'soon',
      });
    });
    expect(mockShared.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        messageText: 'call started',
        messageType: 'call',
      })
    );
    // call metadata must NOT be forwarded to the mutation
    const arg = mockShared.mutateAsync.mock.calls.at(-1)?.[0] as Record<
      string,
      unknown
    >;
    expect(arg.callId).toBeUndefined();
    expect(arg.scheduledTime).toBeUndefined();
  });

  it('defaults missing messageType to text', async () => {
    renderScreen();
    await act(async () => {
      await mockShared.videoSendMessage?.({
        jobId: 'job-1',
        receiverId: 'user-2',
        messageText: 'no type',
        senderId: 'user-1',
        messageType: '',
      });
    });
    expect(mockShared.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ messageType: 'text' })
    );
  });
});

describe('MessagingScreen — markMessageFailed guards undefined cache', () => {
  it('retry failure with undefined cache still runs setQueryData updater safely', async () => {
    const failed = msg({
      id: 'temp_message_7',
      deliveryStatus: 'failed',
      messageText: 'guard',
    });
    mockShared.rawMessages = [failed];
    mockShared.mutateAsync.mockRejectedValueOnce(new Error('down'));
    // first getQueryData (find retry temp) returns a matching temp; setQueryData
    // updater is invoked with undefined oldData to hit the early-return branch.
    mockShared.getQueryData.mockReturnValue([
      { id: 'temp_message_77', messageText: 'guard' },
    ]);
    mockShared.setQueryData.mockImplementation((_k: unknown, fn: unknown) => {
      if (typeof fn === 'function') (fn as (d: unknown) => unknown)(undefined);
    });
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('bubble-temp_message_7'));
    });
    await waitFor(() => expect(mockShared.setQueryData).toHaveBeenCalled());
  });
});

describe('MessagingScreen — no authenticated user', () => {
  it('skips send when user is null', async () => {
    mockShared.user = null;
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('composer-input'), 'no user');
    await act(async () => {
      fireEvent.press(getByTestId('composer-send'));
    });
    expect(mockShared.mutateAsync).not.toHaveBeenCalled();
  });

  it('skips attach when user is null', async () => {
    mockShared.user = null;
    const { getByTestId } = renderScreen();
    await act(async () => {
      fireEvent.press(getByTestId('composer-attach'));
    });
    expect(
      ImagePicker.requestMediaLibraryPermissionsAsync
    ).not.toHaveBeenCalled();
  });
});
