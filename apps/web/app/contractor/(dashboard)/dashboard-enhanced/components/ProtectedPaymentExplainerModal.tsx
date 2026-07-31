'use client';

/**
 * ProtectedPaymentExplainerModal — one-time contractor-only modal that
 * reframes Mintenance's payment custody from the contractor's side.
 *
 * R2 #21 of docs/RETENTION_ROADMAP_2026.md. Source-PDF §4.3 contractor
 * mental model "who protects me if the homeowner is the dodgy one?".
 *
 * Dismissal is persisted in localStorage (client-only) so one visit
 * clears it permanently. Note: NOT server-persisted — a fresh browser
 * will show it again. For a single authoritative dismissal flag we'd
 * write to `profiles.settings` (follow-up).
 */

import React, { useEffect, useState } from 'react';
import { Shield, CheckCircle, Clock, ArrowRight, X } from 'lucide-react';

const STORAGE_KEY = 'mintenance.contractor.protectedPaymentSeen';

interface Props {
  /** Optionally force open regardless of the seen flag (for replay). */
  force?: boolean;
}

export function ProtectedPaymentExplainerModal({ force }: Props = {}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (force) {
      setOpen(true);
      return;
    }
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) setOpen(true);
    } catch {
      // localStorage disabled — fail open (show it).
      setOpen(true);
    }
  }, [force]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // ignored
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role='dialog'
      aria-labelledby='ppe-title'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
    >
      <div className='bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden'>
        <div className='bg-emerald-600 text-white px-6 py-5 flex items-start justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center'>
              <Shield className='w-5 h-5' />
            </div>
            <div>
              <h2 id='ppe-title' className='text-lg font-bold'>
                Protected Payment works for you too
              </h2>
              <p className='text-xs opacity-90 mt-0.5'>
                One quick explainer before you start bidding
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label='Dismiss'
            className='text-white/80 hover:text-white transition'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='px-6 py-5 space-y-4 text-sm text-gray-700'>
          <p>
            The average UK trade chases <strong>£6,121</strong> in unpaid
            invoices. On Mintenance, the money is funded before you arrive and
            released on approval — no chasing.
          </p>

          <div className='space-y-3'>
            <div className='flex gap-3'>
              <CheckCircle className='w-5 h-5 text-emerald-600 shrink-0 mt-0.5' />
              <div>
                <div className='font-semibold text-gray-900'>
                  Funded before you start
                </div>
                <div className='text-xs text-gray-500'>
                  Homeowner money lands in Protected Payment the moment the
                  contract is signed. If they don&rsquo;t fund, you don&rsquo;t
                  travel.
                </div>
              </div>
            </div>
            <div className='flex gap-3'>
              <Clock className='w-5 h-5 text-emerald-600 shrink-0 mt-0.5' />
              <div>
                <div className='font-semibold text-gray-900'>
                  Auto-release after 7 days
                </div>
                <div className='text-xs text-gray-500'>
                  If the homeowner doesn&rsquo;t respond to your completion
                  photos within a week, payment releases automatically.
                </div>
              </div>
            </div>
            <div className='flex gap-3'>
              <Shield className='w-5 h-5 text-emerald-600 shrink-0 mt-0.5' />
              <div>
                <div className='font-semibold text-gray-900'>
                  Dispute support
                </div>
                <div className='text-xs text-gray-500'>
                  If things go wrong, Mintenance mediates with evidence from
                  both sides — you&rsquo;re not on your own.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='px-6 pb-5 flex justify-end'>
          <button
            onClick={dismiss}
            className='inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition'
          >
            Got it
            <ArrowRight className='w-4 h-4' />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProtectedPaymentExplainerModal;
