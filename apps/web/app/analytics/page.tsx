import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import Logo from '../components/Logo';
import { RevenueChart } from './components/RevenueChart';
import { JobsChart } from './components/JobsChart';
import { PerformanceMetrics } from './components/PerformanceMetrics';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics | Mintenance',
  description: 'View your business analytics and performance metrics',
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AnalyticsPage() {
  // Get current user from cookies (more reliable)
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    return (
      <div style={{ padding: theme.spacing[6], textAlign: 'center' }}>
        <p>Please log in as a contractor to view analytics.</p>
        <Link href="/login" style={{ color: theme.colors.primary }}>Go to Login</Link>
      </div>
    );
  }

  // Fetch contractor stats
  const { data: contractor } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch all jobs for this contractor
  const { data: allJobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('contractor_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch completed jobs with revenue
  const { data: completedJobs } = await supabase
    .from('jobs')
    .select('*, escrow_transactions(*)')
    .eq('contractor_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  // Fetch active bids
  const { data: bids } = await supabase
    .from('bids')
    .select('*')
    .eq('contractor_id', user.id);

  // Fetch reviews for average rating (specify the foreign key relationship)
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('reviewed_id', user.id);

  // Calculate metrics
  const totalRevenue = completedJobs?.reduce((sum, job) => {
    const escrowAmount = job.escrow_transactions?.reduce((s: number, t: any) => 
      s + (t.status === 'released' ? parseFloat(t.amount) : 0), 0) || 0;
    return sum + escrowAmount;
  }, 0) || 0;

  const pendingRevenue = completedJobs?.reduce((sum, job) => {
    const escrowAmount = job.escrow_transactions?.reduce((s: number, t: any) => 
      s + (t.status === 'held' ? parseFloat(t.amount) : 0), 0) || 0;
    return sum + escrowAmount;
  }, 0) || 0;

  const averageJobValue = completedJobs?.length 
    ? totalRevenue / completedJobs.length 
    : 0;

  const winRate = bids?.length 
    ? ((completedJobs?.length || 0) / bids.length * 100) 
    : 0;

  const avgRating = reviews?.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : contractor?.rating || 0;

  // Group jobs by month for chart
  const jobsByMonth = allJobs?.reduce((acc: any, job) => {
    const month = new Date(job.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {}) || {};

  // Group revenue by month
  const revenueByMonth = completedJobs?.reduce((acc: any, job) => {
    const month = new Date(job.completed_at || job.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    const jobRevenue = job.escrow_transactions?.reduce((s: number, t: any) => 
      s + (t.status === 'released' ? parseFloat(t.amount) : 0), 0) || 0;
    acc[month] = (acc[month] || 0) + jobRevenue;
    return acc;
  }, {}) || {};

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: theme.colors.backgroundSecondary,
      }}
    >
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
          <Logo className="w-10 h-10" />
          <span style={{
            marginLeft: theme.spacing[3],
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
          }}>
            Mintenance
          </span>
        </Link>

        <nav style={{ display: 'flex', gap: theme.spacing[4] }}>
          <Link href="/dashboard" style={{ color: theme.colors.textSecondary, textDecoration: 'none' }}>
            Dashboard
          </Link>
          <Link href="/contractor/profile" style={{ color: theme.colors.textSecondary, textDecoration: 'none' }}>
            Profile
          </Link>
          <Link href="/jobs" style={{ color: theme.colors.textSecondary, textDecoration: 'none' }}>
            Jobs
          </Link>
        </nav>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: theme.spacing[8] }}>
        <h1 style={{
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text,
          marginBottom: theme.spacing[8],
        }}>
          Business Analytics
        </h1>

        {/* Key Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: theme.spacing[6],
          marginBottom: theme.spacing[8],
        }}>
          {/* Total Revenue */}
          <div style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing[6],
            border: `1px solid ${theme.colors.border}`,
          }}>
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[2],
            }}>
              Total Revenue
            </p>
            <p style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.success,
            }}>
              £{totalRevenue.toLocaleString()}
            </p>
            <p style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginTop: theme.spacing[2],
            }}>
              {completedJobs?.length || 0} completed jobs
            </p>
          </div>

          {/* Pending Revenue */}
          <div style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing[6],
            border: `1px solid ${theme.colors.border}`,
          }}>
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[2],
            }}>
              Pending Revenue
            </p>
            <p style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.warning,
            }}>
              £{pendingRevenue.toLocaleString()}
            </p>
            <p style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginTop: theme.spacing[2],
            }}>
              In escrow
            </p>
          </div>

          {/* Average Job Value */}
          <div style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing[6],
            border: `1px solid ${theme.colors.border}`,
          }}>
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[2],
            }}>
              Avg Job Value
            </p>
            <p style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.primary,
            }}>
              £{averageJobValue.toLocaleString()}
            </p>
            <p style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginTop: theme.spacing[2],
            }}>
              Per completed job
            </p>
          </div>

          {/* Win Rate */}
          <div style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing[6],
            border: `1px solid ${theme.colors.border}`,
          }}>
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[2],
            }}>
              Win Rate
            </p>
            <p style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.primary,
            }}>
              {winRate.toFixed(0)}%
            </p>
            <p style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginTop: theme.spacing[2],
            }}>
              {bids?.length || 0} total bids
            </p>
          </div>
        </div>

        {/* Charts Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: theme.spacing[6],
          marginBottom: theme.spacing[8],
        }}>
          <RevenueChart data={revenueByMonth} />
          <JobsChart data={jobsByMonth} />
        </div>

        {/* Performance Metrics */}
        <PerformanceMetrics
          avgRating={avgRating}
          completionRate={winRate}
          totalJobs={allJobs?.length || 0}
          activeJobs={allJobs?.filter(j => j.status === 'in_progress').length || 0}
        />
      </div>
    </main>
  );
}
