/**
 * NoLeadFeesSection — contractor landing-page module that stakes out
 * "No lead fees, ever" as permanent platform positioning.
 *
 * Source: docs/RETENTION_ROADMAP_2026.md R1 move #15.
 * Strategy input: Mintenance_Demographics_Mentality_Retention_2026-04-17.pdf
 * §4 flaw "Lead-cost mental model" — trades assume every marketplace
 * charges per-lead. We win by saying it plainly, above the fold.
 */

import { Check, X } from 'lucide-react';
import { CONTRACTOR_PLAN_FEES, PAYMENT_RELEASE_TIMING } from '@/lib/marketing/public-journey';

export function NoLeadFeesSection() {
  return (
    <section className='py-20 bg-white'>
      <div className='max-w-5xl mx-auto px-6'>
        <div className='inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5'>
          <Check className='w-3.5 h-3.5' />
          No per-lead fees
        </div>
        <h2 className='text-3xl sm:text-4xl font-bold text-gray-900 mb-4 max-w-3xl'>
          Start free on Basic.
        </h2>
        <p className='text-lg text-gray-600 max-w-2xl mb-10'>
          Paid plans are optional. A platform fee applies to completed work.
        </p>

        <div className='grid sm:grid-cols-3 gap-5'>
          <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-6'>
            <div className='flex items-center gap-2 mb-2'>
              <Check className='w-5 h-5 text-emerald-600' />
              <span className='font-semibold text-emerald-900'>
                What you pay
              </span>
            </div>
            <p className='text-sm text-emerald-900/80'>
              {CONTRACTOR_PLAN_FEES}
            </p>
          </div>
          <div className='rounded-2xl border border-gray-200 bg-white p-6'>
            <div className='flex items-center gap-2 mb-2'>
              <X className='w-5 h-5 text-gray-400' />
              <span className='font-semibold text-gray-900'>
                What you don&rsquo;t pay
              </span>
            </div>
            <p className='text-sm text-gray-600'>
              View jobs and submit bids without a per-lead or shortlist charge.
            </p>
          </div>
          <div className='rounded-2xl border border-gray-200 bg-white p-6'>
            <div className='flex items-center gap-2 mb-2'>
              <Check className='w-5 h-5 text-emerald-600' />
              <span className='font-semibold text-gray-900'>
                When payment lands
              </span>
            </div>
            <p className='text-sm text-gray-600'>
              {PAYMENT_RELEASE_TIMING}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default NoLeadFeesSection;
