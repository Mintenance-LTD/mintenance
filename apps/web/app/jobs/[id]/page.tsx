import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { HomeownerLayoutShell } from '@/app/dashboard/components/HomeownerLayoutShell';
import Link from 'next/link';
import { PhotoGallery } from './components/PhotoGallery';
import { ContractorViewersList } from './components/ContractorViewersList';
import { JobLocationMap } from './components/JobLocationMap';
import { JobViewTracker } from './components/JobViewTracker';
import { IntelligentMatching } from './components/IntelligentMatching';

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
    .select('*')
    .eq('id', resolvedParams.id)
    .single();

  // Debug logging
  console.log('JobDetailPage - Fetching job:', {
    jobId: resolvedParams.id,
    jobError: jobError ? JSON.stringify(jobError, null, 2) : null,
    jobErrorType: jobError ? typeof jobError : null,
    jobErrorKeys: jobError ? Object.keys(jobError) : null,
    jobFound: !!job,
    jobIdFromDB: job?.id
  });

  if (jobError) {
    console.error('JobDetailPage - Error fetching job:', {
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
    console.error('JobDetailPage - Job not found for ID:', resolvedParams.id);
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
    .select('id, first_name, last_name, email, phone, profile_image_url')
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
      contractor_id
    `)
    .eq('job_id', resolvedParams.id);

  // Fetch contractor info for each bid
  const bidsWithContractors = bids ? await Promise.all(
    bids.map(async (bid) => {
      if (bid.contractor_id) {
        const { data: contractor } = await serverSupabase
          .from('users')
          .select('id, first_name, last_name, email, phone, profile_image_url')
          .eq('id', bid.contractor_id)
          .single();
        return { ...bid, contractor };
      }
      return bid;
    })
  ) : [];

  // Fetch job photos/attachments
  const { data: photos } = await serverSupabase
    .from('job_attachments')
    .select('*')
    .eq('job_id', resolvedParams.id)
    .order('created_at', { ascending: false});

  // Get the accepted bid (if any)
  const acceptedBid = bidsWithContractors?.find((bid: any) => bid.status === 'accepted');
  
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
      {/* Track view when contractors visit this page */}
      <JobViewTracker jobId={resolvedParams.id} />
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: theme.spacing[6],
      }}>
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
                  <div>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
                  {bidsWithContractors.map((bid: any) => {
                    const bidContractor = bid.contractor;
                    const contractorName = bidContractor?.first_name && bidContractor?.last_name
                      ? `${bidContractor.first_name} ${bidContractor.last_name}`
                      : 'Unknown Contractor';
                    const initials = contractorName
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <div
                        key={bid.id}
                        style={{
                          padding: theme.spacing[4],
                          backgroundColor: bid.status === 'accepted' ? '#F0FDF4' : theme.colors.backgroundSecondary,
                          borderRadius: theme.borderRadius.md,
                          border: bid.status === 'accepted' ? `2px solid ${theme.colors.success}` : `1px solid ${theme.colors.border}`,
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          gap: theme.spacing[3],
                          alignItems: 'flex-start',
                        }}>
                          {/* Contractor Avatar */}
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: theme.borderRadius.full,
                            backgroundColor: bidContractor?.profile_image_url ? 'transparent' : theme.colors.primary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: theme.typography.fontSize.lg,
                            fontWeight: theme.typography.fontWeight.bold,
                            color: 'white',
                            flexShrink: 0,
                            overflow: 'hidden',
                          }}>
                            {bidContractor?.profile_image_url ? (
                              <img
                                src={bidContractor.profile_image_url}
                                alt={contractorName}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : (
                              initials
                            )}
                          </div>

                          {/* Contractor Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: theme.spacing[2],
                              flexWrap: 'wrap',
                              gap: theme.spacing[2],
                            }}>
                              <div>
                                <div style={{
                                  fontSize: theme.typography.fontSize.base,
                                  fontWeight: theme.typography.fontWeight.semibold,
                                  color: theme.colors.textPrimary,
                                  marginBottom: '2px',
                                }}>
                                  {contractorName}
                                </div>
                                {bidContractor?.email && (
                                  <div style={{
                                    fontSize: theme.typography.fontSize.sm,
                                    color: theme.colors.textSecondary,
                                  }}>
                                    {bidContractor.email}
                                  </div>
                                )}
                                {bidContractor?.phone && (
                                  <div style={{
                                    fontSize: theme.typography.fontSize.sm,
                                    color: theme.colors.textSecondary,
                                  }}>
                                    {bidContractor.phone}
                                  </div>
                                )}
                              </div>
                              <div style={{
                                fontSize: theme.typography.fontSize['2xl'],
                                fontWeight: theme.typography.fontWeight.bold,
                                color: bid.status === 'accepted' ? theme.colors.success : theme.colors.primary,
                              }}>
                                £{Number(bid.amount).toLocaleString()}
                              </div>
                            </div>

                            {/* Bid Description */}
                            {bid.description && (
                              <div style={{
                                marginTop: theme.spacing[2],
                                padding: theme.spacing[3],
                                backgroundColor: bid.status === 'accepted' ? 'rgba(16, 185, 129, 0.1)' : theme.colors.backgroundTertiary,
                                borderRadius: theme.borderRadius.md,
                              }}>
                                <div style={{
                                  fontSize: theme.typography.fontSize.xs,
                                  fontWeight: theme.typography.fontWeight.medium,
                                  color: theme.colors.textSecondary,
                                  marginBottom: theme.spacing[1],
                                }}>
                                  Proposal Details:
                                </div>
                                <div style={{
                                  fontSize: theme.typography.fontSize.sm,
                                  color: theme.colors.textPrimary,
                                  lineHeight: 1.6,
                                }}>
                                  {bid.description}
                                </div>
                              </div>
                            )}

                            {/* Bid Status & Date */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: theme.spacing[2],
                              paddingTop: theme.spacing[2],
                              borderTop: `1px solid ${theme.colors.border}`,
                            }}>
                              <div style={{
                                fontSize: theme.typography.fontSize.xs,
                                color: theme.colors.textSecondary,
                              }}>
                                Submitted {new Date(bid.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </div>
                              {bid.status === 'accepted' && (
                                <div style={{
                                  fontSize: theme.typography.fontSize.xs,
                                  fontWeight: theme.typography.fontWeight.semibold,
                                  color: theme.colors.success,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: theme.spacing[1],
                                }}>
                                  <Icon name="checkCircle" size={14} color={theme.colors.success} />
                                  Accepted Bid
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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

