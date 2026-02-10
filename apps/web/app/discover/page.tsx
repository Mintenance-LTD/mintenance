import { getCurrentUserFromCookies } from '@/lib/auth';
import { getCachedContractors } from '@/lib/cache';
import { theme } from '@/lib/theme';
import Link from 'next/link';
import { DiscoverClient } from './components/DiscoverClient';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { redirect } from 'next/navigation';
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

  // Redirect contractors to the new contractor discover page
  if (user.role === 'contractor') {
    redirect('/contractor/discover');
  }

  // Fetch contractors for homeowners using ISR cache
  const contractors = await getCachedContractors(20, 0);

  return (
    <ErrorBoundary>
      <DiscoverClient
        user={user}
        contractors={contractors}
        jobs={[]}
        contractorLocation={null}
        contractorSkills={[]}
      />
    </ErrorBoundary>
  );
}