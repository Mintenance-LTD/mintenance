import { Metadata } from 'next';
import { OnboardingWizard } from './OnboardingWizard';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { contractorOnboardingAudience } from '@/lib/onboarding/audience';

export const metadata: Metadata = {
  title: 'Set Up Your Account | Mintenance',
  description:
    'Complete your contractor profile to start receiving job opportunities.',
};

export default async function ContractorOnboardingPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect('/login?redirect=/contractor/onboarding');
  if (user.role !== 'contractor') redirect('/getting-started');
  if ((await contractorOnboardingAudience(user.id)) === 'team-member') {
    redirect('/getting-started?persona=team-member&guide=team-member');
  }
  const [profile, skills, area, insurance] = await Promise.all([
    serverSupabase
      .from('profiles')
      .select('company_name,phone,years_experience,bio,license_number')
      .eq('id', user.id)
      .single(),
    serverSupabase
      .from('contractor_skills')
      .select('skill_name')
      .eq('contractor_id', user.id),
    serverSupabase
      .from('service_areas')
      .select('postal_codes,service_radius')
      .eq('contractor_id', user.id)
      .eq('is_primary_area', true)
      .maybeSingle(),
    serverSupabase
      .from('contractor_insurance')
      .select('provider')
      .eq('contractor_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if ([profile, skills, area, insurance].some((result) => result.error)) {
    throw new Error('Could not load saved setup. Please retry.');
  }
  const p = profile.data;
  return (
    <OnboardingWizard
      initialData={{
        business: {
          businessName: p?.company_name ?? '',
          phoneNumber: p?.phone ?? '',
          yearsExperience:
            p?.years_experience == null ? '' : String(p.years_experience),
          bio: p?.bio ?? '',
        },
        skills: {
          selectedSkills: (skills.data ?? []).map((s) => s.skill_name),
          licenseNumber: p?.license_number ?? '',
          insuranceProvider: insurance.data?.provider ?? '',
        },
        serviceArea: {
          postcode: area.data?.postal_codes?.[0] ?? '',
          radiusMiles: area.data?.service_radius
            ? String(
                Math.max(1, Math.round(area.data.service_radius / 1.60934))
              )
            : '10',
        },
      }}
    />
  );
}
