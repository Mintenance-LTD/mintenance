import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import { AddPropertyButton } from './components/AddPropertyButton';
import { PropertyCard } from './components/PropertyCard';
import { PropertiesEmptyState } from './components/PropertiesEmptyState';

export default async function PropertiesPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/properties');
  }

  // Fetch real properties from database
  const { data: properties, error: propertiesError } = await serverSupabase
    .from('properties')
    .select('*')
    .eq('owner_id', user.id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false });

  // Fetch jobs for each property to calculate stats
  const { data: jobs } = await serverSupabase
    .from('jobs')
    .select('id, property_id, status, budget, scheduled_date, created_at')
    .eq('homeowner_id', user.id);

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

  return (
    <HomeownerLayoutShell
      currentPath="/properties"
    >
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: theme.spacing[6],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6],
      }}>
        {/* Header - Enhanced */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 p-8 -m-8 rounded-2xl mb-8 group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center shadow-sm">
                <Icon name="home" size={28} color={theme.colors.primary} />
              </div>
              <div>
                <h1 className="text-heading-md font-[640] text-gray-900 mb-2 tracking-tighter">
                  My Properties
                </h1>
                <p className="text-base font-[460] text-gray-600 leading-[1.5]">
                  {propertiesWithStats.length} {propertiesWithStats.length === 1 ? 'property' : 'properties'} • {totalActiveJobs} active {totalActiveJobs === 1 ? 'job' : 'jobs'} • £{totalSpent.toLocaleString()} total spent
                </p>
              </div>
            </div>
            <AddPropertyButton />
          </div>
        </div>

        {/* Properties Grid - Enhanced with PropertyCard */}
        {propertiesWithStats.length === 0 ? (
          <PropertiesEmptyState />
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {propertiesWithStats.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </HomeownerLayoutShell>
  );
}

