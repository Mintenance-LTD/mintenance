import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MessagesListScreen from '../MessagesListScreen';
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return {
    ...RN,
    FlatList: ({ data, renderItem, ListEmptyComponent }: any) =>
      React.createElement(
        RN.View,
        null,
        data.length
          ? data.map((item: any) =>
              React.createElement(
                React.Fragment,
                { key: item.jobId },
                renderItem({ item })
              )
            )
          : ListEmptyComponent
      ),
  };
});
const mockNavigate = jest.fn();
const mockThreads = [
  {
    jobId: 'recent',
    jobTitle: 'Recent job',
    unreadCount: 0,
    participants: [{ id: 'other', name: 'Builder' }],
    lastMessage: {
      createdAt: new Date().toISOString(),
      messageText: 'Recent message',
    },
  },
  {
    jobId: 'older',
    jobTitle: 'Older job',
    unreadCount: 0,
    participants: [{ id: 'other', name: 'Builder' }],
    lastMessage: { createdAt: '2020-01-01', messageText: 'Retained history' },
  },
  {
    jobId: 'unread',
    jobTitle: 'Unread job',
    unreadCount: 3,
    participants: [{ id: 'other', name: 'Builder' }],
    lastMessage: { createdAt: '2020-01-01', messageText: 'Unread history' },
  },
];
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'me' } }),
}));
jest.mock('../../hooks/useMessaging', () => ({
  useMessageThreadsWithRealTime: () => ({ data: mockThreads }),
}));
jest.mock('../../utils/haptics', () => ({
  useHaptics: () => ({ buttonPress: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireMock('react-native').View,
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../../components/SkeletonLoader', () => ({
  SkeletonMessageCard: () => null,
}));
jest.mock('../../components/ui/Banner', () => ({ Banner: () => null }));
jest.mock('../../components/SearchBar', () => ({
  __esModule: true,
  default: jest.requireMock('react-native').TextInput,
}));
it('keeps old unread conversations visible and lets users retrieve older history', () => {
  const screen = render(<MessagesListScreen />);
  expect(screen.getByText('Recent message')).toBeTruthy();
  expect(screen.getByText('Unread history')).toBeTruthy();
  expect(screen.queryByText('Retained history')).toBeNull();
  fireEvent.press(screen.getByText('Older'));
  expect(screen.getByText('Retained history')).toBeTruthy();
  fireEvent.press(screen.getByText('Retained history'));
  expect(mockNavigate).toHaveBeenCalledWith(
    'Messaging',
    expect.objectContaining({ conversationId: 'older' })
  );
  fireEvent.press(screen.getByText('Unread'));
  expect(screen.getByText('3')).toBeTruthy();
  expect(screen.queryByText('Retained history')).toBeNull();
  fireEvent.press(screen.getByLabelText('Search conversations'));
  fireEvent.changeText(
    screen.getByPlaceholderText('Search by name or job...'),
    'Older job'
  );
  expect(screen.getByText('Retained history')).toBeTruthy();
});
