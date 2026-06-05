/**
 * NotificationScreen — branch-coverage suite.
 *
 * Mocks ONLY externals (navigation, AuthContext, NotificationService CRUD,
 * navigateForNotification, supabase realtime channel) plus a functional
 * FlatList (the repo's global react-native mock stubs FlatList as a bare
 * host string that never renders its rows, so list items would otherwise
 * never mount). The screen under test and its presentational sub-components
 * render for real, exercising list styling (read vs unread), tabs,
 * empty/loading/error states, mark-read, mark-all, tap-to-navigate, refresh
 * and the realtime INSERT/UPDATE/DELETE handlers.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ---- react-native: keep the global mock but give FlatList real behaviour --
jest.mock('react-native', () => {
  const RealReact = require('react');
  const actual = jest.requireActual(
    require('path').resolve(__dirname, '../../../__mocks__/react-native.js')
  );
  const FlatList = (props: {
    data?: unknown[];
    renderItem?: (info: { item: unknown; index: number }) => unknown;
    keyExtractor?: (item: unknown, index: number) => string;
    refreshControl?: unknown;
    ListEmptyComponent?: unknown;
  }) => {
    const { data = [], renderItem, keyExtractor } = props;
    return RealReact.createElement(
      actual.ScrollView,
      { refreshControl: props.refreshControl },
      data.map((item, index) =>
        RealReact.createElement(
          RealReact.Fragment,
          { key: keyExtractor ? keyExtractor(item, index) : String(index) },
          renderItem ? renderItem({ item, index }) : null
        )
      )
    );
  };
  return { ...actual, FlatList };
});

import { Alert } from 'react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 10, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockGetUserNotifications = jest.fn();
const mockGetUnreadCount = jest.fn();
const mockMarkAsRead = jest.fn();
const mockMarkAllAsRead = jest.fn();
jest.mock('../../services/NotificationService', () => ({
  NotificationService: {
    getUserNotifications: (...a: unknown[]) => mockGetUserNotifications(...a),
    getUnreadCount: (...a: unknown[]) => mockGetUnreadCount(...a),
    markAsRead: (...a: unknown[]) => mockMarkAsRead(...a),
    markAllAsRead: (...a: unknown[]) => mockMarkAllAsRead(...a),
  },
}));

const mockNavigateForNotification = jest.fn();
jest.mock('../notifications', () => {
  const actual = jest.requireActual('../notifications');
  return {
    ...actual,
    navigateForNotification: (...a: unknown[]) =>
      mockNavigateForNotification(...a),
  };
});

let mockUser: { id: string } | null = { id: 'user-1' };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Capture the realtime handler + lifecycle so tests can drive it.
let realtimeHandler: ((payload: unknown) => void) | null = null;
const mockUnsubscribe = jest.fn();
const mockSubscribe = jest.fn(() => ({ unsubscribe: mockUnsubscribe }));
const mockOn = jest.fn(
  (_event: unknown, _filter: unknown, cb: typeof realtimeHandler) => {
    realtimeHandler = cb;
    return { subscribe: mockSubscribe };
  }
);
const mockChannel = jest.fn(() => ({ on: mockOn }));
jest.mock('../../config/supabase', () => ({
  supabase: { channel: (...a: unknown[]) => mockChannel(...a) },
}));

import { NotificationScreen } from '../NotificationScreen';
import { logger } from '../../utils/logger';

// ---- fixtures ----------------------------------------------------------

const NOW = new Date().toISOString();

const makeNotif = (over: Record<string, unknown> = {}) => ({
  id: 'n1',
  title: 'Job update 🎉',
  body: 'Your job was updated',
  type: 'job_update',
  priority: 'normal',
  userId: 'user-1',
  createdAt: NOW,
  read: false,
  data: { jobId: 'job-1' },
  ...over,
});

const renderScreen = () => render(<NotificationScreen />);

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 'user-1' };
  realtimeHandler = null;
  mockGetUserNotifications.mockResolvedValue([]);
  mockGetUnreadCount.mockResolvedValue(0);
  mockMarkAsRead.mockResolvedValue(undefined);
  mockMarkAllAsRead.mockResolvedValue(undefined);
  jest.spyOn(logger, 'error').mockImplementation(() => {});
  jest.spyOn(logger, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('NotificationScreen — load states', () => {
  it('shows the loading spinner before data resolves', () => {
    let resolve!: (v: unknown) => void;
    mockGetUserNotifications.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    const { getByText } = renderScreen();
    expect(getByText('Loading notifications...')).toBeTruthy();
    act(() => resolve([]));
  });

  it('renders empty state when there are no notifications', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Notifications')).toBeTruthy());
    // header subtitle reflects all-caught-up branch
    expect(getByText('All caught up')).toBeTruthy();
    expect(mockGetUserNotifications).toHaveBeenCalledWith('user-1');
  });

  it('renders the error view and retries on press', async () => {
    mockGetUserNotifications.mockRejectedValueOnce(new Error('boom'));
    const { getByText } = renderScreen();
    await waitFor(() =>
      expect(getByText('Failed to load notifications')).toBeTruthy()
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to load notifications',
      expect.any(Error)
    );

    // retry: next call succeeds and clears the error
    mockGetUserNotifications.mockResolvedValueOnce([makeNotif()]);
    mockGetUnreadCount.mockResolvedValueOnce(1);
    fireEvent.press(getByText('Try Again'));
    await waitFor(() => expect(getByText('Notifications')).toBeTruthy());
  });

  it('does not call the service or open a realtime channel when there is no user', async () => {
    mockUser = null;
    const { getByText } = renderScreen();
    // loadNotifications early-returns before the try/finally, so loading
    // never flips and the spinner stays mounted.
    expect(getByText('Loading notifications...')).toBeTruthy();
    expect(mockGetUserNotifications).not.toHaveBeenCalled();
    expect(mockChannel).not.toHaveBeenCalled();
  });
});

describe('NotificationScreen — populated list', () => {
  it('renders read and unread notifications with correct subtitle', async () => {
    mockGetUserNotifications.mockResolvedValue([
      makeNotif({ id: 'n1', title: 'Unread one', read: false }),
      makeNotif({ id: 'n2', title: 'Read one', read: true }),
    ]);
    mockGetUnreadCount.mockResolvedValue(1);
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Unread one')).toBeTruthy());
    expect(getByText('Read one')).toBeTruthy();
    expect(getByText('1 unread')).toBeTruthy();
    // Mark all CTA appears only when unreadCount > 0
    expect(getByText('Mark all')).toBeTruthy();
  });

  it('marks a single notification read via the inline button (leaving others untouched)', async () => {
    // Two unread items so the state-map exercises both the matching (mutate)
    // and non-matching (pass-through) branches of handleMarkRead.
    mockGetUserNotifications.mockResolvedValue([
      makeNotif({ id: 'n1', title: 'Unread one', read: false }),
      makeNotif({ id: 'n2', title: 'Unread two', read: false }),
    ]);
    mockGetUnreadCount.mockResolvedValue(2);
    const { getByText, getAllByLabelText } = renderScreen();
    await waitFor(() => expect(getByText('Unread one')).toBeTruthy());

    // inline button calls e.stopPropagation() before delegating
    fireEvent.press(getAllByLabelText('Mark as read')[0], {
      stopPropagation: () => {},
    });
    await waitFor(() => expect(mockMarkAsRead).toHaveBeenCalledWith('n1'));
    // one of two read -> still 1 unread, the other item untouched
    await waitFor(() => expect(getByText('1 unread')).toBeTruthy());
    expect(getByText('Unread two')).toBeTruthy();
  });

  it('tapping an unread notification marks it read then navigates', async () => {
    mockGetUserNotifications.mockResolvedValue([
      makeNotif({ id: 'n1', title: 'Tap me', read: false }),
    ]);
    mockGetUnreadCount.mockResolvedValue(1);
    const { getByText, getByLabelText } = renderScreen();
    await waitFor(() => expect(getByText('Tap me')).toBeTruthy());

    fireEvent.press(getByLabelText('Unread: Tap me'));
    await waitFor(() => expect(mockMarkAsRead).toHaveBeenCalledWith('n1'));
    expect(mockNavigateForNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'n1' })
    );
  });

  it('tapping one unread item leaves sibling items unchanged', async () => {
    // Two unread; tapping n1 exercises the non-matching pass-through branch
    // in handleNotificationPress' state map.
    mockGetUserNotifications.mockResolvedValue([
      makeNotif({ id: 'n1', title: 'First', read: false }),
      makeNotif({ id: 'n2', title: 'Second', read: false }),
    ]);
    mockGetUnreadCount.mockResolvedValue(2);
    const { getByText, getByLabelText } = renderScreen();
    await waitFor(() => expect(getByText('First')).toBeTruthy());

    fireEvent.press(getByLabelText('Unread: First'));
    await waitFor(() => expect(mockMarkAsRead).toHaveBeenCalledWith('n1'));
    await waitFor(() => expect(getByText('1 unread')).toBeTruthy());
    expect(getByText('Second')).toBeTruthy();
  });

  it('tapping an already-read notification navigates without marking read', async () => {
    mockGetUserNotifications.mockResolvedValue([
      makeNotif({ id: 'n2', title: 'Already read', read: true }),
    ]);
    mockGetUnreadCount.mockResolvedValue(0);
    const { getByText, getByLabelText } = renderScreen();
    await waitFor(() => expect(getByText('Already read')).toBeTruthy());

    fireEvent.press(getByLabelText('Already read'));
    expect(mockMarkAsRead).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(mockNavigateForNotification).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: 'n2' })
      )
    );
  });
});

describe('NotificationScreen — mark all as read', () => {
  it('confirms via Alert and marks every notification read', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetUserNotifications.mockResolvedValue([
      makeNotif({ id: 'n1', read: false }),
      makeNotif({ id: 'n2', title: 'two', read: false }),
    ]);
    mockGetUnreadCount.mockResolvedValue(2);
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('2 unread')).toBeTruthy());

    fireEvent.press(getByText('Mark all'));
    expect(alertSpy).toHaveBeenCalled();

    // Invoke the "Mark All" alert button onPress
    const buttons = alertSpy.mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => Promise<void> | void;
    }>;
    const markAll = buttons.find((b) => b.text === 'Mark All');
    await act(async () => {
      await markAll?.onPress?.();
    });
    expect(mockMarkAllAsRead).toHaveBeenCalledWith('user-1');
    await waitFor(() => expect(getByText('All caught up')).toBeTruthy());
  });
});

describe('NotificationScreen — tabs + filtering', () => {
  it('switches to the Unread tab and filters out read items', async () => {
    mockGetUserNotifications.mockResolvedValue([
      makeNotif({ id: 'n1', title: 'Stays', read: false }),
      makeNotif({ id: 'n2', title: 'Goes', read: true }),
    ]);
    mockGetUnreadCount.mockResolvedValue(1);
    const { getByText, queryByText, getByLabelText } = renderScreen();
    await waitFor(() => expect(getByText('Goes')).toBeTruthy());

    fireEvent.press(getByLabelText(/Filter Unread/));
    await waitFor(() => expect(queryByText('Goes')).toBeNull());
    expect(getByText('Stays')).toBeTruthy();
  });

  it('shows the empty state for a tab with no matching notifications', async () => {
    mockGetUserNotifications.mockResolvedValue([
      makeNotif({ id: 'n1', type: 'job_update', read: true }),
    ]);
    mockGetUnreadCount.mockResolvedValue(0);
    const { getByText, getByLabelText, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('Job update')).toBeTruthy());

    // Payments tab — no payment notifications -> NotificationEmpty renders
    fireEvent.press(getByLabelText(/Filter Payments/));
    await waitFor(() => expect(queryByText('Job update')).toBeNull());
  });
});

describe('NotificationScreen — pull to refresh', () => {
  it('reloads data when the FlatList refresh control fires', async () => {
    mockGetUserNotifications.mockResolvedValue([makeNotif({ id: 'n1' })]);
    mockGetUnreadCount.mockResolvedValue(1);
    const { getByText, UNSAFE_getAllByType } = renderScreen();
    await waitFor(() => expect(getByText('Job update')).toBeTruthy());

    const initialCalls = mockGetUserNotifications.mock.calls.length;
    const { ScrollView } = require('react-native');
    const scrollViews = UNSAFE_getAllByType(ScrollView);
    const list = scrollViews.find((sv) => sv.props.refreshControl);
    await act(async () => {
      list!.props.refreshControl.props.onRefresh();
    });
    await waitFor(() =>
      expect(mockGetUserNotifications.mock.calls.length).toBe(initialCalls + 1)
    );
  });
});

describe('NotificationScreen — realtime channel', () => {
  const mountAndReady = async () => {
    mockGetUserNotifications.mockResolvedValue([
      makeNotif({ id: 'existing', title: 'Existing', read: true }),
    ]);
    mockGetUnreadCount.mockResolvedValue(0);
    const utils = renderScreen();
    await waitFor(() => expect(utils.getByText('Existing')).toBeTruthy());
    expect(mockChannel).toHaveBeenCalledWith('notifications:user-1');
    expect(realtimeHandler).toBeTruthy();
    return utils;
  };

  it('prepends an INSERT row and increments the unread count', async () => {
    const { getByText } = await mountAndReady();
    await act(async () => {
      realtimeHandler!({
        eventType: 'INSERT',
        new: {
          id: 'rt1',
          title: 'Realtime in',
          message: 'hello',
          type: 'system',
          user_id: 'user-1',
          created_at: NOW,
          read: false,
          action_url: '/jobs/9',
        },
      });
    });
    await waitFor(() => expect(getByText('Realtime in')).toBeTruthy());
    expect(getByText('1 unread')).toBeTruthy();
  });

  it('INSERT with metadata uses metadata and INSERT defaults fill blanks', async () => {
    const { getByText } = await mountAndReady();
    await act(async () => {
      realtimeHandler!({
        eventType: 'INSERT',
        new: {
          id: 'rt2',
          metadata: { actionUrl: '/x' },
          // no title/message/type/created_at/read -> default branches
        },
      });
    });
    // default title is "Notification"
    await waitFor(() => expect(getByText('Notification')).toBeTruthy());
  });

  it('INSERT ignores a duplicate id already in the list', async () => {
    const { queryAllByText } = await mountAndReady();
    await act(async () => {
      realtimeHandler!({
        eventType: 'INSERT',
        new: {
          id: 'existing',
          title: 'Existing',
          message: 'dup',
          type: 'system',
          user_id: 'user-1',
          created_at: NOW,
          read: true,
        },
      });
    });
    // still only one "Existing" card
    expect(queryAllByText('Existing').length).toBe(1);
  });

  it('UPDATE flips read state in place and leaves non-matching rows alone', async () => {
    mockGetUserNotifications.mockResolvedValue([
      makeNotif({ id: 'u1', title: 'To update', read: false }),
      makeNotif({ id: 'u2', title: 'Other', read: false }),
    ]);
    mockGetUnreadCount.mockResolvedValue(2);
    const { getByText, getAllByLabelText } = renderScreen();
    await waitFor(() => expect(getByText('To update')).toBeTruthy());
    expect(realtimeHandler).toBeTruthy();

    await act(async () => {
      realtimeHandler!({
        eventType: 'UPDATE',
        new: { id: 'u1', read: true },
      });
    });
    // u1's mark-read button disappears; u2 (non-matching) keeps its button
    await waitFor(() =>
      expect(getAllByLabelText('Mark as read').length).toBe(1)
    );
  });

  it('UPDATE with no read field falls back to the existing read state', async () => {
    mockGetUserNotifications.mockResolvedValue([
      makeNotif({ id: 'u1', title: 'Keeps read', read: true }),
    ]);
    mockGetUnreadCount.mockResolvedValue(0);
    const { getByText, queryByLabelText } = renderScreen();
    await waitFor(() => expect(getByText('Keeps read')).toBeTruthy());

    await act(async () => {
      // row.read is undefined -> `row.read ?? n.read` keeps n.read (true)
      realtimeHandler!({ eventType: 'UPDATE', new: { id: 'u1' } });
    });
    // still read: no mark-read button rendered
    expect(queryByLabelText('Mark as read')).toBeNull();
  });

  it('DELETE removes the matching row', async () => {
    mockGetUserNotifications.mockResolvedValue([
      makeNotif({ id: 'd1', title: 'Delete me', read: true }),
      makeNotif({ id: 'd2', title: 'Keep me', read: true }),
    ]);
    mockGetUnreadCount.mockResolvedValue(0);
    const { getByText, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('Delete me')).toBeTruthy());

    await act(async () => {
      realtimeHandler!({ eventType: 'DELETE', old: { id: 'd1' } });
    });
    await waitFor(() => expect(queryByText('Delete me')).toBeNull());
    expect(getByText('Keep me')).toBeTruthy();
  });

  it('ignores realtime events with an unrecognised eventType', async () => {
    const { getByText, queryAllByText } = await mountAndReady();
    await act(async () => {
      realtimeHandler!({ eventType: 'TRUNCATE', new: { id: 'x' } });
    });
    // list unchanged
    expect(getByText('Existing')).toBeTruthy();
    expect(queryAllByText('Existing').length).toBe(1);
  });

  it('logs a warning when the realtime handler throws', async () => {
    await mountAndReady();
    await act(async () => {
      // payload.new is null -> property access in the INSERT branch throws
      realtimeHandler!({ eventType: 'INSERT', new: null });
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Realtime notification handler failed',
      expect.objectContaining({ err: expect.any(Error) })
    );
  });

  it('unsubscribes from the channel on unmount', async () => {
    const { unmount } = await mountAndReady();
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
