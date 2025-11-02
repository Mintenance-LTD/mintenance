import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { ContractorLayoutShell } from '@/app/contractor/components/ContractorLayoutShell';
import { ContractManagement } from '@/app/jobs/[id]/components/ContractManagement';
import { LocationSharing } from './components/LocationSharing';
import { JobScheduling } from '@/app/jobs/[id]/components/JobScheduling';
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

  // Fetch contractor details
  const { data: contractor } = await serverSupabase
    .from('users')
    .select('id, first_name, last_name, email, phone, profile_image_url')
    .eq('id', user.id)
    .single();

  // Fetch contract for this job (if exists)
  const { data: contract } = await serverSupabase
    .from('contracts')
    .select('id, status, contractor_signed_at, homeowner_signed_at')
    .eq('job_id', resolvedParams.id)
    .single();

  // Determine contract status for scheduling
  const contractStatus = !contract 
    ? 'none' 
    : contract.status === 'accepted' 
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
    <ContractorLayoutShell contractor={contractor} email={user.email} userId={user.id}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: theme.spacing[6],
      }}>
        {/* Header */}
        <div style={{
          marginBottom: theme.spacing[6],
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: theme.spacing[4],
          }}>
            <div>
              <h1 style={{
                margin: 0,
                marginBottom: theme.spacing[2],
                fontSize: theme.typography.fontSize['3xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}>
                {job.title || 'Untitled Job'}
              </h1>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[3],
                flexWrap: 'wrap',
              }}>
                <span style={{
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: currentStatus.color + '20',
                  color: currentStatus.color,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[1],
                }}>
                  <Icon name={currentStatus.icon as any} size={14} color={currentStatus.color} />
                  {currentStatus.label}
                </span>
                {job.location && (
                  <p style={{
                    margin: 0,
                    fontSize: theme.typography.fontSize.base,
                    color: theme.colors.textSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                  }}>
                    <Icon name="mapPin" size={16} />
                    {job.location}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: theme.spacing[6],
        }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
            {/* Job Details Card */}
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
                Job Details
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
                <div>
                  <div style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing[1],
                  }}>
                    Description
                  </div>
                  <div style={{
                    fontSize: theme.typography.fontSize.base,
                    color: theme.colors.textPrimary,
                    lineHeight: 1.6,
                  }}>
                    {job.description || 'No description provided'}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: theme.spacing[4],
                }}>
                  <div>
                    <div style={{
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing[1],
                    }}>
                      Budget
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.lg,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.primary,
                    }}>
                      £{Number(job.budget || 0).toLocaleString()}
                    </div>
                  </div>

                  {job.scheduled_start_date && (
                    <div>
                      <div style={{
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                        color: theme.colors.textSecondary,
                        marginBottom: theme.spacing[1],
                      }}>
                        Scheduled Start
                      </div>
                      <div style={{
                        fontSize: theme.typography.fontSize.base,
                        color: theme.colors.textPrimary,
                      }}>
                        {new Date(job.scheduled_start_date).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Homeowner Info Card */}
            {homeowner && (
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
                  Homeowner
                </h2>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[3],
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: theme.borderRadius.full,
                    backgroundColor: theme.colors.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: theme.typography.fontSize.xl,
                    fontWeight: theme.typography.fontWeight.bold,
                    color: 'white',
                    flexShrink: 0,
                  }}>
                    {homeowner.first_name?.[0]}{homeowner.last_name?.[0]}
                  </div>
                  <div>
                    <div style={{
                      fontSize: theme.typography.fontSize.lg,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                      marginBottom: '2px',
                    }}>
                      {homeowner.first_name} {homeowner.last_name}
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                    }}>
                      {homeowner.email}
                    </div>
                    {homeowner.phone && (
                      <div style={{
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textSecondary,
                      }}>
                        {homeowner.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
            {/* Quick Actions for Assigned Jobs */}
            {job.status === 'assigned' && homeowner && (
              <div style={{
                backgroundColor: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing[6],
              }}>
                <h3 style={{
                  margin: 0,
                  marginBottom: theme.spacing[3],
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                }}>
                  Next Steps
                </h3>
                <p style={{
                  margin: 0,
                  marginBottom: theme.spacing[4],
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  lineHeight: 1.6,
                }}>
                  Your bid has been accepted! Contact the homeowner to discuss details and create a contract.
                </p>
                <div style={{
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
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.primaryLight;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.primary;
                      e.currentTarget.style.transform = 'translateY(0)';
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
                      padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                      backgroundColor: 'transparent',
                      color: theme.colors.primary,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.borderRadius.md,
                      textDecoration: 'none',
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                    }}
                  >
                    <Icon name="messages" size={16} color={theme.colors.primary} />
                    View All Messages
                  </Link>
                </div>
              </div>
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
                  scheduled_start_date: job.scheduled_start_date || null,
                  scheduled_end_date: job.scheduled_end_date || null,
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
                Job Progress
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
                  {[
                    { label: 'Job Posted', status: 'posted', completed: true },
                    { label: 'Contractor Assigned', status: 'assigned', completed: job.status !== 'posted' },
                    { label: 'Work In Progress', status: 'in_progress', completed: job.status === 'in_progress' || job.status === 'completed' },
                    { label: 'Work Completed', status: 'completed', completed: job.status === 'completed' },
                  ].map((step) => (
                    <div
                      key={step.status}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing[3],
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: theme.borderRadius.full,
                        backgroundColor: step.completed ? theme.colors.success : theme.colors.backgroundTertiary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {step.completed ? (
                          <Icon name="check" size={18} color="white" />
                        ) : (
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: theme.borderRadius.full,
                            backgroundColor: theme.colors.textTertiary,
                          }} />
                        )}
                      </div>
                      <div>
                        <div style={{
                          fontSize: theme.typography.fontSize.base,
                          fontWeight: step.completed ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.medium,
                          color: step.completed ? theme.colors.textPrimary : theme.colors.textSecondary,
                        }}>
                          {step.label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContractorLayoutShell>
  );
}

