import type { Metadata } from 'next';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getCachedUser } from '@/lib/cache';
import { PropertiesClient2025 } from './components/PropertiesClient2025';
import { getFeatureLimit } from '@/lib/feature-access-config';
import {
  getEffectiveHomeownerTier,
  getEarlyAccessEntitlement,
} from '@/lib/subscription/early-access';

export const metadata: Metadata = {
  title: 'Your Properties | Mintenance',
  description:
    'Manage your properties, view maintenance history, and track active jobs for each location.',
};

export default async function PropertiesPage2025() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/properties');
  }

  // Fetch properties.
  //
  // The previous 300s unstable_cache around this query caused a stale-data
  // bug on the property grid: when a homeowner linked an existing job to a
  // new property, the cached rows still read `property_id = null` for up
  // to 5 minutes, and the per-card "X completed jobs / £Y spent" panel
  // stayed at 0/£0.00 even though the underlying data had been fixed.
  // Cache key was only scoped by user.id, so nothing in the mutation path
  // could bust it. The query itself is ~10ms against a normal-sized
  // homeowner account; the cache was saving nothing measurable.
  const { data: propertiesData } = await serverSupabase
    .from('properties')
    .select('*')
    .eq('owner_id', user.id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false });
  const properties = propertiesData || [];

  // Jobs for the per-property stats. Same reasoning as above — the 60s
  // unstable_cache was hiding property_id updates.
  const { data: jobsData } = await serverSupabase
    .from('jobs')
    .select(
      'id, property_id, status, budget, scheduled_date, created_at, category'
    )
    .eq('homeowner_id', user.id);
  const jobs = jobsData || [];

  // Fetch user's favorites
  const favorites = await unstable_cache(
    async () => {
      const { data } = await serverSupabase
        .from('property_favorites')
        .select('property_id')
        .eq('user_id', user.id);
      return data || [];
    },
    [`property-favorites-${user.id}`],
    { revalidate: 60 }
  )();

  // Create a Set of favorited property IDs for efficient lookup
  const favoritedPropertyIds = new Set(favorites.map((f) => f.property_id));

  // Calculate stats for each property
  const propertiesWithStats = (properties || []).map((property) => {
    const propertyJobs =
      jobs?.filter((job) => job.property_id === property.id) || [];
    const activeJobs = propertyJobs.filter((j) =>
      ['posted', 'assigned', 'in_progress'].includes(j.status || '')
    ).length;
    const completedJobs = propertyJobs.filter(
      (j) => j.status === 'completed'
    ).length;
    // "Spent" should mean money that has actually moved, not budgets on
    // in-flight work. The /properties/[id] detail page already filters to
    // completed for its totalSpent; align the grid card with that so the
    // two views don't disagree.
    const totalSpent = propertyJobs
      .filter((j) => j.status === 'completed')
      .reduce((sum, job) => sum + (Number(job.budget) || 0), 0);
    const lastJob = propertyJobs.sort(
      (a, b) =>
        new Date(b.scheduled_date || b.created_at).getTime() -
        new Date(a.scheduled_date || a.created_at).getTime()
    )[0];
    const lastServiceDate = lastJob
      ? new Date(lastJob.scheduled_date || lastJob.created_at).toISOString()
      : null;

    // Recent job categories
    const recentCategories = propertyJobs
      .slice(0, 5)
      .map((j) => j.category)
      .filter(Boolean);

    return {
      id: property.id,
      property_name: property.property_name,
      address: property.address,
      property_type: property.property_type,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      square_footage: property.square_footage,
      year_built: property.year_built,
      is_primary: property.is_primary,
      is_favorited: favoritedPropertyIds.has(property.id),
      created_at: property.created_at,
      activeJobs,
      completedJobs,
      totalSpent,
      lastServiceDate,
      recentCategories,
    };
  });

  // Check early access first, then subscription
  const tier = await getEffectiveHomeownerTier(user.id);
  const rawLimit = getFeatureLimit(
    'HOMEOWNER_PROPERTY_LIMIT',
    'homeowner',
    tier
  );
  const propertyLimit: number | 'unlimited' =
    rawLimit === 'unlimited'
      ? 'unlimited'
      : typeof rawLimit === 'number'
        ? rawLimit
        : 1;

  // Early-access entitlement upgrades the effective tier to 'agency' even
  // without a paid subscription; surface that to the client so the plan
  // badge doesn't misleadingly read "Agency plan" for someone who isn't
  // actually paying for it.
  const earlyAccess = await getEarlyAccessEntitlement(user.id);
  const isEarlyAccess =
    earlyAccess.eligible && earlyAccess.role === 'homeowner';

  const userDisplayName =
    user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`.trim()
      : user.email;

  const userProfile = await getCachedUser(user.id);

  return (
    <PropertiesClient2025
      properties={propertiesWithStats}
      propertyLimit={propertyLimit}
      tier={tier}
      isEarlyAccess={isEarlyAccess}
      userInfo={{
        name: userDisplayName,
        email: userProfile?.email || user.email,
        avatar:
          (userProfile as typeof userProfile & { profile_image_url?: string })
            ?.profile_image_url ??
          (userProfile as typeof userProfile & { avatar_url?: string })
            ?.avatar_url,
      }}
    />
  );
}
