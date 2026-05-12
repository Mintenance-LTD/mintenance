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
import { MintEditorialSidebarUserMenu } from '@/app/dashboard/components/mint-editorial/MintEditorialSidebarUserMenu';

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  const clean = href.split('?')[0];
  const cleanPath = pathname.split('?')[0];
  if (clean === '/contractor/dashboard-enhanced') {
    return cleanPath === clean || cleanPath.startsWith(clean + '/');
  }
  return cleanPath === clean || cleanPath.startsWith(clean + '/');
}

function NavLink({
  item,
  pathname,
  badgeCount,
}: {
  item: NavItem;
  pathname: string | null;
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
 * Mint Editorial sidebar for the contractor surface. Mirrors the
 * homeowner MintEditorialSidebar but pulls from the contractor
 * branch of useNavSections — same source the legacy
 * ProfessionalContractorLayout uses, so the two layouts stay in
 * sync. Reuses the shared MintEditorialSidebarUserMenu (avatar +
 * popover with Settings + Sign out) so contractors also get the
 * logout fix shipped earlier today.
 */
export function MintEditorialContractorSidebar({
  contractorName,
  email,
  city,
  profileImageUrl,
}: {
  contractorName: string;
  email?: string;
  /** Optional city appended to the subtitle ("Contractor · London"). */
  city?: string | null;
  profileImageUrl?: string | null;
}) {
  const pathname = usePathname();
  const sections = useNavSections('contractor') as NavSection[];
  const { getBadgeCount } = useBadgeCounts();

  // Subtitle priority: "Contractor · {city}" → "Contractor" → email.
  const subtitle = city ? `Contractor · ${city}` : email ? email : 'Contractor';

  return (
    <aside className='me-sidebar'>
      <Link href='/contractor/dashboard-enhanced' className='me-sidebar-brand'>
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
        homeownerName={contractorName}
        subtitle={subtitle}
        profileImageUrl={profileImageUrl}
      />
    </aside>
  );
}
