import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import Logo from '../components/Logo';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ContractorsBrowseClient } from './components/ContractorsBrowseClient';

export const metadata: Metadata = {
  title: 'Find Contractors | Mintenance',
  description: 'Browse and connect with verified contractors on Mintenance',
};

// Force dynamic rendering to always fetch fresh contractor data
export const dynamic = 'force-dynamic';

async function createClient() {
  const cookieStore = await cookies();
  
  // Temporarily use SERVICE_ROLE_KEY to bypass RLS for debugging
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore errors from Server Components
          }
        },
      },
    }
  );
}

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

  // Create server client
  const supabase = await createClient();

  // Build query based on filters
  let query = supabase
    .from('users')
    .select(`
      *,
      contractor_skills(skill_name),
      reviews!reviews_reviewed_id_fkey(rating)
    `)
    .eq('role', 'contractor')
    .eq('is_available', true)
    .eq('is_visible_on_map', true)
    .is('deleted_at', null)
    .order('rating', { ascending: false })
    .order('total_jobs_completed', { ascending: false});

  // Apply filters
  if (searchParams?.location) {
    query = query.ilike('city', `%${searchParams.location}%`);
  }

  if (searchParams?.minRating) {
    query = query.gte('rating', parseFloat(searchParams.minRating));
  }

  const { data: contractors } = await query;

  // Filter by skill if specified (can't do this in SQL easily with the join)
  let filteredContractors = contractors || [];
  if (searchParams?.skill) {
    filteredContractors = filteredContractors.filter((c: any) =>
      c.contractor_skills?.some((s: any) => 
        s.skill_name.toLowerCase().includes(searchParams.skill!.toLowerCase())
      )
    );
  }

  // Fetch all unique skills for filter dropdown
  const { data: allSkills } = await supabase
    .from('contractor_skills')
    .select('skill_name')
    .order('skill_name');

  const uniqueSkills = [...new Set(allSkills?.map(s => s.skill_name) || [])];

  // Fetch all unique cities for filter dropdown
  const { data: cities } = await supabase
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
