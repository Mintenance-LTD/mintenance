'use client';

/**
 * ReferralCard — R7 #8 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Dashboard card letting a homeowner generate + share their "£20 off for
 * your neighbour" link pinned to their postcode prefix. Shows their
 * running credit balance underneath.
 *
 * Mobile counterpart lives in apps/mobile/src/screens/homeowner/
 * ReferralCard.tsx and calls the same endpoints.
 */

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Users, Copy, Check } from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/utils/clipboard';

interface Referral {
  code: string;
  postcode_prefix: string;
  status: string;
}

export function ReferralCard({
  defaultPostcode,
}: {
  defaultPostcode?: string;
}) {
  const [postcode, setPostcode] = useState(defaultPostcode || '');
  const [referral, setReferral] = useState<Referral | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [balancePence, setBalancePence] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/referrals/apply', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && typeof j.balancePence === 'number') {
          setBalancePence(j.balancePence);
        }
      })
      .catch(() => undefined);
  }, []);

  async function generate() {
    if (!postcode.trim()) {
      toast.error('Enter your postcode first');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/referrals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ postcode: postcode.trim() }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j?.error?.message || 'Could not create referral');
        return;
      }
      setReferral(j.referral as Referral);
      setShareUrl(j.shareUrl as string);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!shareUrl) return;
    const ok = await safeCopyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error('Copy failed');
    }
  }

  return (
    <div className='bg-white border border-gray-200 rounded-xl shadow-sm p-6'>
      <div className='flex items-center gap-2 mb-1'>
        <Users className='w-5 h-5 text-emerald-600' />
        <h3 className='text-lg font-semibold text-gray-900'>
          £20 off for your neighbour
        </h3>
      </div>
      <p className='text-sm text-gray-600 mb-4'>
        Share a link with someone on your road. When they book their first job,
        we credit £20 to both of you.
      </p>

      {balancePence > 0 && (
        <div className='mb-4 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-800'>
          You have <strong>£{(balancePence / 100).toFixed(2)}</strong> of
          neighbour credit ready to use on your next job.
        </div>
      )}

      {!referral ? (
        <div className='flex flex-col sm:flex-row gap-2'>
          <input
            type='text'
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder='Your postcode, e.g. M14 5AB'
            className='flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm'
          />
          <button
            onClick={generate}
            disabled={loading}
            className='px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50'
          >
            {loading ? 'Generating…' : 'Generate link'}
          </button>
        </div>
      ) : (
        <div>
          <p className='text-xs text-gray-500 mb-1'>
            Pinned to postcode <strong>{referral.postcode_prefix}</strong> —
            only neighbours in that area can use this.
          </p>
          <div className='flex items-stretch gap-2'>
            <div className='flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-mono text-gray-800 truncate'>
              {shareUrl}
            </div>
            <button
              onClick={copy}
              className='px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 flex items-center gap-1'
            >
              {copied ? (
                <>
                  <Check className='w-4 h-4' /> Copied
                </>
              ) : (
                <>
                  <Copy className='w-4 h-4' /> Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
