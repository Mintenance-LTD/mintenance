import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { GuideHub } from '@/components/onboarding/GuideHub';
import { contractorOnboardingAudience } from '@/lib/onboarding/audience';
export const metadata = { title: 'Getting started | Mintenance' };
export default async function GettingStartedPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string; guide?: string }>;
}) {
  const user = await getCurrentUserFromCookies();
  const query = await searchParams;
  if (!user) {
    const params = new URLSearchParams();
    if (query.persona) params.set('persona', query.persona);
    if (query.guide) params.set('guide', query.guide);
    redirect(
      `/login?redirect=${encodeURIComponent(`/getting-started?${params}`)}`
    );
  }
  const tourAudience =
    user.role === 'contractor'
      ? await contractorOnboardingAudience(user.id).catch(() => undefined)
      : user.role === 'homeowner'
        ? 'homeowner'
        : undefined;
  return (
    <GuideHub
      key={user.id}
      userId={user.id}
      role={user.role}
      tourAudience={tourAudience}
      initialPersona={query.persona ?? tourAudience}
      initialGuide={query.guide}
    />
  );
}
