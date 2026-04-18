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

export function NoLeadFeesSection() {
  return (
    <section className='py-20 bg-white'>
      <div className='max-w-5xl mx-auto px-6'>
        <div className='inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5'>
          <Check className='w-3.5 h-3.5' />
          No Lead Fees, Ever
        </div>
        <h2 className='text-3xl sm:text-4xl font-bold text-gray-900 mb-4 max-w-3xl'>
          You only pay when you earn.
        </h2>
        <p className='text-lg text-gray-600 max-w-2xl mb-10'>
          Other platforms sell your details to five strangers, charge £100+ per
          shortlist, and raise prices every year. We take a small commission on
          completed work — nothing to view jobs, nothing to bid, nothing per
          lead.
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
              A single, transparent commission on each completed job. No
              membership, no seat fee, no per-lead charge.
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
              No annual membership. No per-lead fees. No &ldquo;premium&rdquo;
              tier to appear in results. No charges for bids you don&rsquo;t
              win.
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
              Homeowner funds are held from the moment the contract is signed.
              Complete the work, upload after-photos — payment releases to your
              Stripe account.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default NoLeadFeesSection;
