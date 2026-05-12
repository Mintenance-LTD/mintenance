import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ProfessionalContractorLayout } from './components/ProfessionalContractorLayout';
import { MintEditorialContractorShell } from './components/mint-editorial/MintEditorialContractorShell';

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

  const { data: contractorProfile } = await serverSupabase
    .from('profiles')
    .select(
      'first_name, last_name, company_name, profile_image_url, city, country, address, postcode, latitude, longitude'
    )
    .eq('id', authUser.id)
    .single();

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
      {children}
    </ProfessionalContractorLayout>
  );
}
