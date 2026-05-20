import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';

interface LandlordLayoutProps {
  children: React.ReactNode;
}

/**
 * Landlord layout wraps every /landlord/* sub-page in the universal
 * Mint Editorial / legacy shell so they all inherit the sidebar +
 * topbar consistently with /dashboard, /jobs, /payments etc.
 * Previously these pages rendered full-bleed client components with
 * no shell — Mint Editorial users saw an inconsistent jump to a
 * shell-less page whenever they hit /landlord/reports or similar.
 *
 * The auth gate stays here: non-homeowner / non-admin users are
 * bounced before any chrome renders.
 */
export default async function LandlordLayout({
  children,
}: LandlordLayoutProps) {
  const authUser = await getCurrentUserFromCookies();

  if (
    !authUser ||
    (authUser.role !== 'homeowner' && authUser.role !== 'admin')
  ) {
    redirect('/login');
  }

  return (
    <HomeownerPageWrapper className='me-legacy-fit'>
      {children}
    </HomeownerPageWrapper>
  );
}
