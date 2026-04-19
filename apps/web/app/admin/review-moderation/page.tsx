'use client';

/**
 * Admin review-moderation queue — R7 #19 deferred follow-up #9.
 *
 * Lists contractor replies currently inside the 48h moderation window.
 * Admins can approve (publish immediately) or block (hide forever).
 *
 * Gated by the /admin layout + `withApiHandler({ roles: ['admin'] })` on
 * the backing API. Mutations require fresh MFA step-up server-side so a
 * stolen session alone can't silently censor replies.
 */

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Star,
  MessageSquareReply,
} from 'lucide-react';

interface PendingReply {
  id: string;
  rating: number;
  comment: string;
  response: string;
  respondedAt: string;
  publishesAt: string;
  reviewerName: string;
  contractorId: string;
  contractorName: string;
  jobTitle: string | null;
}

export default function AdminReviewModerationPage() {
  const [rows, setRows] = useState<PendingReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/review-moderation', {
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRows((json.reviews || []) as PendingReply[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function doAction(reviewId: string, action: 'approve' | 'block') {
    const verb = action === 'approve' ? 'approve' : 'block';
    if (
      !window.confirm(
        action === 'approve'
          ? 'Publish this reply now (skipping the remaining moderation window)?'
          : 'Block this reply from ever being published? This is visible to the contractor in their review list.'
      )
    ) {
      return;
    }
    setPendingAction(reviewId);
    try {
      const res = await fetch('/api/admin/review-moderation', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, action }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.requiresStepUp) {
          toast.error('MFA step-up required — prompt coming soon');
        } else {
          toast.error(json?.error?.message || `Could not ${verb} reply`);
        }
        return;
      }
      toast.success(action === 'approve' ? 'Reply published' : 'Reply blocked');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not ${verb}`);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <header className='mb-6'>
          <h1 className='text-2xl font-bold text-gray-900 flex items-center gap-2'>
            <MessageSquareReply className='w-6 h-6 text-amber-600' />
            Review-reply moderation
          </h1>
          <p className='text-sm text-gray-600 mt-1'>
            Contractor replies in the 48-hour moderation window. Approve
            publishes immediately. Block hides forever; contractor sees "blocked
            by moderation".
          </p>
        </header>

        {loading ? (
          <div className='py-16 flex justify-center'>
            <Loader2 className='w-8 h-8 animate-spin text-gray-400' />
          </div>
        ) : rows.length === 0 ? (
          <div className='bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-600'>
            Nothing pending. The queue is clean.
          </div>
        ) : (
          <ul className='space-y-4'>
            {rows.map((r) => {
              const publishes = new Date(r.publishesAt);
              const now = Date.now();
              const hoursLeft = Math.max(
                0,
                Math.round((publishes.getTime() - now) / (1000 * 60 * 60))
              );
              return (
                <li
                  key={r.id}
                  className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm'
                >
                  <div className='flex items-start justify-between gap-4 mb-3'>
                    <div>
                      <p className='text-sm text-gray-500'>
                        {r.reviewerName} →{' '}
                        <span className='font-semibold text-gray-800'>
                          {r.contractorName}
                        </span>
                        {r.jobTitle ? (
                          <span className='text-gray-500'> · {r.jobTitle}</span>
                        ) : null}
                      </p>
                      <div className='flex items-center gap-1 mt-1'>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`w-4 h-4 ${
                              n <= r.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className='inline-flex items-center gap-1 text-xs text-amber-700'>
                      <Clock className='w-3.5 h-3.5' />
                      Publishes in ~{hoursLeft}h
                    </div>
                  </div>

                  {r.comment ? (
                    <div className='text-sm text-gray-700 mb-3 bg-gray-50 rounded-lg p-3'>
                      <p className='text-xs font-semibold text-gray-500 mb-1'>
                        Original review
                      </p>
                      {r.comment}
                    </div>
                  ) : null}

                  <div className='text-sm text-gray-900 mb-4 bg-amber-50 border-l-4 border-amber-300 rounded-r-lg p-3'>
                    <p className='text-xs font-semibold text-amber-800 mb-1'>
                      Contractor reply
                    </p>
                    {r.response}
                  </div>

                  <div className='flex gap-2'>
                    <button
                      onClick={() => doAction(r.id, 'approve')}
                      disabled={pendingAction === r.id}
                      className='inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
                    >
                      <CheckCircle2 className='w-4 h-4' />
                      Approve now
                    </button>
                    <button
                      onClick={() => doAction(r.id, 'block')}
                      disabled={pendingAction === r.id}
                      className='inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
                    >
                      <XCircle className='w-4 h-4' />
                      Block
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
