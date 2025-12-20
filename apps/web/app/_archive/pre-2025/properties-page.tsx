import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { Icon } from '@/components/ui/Icon';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { PageHeader } from '@/components/layouts/PageHeader';
import { AddPropertyButton } from './components/AddPropertyButton';
import { PropertyCard } from './components/PropertyCard';
import { PropertiesEmptyState } from './components/PropertiesEmptyState';
import { getCachedUserProperties, getCachedUser } from '@/lib/cache';

export default async function PropertiesPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/properties');
  }

  // Fetch properties with caching (300s revalidation - properties change infrequently)
  const properties = await unstable_cache(
    async () => {
      const { data, error } = await serverSupabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });
      return error ? [] : (data || []);
    },
    [`properties-${user.id}`],
    { revalidate: 300 }
  )();

  // Fetch jobs for each property to calculate stats (cached 60s)
  const jobs = await unstable_cache(
    async () => {
      const { data } = await serverSupabase
        .from('jobs')
        .select('id, property_id, status, budget, scheduled_date, created_at')
        .eq('homeowner_id', user.id);
      return data || [];
    },
    [`properties-jobs-${user.id}`],
    { revalidate: 60 }
  )();

  // Calculate stats for each property
  const propertiesWithStats = (properties || []).map(property => {
    const propertyJobs = jobs?.filter(job => job.property_id === property.id) || [];
    const activeJobs = propertyJobs.filter(j => ['posted', 'assigned', 'in_progress'].includes(j.status || '')).length;
    const completedJobs = propertyJobs.filter(j => j.status === 'completed').length;
    const totalSpent = propertyJobs.reduce((sum, job) => sum + (Number(job.budget) || 0), 0);
    const lastJob = propertyJobs.sort((a, b) =>
      new Date(b.scheduled_date || b.created_at).getTime() - new Date(a.scheduled_date || a.created_at).getTime()
    )[0];
    const lastServiceDate = lastJob
      ? new Date(lastJob.scheduled_date || lastJob.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

    return {
      ...property,
      activeJobs,
      completedJobs,
      totalSpent,
      lastServiceDate,
    };
  });

  const totalActiveJobs = propertiesWithStats.reduce((sum, p) => sum + p.activeJobs, 0);
  const totalSpent = propertiesWithStats.reduce((sum, p) => sum + p.totalSpent, 0);

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  // Fetch user profile for avatar (cached 300s)
  const userProfile = await getCachedUser(user.id);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <UnifiedSidebar
        userRole="homeowner"
        userInfo={{
          name: userDisplayName,
          email: userProfile?.email || user.email,
          avatar: userProfile?.profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        <PageHeader
          title="My Properties"
          darkBackground={true}
          actions={<AddPropertyButton />}
          userName={userDisplayName}
          userAvatar={userProfile?.profile_image_url}
        />

        <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
          {/* Properties List */}
          {propertiesWithStats.length === 0 ? (
            <PropertiesEmptyState />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {propertiesWithStats.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
