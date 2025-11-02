import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import Link from 'next/link';
import { AddPropertyButton } from './components/AddPropertyButton';

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

  const getPropertyIcon = (type: string) => {
    switch (type) {
      case 'residential':
        return 'home';
      case 'commercial':
        return 'building';
      case 'rental':
        return 'key';
      default:
        return 'home';
    }
  };

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
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: theme.spacing[4],
          flexWrap: 'wrap',
        }}>
          <div>
            <h1 style={{
              margin: 0,
              marginBottom: theme.spacing[1],
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              My Properties
            </h1>
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              {propertiesWithStats.length} {propertiesWithStats.length === 1 ? 'property' : 'properties'} • {propertiesWithStats.reduce((sum, p) => sum + p.activeJobs, 0)} active jobs
            </p>
          </div>
          <AddPropertyButton />
        </div>

        {/* Properties Grid */}
        {propertiesWithStats.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: theme.spacing[12],
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: theme.borderRadius.xl,
          }}>
            <div style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}>
              No properties yet
            </div>
            <p style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
            }}>
              Add your first property using the button above to start tracking maintenance and jobs
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
            gap: theme.spacing[6],
          }}>
            {propertiesWithStats.map((property) => (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    backgroundColor: theme.colors.white,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.borderRadius.xl,
                    padding: theme.spacing[6],
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    height: '100%',
                  }}
                  className="property-card"
                >
                  {/* Primary Badge */}
                  {property.is_primary && (
                    <div style={{
                      position: 'absolute',
                      top: theme.spacing[4],
                      right: theme.spacing[4],
                      padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                      borderRadius: theme.borderRadius.full,
                      backgroundColor: '#DBEAFE',
                      color: '#1E40AF',
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                    }}>
                      Primary
                    </div>
                  )}

                  {/* Property Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: theme.spacing[3],
                    marginBottom: theme.spacing[4],
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: theme.borderRadius.xl,
                      backgroundColor: theme.colors.backgroundSecondary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon name={getPropertyIcon(property.property_type || 'residential')} size={28} color={theme.colors.primary} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: property.is_primary ? theme.spacing[16] : 0 }}>
                      <h3 style={{
                        margin: 0,
                        marginBottom: '4px',
                        fontSize: theme.typography.fontSize.lg,
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.textPrimary,
                      }}>
                        {property.property_name || 'Unnamed Property'}
                      </h3>
                      <p style={{
                        margin: 0,
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textSecondary,
                        lineHeight: 1.5,
                      }}>
                        {property.address || 'Address not specified'}
                      </p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: theme.spacing[3],
                    marginBottom: theme.spacing[4],
                    paddingBottom: theme.spacing[4],
                    borderBottom: `1px solid ${theme.colors.border}`,
                  }}>
                    <div>
                      <div style={{
                        fontSize: theme.typography.fontSize.xs,
                        color: theme.colors.textSecondary,
                        marginBottom: '2px',
                      }}>
                        Active Jobs
                      </div>
                      <div style={{
                        fontSize: theme.typography.fontSize.base,
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.textPrimary,
                      }}>
                        {property.activeJobs}
                      </div>
                    </div>
                    <div>
                      <div style={{
                        fontSize: theme.typography.fontSize.xs,
                        color: theme.colors.textSecondary,
                        marginBottom: '2px',
                      }}>
                        Completed
                      </div>
                      <div style={{
                        fontSize: theme.typography.fontSize.base,
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.textPrimary,
                      }}>
                        {property.completedJobs}
                      </div>
                    </div>
                    <div>
                      <div style={{
                        fontSize: theme.typography.fontSize.xs,
                        color: theme.colors.textSecondary,
                        marginBottom: '2px',
                      }}>
                        Total Spent
                      </div>
                      <div style={{
                        fontSize: theme.typography.fontSize.base,
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.textPrimary,
                      }}>
                        £{property.totalSpent.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                    }}>
                      {property.lastServiceDate ? `Last service: ${property.lastServiceDate}` : 'No service history'}
                    </span>
                    <span style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.primary,
                      fontWeight: theme.typography.fontWeight.medium,
                    }}>
                      View Details →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </HomeownerLayoutShell>
  );
}

