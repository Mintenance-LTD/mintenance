import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PortfolioActionQueue } from '../components/PortfolioActionQueue';
const mockGet = jest.fn();
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  writeAsStringAsync: jest.fn(),
  StorageAccessFramework: {},
  EncodingType: { UTF8: 'utf8' },
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'synthetic-manager' } }),
}));
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));
let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => client.clear());
it('loads on expansion, opens the correct property and retrieves the next page', async () => {
  mockGet.mockResolvedValue({
    items: [
      {
        id: 'job',
        kind: 'job',
        property_id: 'property',
        property_name: 'Synthetic home',
        title: 'Repair',
        next_action: 'Assign a contractor',
      },
    ],
    total: 6,
    scope: 'team',
    hasMore: true,
  });
  const open = jest.fn();
  const view = render(
    <QueryClientProvider client={client}>
      <PortfolioActionQueue onOpenProperty={open} />
    </QueryClientProvider>
  );
  expect(mockGet).not.toHaveBeenCalled();
  fireEvent.press(view.getByText('Maintenance action queue +'));
  await waitFor(() => expect(view.getByText('Repair')).toBeTruthy());
  fireEvent.press(view.getByText('Open property →'));
  expect(open).toHaveBeenCalledWith('property');
  fireEvent.press(view.getByText('Next'));
  await waitFor(() =>
    expect(mockGet).toHaveBeenCalledWith(
      '/api/portfolio/queue?offset=5&limit=5&scope=team',
      expect.objectContaining({ timeout: 15000, retries: 0 })
    )
  );
});
it('shows a retry action after a failed load', async () => {
  mockGet.mockRejectedValue(new Error('offline'));
  const view = render(
    <QueryClientProvider client={client}>
      <PortfolioActionQueue onOpenProperty={jest.fn()} />
    </QueryClientProvider>
  );
  fireEvent.press(view.getByText('Maintenance action queue +'));
  await waitFor(() =>
    expect(view.getByText('Unable to load actions. Tap to retry.')).toBeTruthy()
  );
});

it.each([true, false])(
  'opens jobs only with explicit server permission (%s)',
  async (allowed) => {
    mockGet.mockResolvedValue({
      items: [
        {
          id: 'job-1',
          kind: 'job',
          property_id: 'shared-home',
          property_name: 'Home',
          title: 'Repair',
          next_action: 'Review progress',
          can_open_job: allowed,
        },
      ],
      total: 1,
      scope: 'team',
      hasMore: false,
    });
    const openJob = jest.fn();
    const openProperty = jest.fn();
    const view = render(
      <QueryClientProvider client={client}>
        <PortfolioActionQueue
          initiallyExpanded
          onOpenProperty={openProperty}
          onOpenJob={openJob}
        />
      </QueryClientProvider>
    );
    await view.findByText('Repair');
    fireEvent.press(view.getByText(allowed ? 'Open job →' : 'Open property →'));
    if (allowed) {
      expect(openJob).toHaveBeenCalledWith('job-1');
      expect(openProperty).not.toHaveBeenCalled();
    } else {
      expect(openProperty).toHaveBeenCalledWith('shared-home');
      expect(openJob).not.toHaveBeenCalled();
    }
    view.unmount();
  }
);
it('filters on the server and hides management controls for a viewer', async () => {
  mockGet.mockImplementation((url: string) =>
    Promise.resolve({
      scope: url.includes('scope=mine') ? 'mine' : 'team',
      items: url.includes('scope=mine')
        ? []
        : [
            {
              id: 'job',
              kind: 'job',
              property_id: 'home',
              property_name: 'Home',
              title: 'Repair',
              next_action: 'Review progress',
              can_manage_followup: false,
              assignment_status: 'needs_reassignment',
            },
          ],
      total: url.includes('scope=mine') ? 0 : 6,
      hasMore: !url.includes('scope=mine'),
    })
  );
  const view = render(
    <QueryClientProvider client={client}>
      <PortfolioActionQueue initiallyExpanded onOpenProperty={jest.fn()} />
    </QueryClientProvider>
  );
  await view.findByText('Repair');
  expect(view.getByText('Responsible: Needs reassignment')).toBeTruthy();
  expect(view.queryByText('Manage follow-up')).toBeNull();
  fireEvent.press(view.getByText('Next'));
  await waitFor(() =>
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('offset=5'),
      expect.anything()
    )
  );
  fireEvent.press(view.getByLabelText('Mine queue'));
  await view.findByText('No follow-ups assigned to you on this page.');
  expect(mockGet).toHaveBeenCalledWith(
    '/api/portfolio/queue?offset=0&limit=5&scope=mine',
    expect.anything()
  );
});
it('does not label a legacy unfiltered response as Mine', async () => {
  mockGet.mockResolvedValue({
    scope: 'team',
    items: [],
    total: 0,
    hasMore: false,
  });
  const view = render(
    <QueryClientProvider client={client}>
      <PortfolioActionQueue initiallyExpanded onOpenProperty={jest.fn()} />
    </QueryClientProvider>
  );
  await view.findByText('No actions in this queue on this page.');
  fireEvent.press(view.getByLabelText('Mine queue'));
  await view.findByText('Unable to load actions. Tap to retry.');
  expect(
    view.queryByText('No follow-ups assigned to you on this page.')
  ).toBeNull();
});
