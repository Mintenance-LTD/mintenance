'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Search, Bell } from 'lucide-react';
import { MintEditorialContractorSidebar } from './MintEditorialContractorSidebar';
import { MintEditorialContractorTopNav } from './MintEditorialContractorTopNav';
import { MintEditorialDock } from '@/app/dashboard/components/mint-editorial/MintEditorialDock';

interface MintEditorialContractorShellProps {
  /** Display name shown in the sidebar user card. */
  contractorName: string;
  email?: string;
  city?: string | null;
  profileImageUrl?: string | null;
  children: ReactNode;
  /** Optional override for the main content padding. Defaults match
   *  the homeowner dashboard. */
  contentPadding?: string;
}

/**
 * Universal Mint Editorial chrome for every contractor surface:
 * left sidebar (shared contractor nav config) + topbar (search +
 * sub-nav + bell) + scrollable content area + always-present
 * Mint AI compose dock at the bottom.
 *
 * Mounted by the `/contractor/*` layout when the
 * `mintenance-theme=mint-editorial` cookie is set, so every
 * contractor page picks up the chrome automatically without each
 * page having to import the shell directly. Same single-source
 * pattern the homeowner side uses through HomeownerPageWrapper.
 */
export function MintEditorialContractorShell({
  contractorName,
  email,
  city,
  profileImageUrl,
  children,
  contentPadding = '28px 36px 140px',
}: MintEditorialContractorShellProps) {
  return (
    <div className='me-root' style={{ display: 'flex' }}>
      <MintEditorialContractorSidebar
        contractorName={contractorName}
        email={email}
        city={city}
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
        <div className='me-topbar'>
          <div className='search-pill' style={{ width: 280 }}>
            <Search size={15} strokeWidth={1.75} />
            <span>Search jobs, customers, invoices</span>
          </div>
          <MintEditorialContractorTopNav />
          <div style={{ flex: 1 }} />
          <Link
            href='/contractor/notifications'
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
