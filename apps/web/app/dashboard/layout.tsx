import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ProfessionalHomeownerLayout } from './components/ProfessionalHomeownerLayout';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const authUser = await getCurrentUserFromCookies();

  if (!authUser || authUser.role === 'contractor') {
    redirect(authUser?.role === 'contractor' ? '/contractor/dashboard-enhanced' : '/login');
  }

  const { data: homeownerProfile } = await serverSupabase
    .from('profiles')
    .select('first_name, last_name, profile_image_url')
    .eq('id', authUser.id)
    .single();

  return (
    <ProfessionalHomeownerLayout
      homeowner={homeownerProfile}
      email={authUser.email}
      userId={authUser.id}
    >
      {children}
    </ProfessionalHomeownerLayout>
  );
}
