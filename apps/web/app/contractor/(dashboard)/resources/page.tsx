/**
 * /contractor/resources — fallback placeholder.
 *
 * Audit P1 (2026-04-23): the resources feature is unbuilt. Page kept for
 * direct-URL fallback only; sidebar + landing-page footer no longer link
 * here. Re-add the sidebar entry in `components/layouts/sidebar/
 * sidebarNavConfig.ts` once contractor business resources ship.
 *
 * Audit P2 (2026-05-10): UI extracted into the shared
 * <ComingSoonPlaceholder>. See apps/web/components/ui/ComingSoonPlaceholder.tsx
 * for the canonical surface.
 */

import { Package, BookOpen, FileText } from 'lucide-react';
import { ComingSoonPlaceholder } from '@/components/ui/ComingSoonPlaceholder';

export const metadata = {
  title: 'Resources | Mintenance',
  description: 'Business resources and tools for contractors.',
  robots: { index: false, follow: false },
};

export default function ResourcesPage() {
  return (
    <ComingSoonPlaceholder
      Icon={Package}
      iconColor='purple'
      title='Resources'
      description='Access business templates, compliance guides, training materials, and tools to help you run a successful contracting business.'
      features={[
        { icon: BookOpen, label: 'Guides' },
        { icon: FileText, label: 'Templates' },
        { icon: Package, label: 'Tools' },
      ]}
    />
  );
}
