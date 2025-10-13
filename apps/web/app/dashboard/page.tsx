import { headers } from 'next/headers';
import Link from 'next/link';
import { getCurrentUserFromHeaders, getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import LogoutButton from '@/components/LogoutButton';
import UnauthenticatedCard from '@/components/UnauthenticatedCard';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';
import Logo from '../components/Logo';
import { ContractorLayoutShell } from '../contractor/components/ContractorLayoutShell';
import { ProfileQuickActions } from '../contractor/profile/components/ProfileQuickActions';
import { ProfileStats } from '../contractor/profile/components/ProfileStats';
import { ProfileReviews } from '../contractor/profile/components/ProfileReviews';
import { MetricCard } from '@/components/ui/MetricCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Mintenance',
  description: 'Manage your Mintenance account and projects',
};

const formatStatusLabel = (status?: string | null) => {
  if (!status) return 'Unknown';
  return status
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default async function DashboardPage() {
  const headersList = await headers();

  let user = getCurrentUserFromHeaders(headersList as unknown as Headers);
  if (!user) {
    user = await getCurrentUserFromCookies();
  }

  if (!user) {
    return <UnauthenticatedCard />;
  }

  if (user.role === 'contractor') {
    const [
      contractorProfileResponse,
      skillsResponse,
      reviewsResponse,
      completedJobsResponse,
      activeJobsResponse,
      quotesResponse,
    ] = await Promise.all([
      serverSupabase
        .from('users')
        .select(
          `first_name,
           last_name,
           company_name,
           profile_image_url,
           city,
           country,
           bio,
           is_available,
           email_verified,
           total_jobs_completed,
           rating`
        )
        .eq('id', user.id)
        .single(),
      serverSupabase
        .from('contractor_skills')
        .select('skill_name')
        .eq('contractor_id', user.id),
      serverSupabase
        .from('reviews')
        .select(
          `
          *,
          reviewer:reviewer_id (
            first_name,
            last_name,
            profile_image_url
          ),
          job:job_id (
            title,
            category
          )
        `
        )
        .eq('reviewed_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      serverSupabase
        .from('jobs')
        .select('id, title, category, status, completed_at')
        .eq('contractor_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10),
      serverSupabase
        .from('jobs')
        .select('id, title, status, scheduled_date, updated_at')
        .eq('contractor_id', user.id)
        .in('status', ['assigned', 'in_progress'])
        .order('updated_at', { ascending: false })
        .limit(6),
      serverSupabase
        .from('contractor_quotes')
        .select('id, title, status, updated_at')
        .eq('contractor_id', user.id)
        .in('status', ['draft', 'sent'])
        .order('updated_at', { ascending: false })
        .limit(6),
    ]);

    const contractorProfile = contractorProfileResponse.data ?? null;
    const skills = skillsResponse.data ?? [];
    const reviews = reviewsResponse.data ?? [];
    const completedJobs = completedJobsResponse.data ?? [];
    const activeJobs = activeJobsResponse.data ?? [];
    const pendingQuotes = quotesResponse.data ?? [];

    const profileFields = [
      contractorProfile?.first_name,
      contractorProfile?.last_name,
      contractorProfile?.bio,
      contractorProfile?.city,
      contractorProfile?.country,
      contractorProfile?.profile_image_url,
      skills.length > 0,
    ];
    const completedFields = profileFields.filter(Boolean).length;
    const profileCompletion = profileFields.length
      ? Math.round((completedFields / profileFields.length) * 100)
      : 0;

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : contractorProfile?.rating ?? 0;

    const metrics = {
      profileCompletion,
      averageRating,
      totalReviews: reviews.length,
      jobsCompleted: completedJobs.length,
    };

    const summaryCards = [
      {
        label: 'Active Jobs',
        value: activeJobs.length,
        helper: 'Currently in progress',
      },
      {
        label: 'Open Quotes',
        value: pendingQuotes.length,
        helper: 'Draft or sent to homeowners',
      },
      {
        label: 'Completed Jobs',
        value: completedJobs.length,
        helper: 'Lifetime completions',
      },
    ];

    const activeJobItems = activeJobs.slice(0, 4);
    const quoteItems = pendingQuotes.slice(0, 4);
    const sentQuotesCount = pendingQuotes.filter((quote) => quote.status === 'sent').length;

    const baseListCardStyle = {
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '20px',
      padding: theme.spacing[6],
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing[4],
    } as const;

    return (
      <ContractorLayoutShell contractor={contractorProfile} email={user.email}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[8],
          }}
        >
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: theme.spacing[4],
            }}
          >
            {summaryCards.map((card) => (
              <div
                key={card.label}
                style={{
                  backgroundColor: theme.colors.surface,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '18px',
                  padding: theme.spacing[5],
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing[2],
                }}
              >
                <span
                  style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: '1.2px',
                  }}
                >
                  {card.label}
                </span>
                <span
                  style={{
                    fontSize: theme.typography.fontSize['3xl'],
                    fontWeight: theme.typography.fontWeight.bold,
                    color: theme.colors.textPrimary,
                  }}
                >
                  {card.value}
                </span>
                <span
                  style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                  }}
                >
                  {card.helper}
                </span>
              </div>
            ))}
          </section>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 320px) 1fr',
              gap: theme.spacing[8],
              alignItems: 'start',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
              <ProfileQuickActions unreadMessagesCount={0} />

              <div style={baseListCardStyle}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: theme.typography.fontSize['2xl'],
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    Active Jobs
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    Manage projects currently moving forward.
                  </p>
                </div>

                {activeJobItems.length > 0 ? (
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: theme.spacing[3],
                    }}
                  >
                    {activeJobItems.map((job) => (
                      <li
                        key={job.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: theme.spacing[4],
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span
                            style={{
                              fontWeight: theme.typography.fontWeight.semibold,
                              color: theme.colors.textPrimary,
                            }}
                          >
                            {job.title || 'Untitled job'}
                          </span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 8px',
                              borderRadius: '10px',
                              backgroundColor: theme.colors.backgroundSecondary,
                              border: `1px solid ${theme.colors.border}`,
                              fontSize: theme.typography.fontSize.xs,
                              color: theme.colors.textSecondary,
                              textTransform: 'capitalize',
                            }}
                          >
                            {formatStatusLabel(job.status)}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: theme.typography.fontSize.xs,
                            color: theme.colors.textSecondary,
                          }}
                        >
                          {formatDate(job.scheduled_date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    You&apos;re all caught up. No active jobs right now.
                  </p>
                )}
              </div>

              <div style={baseListCardStyle}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: theme.typography.fontSize['2xl'],
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    Open Quotes
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    {sentQuotesCount} awaiting homeowner response.
                  </p>
                </div>

                {quoteItems.length > 0 ? (
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: theme.spacing[3],
                    }}
                  >
                    {quoteItems.map((quote) => (
                      <li
                        key={quote.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: theme.spacing[4],
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span
                            style={{
                              fontWeight: theme.typography.fontWeight.semibold,
                              color: theme.colors.textPrimary,
                            }}
                          >
                            {quote.title || 'Untitled quote'}
                          </span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 8px',
                              borderRadius: '10px',
                              backgroundColor: theme.colors.backgroundSecondary,
                              border: `1px solid ${theme.colors.border}`,
                              fontSize: theme.typography.fontSize.xs,
                              color: theme.colors.textSecondary,
                              textTransform: 'capitalize',
                            }}
                          >
                            {formatStatusLabel(quote.status)}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: theme.typography.fontSize.xs,
                            color: theme.colors.textSecondary,
                          }}
                        >
                          {formatDate(quote.updated_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    No drafts or pending quotes yet.
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
              <ProfileStats metrics={metrics} skills={skills} />
              <ProfileReviews reviews={reviews.slice(0, 3)} />
            </div>
          </div>
        </div>
      </ContractorLayoutShell>
    );
  }

  // Fetch homeowner-specific data
  const { data: homeownerJobs } = await serverSupabase
    .from('jobs')
    .select('*')
    .eq('homeowner_id', user.id)
    .order('created_at', { ascending: false });

  const jobs = homeownerJobs || [];
  const activeJobs = jobs.filter(j => ['posted', 'assigned', 'in_progress'].includes(j.status || ''));
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const postedJobs = jobs.filter(j => j.status === 'posted');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.backgroundSecondary }}>
      {/* Logo Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing[6],
        backgroundColor: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <Logo />
          <span style={{
            marginLeft: theme.spacing[3],
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            Mintenance
          </span>
        </Link>

        <div style={{ display: 'flex', gap: theme.spacing[4], alignItems: 'center' }}>
          <Link href="/jobs" style={{ color: theme.colors.textSecondary, textDecoration: 'none', fontSize: theme.typography.fontSize.sm }}>
            Jobs
          </Link>
          <Link href="/contractors" style={{ color: theme.colors.textSecondary, textDecoration: 'none', fontSize: theme.typography.fontSize.sm }}>
            Contractors
          </Link>
          <Link href="/messages" style={{ color: theme.colors.textSecondary, textDecoration: 'none', fontSize: theme.typography.fontSize.sm }}>
            Messages
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: theme.spacing[8] }}>
        {/* Header */}
        <div style={{ marginBottom: theme.spacing[8] }}>
          <h1 style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[2],
          }}>
            Maintenance Hub
          </h1>
          <p style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.base }}>
            Manage your maintenance requests and find trusted contractors
          </p>
        </div>

        {/* Metrics */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: theme.spacing[4],
          marginBottom: theme.spacing[8],
        }}>
          <MetricCard
            label="Total Jobs"
            value={jobs.length.toString()}
            subtitle="All time"
            icon="briefcase"
            color={theme.colors.primary}
          />

          <MetricCard
            label="Active Jobs"
            value={activeJobs.length.toString()}
            subtitle="In progress or posted"
            icon="activity"
            color={theme.colors.warning || '#F59E0B'}
          />

          <MetricCard
            label="Completed"
            value={completedJobs.length.toString()}
            subtitle="Successfully finished"
            icon="checkCircle"
            color={theme.colors.success}
          />

          <MetricCard
            label="Posted"
            value={postedJobs.length.toString()}
            subtitle="Awaiting contractors"
            icon="clock"
            color={theme.colors.info}
          />
        </section>

        {/* Quick Actions */}
        <section style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '20px',
          padding: theme.spacing[6],
          border: `1px solid ${theme.colors.border}`,
          marginBottom: theme.spacing[8],
        }}>
          <h2 style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            marginBottom: theme.spacing[5],
          }}>
            Quick Actions
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing[4],
          }}>
            <Link href="/jobs" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: theme.spacing[4],
                borderRadius: '16px',
                backgroundColor: theme.colors.backgroundSecondary,
                border: `1px solid ${theme.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[3],
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Icon name="plus" size={24} color={theme.colors.primary} />
                <div>
                  <div style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary }}>
                    Post a Job
                  </div>
                  <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                    Request maintenance
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/contractors" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: theme.spacing[4],
                borderRadius: '16px',
                backgroundColor: theme.colors.backgroundSecondary,
                border: `1px solid ${theme.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[3],
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Icon name="users" size={24} color={theme.colors.primary} />
                <div>
                  <div style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary }}>
                    Browse Contractors
                  </div>
                  <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                    Find professionals
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/discover" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: theme.spacing[4],
                borderRadius: '16px',
                backgroundColor: theme.colors.backgroundSecondary,
                border: `1px solid ${theme.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[3],
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Icon name="search" size={24} color={theme.colors.primary} />
                <div>
                  <div style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary }}>
                    Discover
                  </div>
                  <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                    Explore options
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/messages" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: theme.spacing[4],
                borderRadius: '16px',
                backgroundColor: theme.colors.backgroundSecondary,
                border: `1px solid ${theme.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[3],
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Icon name="messageCircle" size={24} color={theme.colors.primary} />
                <div>
                  <div style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary }}>
                    Messages
                  </div>
                  <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                    Chat with contractors
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Recent Jobs */}
        {jobs.length > 0 && (
          <section style={{
            backgroundColor: theme.colors.surface,
            borderRadius: '20px',
            padding: theme.spacing[6],
            border: `1px solid ${theme.colors.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[5] }}>
              <h2 style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                margin: 0,
              }}>
                Recent Jobs
              </h2>
              <Link href="/jobs" style={{
                color: theme.colors.primary,
                textDecoration: 'none',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
              }}>
                View All →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
              {jobs.slice(0, 5).map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: theme.spacing[4],
                    borderRadius: '16px',
                    backgroundColor: theme.colors.backgroundSecondary,
                    border: `1px solid ${theme.colors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div>
                      <div style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary, marginBottom: theme.spacing[1] }}>
                        {job.title}
                      </div>
                      <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                        {new Date(job.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <StatusBadge status={job.status} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
