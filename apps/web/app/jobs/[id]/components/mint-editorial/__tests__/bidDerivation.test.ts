import { describe, it, expect } from 'vitest';
import {
  pendingOnly,
  acceptedBidOf,
  bidContractorName,
  pickRecommended,
  median,
} from '../bidDerivation';
import type { Bid } from '../../BidCard';

/**
 * Guards the bidding-stage bug reported on live job #143A26: the page showed
 * "Bids · 0" and "Waiting for bids" on a job with an assigned contractor and
 * a signed contract, because every signal keyed off PENDING bids and the
 * single bid had been ACCEPTED.
 */

const bid = (over: Partial<Bid> = {}): Bid =>
  ({
    id: 'bid-1',
    amount: 15,
    status: 'pending',
    contractor: {
      id: 'c1',
      first_name: 'Djodjo',
      last_name: 'Nkouka',
      company_name: 'My company LTD',
      admin_verified: true,
      rating: 4.5,
    },
    ...over,
  }) as unknown as Bid;

describe('pendingOnly()', () => {
  it('keeps only pending bids', () => {
    const bids = [
      bid({ id: 'a', status: 'pending' }),
      bid({ id: 'b', status: 'accepted' }),
      bid({ id: 'c', status: 'rejected' }),
    ];
    expect(pendingOnly(bids).map((b) => b.id)).toEqual(['a']);
  });
});

describe('acceptedBidOf()', () => {
  it('finds the accepted bid once bidding has concluded', () => {
    // The live shape: one bid, accepted. pendingOnly() is empty here, which
    // is exactly why the page must not treat that as "no bids".
    const bids = [bid({ id: 'x', status: 'accepted', amount: 15 })];
    expect(pendingOnly(bids)).toHaveLength(0);
    expect(acceptedBidOf(bids)?.id).toBe('x');
  });

  it('is null while the job is still open for bids', () => {
    expect(acceptedBidOf([bid({ status: 'pending' })])).toBeNull();
    expect(acceptedBidOf([])).toBeNull();
  });

  it('ignores rejected bids', () => {
    expect(acceptedBidOf([bid({ status: 'rejected' })])).toBeNull();
  });
});

describe('bidContractorName()', () => {
  it('prefers the trading name', () => {
    expect(bidContractorName(bid())).toBe('My company LTD');
  });

  it('falls back to the person, then to a neutral label', () => {
    expect(
      bidContractorName(
        bid({
          contractor: {
            first_name: 'Djodjo',
            last_name: 'Nkouka',
          },
        } as Partial<Bid>)
      )
    ).toBe('Djodjo Nkouka');
    expect(bidContractorName(bid({ contractor: {} } as Partial<Bid>))).toBe(
      'your contractor'
    );
  });
});

describe('pickRecommended()', () => {
  it('returns null with nothing to score', () => {
    expect(pickRecommended([])).toBeNull();
  });

  it('prefers the higher-rated, verified contractor', () => {
    const weak = bid({
      id: 'weak',
      contractor: { rating: 3, admin_verified: false },
    } as Partial<Bid>);
    const strong = bid({
      id: 'strong',
      contractor: { rating: 5, admin_verified: true },
    } as Partial<Bid>);
    expect(pickRecommended([weak, strong])).toBe('strong');
  });
});

describe('median()', () => {
  it('handles empty, odd and even sets', () => {
    expect(median([])).toBe(0);
    expect(median([10, 30, 20])).toBe(20);
    expect(median([10, 20, 30, 40])).toBe(25);
  });
});
