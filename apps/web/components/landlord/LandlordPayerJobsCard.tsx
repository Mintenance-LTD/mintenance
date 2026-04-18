'use client';

/**
 * LandlordPayerJobsCard — deferred follow-up #4 of the R6 landlord story.
 *
 * Dashboard card for users who were designated as the payer on someone
 * else's job (landlord / letting agent / parent). Lists the jobs that
 * need their funding and links through to /jobs/[id] where the existing
 * "Pay Now" button is already gated on payer_user_id.
 *
 * Renders nothing when the list is empty — non-landlord homeowners never
 * see the card at all.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PoundSterling,
  Home,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface PayerJob {
  id: string;
  title: string;
  status: string;
  budget: number | null;
  category: string | null;
  isRentalProperty: boolean;
  createdAt: string;
  homeowner: { id: string; name: string };
  contractor: { id: string; name: string } | null;
  contractStatus: string | null;
  escrowStatus: string | null;
  acceptedBidAmount: number | null;
  payerState: 'awaiting_contract' | 'awaiting_funding' | 'funded' | 'completed';
}

const STATE_LABEL: Record<PayerJob['payerState'], string> = {
  awaiting_contract: 'Contract pending',
  awaiting_funding: 'Awaiting your payment',
  funded: 'Funded · held in escrow',
  completed: 'Completed',
};

function stateIcon(state: PayerJob['payerState']) {
  switch (state) {
    case 'awaiting_funding':
      return <AlertTriangle className='w-4 h-4 text-amber-600' />;
    case 'funded':
      return <CheckCircle2 className='w-4 h-4 text-emerald-600' />;
    case 'completed':
      return <CheckCircle2 className='w-4 h-4 text-gray-500' />;
    default:
      return <Clock className='w-4 h-4 text-gray-500' />;
  }
}

export function LandlordPayerJobsCard() {
  const [jobs, setJobs] = useState<PayerJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/jobs-as-payer', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { jobs: [] }))
      .then((j) => {
        if (!cancelled) setJobs((j.jobs || []) as PayerJob[]);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Don't render the card at all if we're still loading OR the user
  // doesn't have any delegated-payer jobs — avoids dashboard clutter.
  if (loading || jobs.length === 0) return null;

  const awaitingCount = jobs.filter(
    (j) => j.payerState === 'awaiting_funding'
  ).length;

  return (
    <div className='bg-white border border-amber-200 rounded-xl shadow-sm p-6'>
      <div className='flex items-center gap-2 mb-1'>
        <PoundSterling className='w-5 h-5 text-amber-700' />
        <h3 className='text-lg font-semibold text-gray-900'>
          Jobs posted for you
        </h3>
      </div>
      <p className='text-sm text-gray-600 mb-4'>
        {awaitingCount > 0
          ? `${awaitingCount} job${awaitingCount === 1 ? '' : 's'} need${awaitingCount === 1 ? 's' : ''} your payment.`
          : 'All jobs up to date. Nothing to fund right now.'}
      </p>
      <ul className='divide-y divide-gray-100'>
        {jobs.map((j) => {
          const amount =
            j.acceptedBidAmount != null
              ? j.acceptedBidAmount
              : (j.budget ?? null);
          return (
            <li
              key={j.id}
              className='py-3 flex items-center justify-between gap-4'
            >
              <div className='min-w-0'>
                <p className='font-medium text-gray-900 truncate'>{j.title}</p>
                <div className='mt-1 flex items-center gap-3 text-xs text-gray-600'>
                  <span className='inline-flex items-center gap-1'>
                    <User className='w-3 h-3' /> {j.homeowner.name}
                  </span>
                  {j.contractor && (
                    <span className='inline-flex items-center gap-1'>
                      <Home className='w-3 h-3' /> {j.contractor.name}
                    </span>
                  )}
                  {amount != null && (
                    <span className='font-semibold text-gray-800'>
                      £{amount.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className='mt-1 inline-flex items-center gap-1 text-xs'>
                  {stateIcon(j.payerState)}
                  <span
                    className={
                      j.payerState === 'awaiting_funding'
                        ? 'text-amber-700 font-semibold'
                        : 'text-gray-600'
                    }
                  >
                    {STATE_LABEL[j.payerState]}
                  </span>
                </div>
              </div>
              <Link
                href={`/jobs/${j.id}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold shrink-0 ${
                  j.payerState === 'awaiting_funding'
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {j.payerState === 'awaiting_funding' ? 'Pay now' : 'View'}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
