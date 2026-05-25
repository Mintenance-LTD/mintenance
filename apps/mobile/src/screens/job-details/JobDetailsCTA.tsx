/**
 * JobDetailsCTA - Priority-based sticky bottom CTA for job details.
 *
 * Decides which single CTA to show based on job status, user role,
 * contract status, escrow status, and bid state.
 */
import React from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StickyBottomCTA } from '../../components/ui/StickyBottomCTA';
import type { JobsStackParamList } from '../../navigation/types';
import type { Job } from '@mintenance/types';

type JobDetailsScreenNavigationProp = NativeStackNavigationProp<
  JobsStackParamList,
  'JobDetails'
>;

export interface CTAContext {
  job: Job & {
    bids?: { length: number }[];
    completion_confirmed_by_homeowner?: boolean;
  };
  isOwner: boolean;
  isContractor: boolean;
  userId: string | undefined;
  budget: number;
  navigation: JobDetailsScreenNavigationProp;
  contractStatus: string | null;
  escrowStatus: string | null;
  hasReviewed: boolean;
  // Dual-key check: bids come from both camelCase (Bid type) and snake_case (raw Supabase) formats
  bidsArray: Array<{
    id: string;
    contractorId?: string;
    contractor_id?: string;
    status?: string;
    amount?: number;
  }>;
}

/**
 * Returns exactly one CTA element (or null) based on priority order.
 * Contractor CTAs are checked first, then homeowner CTAs.
 */
