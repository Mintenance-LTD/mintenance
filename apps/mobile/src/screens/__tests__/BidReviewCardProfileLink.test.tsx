/**
 * Bid review → contractor profile handoff.
 *
 * 2026-07-31 audit P2-2: the card navigated with only `contractorId`, so
 * ContractorProfileScreen's `fromBidReview` check
 * (`source === 'bidReview' && !!jobId`) was always false and the profile's
 * Message CTA stayed hidden — exactly when a homeowner comparing bids most
 * wants to ask a question. The job is still `posted` during bid review, so
 * the screen's other unlock (an active job) can't fire either.
 *
 * navigation/types.ts already declared `source`/`jobId`/`bidId` and
 * documented them as "required when source === 'bidReview'"; the caller
 * simply never sent them. These tests pin that it now does.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();
/** Flipped per-test to exercise the card's no-parent fallback path. */
let mockHasParentNavigator = true;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    getParent: () =>
      mockHasParentNavigator ? { navigate: mockParentNavigate } : undefined,
  }),
}));

import { BidReviewCard } from '../BidReviewCard';

const BID = {
  id: 'bid-1',
  job_id: 'job-from-bid',
  contractor_id: 'contractor-1',
  amount: 450,
  message: 'Happy to take this on.',
  status: 'pending',
  created_at: '2026-07-01T10:00:00Z',
  contractor: {
    id: 'contractor-1',
    first_name: 'Sam',
    last_name: 'Fixit',
    rating: 4.8,
  },
} as unknown as Parameters<typeof BidReviewCard>[0]['bid'];

describe('BidReviewCard → contractor profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasParentNavigator = true;
  });

  it('passes the bid-review context so the profile can offer Message', () => {
    const { getByText } = render(<BidReviewCard bid={BID} jobId='job-123' />);

    fireEvent.press(getByText(/View Full Profile/i));

    expect(mockParentNavigate).toHaveBeenCalledWith('Modal', {
      screen: 'ContractorProfile',
      params: {
        contractorId: 'contractor-1',
        // The regression: without these two the Message CTA is suppressed.
        source: 'bidReview',
        jobId: 'job-123',
        bidId: 'bid-1',
      },
    });
  });

  it('falls back to the bid’s own job_id when no jobId prop is given', () => {
    const { getByText } = render(<BidReviewCard bid={BID} />);

    fireEvent.press(getByText(/View Full Profile/i));

    expect(mockParentNavigate).toHaveBeenCalledWith(
      'Modal',
      expect.objectContaining({
        params: expect.objectContaining({
          source: 'bidReview',
          jobId: 'job-from-bid',
        }),
      })
    );
  });

  it('sends the same params via the fallback navigator when there is no parent', () => {
    // Leaf navigator with no parent — the card's documented fallback path.
    mockHasParentNavigator = false;

    const { getByText } = render(<BidReviewCard bid={BID} jobId='job-123' />);
    fireEvent.press(getByText(/View Full Profile/i));

    expect(mockNavigate).toHaveBeenCalledWith(
      'Modal',
      expect.objectContaining({
        params: expect.objectContaining({
          source: 'bidReview',
          jobId: 'job-123',
          bidId: 'bid-1',
        }),
      })
    );
    expect(mockParentNavigate).not.toHaveBeenCalled();
  });
});
