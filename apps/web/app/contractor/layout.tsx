import React from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ContractorLayoutShell } from './components/ContractorLayoutShell';

interface ContractorLayoutProps {
  children: React.ReactNode;
}

export default async function ContractorLayout({ children }: ContractorLayoutProps) {
  const authUser = await getCurrentUserFromCookies();

  if (!authUser || authUser.role !== 'contractor') {
    redirect('/login');
  }

  const { data: contractorProfile } = await serverSupabase
    .from('users')
    .select('first_name, last_name, company_name, profile_image_url, city, country')
    .eq('id', authUser.id)
    .single();

  // Get pathname from headers for consistent server-side rendering
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';

  return (
    <ContractorLayoutShell 
      contractor={contractorProfile} 
      email={authUser.email} 
      userId={authUser.id}
      initialPathname={pathname}
    >
      {children}
    </ContractorLayoutShell>
  );
}
