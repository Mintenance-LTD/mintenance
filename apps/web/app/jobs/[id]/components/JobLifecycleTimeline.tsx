import React from 'react';
import Link from 'next/link';

/* ==========================================
   TYPE DEFINITIONS
   ========================================== */

interface LifecycleStep {
  label: string;
  status: 'completed' | 'current' | 'upcoming';
}

export interface JobLifecycleTimelineProps {
  jobStatus: string;
  contractStatus: string;
  escrowStatus: string;
  bidCount: number;
  completionConfirmed: boolean;
}

export interface NextActionCardProps {
  jobId: string;
  jobStatus: string;
  contractStatus: string;
  escrowStatus: string;
  bidCount: number;
  pendingBidCount: number;
  completionConfirmed: boolean;
}

/* ==========================================
   JOB LIFECYCLE TIMELINE COMPONENT
   ========================================== */

export function JobLifecycleTimeline({
  jobStatus,
  contractStatus,
  escrowStatus,
  bidCount,
  completionConfirmed,
}: JobLifecycleTimelineProps) {
  const steps: LifecycleStep[] = [];

  // Step 1: Posted
  const isPosted = true; // Always completed if we can see the job
  steps.push({ label: 'Job Posted', status: isPosted ? 'completed' : 'upcoming' });

  // Step 2: Bids Received
  const hasBids = bidCount > 0;
  const isBidsStep = jobStatus === 'posted' && !hasBids;
  steps.push({
    label: hasBids ? `${bidCount} Bid${bidCount !== 1 ? 's' : ''} Received` : 'Awaiting Bids',
    status: isBidsStep ? 'current' : hasBids ? 'completed' : 'upcoming',
  });

  // Step 3: Bid Accepted
  const bidAccepted = ['assigned', 'in_progress', 'completed'].includes(jobStatus);
  const isBidReview = jobStatus === 'posted' && hasBids;
  steps.push({
    label: 'Bid Accepted',
    status: isBidReview ? 'current' : bidAccepted ? 'completed' : 'upcoming',
  });

  // Step 4: Contract Signed
  const contractSigned = contractStatus === 'accepted';
  const isContractStep = bidAccepted && !contractSigned && contractStatus !== 'none';
  steps.push({
    label: 'Contract Signed',
    status: isContractStep ? 'current' : contractSigned ? 'completed' : 'upcoming',
  });

  // Step 5: Payment Secured
  const paymentSecured = ['held', 'release_pending', 'released'].includes(escrowStatus);
  const isPaymentStep = contractSigned && !paymentSecured;
  steps.push({
    label: 'Payment in Escrow',
    status: isPaymentStep ? 'current' : paymentSecured ? 'completed' : 'upcoming',
  });

  // Step 6: Work In Progress
  const workStarted = ['in_progress', 'completed'].includes(jobStatus);
  const isWorkStep = jobStatus === 'assigned' && paymentSecured;
  steps.push({
    label: 'Work In Progress',
    status: isWorkStep ? 'current' : workStarted ? 'completed' : 'upcoming',
  });

  // Step 7: Completed
  const isCompleted = jobStatus === 'completed';
  const isCompletionStep = isCompleted && !completionConfirmed;
  steps.push({
    label: 'Completed',
    status: isCompletionStep ? 'current' : completionConfirmed ? 'completed' : 'upcoming',
  });

  // Step 8: Approved & Paid
  steps.push({
    label: 'Approved & Paid',
    status: completionConfirmed ? 'completed' : 'upcoming',
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-5">
        Job Progress
      </h3>
      <div className="space-y-0">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-start gap-3">
            {/* Vertical line + circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                  step.status === 'completed'
                    ? 'bg-emerald-500 border-emerald-500'
                    : step.status === 'current'
                      ? 'bg-teal-500 border-teal-500 animate-pulse'
                      : 'bg-white border-gray-300'
                }`}
              >
                {step.status === 'completed' && (
                  <svg className="w-full h-full text-white" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 7L6 9.5L10.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-0.5 h-6 ${
                  step.status === 'completed' ? 'bg-emerald-300' : 'bg-gray-200'
                }`} />
              )}
            </div>
            {/* Label */}
            <span className={`text-sm pt-px ${
              step.status === 'completed'
                ? 'text-gray-900 font-medium'
                : step.status === 'current'
                  ? 'text-teal-700 font-semibold'
                  : 'text-gray-400'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==========================================
   NEXT ACTION CARD COMPONENT
   ========================================== */

export function NextActionCard({
  jobId,
  jobStatus,
  contractStatus,
  escrowStatus,
  bidCount,
  pendingBidCount,
  completionConfirmed,
}: NextActionCardProps) {
  let message = '';
  let ctaLabel = '';
  let ctaHref = '';
  let urgency: 'info' | 'action' | 'urgent' = 'info';

  if (jobStatus === 'posted' && pendingBidCount > 0) {
    message = `You have ${pendingBidCount} pending bid${pendingBidCount !== 1 ? 's' : ''} to review. Compare contractors and accept the best offer.`;
    ctaLabel = 'Review Bids';
    ctaHref = '#bids-section';
    urgency = 'action';
  } else if (jobStatus === 'posted') {
    message = 'Your job is live. Contractors in your area will be able to see and bid on it.';
    ctaLabel = '';
    urgency = 'info';
  } else if (jobStatus === 'assigned' && contractStatus === 'pending') {
    message = 'A contract has been created. Review the terms and sign to proceed with the job.';
    ctaLabel = 'Review Contract';
    ctaHref = '#contract-section';
    urgency = 'action';
  } else if (jobStatus === 'assigned' && contractStatus === 'accepted' && !['held', 'release_pending', 'released'].includes(escrowStatus)) {
    message = 'Both parties have signed the contract. Make payment to secure funds in escrow so work can begin.';
    ctaLabel = 'Make Payment';
    ctaHref = `/jobs/${jobId}/payment`;
    urgency = 'urgent';
  } else if (jobStatus === 'assigned') {
    message = 'Payment is secured. The contractor will begin work soon. You\'ll receive updates as the job progresses.';
    urgency = 'info';
  } else if (jobStatus === 'in_progress') {
    message = 'Work is underway. The contractor will upload completion photos when the job is done.';
    urgency = 'info';
  } else if (jobStatus === 'completed' && !completionConfirmed) {
    message = 'The contractor has completed the work. Review the before/after photos and approve to release payment.';
    ctaLabel = 'Review & Approve';
    ctaHref = '#photo-review';
    urgency = 'urgent';
  } else if (completionConfirmed) {
    message = 'This job is complete. Payment has been released to the contractor.';
    urgency = 'info';
  } else {
    return null;
  }

  const bgColors = {
    info: 'bg-blue-50 border-blue-200',
    action: 'bg-amber-50 border-amber-200',
    urgent: 'bg-rose-50 border-rose-200',
  };

  const textColors = {
    info: 'text-blue-800',
    action: 'text-amber-800',
    urgent: 'text-rose-800',
  };

  const btnColors = {
    info: '',
    action: 'bg-amber-600 hover:bg-amber-700 text-white',
    urgent: 'bg-rose-600 hover:bg-rose-700 text-white',
  };

  const handleCta = (e: React.MouseEvent) => {
    if (ctaHref.startsWith('#')) {
      e.preventDefault();
      const el = document.getElementById(ctaHref.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`rounded-xl border p-5 ${bgColors[urgency]}`}>
      <div className="flex items-start gap-2.5 mb-3">
        {urgency === 'urgent' && (
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse flex-shrink-0 mt-1" />
        )}
        {urgency === 'action' && (
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0 mt-1" />
        )}
        <div>
          <h4 className={`text-sm font-semibold mb-1 ${textColors[urgency]}`}>
            {urgency === 'urgent' ? 'Action Required' : urgency === 'action' ? 'Next Step' : 'Status'}
          </h4>
          <p className={`text-sm ${textColors[urgency]} opacity-90`}>{message}</p>
        </div>
      </div>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          onClick={handleCta}
          className={`block w-full text-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${btnColors[urgency]}`}
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
