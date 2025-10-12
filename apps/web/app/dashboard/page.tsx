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
import type { Metadata } from 'next';

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

  const quickActions =
    user.role === 'contractor'
      ? [
          { href: '/contractor/profile', label: 'My Profile', icon: 'profile' },
          { href: '/jobs', label: 'Browse Jobs', icon: 'briefcase' },
          { href: '/discover', label: 'Discover Jobs', icon: 'discover' },
          { href: '/analytics', label: 'Analytics & Insights', icon: 'chart' },
          { href: '/messages', label: 'Messages', icon: 'messages' },
          { href: '/payments', label: 'Payments & Earnings', icon: 'creditCard' },
          { href: '/search', label: 'Advanced Search', icon: 'discover' },
          { href: '/video-calls', label: 'Video Calls', icon: 'video' },
        ]
      : [
          { href: '/jobs', label: 'Post a Job', icon: 'plus' },
          { href: '/contractors', label: 'Browse Contractors', icon: 'users' },
          { href: '/discover', label: 'Discover Contractors', icon: 'discover' },
          { href: '/messages', label: 'Messages', icon: 'messages' },
          { href: '/payments', label: 'Payments & Escrow', icon: 'creditCard' },
          { href: '/search', label: 'Advanced Search', icon: 'discover' },
          { href: '/video-calls', label: 'Video Calls', icon: 'video' },
        ];

  const statusItems = [
    { label: 'Authenticated', status: 'success', color: theme.colors.success },
    { label: 'Active Session', status: 'info', color: theme.colors.info },
  ];

  return (
    <Layout
      title="Dashboard"
      subtitle={`Welcome back, ${user.email}!`}
      actions={<LogoutButton />}
      navigation={
        user.role === 'contractor'
          ? [
              { label: 'Overview', href: '/dashboard', active: true },
              { label: 'My Profile', href: '/contractor/profile' },
              { label: 'Jobs', href: '/jobs' },
              { label: 'Analytics', href: '/analytics' },
              { label: 'Messages', href: '/messages', badge: 3 },
              { label: 'Payments', href: '/payments' },
            ]
          : [
              { label: 'Overview', href: '/dashboard', active: true },
              { label: 'Jobs', href: '/jobs' },
              { label: 'Contractors', href: '/contractors' },
              { label: 'Messages', href: '/messages', badge: 3 },
              { label: 'Payments', href: '/payments' },
            ]
      }
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing[6],
          backgroundColor: theme.colors.surface,
          borderBottom: `1px solid ${theme.colors.border}`,
          marginBottom: theme.spacing[6],
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <Logo className="w-10 h-10" />
          <span
            style={{
              marginLeft: theme.spacing[3],
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}
          >
            Mintenance
          </span>
        </Link>
      </div>

      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', current: true },
        ]}
        style={{ marginBottom: theme.spacing[6] }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: theme.spacing[6],
          marginTop: theme.spacing[6],
        }}
      >
        <Card variant="elevated" hover>
          <h2
            style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[4],
            }}
          >
            User Info
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: theme.typography.fontWeight.medium, color: theme.colors.textSecondary }}>
                ID:
              </span>
              <span style={{ color: theme.colors.textPrimary }}>{user.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: theme.typography.fontWeight.medium, color: theme.colors.textSecondary }}>
                Email:
              </span>
              <span style={{ color: theme.colors.textPrimary }}>{user.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: theme.typography.fontWeight.medium, color: theme.colors.textSecondary }}>
                Role:
              </span>
              <span
                style={{
                  textTransform: 'capitalize',
                  backgroundColor: theme.colors.secondary,
                  color: theme.colors.white,
                  padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                  borderRadius: theme.borderRadius.base,
                  fontSize: theme.typography.fontSize.sm,
                }}
              >
                {user.role}
              </span>
            </div>
          </div>
        </Card>

        <Card variant="elevated" hover>
          <h2
            style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[4],
            }}
          >
            Quick Actions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} style={{ textDecoration: 'none' }}>
                <Button
                  variant="ghost"
                  fullWidth
                  style={{
                    justifyContent: 'flex-start',
                    padding: theme.spacing[3],
                    borderRadius: theme.borderRadius.lg,
                    fontSize: theme.typography.fontSize.md,
                    color: theme.colors.textPrimary,
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ marginRight: theme.spacing[2], display: 'inline-flex', alignItems: 'center' }}>
                    <Icon name={action.icon} size={16} color={theme.colors.textSecondary} />
                  </span>
                  {action.label}
                </Button>
              </Link>
            ))}
          </div>
        </Card>

        <Card variant="elevated" hover>
          <h2
            style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[4],
            }}
          >
            Status
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
            {statusItems.map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: item.color,
                    borderRadius: '50%',
                    marginRight: theme.spacing[2],
                  }}
                />
                <span
                  style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
