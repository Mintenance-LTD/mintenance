/**
 * /contractor/social — fallback placeholder.
 *
 * Audit P1 (2026-04-23): the social feed is unbuilt. Sidebar entry +
 * Profile dropdown shortcut + EmptyStateEducational CTA all re-pointed
 * (or removed) so this page is no longer reachable from app chrome. Page
 * kept for direct-URL fallback. Re-add the sidebar entry in
 * `components/layouts/sidebar/sidebarNavConfig.ts` once the feed ships.
 *
 * Audit P2 (2026-05-10): UI extracted into the shared
 * <ComingSoonPlaceholder>. See apps/web/components/ui/ComingSoonPlaceholder.tsx
 * for the canonical surface.
 */

import { Heart, MessageCircle, Users } from 'lucide-react';
import { ComingSoonPlaceholder } from '@/components/ui/ComingSoonPlaceholder';

export const metadata = {
  title: 'Social Feed | Mintenance',
  description: 'Connect with other contractors and share your work.',
  robots: { index: false, follow: false },
};

export default function SocialFeedPage() {
  return (
    <ComingSoonPlaceholder
      Icon={Heart}
      iconColor='rose'
      title='Social Feed'
      description='Share your completed projects, connect with fellow contractors, and grow your professional network.'
      features={[
        { icon: MessageCircle, label: 'Posts' },
        { icon: Users, label: 'Network' },
        { icon: Heart, label: 'Likes' },
      ]}
    />
  );
}
