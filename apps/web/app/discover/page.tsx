import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { theme } from '@/lib/theme';
import Logo from '../components/Logo';
import Link from 'next/link';
import { DiscoverClient } from './components/DiscoverClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discover | Mintenance',
  description: 'Discover contractors and jobs on Mintenance',
};

export default async function DiscoverPage() {
  // Get current user from cookies (server-side)
  const user = await getCurrentUserFromCookies();

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary }}>
            Access Denied
          </h1>
          <p style={{ color: theme.colors.textSecondary }}>You must be logged in to view this page.</p>
          <Link href="/login" style={{ color: theme.colors.primary, textDecoration: 'none' }}>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

    // Create Supabase client
    const supabase = serverSupabase;

  // Fetch data based on user role
  let contractors = [];
  let jobs = [];

  if (user.role === 'contractor') {
    // Fetch jobs for contractors
    const { data: jobsData } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'posted')
      .limit(20);
    jobs = jobsData || [];
  } else {
    // Fetch contractors for homeowners
    const { data: contractorsData } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'contractor')
      .eq('is_available', true)
      .eq('deleted_at', null)
      .limit(20);
    contractors = contractorsData || [];
  }

  return (
    <DiscoverClient 
      user={user}
      contractors={contractors}
      jobs={jobs}
    />
  );
}