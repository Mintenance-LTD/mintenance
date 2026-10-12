import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePagedJobMessages } from '../usePagedJobMessages';
import { getJobMessagesPage } from '../../services/messaging/MessageFetcher';

jest.mock('../../services/messaging/MessageFetcher', () => ({
  getJobMessagesPage: jest.fn(),
}));
jest.mock('../useOfflineQuery', () => ({
  useOfflineQuery: (options: object) =>
    require('@tanstack/react-query').useQuery(options),
}));
const fetchPage = getJobMessagesPage as jest.Mock;
const newer = { id: 'new', createdAt: '2026-10-12T10:00:00Z' };
const older = { id: 'old', createdAt: '2026-10-11T10:00:00Z' };
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return renderHook(() => usePagedJobMessages('job-1'), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}
beforeEach(() => fetchPage.mockReset());
it('renders the newest page without fetching older pages, then appends history on request', async () => {
  fetchPage.mockResolvedValueOnce({
    messages: [newer],
    nextCursor: 'older-cursor',
  });
  const { result } = setup();
  await waitFor(() => expect(result.current.data).toEqual([newer]));
  expect(fetchPage).toHaveBeenCalledTimes(1);
  fetchPage.mockResolvedValueOnce({ messages: [older, newer] });
  await act(async () => result.current.loadOlder());
  await waitFor(() => expect(result.current.data).toEqual([older, newer]));
  expect(fetchPage).toHaveBeenLastCalledWith('job-1', 'older-cursor');
  expect(result.current.hasOlder).toBe(false);
  fetchPage.mockResolvedValueOnce({
    messages: [newer],
    nextCursor: 'older-cursor',
  });
  await act(async () => {
    await result.current.refetch();
  });
  expect(result.current.data).toEqual([older, newer]);
  expect(result.current.hasOlder).toBe(false);
});
it('keeps visible messages when an older page fails and allows retry', async () => {
  fetchPage.mockResolvedValueOnce({
    messages: [newer],
    nextCursor: 'older-cursor',
  });
  const { result } = setup();
  await waitFor(() => expect(result.current.hasOlder).toBe(true));
  fetchPage.mockRejectedValueOnce(new Error('offline'));
  await act(async () => result.current.loadOlder());
  expect(result.current.data).toEqual([newer]);
  expect(result.current.olderError).toBe(true);
  expect(result.current.hasOlder).toBe(true);
  fetchPage.mockResolvedValueOnce({ messages: [older] });
  await act(async () => result.current.loadOlder());
  expect(result.current.olderError).toBe(false);
});
