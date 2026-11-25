import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { openBrowserAsync } from 'expo-web-browser';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { PropertyTimeline } from '../components/PropertyTimeline';

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: jest.fn() },
}));

const propertyId = '11111111-1111-4111-8111-111111111111';
const recordId = '22222222-2222-4222-8222-222222222222';
const path = '/api/properties/' + propertyId + '/activity';
const date = '2026-11-24T15:00:00Z';

it('opens exact native inspections and web payment records, and navigates cursor pages', async () => {
  jest.mocked(mobileApiClient.get).mockImplementation(async (url) =>
    url === path
      ? {
          events: [
            {
              id: 'inspection-' + recordId,
              kind: 'inspection',
              title: 'Test check-out',
              inspected_on: '2026-11-01',
              date,
              href: '/properties/' + propertyId + '/inspections/' + recordId,
            },
            {
              id: 'payment-' + recordId,
              kind: 'payment',
              title: 'Payment funded',
              date,
              href: '/payments/' + recordId,
            },
          ],
          nextCursor: 'test-cursor',
        }
      : { events: [], nextCursor: null }
  );
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: 0 } },
  });
  const openInspection = jest.fn();
  const openJob = jest.fn();
  const ui = render(
    <QueryClientProvider client={client}>
      <PropertyTimeline
        accountId='owner'
        propertyId={propertyId}
        openInspection={openInspection}
        openJob={openJob}
      />
    </QueryClientProvider>
  );
  fireEvent.press(await ui.findByText('Test check-out'));
  expect(openInspection).toHaveBeenCalledWith(recordId);
  expect(ui.getByText(/Inspection · 1 November 2026/)).toBeTruthy();
  expect(ui.getByText(/Recorded · 24 Nov 2026/)).toBeTruthy();

  fireEvent.press(ui.getByText('Payment funded'));
  expect(openBrowserAsync).toHaveBeenCalledWith(
    'https://www.mintenance.co.uk/payments/' + recordId
  );

  fireEvent.press(ui.getByText('Older'));
  await ui.findByText('No recorded activity on this page.');
  expect(mobileApiClient.get).toHaveBeenLastCalledWith(
    path + '?cursor=test-cursor',
    expect.anything()
  );
  fireEvent.press(ui.getByText('Newer'));
  await waitFor(() => expect(ui.getByText('Test check-out')).toBeTruthy());
  ui.unmount();
  client.clear();
});
