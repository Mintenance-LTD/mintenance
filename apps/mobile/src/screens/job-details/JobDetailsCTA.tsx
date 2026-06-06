/**
 * JobDetailsCTA - Priority-based sticky bottom CTA for job details.
 *
 * Decides which single CTA to show based on job status, user role,
 * contract status, escrow status, and bid state.
 */
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StickyBottomCTA } from '../../components/ui/StickyBottomCTA';
import type { JobsStackParamList } from '../../navigation/types';
import type { Job } from '@mintenance/types';
import { JobService } from '../../services/JobService';
import { queryKeys } from '../../lib/queryClient';
import { ReadyToStartCTA } from './ReadyToStartCTA';
import { isEscrowFunded, isEscrowHeldOnly } from '../../utils/escrowStatus';

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
  // 2026-05-25 audit-P0-3: count of before-photos already uploaded for
  // this job. When > 0 in the ready_to_start branch, the CTA shows
  // "Start Job" directly instead of "Upload Before Photos" — without
  // this, a contractor returning to the screen after a previous upload
  // session has no path to start the job, which is the root cause of
  // the 6-assigned-but-0-in_progress live state.
  beforePhotoCount: number;
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
  beforePhotoCount,
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
      // 2026-05-26 audit-66 P1: only pending bids can be PATCHed
      // (`api/jobs/[id]/bids/[bidId]/route.ts` enforces
      // `bid.status !== 'pending' → 400`). Previously every existing
      // bid surfaced an "Edit Bid" CTA that 400'd for rejected /
      // withdrawn / accepted bids. Split the rendering:
      //   - pending  → "Edit Bid" CTA (existingBidId flow)
      //   - withdrawn → "Submit a New Bid" (submit-bid revives
      //     withdrawn → pending per audit-31 P1)
      //   - rejected → status-only (cannot re-bid on rejection per
      //     the same audit)
      //   - accepted → status-only (job moved past bidding)
      const status = (myBid.status || 'sent').toLowerCase();
      const isEditable = status === 'pending';
      const canResubmit = status === 'withdrawn';
      const statusLabel =
        status === 'pending'
          ? 'Pending'
          : status === 'accepted'
            ? 'Accepted'
            : status === 'rejected'
              ? 'Not selected'
              : status === 'withdrawn'
                ? 'Withdrawn'
                : status.charAt(0).toUpperCase() + status.slice(1);
      if (isEditable) {
        return (
          <StickyBottomCTA
            price={myBid.amount ? myBid.amount : undefined}
            priceLabel='Your bid'
            buttonText={`Bid ${statusLabel} — Edit Bid`}
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
      if (canResubmit) {
        return (
          <StickyBottomCTA
            price={undefined}
            priceLabel='Your bid'
            buttonText='Submit a New Bid'
            onPress={() =>
              navigation.navigate('BidSubmission', { jobId: job.id })
            }
            secondaryText={`Your previous bid was ${statusLabel.toLowerCase()}.`}
          />
        );
      }
      // Accepted / rejected: status-only, no destination
      return (
        <StickyBottomCTA
          price={myBid.amount ? myBid.amount : undefined}
          priceLabel='Your bid'
          buttonText={`Bid ${statusLabel}`}
          onPress={() => {}}
          secondaryText={
            status === 'accepted'
              ? 'You won this job — wait for the homeowner to fund escrow.'
              : 'This bid is no longer editable.'
          }
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
  // 2026-05-27 audit-83 P1: use the shared isEscrowFunded predicate
  // instead of strict `=== 'held'`. After homeowner approval escrow
  // transitions held → release_pending → completed before the job
  // status flips; without the broader predicate the contractor sees
  // a misleading "Waiting for Payment" CTA during that window.
  if (
    isAssignedContractor &&
    job.status === 'assigned' &&
    contractStatus === 'accepted' &&
    !isEscrowFunded(escrowStatus)
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

  // 4. ready_to_start: escrow held. Two sub-states:
  //    - No before-photos yet: prompt to upload (status quo)
  //    - Before-photos exist: prompt to Start Job directly.
  //
  // 2026-05-25 audit-P0-3: prior to this split, the only "Start Job"
  // surface lived as a one-shot Alert at the end of a successful upload
  // in PhotoUpload screen. Contractors who uploaded, closed the app,
  // and returned later had no path to start — the screen always showed
  // "Upload Before Photos" until status flipped to in_progress. Live
  // data: 6 assigned jobs, 0 in_progress, with 3 before-photos already
  // uploaded server-side.
  // 2026-05-27 audit-83 P1: "ready to start" needs escrow funded but
  // not yet released. isEscrowHeldOnly = funded && !released so the
  // CTA correctly suppresses once payout fires (job has already
  // completed by then).
  if (
    isAssignedContractor &&
    job.status === 'assigned' &&
    contractStatus === 'accepted' &&
    isEscrowHeldOnly(escrowStatus)
  ) {
    if (beforePhotoCount > 0) {
      return (
        <ReadyToStartCTA
          jobId={job.id}
          onStarted={() => {
            // Caller (JobDetailsScreen) will refetch on focus + status
            // change; nothing else to do here.
          }}
        />
      );
    }
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

  // 2026-05-27 audit-83 P1: same broader-funded predicate for the
  // homeowner "Pay Now" branch. Without it, a homeowner whose escrow
  // has transitioned past held (release_pending / completed) would
  // briefly see "Pay Now" again and could re-trigger create-intent,
  // risking a duplicate charge.
  if (
    isOwner &&
    job.status === 'assigned' &&
    contractStatus === 'accepted' &&
    !isEscrowFunded(escrowStatus)
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
              jobTitle: job.title,
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
