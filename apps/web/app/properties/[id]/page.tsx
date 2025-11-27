import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { HomeownerLayoutShell } from '@/app/dashboard/components/HomeownerLayoutShell';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { ArrowLeft, Edit, Plus } from 'lucide-react';

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/properties');
  }

  // Fetch real property data from database with caching (300s revalidation)
  const property = await unstable_cache(
    async () => {
      const { data, error } = await serverSupabase
        .from('properties')
        .select('*')
        .eq('id', resolvedParams.id)
        .eq('owner_id', user.id)
        .single();
      if (error || !data) throw new Error('Property not found');
      return data;
    },
    [`property-${resolvedParams.id}-${user.id}`],
    { revalidate: 300 }
  )().catch(() => null);

  if (!property) {
    redirect('/properties');
  }

  // Fetch real jobs associated with this property with caching (60s revalidation)
  const jobs = await unstable_cache(
    async () => {
      const { data } = await serverSupabase
        .from('jobs')
        .select(`
          id,
          title,
          status,
          budget,
          created_at,
          scheduled_date,
          contractor:users!jobs_contractor_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('property_id', resolvedParams.id)
        .eq('homeowner_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    [`property-jobs-${resolvedParams.id}-${user.id}`],
    { revalidate: 60 }
  )();

  // Calculate stats from real data
  const activeJobs = jobs?.filter(j => ['posted', 'assigned', 'in_progress'].includes(j.status || '')).length || 0;
  const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0;
  const totalSpent = jobs?.reduce((sum, job) => sum + (Number(job.budget) || 0), 0) || 0;
  
  const lastJob = jobs && jobs.length > 0 ? jobs[0] : null;
  const lastServiceDate = lastJob 
    ? new Date(lastJob.scheduled_date || lastJob.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never';

  return (
    <HomeownerLayoutShell
      currentPath="/properties"
    >
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: theme.spacing[6],
      }}>
        {/* Back Button */}
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Properties
        </Link>

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: theme.spacing[6],
          flexWrap: 'wrap',
          gap: theme.spacing[4],
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
              <h1 style={{
                margin: 0,
                fontSize: theme.typography.fontSize['3xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}>
                {property.property_name || 'Unnamed Property'}
              </h1>
              {property.is_primary && (
                <span style={{
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: '#DBEAFE',
                  color: '#1E40AF',
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                }}>
                  Primary
                </span>
              )}
            </div>
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
            }}>
              <Icon name="mapPin" size={16} />
              {property.address || 'Address not specified'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: theme.spacing[2] }}>
            <Button variant="outline" leftIcon={<Edit className="h-4 w-4" />}>
              Edit Property
            </Button>
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
              New Job
            </Button>
          </div>
        </div>

        {/* Property Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: theme.spacing[4],
          marginBottom: theme.spacing[6],
        }}>
          <div style={{
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing[5],
          }}>
            <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing[2] }}>
              Property Type
            </div>
            <div style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary }}>
              {property.property_type ? property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1) : 'Not specified'}
            </div>
          </div>

          <div style={{
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing[5],
          }}>
            <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing[2] }}>
              Active Jobs
            </div>
            <div style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.primary }}>
              {activeJobs}
            </div>
          </div>

          <div style={{
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing[5],
          }}>
            <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing[2] }}>
              Completed Jobs
            </div>
            <div style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.success }}>
              {completedJobs}
            </div>
          </div>

          <div style={{
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing[5],
          }}>
            <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing[2] }}>
              Total Budget
            </div>
            <div style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary }}>
              £{totalSpent.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Property Details Card */}
        <div style={{
          backgroundColor: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing[6],
          marginBottom: theme.spacing[6],
        }}>
          <h2 style={{
            margin: 0,
            marginBottom: theme.spacing[4],
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
          }}>
            Property Details
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: theme.spacing[6],
          }}>
            <div>
              <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing[1] }}>
                Last Service
              </div>
              <div style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary }}>
                {lastServiceDate}
              </div>
            </div>

            <div>
              <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing[1] }}>
                Total Jobs
              </div>
              <div style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary }}>
                {jobs?.length || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Jobs History */}
        <div style={{
          backgroundColor: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing[6],
        }}>
          <h2 style={{
            margin: 0,
            marginBottom: theme.spacing[4],
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
          }}>
            Job History ({jobs?.length || 0})
          </h2>

          {(!jobs || jobs.length === 0) ? (
            <div style={{
              textAlign: 'center',
              padding: theme.spacing[8],
              color: theme.colors.textSecondary,
            }}>
              No jobs yet for this property
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
              {jobs.map((job) => {
                const jobDate = new Date(job.scheduled_date || job.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const contractor = Array.isArray(job.contractor) ? job.contractor[0] : job.contractor;
                const contractorName = contractor?.first_name && contractor?.last_name
                  ? `${contractor.first_name} ${contractor.last_name}`
                  : null;

                const statusConfig = {
                  completed: { bg: '#D1FAE5', icon: 'checkCircle', iconColor: '#065F46' },
                  in_progress: { bg: '#FEF3C7', icon: 'clock', iconColor: '#92400E' },
                  assigned: { bg: '#DBEAFE', icon: 'userCheck', iconColor: '#1E40AF' },
                  posted: { bg: '#F3F4F6', icon: 'briefcase', iconColor: '#4B5563' },
                };
                const config = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.posted;

                return (
                  <span className={`property-job-link-${job.id}`}>
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      style={{
                        textDecoration: 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: theme.spacing[4],
                        borderRadius: theme.borderRadius.md,
                        border: `1px solid ${theme.colors.border}`,
                        transition: 'all 0.2s',
                        backgroundColor: 'transparent',
                      }}
                    >
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: theme.borderRadius.md,
                        backgroundColor: config.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Icon
                          name={config.icon as any}
                          size={20}
                          color={config.iconColor}
                        />
                      </div>
                      <div>
                        <div style={{
                          fontSize: theme.typography.fontSize.base,
                          fontWeight: theme.typography.fontWeight.medium,
                          color: theme.colors.textPrimary,
                          marginBottom: '2px',
                        }}>
                          {job.title || 'Untitled Job'}
                        </div>
                        <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                          {jobDate}{contractorName && ` • ${contractorName}`}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.base,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                    }}>
                      £{Number(job.budget || 0).toLocaleString()}
                    </div>
                  </Link>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
          [class^="property-job-link-"]:hover a {
            background-color: ${theme.colors.backgroundSecondary} !important;
          }
        `
      }} />
    </HomeownerLayoutShell>
  );
}

