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
 *
 * 2026-05-02 audit follow-up (98% readiness step 9): the prior fallback
 * for `requiresStepUp` was a `toast.error('… coming soon')` that left
 * admins with no way to complete the action. Replaced with an inline
 * step-up dialog (TOTP / backup-code) that POSTs to
 * /api/auth/mfa/step-up and, on success, replays the original mutation.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Star,
  MessageSquareReply,
  Shield,
} from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-dialog';

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

interface StepUpRequest {
  reviewId: string;
  action: 'approve' | 'block';
  maxAgeMinutes: number;
}

interface MfaStepUpDialogProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

/**
 * Minimal inline step-up dialog — TOTP by default, backup-code as the
 * fallback. CSRF is fetched lazily so the dialog doesn't ping the API
 * on every render. Two-state (loading/error) flow keeps the surface
 * simple and testable.
 */
function MfaStepUpDialog({ open, onCancel, onSuccess }: MfaStepUpDialogProps) {
  const [code, setCode] = useState('');
  const [method, setMethod] = useState<'totp' | 'backup_code'>('totp');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setCode('');
    setError(null);
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/csrf', { credentials: 'same-origin' });
        const data = await res.json();
        if (!cancelled && data?.csrfToken) setCsrfToken(data.csrfToken);
      } catch {
        // Non-fatal: the route also accepts the cookie-only path.
      }
    })();
    setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      cancelled = true;
    };
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 6) {
      setError('Enter a 6-digit code (or your full backup code).');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/mfa/step-up', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify({ code, method, maxAgeMinutes: 15 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success !== true) {
        setError(json?.error || 'Verification failed. Try again.');
        return;
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='mfa-step-up-title'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'
    >
      <form
        onSubmit={submit}
        className='w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl'
      >
        <div className='flex items-center gap-2 mb-3'>
          <Shield className='w-5 h-5 text-amber-600' />
          <h2
            id='mfa-step-up-title'
            className='text-lg font-bold text-gray-900'
          >
            Confirm your identity
          </h2>
        </div>
        <p className='text-sm text-gray-600 mb-4'>
          This admin action requires fresh MFA verification. Enter your code to
          continue.
        </p>

        <div className='space-y-3'>
          <div className='flex gap-2 text-xs'>
            <button
              type='button'
              onClick={() => setMethod('totp')}
              className={`px-2 py-1 rounded-lg font-semibold border ${
                method === 'totp'
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              Authenticator
            </button>
            <button
              type='button'
              onClick={() => setMethod('backup_code')}
              className={`px-2 py-1 rounded-lg font-semibold border ${
                method === 'backup_code'
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              Backup code
            </button>
          </div>
          <input
            ref={inputRef}
            type='text'
            inputMode={method === 'totp' ? 'numeric' : 'text'}
            autoComplete='one-time-code'
            value={code}
            onChange={(e) => setCode(e.target.value.trim())}
            placeholder={method === 'totp' ? '123456' : 'Backup code'}
            className='w-full rounded-lg border border-gray-300 px-3 py-2 text-base font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-amber-500'
            maxLength={16}
            required
          />
          {error ? (
            <p className='text-xs font-semibold text-red-600'>{error}</p>
          ) : null}
        </div>

        <div className='mt-5 flex justify-end gap-2'>
          <button
            type='button'
            onClick={onCancel}
            className='px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100'
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={submitting || !code}
            className='inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
          >
            {submitting ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <CheckCircle2 className='w-4 h-4' />
            )}
            Verify
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminReviewModerationPage() {
  const [rows, setRows] = useState<PendingReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [stepUpRequest, setStepUpRequest] = useState<StepUpRequest | null>(
    null
  );
  const confirm = useConfirm();

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

  async function performAction(
    reviewId: string,
    action: 'approve' | 'block',
    options: { confirmed?: boolean } = {}
  ): Promise<void> {
    const verb = action === 'approve' ? 'approve' : 'block';
    if (!options.confirmed) {
      const ok = await confirm(
        action === 'approve'
          ? {
              title: 'Publish this reply now?',
              description: 'This skips the remaining moderation window.',
              confirmText: 'Publish',
            }
          : {
              title: 'Block this reply?',
              description:
                'This reply will never be published. This is visible to the contractor in their review list.',
              confirmText: 'Block',
              destructive: true,
            }
      );
      if (!ok) return;
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
          // Park the action; resume after the step-up dialog succeeds.
          setStepUpRequest({
            reviewId,
            action,
            maxAgeMinutes:
              typeof json.maxAgeMinutes === 'number' ? json.maxAgeMinutes : 15,
          });
          return;
        }
        toast.error(json?.error?.message || `Could not ${verb} reply`);
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

  function doAction(reviewId: string, action: 'approve' | 'block') {
    void performAction(reviewId, action);
  }

  function onStepUpSuccess() {
    const parked = stepUpRequest;
    setStepUpRequest(null);
    if (!parked) return;
    // Skip the confirm() prompt the second time — the admin already
    // approved this action before the step-up was demanded.
    void performAction(parked.reviewId, parked.action, { confirmed: true });
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

      <MfaStepUpDialog
        open={stepUpRequest !== null}
        onCancel={() => {
          setStepUpRequest(null);
          toast('Verification cancelled. The action was not applied.');
        }}
        onSuccess={onStepUpSuccess}
      />
    </div>
  );
}
