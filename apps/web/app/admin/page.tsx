import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import styles from './admin.module.css';

export const metadata = {
  title: 'Admin Dashboard | Mintenance',
  description: 'Administrative dashboard',
};

export default async function AdminDashboardPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  // Fetch admin metrics
  const [
    totalUsersResponse,
    totalContractorsResponse,
    totalJobsResponse,
    activeSubscriptionsResponse,
  ] = await Promise.all([
    serverSupabase.from('users').select('id', { count: 'exact', head: true }),
    serverSupabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'contractor'),
    serverSupabase.from('jobs').select('id', { count: 'exact', head: true }),
    serverSupabase.from('contractor_subscriptions')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'trial']),
  ]);

  const totalUsers = totalUsersResponse.count || 0;
  const totalContractors = totalContractorsResponse.count || 0;
  const totalJobs = totalJobsResponse.count || 0;
  const activeSubscriptions = activeSubscriptionsResponse.count || 0;

  // Calculate MRR using database function
  const { data: mrrData } = await serverSupabase.rpc('calculate_mrr');
  const mrr = mrrData && mrrData.length > 0 ? parseFloat(mrrData[0].total_mrr || '0') : 0;

  return (
    <div style={{
      padding: theme.spacing[8],
      maxWidth: '1440px',
      margin: '0 auto',
    }}>
      <div style={{ marginBottom: theme.spacing[8] }}>
        <h1 style={{
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[2],
        }}>
          Admin Dashboard
        </h1>
        <p style={{
          fontSize: theme.typography.fontSize.base,
          color: theme.colors.textSecondary,
        }}>
          Manage platform operations, revenue, and user activity
        </p>
      </div>

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[8],
      }}>
        <Card style={{ padding: theme.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
            <Icon name="users" size={24} color={theme.colors.primary} />
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}>
              Total Users
            </h3>
          </div>
          <p style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            {totalUsers.toLocaleString()}
          </p>
        </Card>

        <Card style={{ padding: theme.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
            <Icon name="briefcase" size={24} color={theme.colors.primary} />
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}>
              Contractors
            </h3>
          </div>
          <p style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            {totalContractors.toLocaleString()}
          </p>
        </Card>

        <Card style={{ padding: theme.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
            <Icon name="fileText" size={24} color={theme.colors.primary} />
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}>
              Total Jobs
            </h3>
          </div>
          <p style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            {totalJobs.toLocaleString()}
          </p>
        </Card>

        <Card style={{ padding: theme.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
            <Icon name="creditCard" size={24} color={theme.colors.primary} />
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}>
              Active Subscriptions
            </h3>
          </div>
          <p style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            {activeSubscriptions.toLocaleString()}
          </p>
        </Card>

        <Card style={{ padding: theme.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
            <Icon name="currencyPound" size={24} color={theme.colors.success} />
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}>
              Monthly Recurring Revenue
            </h3>
          </div>
          <p style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.success,
          }}>
            £{mrr.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      {/* Admin Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: theme.spacing[4],
      }}>
        <Link
          href="/admin/revenue"
          className={styles.adminCardLink}
        >
          <Card className={styles.adminCard} style={{
            padding: theme.spacing[6],
            cursor: 'pointer',
            border: `1px solid ${theme.colors.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
              <Icon name="trendingUp" size={32} color={theme.colors.primary} />
              <h3 style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}>
                Revenue Analytics
              </h3>
            </div>
            <p style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
            }}>
              View subscription revenue, MRR, conversion rates, and payment tracking
            </p>
          </Card>
        </Link>

        <Link
          href="/admin/users"
          className={styles.adminCardLink}
        >
          <Card className={styles.adminCard} style={{
            padding: theme.spacing[6],
            cursor: 'pointer',
            border: `1px solid ${theme.colors.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
              <Icon name="users" size={32} color={theme.colors.primary} />
              <h3 style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}>
                User Management
              </h3>
            </div>
            <p style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
            }}>
              Manage users, contractors, and homeowners
            </p>
          </Card>
        </Link>

        <Link
          href="/admin/security"
          className={styles.adminCardLink}
        >
          <Card className={styles.adminCard} style={{
            padding: theme.spacing[6],
            cursor: 'pointer',
            border: `1px solid ${theme.colors.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
              <Icon name="shield" size={32} color={theme.colors.primary} />
              <h3 style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}>
                Security Dashboard
              </h3>
            </div>
            <p style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
            }}>
              Monitor security events, threats, and system health
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}

