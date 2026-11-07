import React from 'react';
import { SectionList } from 'react-native';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EscrowDashboardScreen } from '../EscrowDashboardScreen';

const mockOrder = jest.fn();
const mockOr = jest.fn(() => ({ order: mockOrder }));
jest.mock('../../../config/supabase', () => ({
  supabase: { from: () => ({ select: () => ({ or: mockOr }) }) },
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'owner', role: 'homeowner' } }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../../components/shared', () => ({ ErrorView: () => null }));

it('keeps the held total accurate while separating blocked, refunded and pending records', async () => {
  mockOrder.mockResolvedValue({
    data: [
      {
        id: 'refund',
        amount: 1.9,
        status: 'refunded',
        job: { title: 'Refunded repair' },
      },
      {
        id: 'blocked',
        amount: 1.32,
        status: 'held',
        homeowner_approval: true,
        release_blocked_reason: 'Reconciliation required',
        job: { title: 'Blocked repair' },
      },
      {
        id: 'pending',
        amount: 1.2,
        status: 'pending',
        job: { title: 'Pending repair' },
      },
    ],
    error: null,
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const navigate = jest.fn();
  const view = render(
    <QueryClientProvider client={client}>
      <EscrowDashboardScreen
        navigation={{ navigate, goBack: jest.fn() } as never}
        route={{} as never}
      />
    </QueryClientProvider>
  );
  await waitFor(() =>
    expect(view.UNSAFE_getByType(SectionList).props.sections).toHaveLength(3)
  );
  const list = view.UNSAFE_getByType(SectionList).props;
  expect(mockOr).toHaveBeenCalledWith('payer_id.eq.owner,payee_id.eq.owner');
  const header = render(list.ListHeaderComponent);
  expect(header.getByText('£1.32')).toBeTruthy();
  expect(
    header.getByText(/includes funds awaiting support review/)
  ).toBeTruthy();
  const blocked = render(list.renderItem({ item: list.sections[0].data[0] }));
  fireEvent.press(blocked.getByText('Get payment help →'));
  expect(navigate).toHaveBeenCalledWith('HelpCenter');
  const refund = render(list.renderItem({ item: list.sections[2].data[0] }));
  expect(refund.getByText('Refunded')).toBeTruthy();
  expect(refund.queryByText('Held')).toBeNull();
  refund.unmount();
  blocked.unmount();
  header.unmount();
  view.unmount();
  client.clear();
});
