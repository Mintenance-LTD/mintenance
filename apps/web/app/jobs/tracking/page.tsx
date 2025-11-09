import { headers } from 'next/headers';
import Link from 'next/link';
import { getCurrentUserFromHeaders, getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import UnauthenticatedCard from '@/components/UnauthenticatedCard';
import { Icon } from '@/components/ui/Icon';
import { Badge as StatusBadge } from '@/components/ui/Badge.unified';
import { Button } from '@/components/ui/Button';
import { theme } from '@/lib/theme';
import Logo from '../../components/Logo';
import LogoutButton from '@/components/LogoutButton';
import type { Metadata } from 'next';
import { Bell, Menu, MessageCircle, Plus } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Job Tracking | Mintenance',
  description: 'Monitor the real-time status and progress of your active home maintenance jobs.',
};

export default async function JobTrackingPage() {
  const headersList = await headers();
  let user = getCurrentUserFromHeaders(headersList as unknown as Headers);
  if (!user) {
    user = await getCurrentUserFromCookies();
  }

  if (!user) {
    return <UnauthenticatedCard />;
  }

  // Redirect contractors
  if (user.role === 'contractor') {
    const { redirect } = await import('next/navigation');
    redirect('/contractor/dashboard-enhanced');
  }

  // Fetch homeowner's active jobs
  const { data: jobsData } = await serverSupabase
    .from('jobs')
    .select(`
      id,
      title,
      status,
      budget,
      category,
      created_at,
      updated_at,
      contractor_id,
      contractor:users!jobs_contractor_id_fkey (
        id,
        first_name,
        last_name,
        profile_image_url
      )
    `)
    .eq('homeowner_id', user.id)
    .in('status', ['posted', 'assigned', 'in_progress'])
    .order('created_at', { ascending: false });

  const jobs = jobsData || [];
  const selectedJobRaw = jobs[0];
  const selectedJob = selectedJobRaw ? {
    ...selectedJobRaw,
    contractor: Array.isArray(selectedJobRaw.contractor) ? selectedJobRaw.contractor[0] : selectedJobRaw.contractor
  } : undefined;

  // Fetch messages for selected job
  let messages: any[] = [];
  if (selectedJob) {
    const { data: messagesData } = await serverSupabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        sender_id,
        sender:users!messages_sender_id_fkey (
          id,
          first_name,
          last_name,
          profile_image_url
        )
      `)
      .or(`job_id.eq.${selectedJob.id}`)
      .order('created_at', { ascending: false })
      .limit(10);
    
    messages = messagesData || [];
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.backgroundSecondary }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${theme.colors.border}`,
        padding: `0 ${theme.spacing[6]}`,
        backgroundColor: theme.colors.surface
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[4] }}>
          <Logo width={24} height={24} />
          <h2 style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            margin: 0
          }}>
            Mintenance
          </h2>
        </div>

        <div style={{ display: 'none', gap: theme.spacing[8] }} className="md:flex">
          <Link href="/dashboard" style={{
            color: theme.colors.textSecondary,
            textDecoration: 'none',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium
          }}>
            Dashboard
          </Link>
          <Link href="/jobs" style={{
            color: theme.colors.primary,
            textDecoration: 'none',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.bold
          }}>
            My Jobs
          </Link>
          <Link href="/contractors" style={{
            color: theme.colors.textSecondary,
            textDecoration: 'none',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium
          }}>
            Find Contractors
          </Link>
          <Link href="/messages" style={{
            color: theme.colors.textSecondary,
            textDecoration: 'none',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium
          }}>
            Messages
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
          <Link href="/jobs/create" style={{ textDecoration: 'none' }}>
            <button style={{
              display: 'flex',
              minWidth: '84px',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              borderRadius: theme.borderRadius.lg,
              height: '40px',
              padding: `0 ${theme.spacing[4]}`,
              backgroundColor: theme.colors.primary,
              color: 'white',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.bold,
              border: 'none'
            }}>
              Post a Job
            </button>
          </Link>
          <button style={{
            display: 'flex',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderRadius: theme.borderRadius.lg,
            height: '40px',
            backgroundColor: theme.colors.backgroundSecondary,
            color: theme.colors.textSecondary,
            gap: theme.spacing[2],
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.bold,
            minWidth: 0,
            padding: `0 ${theme.spacing[2]}`,
            border: 'none'
          }}>
            <Icon name="bell" size={20} color={theme.colors.textSecondary} />
          </button>
          <div style={{
            aspectRatio: '1',
            height: '40px',
            borderRadius: theme.borderRadius.full,
            backgroundColor: theme.colors.primary,
            backgroundImage: (user as any).profile_image_url ? `url(${(user as any).profile_image_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }} />
        </div>

        <Button variant="ghost" size="sm" className="md:hidden" style={{ display: 'none', width: '40px', height: '40px' }}>
          <Menu className="h-6 w-6" />
        </Button>
      </header>

      <main style={{ padding: `${theme.spacing[6]} ${theme.spacing[6]} ${theme.spacing[8]}` }}>
        {/* Title Section */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: theme.spacing[4],
          marginBottom: theme.spacing[8]
        }}>
          <div style={{ display: 'flex', minWidth: '288px', flexDirection: 'column', gap: theme.spacing[2] }}>
            <h1 style={{
              fontSize: theme.typography.fontSize['4xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              margin: 0
            }}>
              Job Tracking
            </h1>
            <p style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
              margin: 0
            }}>
              Monitor the real-time status and progress of your active home maintenance jobs.
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(1, 1fr)',
          gap: theme.spacing[8]
        }} className="lg:grid-cols-3">
          {/* Left Column: Job List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
            <h2 style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              padding: `0 ${theme.spacing[2]}`,
              margin: 0
            }}>
              Active Jobs ({jobs.length})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
              {jobs.map((job, index) => {
                const isSelected = index === 0;
                const contractor = Array.isArray(job.contractor) ? job.contractor[0] : job.contractor;

                // Determine status color
                let statusColor = theme.colors.info;
                let statusLabel = 'Posted';
                let statusBg = `${theme.colors.info}20`;

                if (job.status === 'assigned') {
                  statusColor = theme.colors.info;
                  statusLabel = 'Scheduled';
                  statusBg = `${theme.colors.info}20`;
                } else if (job.status === 'in_progress') {
                  statusColor = theme.colors.warning;
                  statusLabel = 'In Progress';
                  statusBg = `${theme.colors.warning}20`;
                } else if (job.status === 'completed') {
                  statusColor = theme.colors.success;
                  statusLabel = 'Awaiting Payment';
                  statusBg = `${theme.colors.success}20`;
                }

                return (
                  <Link key={job.id} href={`/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex',
                      gap: theme.spacing[4],
                      padding: theme.spacing[4],
                      borderRadius: '18px',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      border: `2px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
                      backgroundColor: isSelected ? `${theme.colors.primary}15` : theme.colors.surface
                    }}>
                      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', gap: theme.spacing[1] }}>
                        <p style={{
                          fontSize: theme.typography.fontSize.base,
                          fontWeight: theme.typography.fontWeight.bold,
                          color: theme.colors.textPrimary,
                          margin: 0
                        }}>
                          {job.title}
                        </p>
                        {contractor && (
                          <p style={{
                            fontSize: theme.typography.fontSize.sm,
                            color: theme.colors.textSecondary,
                            margin: 0
                          }}>
                            {contractor.first_name} {contractor.last_name}
                          </p>
                        )}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: theme.spacing[2],
                          borderRadius: theme.borderRadius.full,
                          backgroundColor: statusBg,
                          padding: '4px 10px',
                          width: 'fit-content',
                          marginTop: theme.spacing[1]
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: statusColor
                          }} />
                          <span style={{
                            fontSize: theme.typography.fontSize.xs,
                            fontWeight: theme.typography.fontWeight.semibold,
                            color: statusColor
                          }}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        <Icon name="arrowForward" size={24} color={theme.colors.textSecondary} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Column: Job Details */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
            {selectedJob ? (
              <>
                {/* Header Section */}
                <div style={{
                  backgroundColor: theme.colors.surface,
                  padding: theme.spacing[6],
                  borderRadius: '18px',
                  border: `1px solid ${theme.colors.border}`
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme.spacing[4]
                  }} className="sm:flex-row sm:items-center sm:justify-between">
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[4] }}>
                      {selectedJob.contractor?.profile_image_url ? (
                        <div style={{
                          backgroundImage: `url(${selectedJob.contractor.profile_image_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          aspectRatio: '1',
                          width: '56px',
                          height: '56px',
                          borderRadius: theme.borderRadius.full
                        }} />
                      ) : (
                        <div style={{
                          backgroundColor: theme.colors.primary,
                          aspectRatio: '1',
                          width: '56px',
                          height: '56px',
                          borderRadius: theme.borderRadius.full,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold'
                        }}>
                          {selectedJob.contractor ? (selectedJob.contractor.first_name?.[0] || 'C') : '?'}
                        </div>
                      )}
                      <div>
                        <h3 style={{
                          fontSize: theme.typography.fontSize['2xl'],
                          fontWeight: theme.typography.fontWeight.bold,
                          color: theme.colors.textPrimary,
                          margin: 0
                        }}>
                          {selectedJob.title}
                        </h3>
                        <p style={{
                          fontSize: theme.typography.fontSize.base,
                          color: theme.colors.textSecondary,
                          margin: 0
                        }}>
                          by {selectedJob.contractor ? `${selectedJob.contractor.first_name} ${selectedJob.contractor.last_name}` : 'Unassigned'}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: theme.spacing[2], width: '100%' }} className="sm:w-auto">
                      <Link href={`/jobs/${selectedJob.id}`} style={{ textDecoration: 'none', flex: 1 }} className="sm:flex-none">
                        <Button variant="primary" size="sm" className="w-full sm:w-auto">
                          <MessageCircle className="h-4 w-4" />
                          <span style={{ whiteSpace: 'nowrap' }}>Message Contractor</span>
                        </Button>
                      </Link>
                      <Link href={`/jobs/${selectedJob.id}`} style={{ textDecoration: 'none', flex: 1 }} className="sm:flex-initial">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                          <span style={{ whiteSpace: 'nowrap' }}>View Job Details</span>
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginTop: theme.spacing[6] }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: theme.spacing[1] }}>
                      <span style={{
                        fontSize: theme.typography.fontSize.base,
                        fontWeight: theme.typography.fontWeight.medium,
                        color: theme.colors.textPrimary
                      }}>
                        Overall Progress
                      </span>
                      <span style={{
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                        color: theme.colors.primary
                      }}>
                        50%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      backgroundColor: theme.colors.border,
                      borderRadius: '10px',
                      height: '10px'
                    }}>
                      <div style={{
                        backgroundColor: theme.colors.primary,
                        height: '10px',
                        borderRadius: '10px',
                        width: '50%'
                      }} />
                    </div>
                  </div>
                </div>

                {/* Status Timeline & Updates Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(1, 1fr)',
                  gap: theme.spacing[6]
                }} className="xl:grid-cols-5">
                  {/* Status Timeline */}
                  <div style={{
                    gridColumn: 'span 2',
                    backgroundColor: theme.colors.surface,
                    padding: theme.spacing[6],
                    borderRadius: '18px',
                    border: `1px solid ${theme.colors.border}`
                  }}>
                    <h4 style={{
                      fontSize: theme.typography.fontSize.lg,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.textPrimary,
                      marginBottom: theme.spacing[4]
                    }}>
                      Status Timeline
                    </h4>

                    <ol style={{
                      position: 'relative',
                      borderLeft: `2px solid ${theme.colors.border}`,
                      padding: 0,
                      margin: 0,
                      listStyle: 'none'
                    }}>
                      <li style={{ marginBottom: theme.spacing[6], marginLeft: theme.spacing[6] }}>
                        <span style={{
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          backgroundColor: theme.colors.success,
                          borderRadius: '50%',
                          left: '-13px',
                          border: `4px solid ${theme.colors.surface}`
                        }}>
                          <Icon name="check" size={12} color="white" />
                        </span>
                        <h5 style={{
                          fontWeight: theme.typography.fontWeight.medium,
                          color: theme.colors.textPrimary,
                          margin: 0
                        }}>
                          Job Booked
                        </h5>
                        <time style={{
                          display: 'block',
                          fontSize: theme.typography.fontSize.sm,
                          color: theme.colors.textSecondary
                        }}>
                          {new Date(selectedJob.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </time>
                      </li>

                      <li style={{ marginBottom: theme.spacing[6], marginLeft: theme.spacing[6] }}>
                        <span style={{
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          backgroundColor: theme.colors.success,
                          borderRadius: '50%',
                          left: '-13px',
                          border: `4px solid ${theme.colors.surface}`
                        }}>
                          <Icon name="check" size={12} color="white" />
                        </span>
                        <h5 style={{
                          fontWeight: theme.typography.fontWeight.medium,
                          color: theme.colors.textPrimary,
                          margin: 0
                        }}>
                          Service Scheduled
                        </h5>
                        <time style={{
                          display: 'block',
                          fontSize: theme.typography.fontSize.sm,
                          color: theme.colors.textSecondary
                        }}>
                          TBD
                        </time>
                      </li>

                      <li style={{ marginBottom: theme.spacing[6], marginLeft: theme.spacing[6] }}>
                        <span style={{
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          backgroundColor: theme.colors.primary,
                          borderRadius: '50%',
                          left: '-13px',
                          border: `4px solid ${theme.colors.surface}`
                        }}>
                          <Icon name="autorenew" size={12} color="white" />
                        </span>
                        <h5 style={{
                          fontWeight: theme.typography.fontWeight.bold,
                          color: theme.colors.primary,
                          margin: 0
                        }}>
                          Work In Progress
                        </h5>
                        <time style={{
                          display: 'block',
                          fontSize: theme.typography.fontSize.sm,
                          color: theme.colors.textSecondary
                        }}>
                          Started {new Date(selectedJob.updated_at || selectedJob.created_at).toLocaleDateString()}
                        </time>
                      </li>

                      <li style={{ marginLeft: theme.spacing[6] }}>
                        <span style={{
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          backgroundColor: theme.colors.border,
                          borderRadius: '50%',
                          left: '-13px',
                          border: `4px solid ${theme.colors.surface}`
                        }}>
                          <Icon name="payments" size={12} color={theme.colors.textSecondary} />
                        </span>
                        <h5 style={{
                          fontWeight: theme.typography.fontWeight.medium,
                          color: theme.colors.textSecondary,
                          margin: 0
                        }}>
                          Awaiting Payment
                        </h5>
                      </li>
                    </ol>
                  </div>

                  {/* Latest Updates & Quick Info */}
                  <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
                    {/* Latest Updates */}
                    <div style={{
                      backgroundColor: theme.colors.surface,
                      padding: theme.spacing[6],
                      borderRadius: '18px',
                      border: `1px solid ${theme.colors.border}`
                    }}>
                      <h4 style={{
                        fontSize: theme.typography.fontSize.lg,
                        fontWeight: theme.typography.fontWeight.bold,
                        color: theme.colors.textPrimary,
                        marginBottom: theme.spacing[4]
                      }}>
                        Latest Updates
                      </h4>

                      <div style={{ overflow: 'hidden' }}>
                        <ul style={{
                          listStyle: 'none',
                          padding: 0,
                          margin: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: theme.spacing[4]
                        }}>
                          {messages.map((message) => {
                            const hoursAgo = Math.floor((Date.now() - new Date(message.created_at).getTime()) / (1000 * 60 * 60));
                            return (
                              <li key={message.id}>
                                <div style={{ position: 'relative' }}>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: theme.spacing[3]
                                  }}>
                                    <div style={{ position: 'relative' }}>
                                      {message.sender?.profile_image_url ? (
                                        <div style={{
                                          backgroundImage: `url(${message.sender.profile_image_url})`,
                                          backgroundSize: 'cover',
                                          backgroundPosition: 'center',
                                          aspectRatio: '1',
                                          width: '32px',
                                          height: '32px',
                                          borderRadius: '50%'
                                        }} />
                                      ) : (
                                        <div style={{
                                          backgroundColor: theme.colors.primary,
                                          aspectRatio: '1',
                                          width: '32px',
                                          height: '32px',
                                          borderRadius: '50%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: 'white',
                                          fontWeight: 'bold',
                                          fontSize: theme.typography.fontSize.sm
                                        }}>
                                          {message.sender?.first_name?.[0] || 'U'}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{
                                      minWidth: 0,
                                      flex: 1,
                                      backgroundColor: theme.colors.backgroundSecondary,
                                      borderRadius: theme.borderRadius.lg,
                                      padding: theme.spacing[3]
                                    }}>
                                      <div>
                                        <div style={{ fontSize: theme.typography.fontSize.sm }}>
                                          <p style={{
                                            fontWeight: theme.typography.fontWeight.medium,
                                            color: theme.colors.textPrimary,
                                            margin: 0
                                          }}>
                                            {message.sender?.first_name} {message.sender?.last_name}
                                          </p>
                                        </div>
                                        <p style={{
                                          margin: '2px 0 0 0',
                                          fontSize: theme.typography.fontSize.sm,
                                          color: theme.colors.textSecondary
                                        }}>
                                          {message.content}
                                        </p>
                                      </div>
                                      <div style={{ marginTop: theme.spacing[2], display: 'flex', justifyContent: 'flex-start' }}>
                                        <span style={{
                                          fontSize: theme.typography.fontSize.xs,
                                          color: theme.colors.textTertiary
                                        }}>
                                          {hoursAgo} {hoursAgo === 1 ? 'hour' : 'hours'} ago
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                          {messages.length === 0 && (
                            <li>
                              <p style={{
                                fontSize: theme.typography.fontSize.sm,
                                color: theme.colors.textSecondary,
                                fontStyle: 'italic',
                                textAlign: 'center',
                                padding: theme.spacing[4]
                              }}>
                                No updates yet
                              </p>
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>

                    {/* Quick Info */}
                    <div style={{
                      backgroundColor: theme.colors.surface,
                      padding: theme.spacing[6],
                      borderRadius: '18px',
                      border: `1px solid ${theme.colors.border}`
                    }}>
                      <h4 style={{
                        fontSize: theme.typography.fontSize.lg,
                        fontWeight: theme.typography.fontWeight.bold,
                        color: theme.colors.textPrimary,
                        marginBottom: theme.spacing[4]
                      }}>
                        Quick Info
                      </h4>

                      <dl style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: theme.spacing[3],
                        margin: 0
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <dt style={{
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: theme.typography.fontWeight.medium,
                            color: theme.colors.textSecondary,
                            margin: 0
                          }}>
                            Scheduled For
                          </dt>
                          <dd style={{
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: theme.typography.fontWeight.semibold,
                            color: theme.colors.textPrimary,
                            margin: 0
                          }}>
                            TBD
                          </dd>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <dt style={{
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: theme.typography.fontWeight.medium,
                            color: theme.colors.textSecondary,
                            margin: 0
                          }}>
                            Total Quote
                          </dt>
                          <dd style={{
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: theme.typography.fontWeight.semibold,
                            color: theme.colors.textPrimary,
                            margin: 0
                          }}>
                            ${selectedJob.budget?.toFixed(2) || '0.00'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                gridColumn: 'span 2',
                backgroundColor: theme.colors.surface,
                padding: theme.spacing[8],
                borderRadius: '18px',
                border: `1px solid ${theme.colors.border}`,
                textAlign: 'center'
              }}>
                <p style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textSecondary
                }}>
                  No active jobs. Post your first job to start tracking!
                </p>
                <Link href="/jobs/create" style={{ textDecoration: 'none', display: 'inline-block', marginTop: theme.spacing[4] }}>
                  <Button variant="primary" size="sm">
                    Post a Job
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

