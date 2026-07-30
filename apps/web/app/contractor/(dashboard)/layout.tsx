import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ProfessionalContractorLayout } from '../components/ProfessionalContractorLayout';
import { MintEditorialContractorShell } from '../components/mint-editorial/MintEditorialContractorShell';
import { PayoutSetupBanner } from '../components/PayoutSetupBanner';

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

  // 2026-05-25 audit-P0-1: select payout readiness flags so we can surface
  // a persistent banner when the contractor started Stripe Connect but
  // didn't finish (live: 1 of 2 contractors is stuck in this state and 2
  // escrow rows are blocked on it). Single round-trip with the existing
  // profile fetch.
  const { data: contractorProfile } = await serverSupabase
    .from('profiles')
    .select(
      'first_name, last_name, company_name, profile_image_url, city, country, address, postcode, latitude, longitude, stripe_connect_account_id, stripe_charges_enabled, stripe_payouts_enabled'
    )
    .eq('id', authUser.id)
    .single();

  const payoutBanner = (
    <PayoutSetupBanner
      hasAccount={!!contractorProfile?.stripe_connect_account_id}
      chargesEnabled={!!contractorProfile?.stripe_charges_enabled}
      payoutsEnabled={!!contractorProfile?.stripe_payouts_enabled}
    />
  );

  // Phase-4 design rebrand. Server-side cookie check picks the Mint
  // Editorial contractor shell when the user has opted in via
  // Settings → Appearance. Both shells receive identical data; the
  // only delta is the chrome (sidebar look, top sub-nav, bottom
  // user menu, persistent Mint AI dock).
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  if (isMintEditorial) {
    const contractorName =
      contractorProfile?.first_name || contractorProfile?.last_name
        ? `${contractorProfile?.first_name ?? ''} ${contractorProfile?.last_name ?? ''}`.trim()
        : (contractorProfile?.company_name ?? 'Mintenance contractor');

    return (
      <MintEditorialContractorShell
        contractorName={contractorName}
        email={authUser.email ?? undefined}
        city={contractorProfile?.city ?? null}
        profileImageUrl={contractorProfile?.profile_image_url ?? null}
      >
        {payoutBanner}
        {children}
      </MintEditorialContractorShell>
    );
  }

  return (
    <ProfessionalContractorLayout
      contractor={contractorProfile}
      email={authUser.email}
      userId={authUser.id}
    >
      {payoutBanner}
      {children}
    </ProfessionalContractorLayout>
  );
}
