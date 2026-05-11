'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useNavSections } from '@/components/layouts/sidebar/sidebarNavConfig';
import type {
  NavItem,
  NavSection,
} from '@/components/layouts/sidebar/SidebarNavItems';
import { initials } from './dashboardHelpers';

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
}: {
  item: NavItem;
  pathname: string | null;
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
}: {
  homeownerName: string;
  email?: string;
  /** Display role (e.g. "Homeowner") for the bottom user-card subtitle. */
  role?: string;
  /** Optional postcode appended to the role line ("Homeowner · SW18"). */
  postcode?: string;
}) {
  const pathname = usePathname();
  const sections = useNavSections('homeowner') as NavSection[];

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
              <NavLink key={item.label} item={item} pathname={pathname} />
            ))}
          </div>
        ))}
      </div>

      <div
        className='me-sidebar-user'
        style={{
          padding: 12,
          background: 'var(--me-surface)',
          border: '1px solid var(--me-line)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          className='avatar avatar-md'
          style={{
            background: 'var(--me-brand)',
            color: 'var(--me-on-brand)',
          }}
        >
          {initials(homeownerName)}
        </span>
        <div className='col' style={{ gap: 0, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {homeownerName}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--me-ink-3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    </aside>
  );
}
