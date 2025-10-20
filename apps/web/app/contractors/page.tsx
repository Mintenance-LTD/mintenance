import { serverSupabase } from '@/lib/api/supabaseServer';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import Logo from '../components/Logo';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ContractorsBrowseClient } from './components/ContractorsBrowseClient';
import { getCachedContractors } from '@/lib/cache';

export const metadata: Metadata = {
  title: 'Find Contractors | Mintenance',
  description: 'Browse and connect with verified contractors on Mintenance',
};

// Enable ISR with revalidation every 10 minutes
export const revalidate = 600;

// Use centralized server client for security

interface SearchParams {
  skill?: string;
  location?: string;
  minRating?: string;
}

export default async function ContractorsPage(props: {
  searchParams?: Promise<SearchParams>;
}) {
  // Check if user is a contractor - redirect to jobs page
  const user = await getCurrentUserFromCookies();
  if (user?.role === 'contractor') {
    redirect('/jobs');
  }

  // Await searchParams
  const searchParams = await props.searchParams;

  // Get cached contractors data
  const contractors = await getCachedContractors(50, 0);

  // Apply client-side filtering for search params
  let filteredContractors = contractors;

  if (searchParams?.location) {
    filteredContractors = filteredContractors.filter((c: any) =>
      c.city?.toLowerCase().includes(searchParams.location!.toLowerCase())
    );
  }

  if (searchParams?.minRating) {
    filteredContractors = filteredContractors.filter((c: any) =>
      c.rating >= parseFloat(searchParams.minRating!)
    );
  }

  if (searchParams?.skill) {
    filteredContractors = filteredContractors.filter((c: any) =>
      c.contractor_skills?.some((s: any) => 
        s.skill_name.toLowerCase().includes(searchParams.skill!.toLowerCase())
      )
    );
  }

  // Use centralized server client
  
  // Fetch all unique skills for filter dropdown
  const { data: allSkills } = await serverSupabase
    .from('contractor_skills')
    .select('skill_name')
    .order('skill_name');

  const uniqueSkills = [...new Set(allSkills?.map(s => s.skill_name) || [])];

  // Fetch all unique cities for filter dropdown
  const { data: cities } = await serverSupabase
    .from('users')
    .select('city')
    .eq('role', 'contractor')
    .eq('is_visible_on_map', true)
    .not('city', 'is', null);

  const uniqueCities = [...new Set(cities?.map(c => c.city) || [])].filter(Boolean);

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
          <Logo />
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
          <Link href="/jobs" style={{ color: theme.colors.textSecondary, textDecoration: 'none' }}>
            Jobs
          </Link>
          <Link href="/discover" style={{ color: theme.colors.textSecondary, textDecoration: 'none' }}>
            Discover
          </Link>
        </nav>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: theme.spacing[8] }}>
        {/* Client Component with List/Map Toggle */}
        <ContractorsBrowseClient
          contractors={filteredContractors}
          uniqueSkills={uniqueSkills}
          uniqueCities={uniqueCities}
          currentFilters={{
            skill: searchParams?.skill,
            location: searchParams?.location,
            minRating: searchParams?.minRating,
          }}
        />
      </div>
    </main>
  );
}
