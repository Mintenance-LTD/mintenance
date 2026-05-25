import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { HomeownerOnboardingWizard } from './HomeownerOnboardingWizard';

export const metadata: Metadata = {
  title: 'Set Up Your Home | Mintenance',
  description:
    'Tell us about your home and what you need help with — takes about a minute.',
};

/**
 * Homeowner onboarding wizard route.
 *
 * 2026-05-25 audit-P0-2 — the web app had no homeowner onboarding
 * surface; web sign-ups skipped the property_type + concern_tags capture
 * that mobile users complete via HomeownerSetupModal. This page is
 * server-rendered to enforce auth + role + idempotency before the
 * client wizard mounts.
 *
 * Redirect rules:
 *   - Unauth → /login
 *   - Contractor → /contractor/dashboard-enhanced (wrong role)
 *   - Admin → /admin (also wrong role)
 *   - Already onboarded → /dashboard (no re-prompt)
 */
export default async function HomeownerOnboardingPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'contractor') {
    redirect('/contractor/dashboard-enhanced');
  }

  if (user.role === 'admin') {
    redirect('/admin');
  }

  const { data: profile } = await serverSupabase
    .from('profiles')
    .select('first_name, onboarding_completed')
    .eq('id', user.id)
    .single();

  if (profile?.onboarding_completed === true) {
    redirect('/dashboard');
  }

  return <HomeownerOnboardingWizard firstName={profile?.first_name ?? null} />;
}
