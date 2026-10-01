import React from 'react';
import { FlatList } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AISearchScreen } from '../AISearchScreen';
const mockSearch = jest.fn();
jest.mock('../../services/AISearchService', () => ({
  AISearchService: {
    search: (...args: unknown[]) => mockSearch(...args),
    getSearchSuggestions: jest.fn(async () => []),
    getTrendingSearches: jest.fn(async () => []),
  },
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
beforeEach(() => {
  mockSearch.mockReset();
  mockSearch.mockResolvedValue([]);
});
it('applies category and trimmed location to the current search, and clears them', async () => {
  const screen = render(<AISearchScreen />);
  fireEvent.changeText(screen.getByLabelText('AI search'), 'leak');
  await waitFor(() => expect(mockSearch).toHaveBeenCalledWith('leak', {}, 20));
  fireEvent.press(screen.getByLabelText('Show search filters'));
  fireEvent.press(screen.getByLabelText('plumbing'));
  fireEvent.changeText(
    screen.getByLabelText('Search location'),
    '  Manchester  '
  );
  fireEvent.press(screen.getByLabelText('Apply search filters'));
  await waitFor(() =>
    expect(mockSearch).toHaveBeenLastCalledWith(
      'leak',
      { category: 'plumbing', location: 'Manchester' },
      20
    )
  );
  fireEvent.press(screen.getByLabelText('Clear all search filters'));
  await waitFor(() =>
    expect(mockSearch).toHaveBeenLastCalledWith('leak', {}, 20)
  );
  expect(screen.getByLabelText('Search location').props.value).toBe('');
});
it('does not let an older unfiltered response replace filtered results', async () => {
  let resolveOld!: (value: unknown[]) => void;
  mockSearch
    .mockReturnValueOnce(
      new Promise((r) => {
        resolveOld = r;
      })
    )
    .mockResolvedValueOnce([
      {
        id: 'fresh',
        type: 'job',
        title: 'Filtered result',
        description: 'Repair',
        relevanceScore: 0.9,
        metadata: {},
      },
    ]);
  const screen = render(<AISearchScreen />);
  fireEvent.changeText(screen.getByLabelText('AI search'), 'leak');
  await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(1));
  fireEvent.press(screen.getByLabelText('Show search filters'));
  fireEvent.press(screen.getByLabelText('plumbing'));
  fireEvent.press(screen.getByLabelText('Apply search filters'));
  await waitFor(() =>
    expect(screen.UNSAFE_getByType(FlatList).props.data[0]?.title).toBe(
      'Filtered result'
    )
  );
  await act(async () => {
    resolveOld([
      {
        id: 'old',
        type: 'job',
        title: 'Old result',
        description: '',
        relevanceScore: 0.9,
        metadata: {},
      },
    ]);
  });
  expect(
    screen
      .UNSAFE_getByType(FlatList)
      .props.data.map((row: { title: string }) => row.title)
  ).toEqual(['Filtered result']);
});
