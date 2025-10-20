import { getCurrentUserFromCookies } from '@/lib/auth';
import { getCachedContractors, getCachedJobs } from '@/lib/cache';
import { theme } from '@/lib/theme';
import Logo from '../components/Logo';
import Link from 'next/link';
import { DiscoverClient } from './components/DiscoverClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discover | Mintenance',
  description: 'Discover contractors and jobs on Mintenance',
};

// Enable ISR with revalidation every 5 minutes
export const revalidate = 300;

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

  // Fetch cached data based on user role
  let contractors = [];
  let jobs = [];

  if (user.role === 'contractor') {
    // Fetch jobs for contractors using ISR cache
    jobs = await getCachedJobs(20, 0);
  } else {
    // Fetch contractors for homeowners using ISR cache
    contractors = await getCachedContractors(20, 0);
  }

  return (
    <DiscoverClient 
      user={user}
      contractors={contractors}
      jobs={jobs}
    />
  );
}