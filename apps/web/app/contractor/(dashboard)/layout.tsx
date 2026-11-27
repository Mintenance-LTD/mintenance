import React from 'react';
import { ContractorAccountShell } from '../components/ContractorAccountShell';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';

interface ContractorLayoutProps {
  children: React.ReactNode;
}

/**
 * NOTE — why this layout lives in a `(dashboard)` route group.
 *
 * This layout hard-gates on `role === 'contractor'`. It used to sit at
 * `app/contractor/layout.tsx`, where it also wrapped the PUBLIC profile route
 * `app/contractor/[id]/page.tsx` — so every contractor profile URL that
 * `app/sitemap.ts` advertises to search engines served a redirect to /login,
 * for Googlebot, for logged-out users, and for logged-in homeowners. That
 * silently defeated the `UUID_CONTRACTOR_PROFILE_RE` whitelist in
 * `middleware/public-routes.ts` (audit F1/F2): the middleware let the request
 * through and this layout redirected it anyway.
 *
 * Route groups are URL-transparent, so `(dashboard)` changes no URLs — it just
 * scopes this gate to the authenticated pages. Keep `app/contractor/[id]/` and
 * `app/contractor/components/` OUTSIDE this group; moving `[id]` back under a
 * gating layout re-breaks public contractor SEO.
 * Regression cover: e2e/full-user-journey.spec.ts (public UUID profile stays
 * reachable; /contractor/dashboard-enhanced and /contractor/settings still
 * redirect logged-out users to /login).
 */

export default async function ContractorLayout({
  children,
}: ContractorLayoutProps) {
  const authUser = await getCurrentUserFromCookies();

  if (!authUser || authUser.role !== 'contractor') {
    redirect('/login');
  }

  return (
    <ContractorAccountShell authUser={authUser}>
      {children}
    </ContractorAccountShell>
  );
}
