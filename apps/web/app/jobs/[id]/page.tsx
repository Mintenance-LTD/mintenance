import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { HomeownerLayoutShell } from '@/app/dashboard/components/HomeownerLayoutShell';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { PhotoGallery } from './components/PhotoGallery';
import { ContractorViewersList } from './components/ContractorViewersList';
import { JobLocationMap } from './components/JobLocationMap';
import { JobViewTracker } from './components/JobViewTracker';
import { IntelligentMatching } from './components/IntelligentMatching';
import { BidListClient } from './components/BidListClient';
import { ContractManagement } from './components/ContractManagement';
import { LocationTracking } from './components/LocationTracking';
import { JobScheduling } from './components/JobScheduling';
import { MessageContractorButton } from './components/MessageContractorButton';
import { DeleteJobButton } from './components/DeleteJobButton';

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/jobs');
  }

  // Redirect contractors to their bid submission page
  if (user.role === 'contractor') {
    redirect(`/contractor/bid/${resolvedParams.id}`);
  }

  // Fetch job details - start with basic query to debug
  const { data: job, error: jobError } = await serverSupabase
    .from('jobs')
    .select('*, scheduled_start_date, scheduled_end_date, scheduled_duration_hours')
    .eq('id', resolvedParams.id)
    .single();

  // Debug logging
  // Debug logging
  logger.debug('JobDetailPage - Fetching job', {
    jobId: resolvedParams.id,
    jobError: jobError ? JSON.stringify(jobError, null, 2) : null,
    jobErrorType: jobError ? typeof jobError : null,
    jobErrorKeys: jobError ? Object.keys(jobError) : null,
    jobFound: !!job,
    jobIdFromDB: job?.id
  });

  if (jobError) {
    logger.error('JobDetailPage - Error fetching job', {
      error: jobError,
      errorString: JSON.stringify(jobError),
      errorMessage: (jobError as any)?.message,
      errorCode: (jobError as any)?.code,
      errorDetails: (jobError as any)?.details,
      jobId: resolvedParams.id
    });
    redirect('/jobs');
  }

  if (!job) {
    logger.error('JobDetailPage - Job not found for ID', { jobId: resolvedParams.id });
    redirect('/jobs');
  }

  // Fetch related data separately to avoid query errors
  const { data: property } = job.property_id ? await serverSupabase
    .from('properties')
    .select('id, property_name, address')
    .eq('id', job.property_id)
    .single() : { data: null };

  const { data: contractor } = job.contractor_id ? await serverSupabase
    .from('users')
    .select('id, first_name, last_name, email, phone, profile_image_url, admin_verified, company_name, license_number')
    .eq('id', job.contractor_id)
    .single() : { data: null };

  const { data: bids } = await serverSupabase
    .from('bids')
    .select(`
      id,
      amount,
      description,
      status,
      created_at,
      contractor_id,
      quote_id
    `)
    .eq('job_id', resolvedParams.id);

  // Fetch contractor info for each bid
  const bidsWithContractors = bids ? await Promise.all(
    bids.map(async (bid) => {
      if (bid.contractor_id) {
        const { data: contractor } = await serverSupabase
          .from('users')
          .select('id, first_name, last_name, email, phone, profile_image_url, admin_verified, company_name, license_number')
          .eq('id', bid.contractor_id)
          .single();

        // Fetch contractor portfolio images from contractor_posts
        const { data: portfolioPosts } = await serverSupabase
          .from('contractor_posts')
          .select('media_urls, title, project_category')
          .eq('contractor_id', bid.contractor_id)
          .in('post_type', ['portfolio', 'work_showcase'])
          .eq('is_active', true)
          .not('media_urls', 'is', null)
          .order('created_at', { ascending: false })
          .limit(12);

        // Flatten portfolio images
        const portfolioImages = portfolioPosts?.flatMap(post =>
          (post.media_urls || []).map((url: string) => ({
            url,
            title: post.title || 'Previous Work',
            category: post.project_category || 'General'
          }))
        ) || [];

        return { ...bid, contractor: { ...contractor, portfolioImages } };
      }
      return bid;
    })
  ) : [];

  // Fetch job photos/attachments
  const { data: photos } = await serverSupabase
    .from('job_attachments')
    .select('*')
    .eq('job_id', resolvedParams.id)
    .order('created_at', { ascending: false });

  // Get the accepted bid (if any)
  const acceptedBid = bidsWithContractors?.find((bid: any) => bid.status === 'accepted');

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

  // Status configuration
  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    posted: { label: 'Posted', color: '#6B7280', bg: '#F3F4F6', icon: 'briefcase' },
    assigned: { label: 'Assigned', color: '#3B82F6', bg: '#DBEAFE', icon: 'userCheck' },
    in_progress: { label: 'In Progress', color: '#F59E0B', bg: '#FEF3C7', icon: 'clock' },
    completed: { label: 'Completed', color: '#10B981', bg: '#D1FAE5', icon: 'checkCircle' },
    cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2', icon: 'xCircle' },
  };

  const currentStatus = statusConfig[job.status || 'posted'] || statusConfig.posted;

  return (
    <HomeownerLayoutShell currentPath="/jobs">
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: theme.spacing[6],
      }}>
        {/* Track view when contractors visit this page */}
        <JobViewTracker jobId={resolvedParams.id} />
        {/* Back Button */}
        <Link
          href="/jobs"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm,
            textDecoration: 'none',
            marginBottom: theme.spacing[4],
          }}
        >
          <Icon name="arrowLeft" size={16} />
          Back to Jobs
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
                {job.title || 'Untitled Job'}
              </h1>
              <span style={{
                padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                borderRadius: theme.borderRadius.full,
                backgroundColor: currentStatus.bg,
                color: currentStatus.color,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[1],
              }}>
                <Icon name={currentStatus.icon as any} size={14} color={currentStatus.color} />
                {currentStatus.label}
              </span>
            </div>
            {property && (
              <p style={{
                margin: 0,
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}>
                <Icon name="home" size={16} />
                {property.property_name || property.address}
              </p>
            )}
          </div>
          {/* Delete button - only show for homeowners on posted jobs */}
          {user.role === 'homeowner' && job.status === 'posted' && (
            <DeleteJobButton jobId={resolvedParams.id} jobTitle={job.title || 'Untitled Job'} />
          )}
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

                  <div>
                    <div style={{
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing[1],
                    }}>
                      Scheduled Date
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.base,
                      color: theme.colors.textPrimary,
                    }}>
                      {job.scheduled_date
                        ? new Date(job.scheduled_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                        : 'Not scheduled'}
                    </div>
                  </div>

                  <div>
                    <div style={{
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing[1],
                    }}>
                      Created
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.base,
                      color: theme.colors.textPrimary,
                    }}>
                      {new Date(job.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  <div>
                    <div style={{
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing[1],
                    }}>
                      Category
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.base,
                      color: theme.colors.textPrimary,
                    }}>
                      {job.category || 'General'}
                    </div>
                  </div>
                </div>

                {/* Location */}
                {job.location && (
                  <div>
                    <div style={{
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing[1],
                    }}>
                      Location
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.base,
                      color: theme.colors.textPrimary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing[1],
                      marginBottom: theme.spacing[4],
                    }}>
                      <Icon name="mapPin" size={16} color={theme.colors.textSecondary} />
                      {job.location}
                    </div>
                  </div>
                )}
              </div>

              {/* Job Location Map - Inside Job Details Card */}
              {job.location && (
                <div style={{
                  marginTop: theme.spacing[4],
                  paddingTop: theme.spacing[4],
                  borderTop: `1px solid ${theme.colors.border}`,
                }}>
                  <JobLocationMap jobLocation={job.location} jobId={resolvedParams.id} />
                </div>
              )}
            </div>

            {/* Contractor Card */}
            {contractor && (
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
                  Assigned Contractor
                </h2>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[3],
                  marginBottom: theme.spacing[4],
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
                  }}>
                    {contractor.first_name?.[0]}{contractor.last_name?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: theme.typography.fontSize.lg,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                      marginBottom: '2px',
                    }}>
                      {contractor.first_name} {contractor.last_name}
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                    }}>
                      {contractor.email}
                    </div>
                    {contractor.phone && (
                      <div style={{
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textSecondary,
                      }}>
                        {contractor.phone}
                      </div>
                    )}
                  </div>
                </div>

                {/* Message Contractor Button */}
                <MessageContractorButton
                  jobId={resolvedParams.id}
                  contractorId={contractor.id}
                  contractorName={`${contractor.first_name} ${contractor.last_name}`}
                  jobTitle={job.title || 'Job'}
                />
              </div>
            )}

            {/* Accepted Bid Card */}
            {acceptedBid && (
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
                  Accepted Bid
                </h2>

                <div style={{
                  backgroundColor: theme.colors.backgroundSecondary,
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing[4],
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: theme.spacing[3],
                  }}>
                    <div style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                    }}>
                      Bid Amount
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize['2xl'],
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.success,
                    }}>
                      £{Number(acceptedBid.amount).toLocaleString()}
                    </div>
                  </div>

                  {acceptedBid.description && (
                    <div>
                      <div style={{
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                        color: theme.colors.textSecondary,
                        marginBottom: theme.spacing[1],
                      }}>
                        Proposal Details
                      </div>
                      <div style={{
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textPrimary,
                        lineHeight: 1.6,
                      }}>
                        {acceptedBid.description}
                      </div>
                    </div>
                  )}

                  <div style={{
                    marginTop: theme.spacing[3],
                    paddingTop: theme.spacing[3],
                    borderTop: `1px solid ${theme.colors.border}`,
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                  }}>
                    Submitted on {new Date(acceptedBid.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
            {/* Contract Management - Only show if contractor is assigned */}
            {contractor && job.status === 'assigned' && (
              <ContractManagement
                jobId={resolvedParams.id}
                userRole="homeowner"
                userId={user.id}
              />
            )}

            {/* Job Scheduling - Only show if contractor is assigned */}
            {contractor && job.status === 'assigned' && (
              <JobScheduling
                jobId={resolvedParams.id}
                userRole="homeowner"
                userId={user.id}
                currentSchedule={{
                  scheduled_start_date: job.scheduled_start_date || null,
                  scheduled_end_date: job.scheduled_end_date || null,
                  scheduled_duration_hours: job.scheduled_duration_hours || null,
                }}
                contractStatus={contractStatus}
              />
            )}

            {/* Location Tracking - Only show if contractor is assigned */}
            {contractor && job.status === 'assigned' && (
              <LocationTracking
                jobId={resolvedParams.id}
                contractorId={contractor.id}
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
                {/* Progress Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
                  {[
                    { label: 'Job Posted', status: 'posted', completed: true },
                    { label: 'Contractor Assigned', status: 'assigned', completed: job.status !== 'posted' },
                    { label: 'Work In Progress', status: 'in_progress', completed: job.status === 'in_progress' || job.status === 'completed' },
                    { label: 'Work Completed', status: 'completed', completed: job.status === 'completed' },
                  ].map((step, index) => (
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

            {/* Photos Card */}
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
                Job Photos ({photos?.length || 0})
              </h2>
              <PhotoGallery photos={photos || []} />
            </div>

            {/* Contractors Interested / All Bids Card */}
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
                Contractors Who Bid ({bidsWithContractors?.length || 0})
              </h2>

              {(!bidsWithContractors || bidsWithContractors.length === 0) ? (
                <div style={{
                  textAlign: 'center',
                  padding: theme.spacing[8],
                  color: theme.colors.textSecondary,
                }}>
                  <Icon name="users" size={48} color={theme.colors.textTertiary} />
                  <p style={{ marginTop: theme.spacing[2], margin: 0, fontSize: theme.typography.fontSize.base }}>
                    No contractors have bid yet
                  </p>
                  <p style={{ marginTop: theme.spacing[1], margin: 0, fontSize: theme.typography.fontSize.sm }}>
                    Contractors viewing this job will be able to submit bids
                  </p>
                </div>
              ) : (
                <BidListClient bids={bidsWithContractors} jobId={resolvedParams.id} />
              )}
            </div>
          </div>
        </div>

        {/* Balanced Grid Section - Intelligent Matching and Contractors Viewing */}
        {/* Only show these sections for homeowners */}
        {user.role === 'homeowner' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: theme.spacing[6],
            marginTop: theme.spacing[6],
          }}>
            {/* Intelligent Matching - Top Matched Contractors */}
            {job.status === 'posted' && (
              <IntelligentMatching jobId={resolvedParams.id} />
            )}

            {/* Contractors Viewing This Job */}
            <ContractorViewersList jobId={resolvedParams.id} />
          </div>
        )}
      </div>
    </HomeownerLayoutShell>
  );
}

