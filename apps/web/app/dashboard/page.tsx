import { headers } from 'next/headers';
import { getCurrentUserFromHeaders, getCurrentUserFromCookies } from '@/lib/auth';
import LogoutButton from '@/components/LogoutButton';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Layout } from '@/components/ui/Layout';
import { theme } from '@/lib/theme';

export default async function DashboardPage() {
  const headersList = headers();

  // Try to get user from headers first (middleware approach)
  // headers() returns ReadonlyHeaders (compatible for reads)
  let user = getCurrentUserFromHeaders(headersList as unknown as Headers);

  // Fallback to cookies if headers don't contain user info (more reliable)
  if (!user) {
    user = await getCurrentUserFromCookies();
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.backgroundSecondary,
      }}>
        <Card variant="elevated" style={{ textAlign: 'center', padding: theme.spacing[8] }}>
          <h1 style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[4],
          }}>
            Access Denied
          </h1>
          <p style={{
            fontSize: theme.typography.fontSize.lg,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing[6],
          }}>
            You must be logged in to view this page.
          </p>
          <Button variant="primary" onClick={() => window.location.href = '/login'}>
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  const quickActions = [
    { href: '/jobs', label: 'View Jobs', icon: '📋' },
    { href: '/contractors', label: 'Browse Contractors', icon: '👷' },
    { href: '/discover', label: 'Discover & Swipe', icon: '🔥' },
    { href: '/messages', label: 'Messages', icon: '💬' },
    { href: '/payments', label: 'Payments & Escrow', icon: '💰' },
    { href: '/search', label: 'Advanced Search', icon: '🔍' },
    { href: '/video-calls', label: 'Video Calls', icon: '📹' },
    { href: '/analytics', label: 'Analytics & Insights', icon: '📊' },
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
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Dashboard' }
      ]}
      navigation={[
        { label: 'Overview', href: '/dashboard', active: true },
        { label: 'Jobs', href: '/jobs' },
        { label: 'Contractors', href: '/contractors' },
        { label: 'Messages', href: '/messages', badge: 3 },
        { label: 'Payments', href: '/payments' },
        { label: 'Analytics', href: '/analytics' },
      ]}
    >
      {/* Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: theme.spacing[6],
        marginTop: theme.spacing[6],
      }}>
        {/* User Info Card */}
        <Card variant="elevated" hover>
          <h2 style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[4],
          }}>
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
              <span style={{ 
                textTransform: 'capitalize',
                backgroundColor: theme.colors.secondary,
                color: theme.colors.white,
                padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                borderRadius: theme.borderRadius.base,
                fontSize: theme.typography.fontSize.sm,
              }}>
                {user.role}
              </span>
            </div>
          </div>
        </Card>

        {/* Quick Actions Card */}
        <Card variant="elevated" hover>
          <h2 style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[4],
          }}>
            Quick Actions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
            {quickActions.map((action, index) => (
              <Button
                key={index}
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
                onClick={() => window.location.href = action.href}
              >
                <span style={{ marginRight: theme.spacing[2] }}>{action.icon}</span>
                {action.label}
              </Button>
            ))}
          </div>
        </Card>

        {/* Status Card */}
        <Card variant="elevated" hover>
          <h2 style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[4],
          }}>
            Status
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
            {statusItems.map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: item.color,
                  borderRadius: '50%',
                  marginRight: theme.spacing[2],
                }} />
                <span style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                }}>
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
