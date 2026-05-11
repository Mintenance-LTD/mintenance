/**
 * Server-side aggregator for the dashboard right-rail "Needs you"
 * feed. Pure function — takes the already-fetched in-page data and
 * returns a polymorphic list of attention items the Mint Editorial
 * widget renders.
 *
 * Extracted out of `app/dashboard/page.tsx` to keep that file under
 * the 500-line MDC cap; logic is unchanged from the inline version.
 */

import type { Job } from './types';

export type NeedsYouItem =
  | {
      kind: 'bid';
      id: string;
      contractorName: string;
      jobTitle: string;
      jobId: string;
      amount: number;
    }
  | {
      kind: 'bidsClosing';
      id: string;
      jobTitle: string;
      jobId: string;
      bidCount: number;
      closesInHours: number;
    }
  | {
      kind: 'verifyProp';
      id: string;
      propertyName: string;
      address: string;
    };

interface PendingBidInput {
  id: string;
  contractorName: string;
  jobTitle: string;
  jobId: string;
  amount: number;
}

interface BidInput {
  status: string;
  job?: { id?: string } | null;
}

interface PropertyInput {
  id?: string | number;
  property_name?: string | null;
  address?: string | null;
  verified?: boolean;
  is_verified?: boolean;
}

export function buildNeedsYouFeed({
  pendingBids,
  allBids,
  postedJobs,
  properties,
  maxItems = 4,
}: {
  pendingBids: PendingBidInput[];
  allBids: BidInput[];
  postedJobs: Job[];
  properties: PropertyInput[];
  maxItems?: number;
}): NeedsYouItem[] {
  const items: NeedsYouItem[] = [];

  // 1) Top 2 pending bids.
  for (const bid of pendingBids.slice(0, 2)) {
    items.push({
      kind: 'bid',
      id: bid.id,
      contractorName: bid.contractorName,
      jobTitle: bid.jobTitle,
      jobId: bid.jobId,
      amount: bid.amount,
    });
  }

  // 2) Posted jobs with 2+ pending bids, 24h+ old. Heuristic SLA
  //    (48h - age) bounded at 4h floor.
  const bidsByJob = new Map<string, number>();
  for (const bid of allBids) {
    if (bid.status !== 'pending' || !bid.job?.id) continue;
    bidsByJob.set(bid.job.id, (bidsByJob.get(bid.job.id) || 0) + 1);
  }
  for (const job of postedJobs) {
    if (items.length >= maxItems) break;
    const count = bidsByJob.get(job.id) || 0;
    if (count < 2) continue;
    const ageHours = job.created_at
      ? Math.floor(
          (Date.now() - new Date(job.created_at).getTime()) / 3_600_000
        )
      : 0;
    if (ageHours < 24) continue;
    const closesIn = Math.max(4, 48 - ageHours);
    items.push({
      kind: 'bidsClosing',
      id: `closing-${job.id}`,
      jobTitle: job.title || 'Untitled job',
      jobId: job.id,
      bidCount: count,
      closesInHours: closesIn,
    });
  }

  // 3) Unverified properties.
  for (const prop of properties) {
    if (items.length >= maxItems) break;
    const verified = prop.verified === true || prop.is_verified === true;
    if (verified) continue;
    items.push({
      kind: 'verifyProp',
      id: String(prop.id ?? ''),
      propertyName: prop.property_name || 'Untitled property',
      address: prop.address || '',
    });
  }

  return items;
}
