import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getCachedUser } from '@/lib/cache';
import { PropertiesClient2025 } from './components/PropertiesClient2025';

export default async function PropertiesPage2025() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/properties');
  }

  // Fetch properties
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

  // Fetch jobs for stats
  const jobs = await unstable_cache(
    async () => {
      const { data } = await serverSupabase
        .from('jobs')
        .select('id, property_id, status, budget, scheduled_date, created_at, category')
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
      ? new Date(lastJob.scheduled_date || lastJob.created_at).toISOString()
      : null;

    // Recent job categories
    const recentCategories = propertyJobs
      .slice(0, 5)
      .map(j => j.category)
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
      created_at: property.created_at,
      activeJobs,
      completedJobs,
      totalSpent,
      lastServiceDate,
      recentCategories,
    };
  });

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  const userProfile = await getCachedUser(user.id);

  return (
    <PropertiesClient2025
      properties={propertiesWithStats}
      userInfo={{
        name: userDisplayName,
        email: userProfile?.email || user.email,
        avatar: userProfile?.profile_image_url,
      }}
    />
  );
}
