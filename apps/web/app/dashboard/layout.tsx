import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ProfessionalHomeownerLayout } from './components/ProfessionalHomeownerLayout';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const authUser = await getCurrentUserFromCookies();

  // Mint Editorial (Phase 1) brings its own sidebar + topbar, so we must
  // NOT wrap it in the legacy ProfessionalHomeownerLayout — otherwise
  // the page renders two stacked shells. When the theme cookie is set,
  // pass `children` through unchanged and let the dashboard page own
  // the full canvas.
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';
  if (isMintEditorial) {
    // Auth still needs to gate: the same redirect logic as below.
    if (!authUser || authUser.role === 'contractor') {
      redirect(
        authUser?.role === 'contractor'
          ? '/contractor/dashboard-enhanced'
          : '/login'
      );
    }
    return <>{children}</>;
  }

  if (!authUser || authUser.role === 'contractor') {
    redirect(
      authUser?.role === 'contractor'
        ? '/contractor/dashboard-enhanced'
        : '/login'
    );
  }

  // WFE-P1-2: use maybeSingle so a missing profile does not throw and crash
  // the error boundary. Fall back to an empty profile shape.
  const { data: homeownerProfile, error: profileError } = await serverSupabase
    .from('profiles')
    .select('first_name, last_name, profile_image_url')
    .eq('id', authUser.id)
    .maybeSingle();

  if (profileError) {
    logger.error('Failed to load homeowner profile', {
      service: 'dashboard',
      userId: authUser.id,
      error: profileError.message,
    });
  }

  const profile = homeownerProfile ?? {
    first_name: null,
    last_name: null,
    profile_image_url: null,
  };

  return (
    <ProfessionalHomeownerLayout
      homeowner={profile}
      email={authUser.email}
      userId={authUser.id}
    >
      {children}
    </ProfessionalHomeownerLayout>
  );
}
