'use client';

/**
 * /refer/[code] — R7 #8 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Public landing for neighbour-referral links. If the viewer isn't
 * signed in, we show the signup CTA + stash the code in localStorage
 * so /register can POST it to /api/referrals/apply immediately after.
 * If they ARE signed in, we apply the code right away.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface Preview {
  valid: boolean;
  reason?: string;
  code?: string;
  postcodePrefix?: string;
  referrerFirstName?: string;
  rewardPence?: number;
}

export default function ReferPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/referrals/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((j) => setPreview(j as Preview))
      .catch(() =>
        setPreview({ valid: false, reason: 'Could not load invite.' })
      );
  }, [code]);

  async function apply() {
    setApplying(true);
    try {
      const res = await fetch('/api/referrals/apply', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (res.status === 401) {
        // Not signed in — stash and send to signup.
        try {
          window.localStorage.setItem('pending_referral_code', code);
        } catch {
          /* ignore */
        }
        router.replace(
          `/register?returnUrl=${encodeURIComponent(`/refer/${code}`)}`
        );
        return;
      }
      const j = await res.json();
      if (j.redeemed) {
        setApplied(true);
        setAppliedMessage(
          `Nice — £${((preview?.rewardPence ?? 2000) / 100).toFixed(0)} will land on your account when you complete your first job.`
        );
      } else {
        setAppliedMessage(j.reason || 'Invite not available.');
      }
    } finally {
      setApplying(false);
    }
  }

  if (!preview) {
    return (
      <div className='min-h-screen flex items-center justify-center text-gray-500'>
        Checking your invite…
      </div>
    );
  }

  if (!preview.valid) {
    return (
      <div className='max-w-md mx-auto px-4 py-16 text-center'>
        <AlertCircle className='w-10 h-10 text-amber-500 mx-auto mb-3' />
        <h1 className='text-xl font-semibold text-gray-900 mb-2'>
          Invite not available
        </h1>
        <p className='text-gray-600'>{preview.reason}</p>
      </div>
    );
  }

  return (
    <div className='max-w-md mx-auto px-4 py-16'>
      <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center'>
        <CheckCircle2 className='w-12 h-12 text-emerald-500 mx-auto mb-4' />
        <h1 className='text-2xl font-bold text-gray-900 mb-1'>
          {preview.referrerFirstName} invited you to Mintenance
        </h1>
        <p className='text-gray-600 mb-6'>
          £{((preview.rewardPence ?? 2000) / 100).toFixed(0)} off your first job
          — neighbours on <strong>{preview.postcodePrefix}</strong> only.
        </p>

        {applied ? (
          <div className='text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4'>
            {appliedMessage}
          </div>
        ) : (
          appliedMessage && (
            <div className='text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4'>
              {appliedMessage}
            </div>
          )
        )}

        {!applied && (
          <button
            onClick={apply}
            disabled={applying}
            className='w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50'
          >
            {applying ? 'Applying…' : 'Accept invitation'}
          </button>
        )}
      </div>
    </div>
  );
}
