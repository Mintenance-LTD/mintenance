import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ProfessionalContractorLayout } from './components/ProfessionalContractorLayout';
import { MintEditorialContractorShell } from './components/mint-editorial/MintEditorialContractorShell';
import { PayoutSetupBanner } from './components/PayoutSetupBanner';

interface ContractorLayoutProps {
  children: React.ReactNode;
}

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
