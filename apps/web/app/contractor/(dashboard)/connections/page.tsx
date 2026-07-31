/**
 * /contractor/connections — fallback placeholder.
 *
 * Audit P1 (2026-04-23): the connections feature is unbuilt. As of this
 * commit the page is no longer reachable from the contractor sidebar, so
 * users can't randomly stumble in. This file is kept around so direct-URL
 * visits and stale bookmarks land on a friendly "Coming soon" + return-
 * to-dashboard CTA instead of a 404. Re-add the sidebar entry in
 * `components/layouts/sidebar/sidebarNavConfig.ts` once the feature ships.
 *
 * Audit P2 (2026-05-10): UI extracted into the shared
 * <ComingSoonPlaceholder> so all four contractor placeholders share
 * one visual surface.
 */

import { Users, UserPlus, Handshake } from 'lucide-react';
import { ComingSoonPlaceholder } from '@/components/ui/ComingSoonPlaceholder';

export const metadata = {
  title: 'Connections | Mintenance',
  description: 'Manage your professional contractor connections.',
  // noindex while the feature is unbuilt — stops search engines and
  // social previews from surfacing a Coming Soon page externally.
  robots: { index: false, follow: false },
};

export default function ConnectionsPage() {
  return (
    <ComingSoonPlaceholder
      Icon={Users}
      iconColor='blue'
      title='Connections'
      description='Build your professional network, find subcontractors, and collaborate with other tradespeople in your area.'
      features={[
        { icon: UserPlus, label: 'Find Pros' },
        { icon: Handshake, label: 'Referrals' },
        { icon: Users, label: 'Network' },
      ]}
    />
  );
}
