import React from 'react';
import { render } from '@testing-library/react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContractTermsView } from '../components/ContractTermsView';
import { JobTimelineScreen } from '../JobTimelineScreen';
import { StickyBottomCTA } from '../../../components/ui/StickyBottomCTA';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../../components/shared', () => ({ ScreenHeader: () => null }));
jest.mock('../viewmodels/JobDetailsViewModel', () => ({
  useJobDetailsViewModel: () => ({
    job: { title: 'Synthetic repair', status: 'completed', bids: [] },
    contractStatus: 'accepted',
    escrowStatus: 'pending',
    jobLoading: false,
  }),
}));

it('renders the accepted contract as complete without inventing confirmed funding or approval', () => {
  const view = render(
    <JobTimelineScreen
      route={{ params: { jobId: 'job' } } as never}
      navigation={{ goBack: jest.fn() } as never}
    />
  );
  const icons = view
    .UNSAFE_getAllByType(Ionicons)
    .map((icon) => icon.props.name);
  expect(icons[3]).toBe('checkmark');
  expect(icons[4]).toBe('shield-checkmark-outline');
  expect(icons[7]).toBe('star-outline');
  expect(icons[8]).toBe('wallet-outline');
});

it('keeps customer terms while hiding internal bid provenance and formatting booleans', () => {
  const view = render(
    <ContractTermsView
      title='Repair agreement'
      description={null}
      start_date={null}
      end_date={null}
      formatDate={String}
      terms={{
        bid_id: 'private-bid-reference',
        source: 'accepted_bid',
        created_from: 'bid_acceptance',
        warranty_months: 12,
        materials_included: true,
        scope: {
          rooms: [
            { name: 'Kitchen', room_type: 'kitchen', size_sqm_at_post: 5 },
          ],
        },
      }}
    />
  );
  expect(view.queryByText('private-bid-reference')).toBeNull();
  expect(view.queryByText('accepted_bid')).toBeNull();
  expect(view.queryByText('bid_acceptance')).toBeNull();
  expect(view.getByText('warranty months')).toBeTruthy();
  expect(view.getByText('Yes')).toBeTruthy();
  expect(view.getAllByText(/Kitchen/).length).toBeGreaterThan(0);
});

it('shows the exact payable pounds and pence', () => {
  const view = render(
    <StickyBottomCTA price={1.5} buttonText='Pay Now' onPress={jest.fn()} />
  );
  expect(view.getByText('£1.50')).toBeTruthy();
});
