'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useNavSections } from '@/components/layouts/sidebar/sidebarNavConfig';
import type {
  NavItem,
  NavSection,
} from '@/components/layouts/sidebar/SidebarNavItems';
import { useBadgeCounts } from '@/components/layouts/sidebar/SidebarNotifications';
import { MintEditorialSidebarUserMenu } from './MintEditorialSidebarUserMenu';

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  const clean = href.split('?')[0];
  const cleanPath = pathname.split('?')[0];
  if (clean === '/dashboard') return cleanPath === clean;
  return cleanPath === clean || cleanPath.startsWith(clean + '/');
}

function NavLink({
  item,
  pathname,
  badgeCount,
}: {
  item: NavItem;
  pathname: string | null;
  /** Resolved unread/pending count to render next to the label. Null
   *  hides the pill entirely; 0 is intentional ("no unread") and shows
   *  a muted pill so the icon column stays aligned across rows. */
  badgeCount: number | null;
}) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={'me-nav-item ' + (active ? 'active' : '')}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className='ic' />
      <span>{item.label}</span>
      {badgeCount !== null && badgeCount > 0 ? (
        <span className='count' aria-label={`${badgeCount} unread`}>
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Mint Editorial sidebar. Sources its nav items from the shared
 * `useNavSections('homeowner')` config — same config the legacy
 * ProfessionalHomeownerLayout uses — so the two layouts stay in sync
 * automatically. Parent sections (Jobs with children, etc.) collapse
 * to a single top-level link to fit the calmer Mint Editorial style;
 * the children are still reachable from the destination page.
 *
 * Layout: sticky `<aside>` with three rows —
 *   1. Brand link (top, doesn't scroll)
 *   2. `.me-sidebar-scroll` — scrollable nav (so long configs don't
 *      push the user card off-screen on small viewports)
 *   3. `.me-sidebar-user` — pinned-to-bottom user card with initials
 *      + name + role/postcode subtitle (matching the mock).
 */
export function MintEditorialSidebar({
  homeownerName,
  email,
  role,
  postcode,
  profileImageUrl,
}: {
  homeownerName: string;
  email?: string;
  /** Display role (e.g. "Homeowner") for the bottom user-card subtitle. */
  role?: string;
  /** Optional postcode appended to the role line ("Homeowner · SW18"). */
  postcode?: string;
  /** Avatar URL — falls back to initials in the user card when null. */
  profileImageUrl?: string | null;
}) {
  const pathname = usePathname();
  const sections = useNavSections('homeowner') as NavSection[];
  // Same source the legacy ProfessionalHomeownerLayout uses, so the
  // mint editorial sidebar shows identical message/notification badge
  // counts. Polls every 30s; render gracefully degrades when the hook
  // is still loading (returns null → no pill).
  const { getBadgeCount } = useBadgeCounts();

  // Subtitle priority: role + postcode → role only → email fallback.
  const roleLabel = role
    ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
    : '';
  const subtitle = roleLabel
    ? postcode
      ? `${roleLabel} · ${postcode}`
      : roleLabel
    : email || 'Homeowner';

  return (
    <aside className='me-sidebar'>
      <Link href='/dashboard' className='me-sidebar-brand'>
        <Image
          src='/assets/icon.png'
          alt=''
          width={26}
          height={26}
          className='brand-mark'
          priority
        />
        Mintenance
      </Link>

      <div className='me-sidebar-scroll'>
        {sections.map((section: NavSection) => (
          <div key={section.name}>
            <div className='me-sidebar-section'>{section.name}</div>
            {section.items.map((item: NavItem) => (
              <NavLink
                key={item.label}
                item={item}
                pathname={pathname}
                badgeCount={getBadgeCount(item.badge)}
              />
            ))}
          </div>
        ))}
      </div>

      <MintEditorialSidebarUserMenu
        homeownerName={homeownerName}
        subtitle={subtitle}
        profileImageUrl={profileImageUrl}
      />
    </aside>
  );
}
