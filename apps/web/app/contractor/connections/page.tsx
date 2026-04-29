/**
 * /contractor/connections — fallback placeholder.
 *
 * Audit P1 (2026-04-23): the connections feature is unbuilt. As of this
 * commit the page is no longer reachable from the contractor sidebar, so
 * users can't randomly stumble in. This file is kept around so direct-URL
 * visits and stale bookmarks land on a friendly "Coming soon" + return-
 * to-dashboard CTA instead of a 404. Re-add the sidebar entry in
 * `components/layouts/sidebar/sidebarNavConfig.ts` once the feature ships.
 */

import { Users, UserPlus, Handshake, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Connections | Mintenance',
  description: 'Manage your professional contractor connections.',
  // noindex while the feature is unbuilt — stops search engines and
  // social previews from surfacing a Coming Soon page externally.
  robots: { index: false, follow: false },
};

export default function ConnectionsPage() {
  return (
    <div className='flex min-h-[60vh] flex-col items-center justify-center px-4 text-center'>
      <div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-500'>
        <Users className='h-8 w-8' />
      </div>
      <h1 className='text-2xl font-bold text-navy-900'>Connections</h1>
      <p className='mx-auto mt-3 max-w-md text-base text-navy-500'>
        Build your professional network, find subcontractors, and collaborate
        with other tradespeople in your area.
      </p>
      <div className='mt-8 flex items-center gap-8 text-sm text-navy-400'>
        <div className='flex flex-col items-center gap-1'>
          <UserPlus className='h-5 w-5' />
          <span>Find Pros</span>
        </div>
        <div className='flex flex-col items-center gap-1'>
          <Handshake className='h-5 w-5' />
          <span>Referrals</span>
        </div>
        <div className='flex flex-col items-center gap-1'>
          <Users className='h-5 w-5' />
          <span>Network</span>
        </div>
      </div>
      <div className='mt-8 rounded-xl border border-amber-200 bg-amber-50 px-6 py-3 text-sm font-medium text-amber-700'>
        Coming soon — this feature is under development.
      </div>
      <Link
        href='/contractor/dashboard-enhanced'
        className='mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700'
      >
        Back to Dashboard <ArrowRight className='h-4 w-4' />
      </Link>
    </div>
  );
}
