'use client';

import { AlertCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

/**
 * Renders a "verify your phone" warning when the gate actually applies
 * to this user. Extracted from `quick-create/page.tsx` on 2026-05-09
 * for AUDIT_PUNCH_LIST P2 #41.
 *
 * The verdict comes from `GET /api/users/profile`, not from
 * `phone_verified` alone: early-access homeowners are waived by signup
 * rank, which the browser can't compute. Fetching it also keeps this
 * banner in step with what `POST /api/jobs` will actually enforce —
 * the previous env-var bypass could disagree with the server and leave
 * the user staring at an unexplained 4xx.
 *
 * Returns null when there's nothing to show, so callers can drop it
 * unconditionally.
 */
export function PhoneVerificationBanner() {
  const router = useRouter();

  const { data } = useQuery({
    queryKey: ['phone-verification-required'],
    queryFn: async () => {
      const res = await fetch('/api/users/profile', {
        credentials: 'same-origin',
      });
      if (!res.ok) {
        throw new Error('Failed to load verification status');
      }
      return (await res.json()) as { phoneVerificationRequired?: boolean };
    },
    staleTime: 30_000,
  });

  // 2026-05-27 audit-P2-8: the dev bypass stays gated on
  // NODE_ENV !== 'production' to match the server-side P0.1 fix
  // (CLAUDE.md). Without the prod guard, a leaked
  // NEXT_PUBLIC_SKIP_PHONE_VERIFICATION=true would hide this banner
  // even though /api/jobs still rejects the post — the user clicks
  // Post Job, gets a 4xx, with no actionable prompt.
  const devBypass =
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_SKIP_PHONE_VERIFICATION === 'true';

  // Render only on an explicit true — staying quiet while the status
  // loads beats flashing "verify your phone" at someone who doesn't
  // need to.
  if (devBypass || data?.phoneVerificationRequired !== true) {
    return null;
  }

  return (
    <div className='bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6'>
      <div className='flex items-start gap-3'>
        <AlertCircle className='w-5 h-5 text-amber-600 mt-0.5' />
        <div className='flex-1'>
          <p className='font-medium text-amber-900'>
            Phone verification required
          </p>
          <p className='text-sm text-amber-700 mt-1'>
            To post jobs and hire contractors, please verify your phone number
            for security.
          </p>
          <button
            onClick={() => router.push('/settings?tab=verification')}
            className='mt-2 text-sm font-medium text-amber-900 hover:text-amber-800 underline inline-flex items-center gap-1'
          >
            Verify phone number
            <ArrowRight className='w-3 h-3' />
          </button>
        </div>
      </div>
    </div>
  );
}
