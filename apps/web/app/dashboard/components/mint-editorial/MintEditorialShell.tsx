'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Search, X } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { MintEditorialSidebar } from './MintEditorialSidebar';
import { MintEditorialTopNav } from './MintEditorialTopNav';

interface MintEditorialShellProps {
  /** Display name shown in the sidebar user card. */
  homeownerName: string;
  /** Email shown under the name in the sidebar user card (fallback if
   *  no role is provided). */
  email?: string;
  /** Role label for the sidebar user-card subtitle (e.g. "homeowner"). */
  role?: string;
  /** Optional postcode to append to the role line ("Homeowner · SW18"). */
  postcode?: string;
  /** Optional profile picture for the sidebar user card. When set the
   *  card renders an <Image> from the avatars bucket; otherwise it
   *  falls back to initials. */
  profileImageUrl?: string | null;
  /** Page content rendered inside the main scroll area. */
  children: ReactNode;
  /** Optional override for the main content padding. Defaults match
   *  the dashboard ("28px 36px 140px"); the 140px footer leaves room
   *  for the always-present Mint AI dock. */
  contentPadding?: string;
}

/**
 * Universal page chrome for every Mint Editorial homeowner surface:
 * sidebar (shared nav config) + topbar (search + bell) + scrollable
 * content area + always-present Mint AI compose dock.
 *
 * Consumers:
 *   - `HomeownerPageWrapper` switches into this shell when the
 *     `mintenance-theme=mint-editorial` cookie is set, so every page
 *     using the wrapper gets the chrome automatically.
 *   - `MintEditorialHomeownerDashboard` renders its own data inside
 *     the shell.
 *
 * Single source of truth → one place to evolve the sidebar/topbar/dock
 * and every page picks up the change.
 *
 * Responsive: below 768px the 240px sidebar collapses into an
 * off-canvas drawer toggled by the topbar hamburger (the `me-shell` +
 * `me-drawer-open` classes drive the CSS in styles/mint-editorial.css).
 * Without this the fixed sidebar stole most of a phone's width and
 * clipped page content off-screen.
 */
export function MintEditorialShell({
  homeownerName,
  email,
  role,
  postcode,
  profileImageUrl,
  children,
  contentPadding = '28px 36px 140px',
}: MintEditorialShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile nav drawer whenever the route changes (e.g. after
  // tapping a nav link) so it never lingers over the new page.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div
      className={'me-root me-shell' + (drawerOpen ? ' me-drawer-open' : '')}
      style={{ display: 'flex' }}
    >
      {/* Mobile-only backdrop. Inert on desktop (display:none); on small
          viewports it dims the page and closes the drawer on tap. */}
      <div
        className='me-drawer-backdrop'
        onClick={() => setDrawerOpen(false)}
        aria-hidden='true'
      />

      <MintEditorialSidebar
        homeownerName={homeownerName}
        email={email}
        role={role}
        postcode={postcode}
        profileImageUrl={profileImageUrl}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* Topbar — hamburger (mobile only) + search field on the left,
            sub-nav tabs in the middle (Phase-2 mock parity), bell on the
            right. Primary CTAs (Post a job, New job, etc.) still belong
            to the page's own greeting row. */}
        <div className='me-topbar'>
          <button
            type='button'
            className='me-menu-btn'
            onClick={() => setDrawerOpen((open) => !open)}
            aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={drawerOpen}
          >
            {drawerOpen ? (
              <X size={18} strokeWidth={1.9} />
            ) : (
              <Menu size={18} strokeWidth={1.9} />
            )}
          </button>
          <div className='search-pill' style={{ width: 280 }}>
            <Search size={15} strokeWidth={1.75} />
            <span>Search jobs, contractors, invoices</span>
          </div>
          <MintEditorialTopNav />
          <div style={{ flex: 1 }} />
          <NotificationBell href='/notifications' />
        </div>

        <div className='me-content' style={{ padding: contentPadding, flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