export function getPriorityCTA({
  job,
  isOwner,
  isContractor,
  userId,
  budget,
  navigation,
  contractStatus,
  escrowStatus,
  hasReviewed,
  bidsArray,
}: CTAContext): React.ReactElement | null {
  const isAssignedContractor = isContractor && job.contractor_id === userId;

  if (isContractor && job.status === 'posted') {
    // Check if this contractor already has a bid on this job
    const myBid = userId
      ? bidsArray.find(
          (b) => b.contractorId === userId || b.contractor_id === userId
        )
      : null;

    if (myBid) {
      // Contractor already bid -- show status instead of submit
      const bidStatus =
        myBid.status === 'pending'
          ? 'Pending'
          : myBid.status === 'accepted'
            ? 'Accepted'
            : myBid.status || 'Sent';
      return (
        <StickyBottomCTA
          price={myBid.amount ? myBid.amount : undefined}
          priceLabel='Your bid'
          buttonText={`Bid ${bidStatus} — Edit Bid`}
          onPress={() =>
            navigation.navigate('BidSubmission', {
              jobId: job.id,
              existingBidId: myBid.id,
            })
          }
          secondaryText='Your bid has been submitted'
        />
      );
    }

    return (
      <StickyBottomCTA
        // 2026-05-22: homeowner-set budget no longer surfaced on the
        // Submit Bid CTA — contractors price each bid themselves.
        price={undefined}
        priceLabel='Estimated budget'
        buttonText='Submit Bid'
        onPress={() => navigation.navigate('BidSubmission', { jobId: job.id })}
      />
    );
  }

  // Contractor stages matching web app workflow:
  // 1. contract_preparing: no contract or draft -> "Prepare Contract"
  if (
    isAssignedContractor &&
    job.status === 'assigned' &&
    (!contractStatus ||
      contractStatus === 'draft' ||
      contractStatus === 'pending_contractor')
  ) {
    return (
      <StickyBottomCTA
        buttonText='Prepare Contract'
        onPress={() =>
          navigation.navigate('ContractPreparation', {
            jobId: job.id,
            jobTitle: job.title,
          })
        }
        secondaryText='Create contract with your business details and terms'
      />
    );
  }

  // 2. contract_pending: contractor needs to sign -> "Sign Contract"
  if (
    isAssignedContractor &&
    job.status === 'assigned' &&
    contractStatus === 'pending_homeowner'
  ) {
    return (
      <StickyBottomCTA
        buttonText='Waiting for Homeowner'
        onPress={() => navigation.navigate('ContractView', { jobId: job.id })}
        secondaryText='Homeowner needs to review and sign'
      />
    );
  }

  // 3. awaiting_payment: both signed, waiting for escrow -> "Waiting for Payment"
  if (
    isAssignedContractor &&
    job.status === 'assigned' &&
    contractStatus === 'accepted' &&
    escrowStatus !== 'held'
  ) {
    // 2026-05-26 audit-53 P2: distinguish 'pending' (Stripe charged,
    // webhook still landing) from "no escrow yet". On 'pending' the
    // homeowner has paid — telling the contractor "homeowner needs to
    // deposit" is wrong; the truth is "settling now". When the webhook
    // finishes or the homeowner re-opens the screen (forcing a refetch
    // after audit-53 P1's confirm-intent call), this transitions to
    // 'held' and CTA 4 fires.
    const isSettling = escrowStatus === 'pending';
    return (
      <StickyBottomCTA
        buttonText={isSettling ? 'Payment Settling' : 'Waiting for Payment'}
        onPress={() => navigation.navigate('ContractView', { jobId: job.id })}
        secondaryText={
          isSettling
            ? 'Homeowner has paid — escrow is settling and will be ready in a moment.'
            : 'Homeowner needs to deposit payment into escrow'
        }
        disabled={isSettling}
      />
    );
  }

  // 4. ready_to_start: escrow held -> "Upload Before Photos"
  if (
    isAssignedContractor &&
    job.status === 'assigned' &&
    contractStatus === 'accepted' &&
    escrowStatus === 'held'
  ) {
    return (
      <StickyBottomCTA
        buttonText='Upload Before Photos'
        onPress={() =>
          navigation.navigate('PhotoUpload', {
            jobId: job.id,
            photoType: 'before',
          })
        }
        secondaryText='Required before starting work'
      />
    );
  }

  if (isAssignedContractor && job.status === 'in_progress') {
    return (
      <StickyBottomCTA
        buttonText='Upload After Photos'
        onPress={() =>
          navigation.navigate('PhotoUpload', {
            jobId: job.id,
            photoType: 'after',
          })
        }
        secondaryText='Document completed work'
      />
    );
  }

  if (isOwner && job.status === 'posted' && bidsArray.length > 0) {
    return (
      <StickyBottomCTA
        buttonText={`View ${bidsArray.length} Bid${bidsArray.length !== 1 ? 's' : ''}`}
        onPress={() => navigation.navigate('BidReview', { jobId: job.id })}
        secondaryText='Review contractor bids'
      />
    );
  }

  if (
    isOwner &&
    job.status === 'assigned' &&
    (contractStatus === 'draft' || contractStatus === 'pending_contractor')
  ) {
    return (
      <StickyBottomCTA
        buttonText='Waiting for Contractor'
        onPress={() => navigation.navigate('ContractView', { jobId: job.id })}
        secondaryText='Contractor is preparing the contract'
        disabled
      />
    );
  }

  if (
    isOwner &&
    job.status === 'assigned' &&
    contractStatus &&
    contractStatus !== 'accepted' &&
    contractStatus !== 'draft' &&
    contractStatus !== 'pending_contractor'
  ) {
    return (
      <StickyBottomCTA
        buttonText='View & Sign Contract'
        onPress={() => navigation.navigate('ContractView', { jobId: job.id })}
        secondaryText='Review and sign contract'
      />
    );
  }

  if (
    isOwner &&
    job.status === 'assigned' &&
    contractStatus === 'accepted' &&
    escrowStatus !== 'held'
  ) {
    // 2026-05-26 audit-53 P2: when escrow exists as 'pending' (Stripe
    // already charged, webhook still landing) showing "Pay Now" again
    // invited duplicate payment attempts. The homeowner pressing the
    // button a second time would re-run create-intent and could
    // potentially double-charge. Surface a settling state instead;
    // the screen refetches on focus and will transition to the next
    // CTA once escrow flips to 'held'.
    if (escrowStatus === 'pending') {
      return (
        <StickyBottomCTA
          buttonText='Payment Settling'
          onPress={() => navigation.navigate('ContractView', { jobId: job.id })}
          secondaryText='Your payment is being placed in escrow — this usually takes a few seconds.'
          disabled
        />
      );
    }

    // 2026-05-24 audit-26 P1: pre-open-bidding the gate was `budget > 0`
    // and the payable amount fell back to budget. With open-bidding,
    // jobs.budget is nullable and is NOT the source of truth for the
    // payable amount — the accepted bid is. Gating on budget meant
    // budget-less jobs with accepted bids couldn't proceed to escrow.
    // Now: use acceptedBid.amount if available; only fall back to
    // budget as the legacy path. Show the CTA whenever there's any
    // positive amount to charge.
    const acceptedBid = bidsArray.find(
      (b: { status?: string; amount?: number }) => b.status === 'accepted'
    );
    const amount = acceptedBid?.amount ?? (budget > 0 ? budget : 0);
    if (amount > 0) {
      return (
        <StickyBottomCTA
          price={amount}
          priceLabel='Bid amount'
          buttonText='Pay Now'
          onPress={() =>
            navigation.navigate('JobPayment', {
              jobId: job.id,
              amount,
              contractorId: job.contractor_id || '',
            })
          }
          secondaryText='Secure payment in escrow'
        />
      );
    }
  }

  if (
    isOwner &&
    job.status === 'completed' &&
    !job.completion_confirmed_by_homeowner
  ) {
    return (
      <StickyBottomCTA
        buttonText='Review Work'
        onPress={() => navigation.navigate('PhotoReview', { jobId: job.id })}
        secondaryText='Compare before & after photos'
      />
    );
  }

  if (
    isOwner &&
    job.status === 'completed' &&
    job.completion_confirmed_by_homeowner &&
    !hasReviewed
  ) {
    return (
      <StickyBottomCTA
        buttonText='Leave a Review'
        onPress={() =>
          navigation.navigate('ReviewSubmission', {
            jobId: job.id,
            jobTitle: job.title,
            contractorName: undefined,
          })
        }
        secondaryText='Rate your experience'
      />
    );
  }

  // 2026-05-24 audit-27 P1: reciprocal contractor → homeowner review.
  // /api/jobs/:id/review accepts reviews from either party on a
  // completed job (the role gate is { homeowner | contractor }, and
  // revieweeId is derived from `isHomeowner ? contractor_id :
  // homeowner_id`). Mobile only surfaced the CTA for isOwner, so
  // assigned contractors had no way to rate the homeowner after the
  // job wrapped. The escrow release isn't gated on this — it's
  // optional reputation/trust signal — but the API supported it and
  // the web side already exposes the contractor flow, so the mobile
  // side was just missing the entry point.
  if (
    isAssignedContractor &&
    job.status === 'completed' &&
    job.completion_confirmed_by_homeowner &&
    !hasReviewed
  ) {
    return (
      <StickyBottomCTA
        buttonText='Leave a Review'
        onPress={() =>
          navigation.navigate('ReviewSubmission', {
            jobId: job.id,
            jobTitle: job.title,
            contractorName: undefined,
          })
        }
        secondaryText='Rate the homeowner'
      />
    );
  }

  return null;
}
