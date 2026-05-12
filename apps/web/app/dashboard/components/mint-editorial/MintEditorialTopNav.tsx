'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface TopNavItem {
  label: string;
  href: string;
  /** When set, the tab is considered active if the current pathname
   *  starts with one of these prefixes (in addition to exact match
   *  against `href`). Used for nested routes like `/jobs/[id]` mapping
   *  to "Jobs", and `/messages/[jobId]` mapping to "Messages". */
  matchPrefixes?: string[];
}

const TABS: TopNavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Jobs', href: '/jobs', matchPrefixes: ['/jobs', '/timeline'] },
  { label: 'Post a job', href: '/jobs/create' },
  { label: 'Messages', href: '/messages' },
  { label: 'Properties', href: '/properties', matchPrefixes: ['/properties'] },
  {
    label: 'Payments',
    href: '/payments',
    matchPrefixes: ['/payments', '/financials'],
  },
];

function isTabActive(pathname: string | null, tab: TopNavItem): boolean {
  if (!pathname) return false;
  const clean = pathname.split('?')[0];
  if (tab.href === clean) return true;

  // /jobs/create has to win over the broader /jobs tab — exact match
  // for the special-case "Post a job" tab is enough.
  if (tab.href === '/jobs/create') return false;
  // Avoid /jobs tab matching when the user is on /jobs/create.
  if (tab.href === '/jobs' && clean.startsWith('/jobs/create')) return false;

  for (const prefix of tab.matchPrefixes ?? []) {
    if (clean === prefix || clean.startsWith(prefix + '/')) return true;
  }
  return false;
}

/**
 * Mint Editorial top sub-nav (the pill-style tab row that sits inside
 * the topbar to the right of the search field).
 *
 * Phase-2 design mock parity: the homeowner shell shows quick access
 * to Dashboard / Jobs / Post a job / Messages / Properties / Payments
 * without forcing users into the longer left-rail nav for the most
 * common destinations. The sidebar still owns the full nav surface.
 */
export function MintEditorialTopNav() {
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
