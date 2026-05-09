'use client';

import { AlertCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Renders a "verify your phone" warning when the user hasn't completed
 * phone verification AND the dev-skip flag isn't on. Extracted from
 * `quick-create/page.tsx` on 2026-05-09 for AUDIT_PUNCH_LIST P2 #41.
 *
 * Returns null when there's nothing to show, so callers can drop it
 * unconditionally.
 */
export function PhoneVerificationBanner({
  phoneVerified,
}: {
  phoneVerified: boolean | undefined;
}) {
  const router = useRouter();

  if (
    phoneVerified ||
    process.env.NEXT_PUBLIC_SKIP_PHONE_VERIFICATION === 'true'
  ) {
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
