import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import {
  PaymentReviewMilestones,
  formatPaymentMilestone,
} from '../PaymentReviewMilestones';
import { mobileApiClient } from '../../../utils/mobileApiClient';
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: jest.fn() },
}));
it('separates recorded review and release and refreshes the approval hold after approval', async () => {
  (mobileApiClient.get as jest.Mock)
    .mockResolvedValueOnce({
      escrow: {
        status: 'held',
        autoApprovalDate: '2026-11-23T15:02Z',
        autoReleaseDate: '2026-11-30T15:02Z',
      },
    })
    .mockResolvedValueOnce({
      escrow: {
        status: 'held',
        autoApprovalDate: '2026-11-23T15:02Z',
        coolingOffEndsAt: '2026-11-18T15:02Z',
        autoReleaseDate: '2026-11-18T15:02Z',
      },
    });
  const view = render(<PaymentReviewMilestones jobId='job' approved={false} />);
  expect(
    await view.findByText(
      /Automatic review approval: 23 November 2026 at 15:02 GMT/
    )
  ).toBeTruthy();
  expect(
    view.getByText(/Earliest recorded release eligibility: 30 November/)
  ).toBeTruthy();
  view.rerender(<PaymentReviewMilestones jobId='job' approved />);
  expect(
    await view.findByText(/Approval hold ends: 18 November 2026 at 15:02 GMT/)
  ).toBeTruthy();
  await waitFor(() =>
    expect(view.queryByText(/Automatic review approval:/)).toBeNull()
  );
  expect(formatPaymentMilestone('2026-07-17T08:00Z')).toContain('09:00 BST');
});
