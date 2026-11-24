import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';
import { CalendarScreen } from '../CalendarScreen';
import { mobileApiClient } from '../../utils/mobileApiClient';

jest.mock('react-native', () => {
  const native = jest.requireActual('react-native');
  const React = require('react');
  return {
    ...native,
    FlatList: ({
      data,
      renderItem,
    }: {
      data: { id: string }[];
      renderItem: (props: {
        item: { id: string };
        index: number;
      }) => React.ReactNode;
    }) =>
      data.map((item, index) =>
        React.createElement(
          React.Fragment,
          { key: item.id },
          renderItem({ item, index })
        )
      ),
  };
});

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'contractor', role: 'contractor' } }),
}));
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: jest.fn() },
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

it('opens the selected visit and carries that job into the web proposal form', async () => {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  jest.mocked(mobileApiClient.get).mockResolvedValue({
    appointments: [
      {
        id: 'visit-one',
        title: 'Garden visit',
        date,
        time: '09:00',
        status: 'confirmed',
        jobId: 'job-one',
      },
      {
        id: 'visit-two',
        title: 'Garden visit',
        date,
        time: '16:00',
        endTime: '17:00',
        status: 'cancelled',
        past: true,
        jobId: 'job-two',
        client: { name: 'Test client' },
      },
    ],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity } },
  });
  const navigation = {} as React.ComponentProps<
    typeof CalendarScreen
  >['navigation'];
  const screen = render(
    <QueryClientProvider client={queryClient}>
      <CalendarScreen navigation={navigation} />
    </QueryClientProvider>
  );
  fireEvent.press(await screen.findByLabelText('Garden visit at 16:00'));
  expect(screen.getByText('cancelled · Past visit')).toBeTruthy();
  fireEvent.press(screen.getByText('Propose a new visit on web'));
  await waitFor(() =>
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledTimes(1)
  );
  const href =
    jest.mocked(WebBrowser.openBrowserAsync).mock.calls[0]?.[0] ?? '';
  const destination = new URL(href);
  expect(destination.pathname).toBe('/contractor/scheduling');
  expect(destination.searchParams.get('jobId')).toBe('job-two');
  screen.unmount();
  queryClient.clear();
});
