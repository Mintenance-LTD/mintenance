import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { ContractManagement } from '@/app/jobs/[id]/components/ContractManagement';
import { LocationSharing } from './components/LocationSharing';
import { JobScheduling } from '@/app/jobs/[id]/components/JobScheduling';
import { getGradientCardStyle, getCardHoverStyle } from '@/lib/theme-enhancements';
import { Card } from '@/components/ui/Card.unified';
import Link from 'next/link';

export default async function ContractorJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch job details
  const { data: job, error: jobError } = await serverSupabase
    .from('jobs')
    .select('*')
    .eq('id', resolvedParams.id)
    .single();

  if (jobError || !job) {
    redirect('/contractor/bid');
  }

  // Verify contractor is assigned to this job
  if (job.contractor_id !== user.id) {
    redirect('/contractor/bid');
  }

  // Fetch homeowner details
  const { data: homeowner } = job.homeowner_id ? await serverSupabase
    .from('users')
    .select('id, first_name, last_name, email, phone, profile_image_url')
    .eq('id', job.homeowner_id)
    .single() : { data: null };

  // Fetch contract for this job (if exists) - include start_date and end_date for scheduling
  const { data: contract } = await serverSupabase
    .from('contracts')
    .select('id, status, contractor_signed_at, homeowner_signed_at, start_date, end_date')
    .eq('job_id', resolvedParams.id)
    .single();

  // Determine contract status for scheduling
  // Contract is accepted if status is 'accepted' OR both parties have signed
  const contractStatus = !contract 
    ? 'none' 
    : contract.status === 'accepted' || (contract.contractor_signed_at && contract.homeowner_signed_at)
      ? 'accepted' 
      : 'pending';

  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    posted: { label: 'Posted', color: theme.colors.info, icon: 'briefcase' },
    assigned: { label: 'Assigned', color: theme.colors.warning, icon: 'userCheck' },
    in_progress: { label: 'In Progress', color: theme.colors.primary, icon: 'loader' },
    completed: { label: 'Completed', color: theme.colors.success, icon: 'checkCircle' },
    cancelled: { label: 'Cancelled', color: theme.colors.error, icon: 'xCircle' },
  };

  const currentStatus = statusConfig[job.status || 'posted'] || statusConfig.posted;

  return (
    <div suppressHydrationWarning style={{
      width: '100%',
      maxWidth: '100%',
      margin: 0,
      padding: 0,
    }}>
        {/* Header Section */}
        <div suppressHydrationWarning style={{
          marginBottom: theme.spacing[6],
        }}>
          <div suppressHydrationWarning style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: theme.spacing[4],
            gap: theme.spacing[4],
          }}>
            <div suppressHydrationWarning style={{ flex: 1 }}>
              <h1 suppressHydrationWarning style={{
                margin: 0,
                marginBottom: theme.spacing[3],
                fontSize: theme.typography.fontSize['3xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                letterSpacing: '-0.02em',
              }}>
                {job.title || 'Untitled Job'}
              </h1>
              <div suppressHydrationWarning style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[3],
                flexWrap: 'wrap',
              }}>
                <span suppressHydrationWarning style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: currentStatus.color + '20',
                  color: currentStatus.color,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  border: `1px solid ${currentStatus.color}30`,
                }}>
                  <Icon name={currentStatus.icon as any} size={16} color={currentStatus.color} />
                  {currentStatus.label}
                </span>
                {job.location && (
                  <p suppressHydrationWarning style={{
                    margin: 0,
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                  }}>
                    <Icon name="mapPin" size={16} color={theme.colors.textSecondary} />
                    {job.location}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div suppressHydrationWarning style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: theme.spacing[6],
        }}>
          {/* Left Column */}
          <div suppressHydrationWarning style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
            {/* Budget Card - Gradient */}
            <Card
              padding="lg"
              hover={true}
              style={{
                ...getGradientCardStyle('success'),
                background: `linear-gradient(135deg, ${theme.colors.success}08 0%, ${theme.colors.success}03 100%)`,
              }}
            >
              <div suppressHydrationWarning style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div suppressHydrationWarning>
                  <div suppressHydrationWarning style={{
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: '1.2px',
                    marginBottom: theme.spacing[2],
                  }}>
                    Budget
                  </div>
                  <div suppressHydrationWarning style={{
                    fontSize: theme.typography.fontSize['3xl'],
                    fontWeight: theme.typography.fontWeight.bold,
                    color: theme.colors.textPrimary,
                    lineHeight: 1.2,
                  }}>
                    £{Number(job.budget || 0).toLocaleString()}
                  </div>
                </div>
                <div suppressHydrationWarning style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: `${theme.colors.success}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon name="currencyPound" size={28} color={theme.colors.success} />
                </div>
              </div>
            </Card>

            {/* Job Details Card */}
            <Card padding="lg" hover={false}>
              <h2 suppressHydrationWarning style={{
                margin: 0,
                marginBottom: theme.spacing[5],
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}>
                Job Details
              </h2>

              <div suppressHydrationWarning style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[5] }}>
                <div suppressHydrationWarning>
                  <div suppressHydrationWarning style={{
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: theme.spacing[2],
                  }}>
                    Description
                  </div>
                  <div suppressHydrationWarning style={{
                    fontSize: theme.typography.fontSize.base,
                    color: theme.colors.textPrimary,
                    lineHeight: 1.7,
                    padding: theme.spacing[4],
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: theme.borderRadius.md,
                    border: `1px solid ${theme.colors.border}`,
                  }}>
                    {job.description || 'No description provided'}
                  </div>
                </div>

                {job.scheduled_start_date && (
                  <div suppressHydrationWarning style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[3],
                    padding: theme.spacing[4],
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: theme.borderRadius.md,
                    border: `1px solid ${theme.colors.border}`,
                  }}>
                    <div suppressHydrationWarning style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: theme.borderRadius.full,
                      backgroundColor: `${theme.colors.primary}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon name="calendar" size={20} color={theme.colors.primary} />
                    </div>
                    <div suppressHydrationWarning>
                      <div suppressHydrationWarning style={{
                        fontSize: theme.typography.fontSize.xs,
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: theme.spacing[1],
                      }}>
                        Scheduled Start
                      </div>
                      <div suppressHydrationWarning style={{
                        fontSize: theme.typography.fontSize.base,
                        fontWeight: theme.typography.fontWeight.medium,
                        color: theme.colors.textPrimary,
                      }}>
                        {new Date(job.scheduled_start_date).toLocaleDateString('en-GB', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Homeowner Info Card */}
            {homeowner && (
              <Card padding="lg" hover={true} style={getCardHoverStyle()}>
                <h2 suppressHydrationWarning style={{
                  margin: 0,
                  marginBottom: theme.spacing[5],
                  fontSize: theme.typography.fontSize.xl,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.textPrimary,
                }}>
                  Homeowner
                </h2>

                <div suppressHydrationWarning style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[4],
                  padding: theme.spacing[4],
                  backgroundColor: theme.colors.backgroundSecondary,
                  borderRadius: theme.borderRadius.md,
                }}>
                  <div suppressHydrationWarning style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: theme.borderRadius.full,
                    background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primary}CC 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: theme.typography.fontSize.xl,
                    fontWeight: theme.typography.fontWeight.bold,
                    color: 'white',
                    flexShrink: 0,
                    boxShadow: theme.shadows.md,
                  }}>
                    {homeowner.first_name?.[0]}{homeowner.last_name?.[0]}
                  </div>
                  <div suppressHydrationWarning style={{ flex: 1 }}>
                    <div suppressHydrationWarning style={{
                      fontSize: theme.typography.fontSize.lg,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.textPrimary,
                      marginBottom: theme.spacing[1],
                    }}>
                      {homeowner.first_name} {homeowner.last_name}
                    </div>
                    <div suppressHydrationWarning style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing[1],
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing[2],
                    }}>
                      <Icon name="mail" size={14} color={theme.colors.textSecondary} />
                      {homeowner.email}
                    </div>
                    {homeowner.phone && (
                      <div suppressHydrationWarning style={{
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing[2],
                      }}>
                        <Icon name="phone" size={14} color={theme.colors.textSecondary} />
                        {homeowner.phone}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div suppressHydrationWarning style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
            {/* Quick Actions for Assigned Jobs */}
            {job.status === 'assigned' && homeowner && (
              <Card padding="lg" hover={false} style={{
                ...getGradientCardStyle('primary'),
                background: `linear-gradient(135deg, ${theme.colors.primary}08 0%, ${theme.colors.primary}03 100%)`,
                border: `2px solid ${theme.colors.primary}20`,
              }}>
                <div suppressHydrationWarning style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[3],
                  marginBottom: theme.spacing[4],
                }}>
                  <div suppressHydrationWarning style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: theme.borderRadius.full,
                    backgroundColor: `${theme.colors.primary}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon name="checkCircle" size={24} color={theme.colors.primary} />
                  </div>
                  <div suppressHydrationWarning>
                    <h3 suppressHydrationWarning style={{
                      margin: 0,
                      marginBottom: theme.spacing[1],
                      fontSize: theme.typography.fontSize.lg,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.textPrimary,
                    }}>
                      Next Steps
                    </h3>
                    <p suppressHydrationWarning style={{
                      margin: 0,
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                      lineHeight: 1.5,
                    }}>
                      Your bid has been accepted!
                    </p>
                  </div>
                </div>
                <p suppressHydrationWarning style={{
                  margin: 0,
                  marginBottom: theme.spacing[5],
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  lineHeight: 1.6,
                }}>
                  Contact the homeowner to discuss details and create a contract.
                </p>
                <div suppressHydrationWarning style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing[3],
                }}>
                  <Link
                    href={`/messages/${resolvedParams.id}?userId=${homeowner.id}&userName=${encodeURIComponent(`${homeowner.first_name} ${homeowner.last_name}`)}&jobTitle=${encodeURIComponent(job.title || 'Job')}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: theme.spacing[2],
                      padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                      backgroundColor: theme.colors.primary,
                      color: 'white',
                      borderRadius: theme.borderRadius.md,
                      textDecoration: 'none',
                      fontSize: theme.typography.fontSize.base,
                      fontWeight: theme.typography.fontWeight.semibold,
                      transition: 'all 0.2s',
                      boxShadow: theme.shadows.sm,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.primary;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = theme.shadows.md;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.primary;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = theme.shadows.sm;
                    }}
                  >
                    <Icon name="messages" size={20} color="white" />
                    Message Homeowner
                  </Link>
                  <Link
                    href={`/contractor/messages`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: theme.spacing[2],
                      padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                      backgroundColor: 'transparent',
                      color: theme.colors.primary,
                      border: `2px solid ${theme.colors.primary}30`,
                      borderRadius: theme.borderRadius.md,
                      textDecoration: 'none',
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.semibold,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${theme.colors.primary}10`;
                      e.currentTarget.style.borderColor = theme.colors.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = `${theme.colors.primary}30`;
                    }}
                  >
                    <Icon name="messages" size={16} color={theme.colors.primary} />
                    View All Messages
                  </Link>
                </div>
              </Card>
            )}

            {/* Contract Management */}
            {job.status === 'assigned' && (
              <ContractManagement 
                jobId={resolvedParams.id} 
                userRole="contractor" 
                userId={user.id} 
              />
            )}

            {/* Job Scheduling */}
            {job.status === 'assigned' && (
              <JobScheduling 
                jobId={resolvedParams.id}
                userRole="contractor"
                userId={user.id}
                currentSchedule={{
                  // Use contract dates if job scheduled dates are not set
                  scheduled_start_date: job.scheduled_start_date || contract?.start_date || null,
                  scheduled_end_date: job.scheduled_end_date || contract?.end_date || null,
                  scheduled_duration_hours: job.scheduled_duration_hours || null,
                }}
                contractStatus={contractStatus}
              />
            )}

            {/* Location Sharing */}
            {job.status === 'assigned' && (
              <LocationSharing 
                jobId={resolvedParams.id}
                contractorId={user.id}
              />
            )}

            {/* Job Progress Card */}
            <Card padding="lg" hover={false}>
              <h2 suppressHydrationWarning style={{
                margin: 0,
                marginBottom: theme.spacing[5],
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}>
                Job Progress
              </h2>

              <div suppressHydrationWarning style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
                {[
                  { label: 'Job Posted', status: 'posted', completed: true, icon: 'briefcase' },
                  { label: 'Contractor Assigned', status: 'assigned', completed: job.status !== 'posted', icon: 'userCheck' },
                  { label: 'Work In Progress', status: 'in_progress', completed: job.status === 'in_progress' || job.status === 'completed', icon: 'loader' },
                  { label: 'Work Completed', status: 'completed', completed: job.status === 'completed', icon: 'checkCircle' },
                ].map((step, index) => (
                  <div
                    key={step.status}
                    suppressHydrationWarning
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing[4],
                      padding: theme.spacing[3],
                      borderRadius: theme.borderRadius.md,
                      backgroundColor: step.completed ? `${theme.colors.success}08` : 'transparent',
                      border: step.completed ? `1px solid ${theme.colors.success}20` : `1px solid transparent`,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div suppressHydrationWarning style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <div suppressHydrationWarning style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: theme.borderRadius.full,
                        backgroundColor: step.completed ? theme.colors.success : theme.colors.backgroundTertiary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: step.completed ? theme.shadows.sm : 'none',
                      }}>
                        {step.completed ? (
                          <Icon name="check" size={20} color="white" />
                        ) : (
                          <Icon name={step.icon as any} size={18} color={theme.colors.textTertiary} />
                        )}
                      </div>
                      {index < 3 && (
                        <div suppressHydrationWarning style={{
                          position: 'absolute',
                          top: '44px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '2px',
                          height: theme.spacing[4],
                          backgroundColor: step.completed ? theme.colors.success : theme.colors.border,
                        }} />
                      )}
                    </div>
                    <div suppressHydrationWarning style={{ flex: 1 }}>
                      <div suppressHydrationWarning style={{
                        fontSize: theme.typography.fontSize.base,
                        fontWeight: step.completed ? theme.typography.fontWeight.bold : theme.typography.fontWeight.medium,
                        color: step.completed ? theme.colors.textPrimary : theme.colors.textSecondary,
                      }}>
                        {step.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
  );
}

