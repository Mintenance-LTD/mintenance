import React from 'react';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';

/**
 * /disputes layout wraps the dispute create/detail pages in the
 * universal Mint Editorial / legacy shell so they inherit the
 * sidebar + topbar consistently with /payments, /jobs, /financials.
 *
 * The existing pages render full-bleed inline-styled chrome (their
 * own `maxWidth: 1000px` containers + theme.spacing padding), which
 * stays harmless inside the shell content area — no double headers
 * since neither page renders a back-to-dashboard link.
 *
 * Auth gating lives on the API + page-level redirects, not here, so
 * this layout stays a thin shell wrapper.
 */
export default function DisputesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HomeownerPageWrapper className='me-legacy-fit'>
      {children}
    </HomeownerPageWrapper>
  );
}
