'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface TopNavItem {
  label: string;
  href: string;
  /** When set, the tab is considered active if the current pathname
   *  starts with one of these prefixes (in addition to exact match
   *  against `href`). */
  matchPrefixes?: string[];
}

const TABS: TopNavItem[] = [
  {
    label: 'Dashboard',
    href: '/contractor/dashboard-enhanced',
    matchPrefixes: ['/contractor/dashboard-enhanced'],
  },
  {
    label: 'Jobs',
    href: '/contractor/jobs',
    matchPrefixes: ['/contractor/jobs', '/contractor/bid'],
  },
  {
    label: 'Discover',
    href: '/contractor/discover',
    matchPrefixes: ['/contractor/discover', '/contractor/jobs-near-you'],
  },
  {
    label: 'Quotes',
    href: '/contractor/quotes',
    matchPrefixes: ['/contractor/quotes'],
  },
  {
    label: 'Messages',
    href: '/contractor/messages',
    matchPrefixes: ['/contractor/messages'],
  },
  {
    label: 'Schedule',
    href: '/contractor/scheduling',
    matchPrefixes: ['/contractor/scheduling', '/contractor/calendar'],
  },
];

function isTabActive(pathname: string | null, tab: TopNavItem): boolean {
  if (!pathname) return false;
  const clean = pathname.split('?')[0];
  if (tab.href === clean) return true;

  for (const prefix of tab.matchPrefixes ?? []) {
    if (clean === prefix || clean.startsWith(prefix + '/')) return true;
  }
  return false;
}

/**
 * Mint Editorial top sub-nav for the contractor surface.
 *
 * Mirrors the homeowner MintEditorialTopNav structure but with the
 * contractor's natural primary destinations: Dashboard, Jobs (the
 * pipeline), Discover (find new work), Quotes, Messages, Schedule.
 * The longer-tail items (Portfolio, Reviews, Marketing, Finance, etc.)
 * still live in the left sidebar — only the most frequent surfaces
 * earn a tab here.
 */
export function MintEditorialContractorTopNav() {
  const pathname = usePathname();

  return (
    <nav className='me-topnav' aria-label='Primary sections'>
      {TABS.map((tab) => {
        const active = isTabActive(pathname, tab);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={'me-topnav-tab' + (active ? ' active' : '')}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
