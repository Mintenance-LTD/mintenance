/**
 * Helpers for the Mint Editorial /jobs/[id] surface. Pure functions —
 * kept out of the component file so the component stays under the
 * 500-line MDC cap and the lifecycle logic is unit-testable.
 *
 * Every value here is derived from REAL page-level data
 * (job.status, lifecycleData, contractor presence). No proxies, no
 * fake claims — the Phase-1 dashboard escrow mistake taught us.
 */

export type LifecyclePhaseStatus = 'done' | 'current' | 'pending';

export interface LifecyclePhase {
  id: string;
  label: string;
  status: LifecyclePhaseStatus;
}

export interface JobLifecycleInputs {
  jobStatus: string; // posted | assigned | in_progress | completed | …
  bidCount: number;
  contractorAssigned: boolean;
  contractStatus?: string | null; // pending_contractor | pending_homeowner | accepted | …
  escrowStatus?: string | null; // pending | held | release_pending | released | completed
  completionConfirmed: boolean;
}

function isEscrowFunded(escrowStatus?: string | null): boolean {
  if (!escrowStatus) return false;
  return ['held', 'release_pending', 'released', 'completed'].includes(
    escrowStatus
  );
}

function isEscrowReleased(escrowStatus?: string | null): boolean {
  if (!escrowStatus) return false;
  return ['released', 'completed'].includes(escrowStatus);
}

/**
 * Returns the eight canonical phases of the homeowner job lifecycle
 * with each phase marked done / current / pending. "Current" is the
 * first un-done phase; everything after stays pending.
 */
export function buildLifecyclePhases(
  inputs: JobLifecycleInputs
): LifecyclePhase[] {
  const {
    jobStatus,
    bidCount,
    contractorAssigned,
    contractStatus,
    escrowStatus,
    completionConfirmed,
  } = inputs;

  const phases: Array<Omit<LifecyclePhase, 'status'> & { done: boolean }> = [
    { id: 'posted', label: 'Job posted', done: true }, // page exists -> posted
    { id: 'bid', label: 'Bid received', done: bidCount > 0 },
    {
      id: 'accepted',
      label: 'Bid accepted',
      done: contractorAssigned,
    },
    {
      id: 'contract',
      label: 'Contract signed',
      done: contractStatus === 'accepted',
    },
    {
      id: 'escrow',
      label: 'Protected payment',
      done: isEscrowFunded(escrowStatus),
    },
    {
      id: 'in_progress',
      label: 'Work in progress',
      done: jobStatus === 'in_progress' || jobStatus === 'completed',
    },
    {
      id: 'completed',
      label: 'Completed',
      done: jobStatus === 'completed',
    },
    {
      id: 'paid',
      label: 'Approved & paid',
      done: completionConfirmed && isEscrowReleased(escrowStatus),
    },
  ];

  // First un-done phase is "current", everything after stays pending.
  let foundCurrent = false;
  return phases.map(({ done, ...rest }) => {
    if (done) return { ...rest, status: 'done' as const };
    if (!foundCurrent) {
      foundCurrent = true;
      return { ...rest, status: 'current' as const };
    }
    return { ...rest, status: 'pending' as const };
  });
}

export interface NextStepInfo {
  /** Short heading for the "Next step" panel. */
  title: string;
  /** Plain-English instruction for the homeowner. */
  body: string;
  /** Optional CTA — { label, hash } drops the user to an in-page anchor. */
  cta?: { label: string; href: string };
}

/**
 * Convenience wrapper for the job-detail component: assembles
 * JobLifecycleInputs from the shapes the page already holds.
 */
export function computeNextStepForJob(
  job: { id: string; status: string; contractor_id?: string | null },
  lifecycle: {
    bidCount: number;
    contractStatus?: string | null;
    escrowStatus?: string | null;
    completionConfirmed: boolean;
  }
): NextStepInfo {
  return computeNextStep(
    {
      jobStatus: job.status,
      bidCount: lifecycle.bidCount,
      contractorAssigned: !!job.contractor_id,
      contractStatus: lifecycle.contractStatus,
      escrowStatus: lifecycle.escrowStatus,
      completionConfirmed: lifecycle.completionConfirmed,
    },
    job.id
  );
}

/**
 * Maps real lifecycle state to a single concrete next-step instruction.
 * The copy stays calm and operational per the Mint voice guide — no
 * AI hype, just describes what the homeowner needs to do next.
 *
 * `jobId` is needed because the escrow-funding CTA must route to the
 * standalone /jobs/[id]/payment page — there is no payment surface on
 * the job detail page itself to anchor to.
 */
export function computeNextStep(
  inputs: JobLifecycleInputs,
  jobId: string
): NextStepInfo {
  const {
    jobStatus,
    bidCount,
    contractorAssigned,
    contractStatus,
    escrowStatus,
    completionConfirmed,
  } = inputs;

  if (escrowStatus === 'disputed' || jobStatus === 'disputed') {
    return {
      title: 'Dispute under review',
      body: 'Payment release is paused while the dispute is reviewed.',
    };
  }
  if (escrowStatus === 'refunded') {
    return {
      title: 'Payment refunded',
      body: 'View payment details for the confirmed refund.',
    };
  }
  if (jobStatus === 'posted' && bidCount === 0) {
    return {
      title: 'Waiting for bids',
      body: 'Verified local tradespeople usually respond within 24-48h. We will notify you when bids come in.',
    };
  }

  if (jobStatus === 'posted' && bidCount > 0) {
    return {
      title: `Review ${bidCount} ${bidCount === 1 ? 'bid' : 'bids'}`,
      body: 'Compare the bids below and approve the one you want to work with.',
      cta: { label: 'See bids', href: '#bids' },
    };
  }

  if (contractorAssigned && contractStatus !== 'accepted') {
    return {
      title: 'Sign the contract',
      body: 'A contract has been drafted. Both you and the contractor need to sign before work can start.',
      cta: { label: 'Review contract', href: '#contract-section' },
    };
  }

  if (contractStatus === 'accepted' && !isEscrowFunded(escrowStatus)) {
    return {
      title: 'Pay into escrow',
      body: 'Your payment is held until you approve the finished work. Funds only release on sign-off.',
      cta: { label: 'Pay now', href: `/jobs/${jobId}/payment` },
    };
  }

  if (jobStatus === 'in_progress') {
    return {
      title: 'Work in progress',
      body: 'Your contractor will upload "after" photos when finished. You will then approve the work to release payment.',
    };
  }

  if (jobStatus === 'completed' && !completionConfirmed) {
    return {
      title: 'Review the finished work',
      body: 'Compare the before / after photos and approve to release the held payment.',
      cta: { label: 'Open review', href: '#photo-review' },
    };
  }

  if (jobStatus === 'completed' && completionConfirmed) {
    return {
      title: isEscrowReleased(escrowStatus)
        ? 'Payment processed'
        : 'Work approved',
      body: isEscrowReleased(escrowStatus)
        ? 'View payment details for the confirmed release and any refund. Bank arrival may take additional time.'
        : 'Your approval is recorded. Payment release remains subject to the cooling-off period and final checks.',
    };
  }

  // Fallback — shouldn't fire unless a status combo we did not plan for
  // turns up. Stay neutral rather than claim a state we can't prove.
  return {
    title: 'In progress',
    body: 'This job is moving forward. Check back later for updates.',
  };
}
