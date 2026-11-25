import {
  primaryAndNewestFirst,
  propertyPageSize,
  readPropertyPages,
} from '@/lib/services/property-team/read-property-pages';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getCachedUser } from '@/lib/cache';
import { PropertiesClient2025 } from './components/PropertiesClient2025';
import { MintEditorialProperties } from './components/MintEditorialProperties';
import { SharedPropertyLinks } from './components/SharedPropertyLinks';
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

// The per-property job aggregation depends on row-level state that can
// change at any time (a job moves to 'completed', property_id gets linked
// to a job, etc). Next.js' default ISR would happily serve the last
// rendered HTML for 5–10 minutes; pin to force-dynamic so the stats are
// always current.
export const dynamic = 'force-dynamic';

interface PropertyJobSummary {
  property_id: string;
  active_jobs: number;
  completed_jobs: number;
  completed_budgets: number;
  latest_activity: string | null;
  recent_categories: string[];
}

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
  const properties = (
    await readPropertyPages((after) => {
      const query = serverSupabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id)
        .order('id')
        .limit(propertyPageSize);
      return after === null ? query : query.gt('id', after);
    })
  ).sort(primaryAndNewestFirst);
  const summaries = new Map<string, PropertyJobSummary>();
  for (let start = 0; start < properties.length; start += propertyPageSize) {
    const { data, error } = await serverSupabase.rpc(
      'read_owned_property_job_summary',
      {
        p_actor: user.id,
        p_properties: properties
          .slice(start, start + propertyPageSize)
          .map((property) => property.id),
      }
    );
    if (error || !Array.isArray(data))
      throw new Error('Property totals could not be loaded');
    for (const summary of data as PropertyJobSummary[])
      summaries.set(summary.property_id, summary);
  }

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

  const propertiesWithStats = properties.map((property) => {
    const summary = summaries.get(property.id);
    const activeJobs = Number(summary?.active_jobs ?? 0);
    const completedJobs = Number(summary?.completed_jobs ?? 0);
    const totalSpent = Number(summary?.completed_budgets ?? 0);
    const lastServiceDate = summary?.latest_activity ?? null;
    const recentCategories = summary?.recent_categories ?? [];

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
      // 2026-05-21 fix: bug report — property cards showed the
      // generic Building2 icon instead of the uploaded photo. Root
      // cause was this mapping dropping the `photos` field even
      // though `properties.*` was selected. MintEditorialProperties +
      // PropertiesClient2025 both read `p.photos?.[0]` for the
      // thumbnail; without it nothing ever rendered.
      photos: property.photos ?? null,
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

  // Phase-2 design rebrand. Mint Editorial users get the new card grid
  // (real per-property stats only — no maintenance-plan table because
  // we don't have a recurring-tasks-per-property source). Legacy users
  // see the unchanged PropertiesClient2025.
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';
  const sharedProperties = <SharedPropertyLinks userId={user.id} />;

  if (isMintEditorial) {
    return (
      <MintEditorialProperties
        properties={propertiesWithStats}
        propertyLimit={propertyLimit}
        sharedProperties={sharedProperties}
      />
    );
  }

  return (
    <PropertiesClient2025
      properties={propertiesWithStats}
      propertyLimit={propertyLimit}
      tier={tier}
      isEarlyAccess={isEarlyAccess}
      sharedProperties={sharedProperties}
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
