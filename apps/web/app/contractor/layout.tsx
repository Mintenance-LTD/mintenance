import React from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ProfessionalContractorLayout } from './components/ProfessionalContractorLayout';

interface ContractorLayoutProps {
  children: React.ReactNode;
}

export default async function ContractorLayout({ children }: ContractorLayoutProps) {
  const authUser = await getCurrentUserFromCookies();

  if (!authUser || authUser.role !== 'contractor') {
    redirect('/login');
  }

  const { data: contractorProfile } = await serverSupabase
    .from('profiles')
    .select('first_name, last_name, company_name, profile_image_url, city, country, address, postcode, latitude, longitude')
    .eq('id', authUser.id)
    .single();

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
