'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Search, Bell } from 'lucide-react';
import { MintEditorialSidebar } from './MintEditorialSidebar';
import { MintEditorialDock } from './MintEditorialDock';
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
 */
export function MintEditorialShell({
  homeownerName,
  email,
  role,
  postcode,
  children,
  contentPadding = '28px 36px 140px',
}: MintEditorialShellProps) {
  return (
    <div className='me-root' style={{ display: 'flex' }}>
      <MintEditorialSidebar
        homeownerName={homeownerName}
        email={email}
        role={role}
        postcode={postcode}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* Topbar — search field on the left, sub-nav tabs in the
            middle (Phase-2 mock parity), bell on the right. Primary
            CTAs (Post a job, New job, etc.) still belong to the page's
            own greeting row. */}
        <div className='me-topbar'>
          <div className='search-pill' style={{ width: 280 }}>
            <Search size={15} strokeWidth={1.75} />
            <span>Search jobs, contractors, invoices</span>
          </div>
          <MintEditorialTopNav />
          <div style={{ flex: 1 }} />
          <Link
            href='/notifications'
            className='btn btn-ghost btn-sm'
            aria-label='Notifications'
          >
            <Bell size={15} strokeWidth={1.75} />
          </Link>
        </div>

        <div style={{ padding: contentPadding, flex: 1 }}>{children}</div>

        <MintEditorialDock />
      </div>
    </div>
  );
}
