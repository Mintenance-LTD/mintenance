import { getCurrentUserFromCookies } from '@/lib/auth';
import { getCachedJobs } from '@/lib/cache';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { DiscoverClient } from './components/DiscoverClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discover Jobs | Mintenance',
  description: 'Discover new project opportunities on Mintenance',
};

// Enable ISR with revalidation every 5 minutes
export const revalidate = 300;

export default async function ContractorDiscoverPage() {
  // Get current user from cookies (server-side)
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>Access Denied</h1>
          <p>You must be a contractor to view this page.</p>
        </div>
      </div>
    );
  }

  // Fetch jobs using ISR cache
  const jobs = await getCachedJobs(20, 0);

  // Fetch contractor location and skills for enhanced job cards
  const { data: contractorData } = await serverSupabase
    .from('users')
    .select('latitude, longitude')
    .eq('id', user.id)
    .single();

  let contractorLocation: { latitude: number; longitude: number } | null = null;
  if (contractorData?.latitude && contractorData?.longitude) {
    contractorLocation = {
      latitude: contractorData.latitude,
      longitude: contractorData.longitude,
    };
  }

  // Fetch contractor skills
  const { data: skillsData } = await serverSupabase
    .from('contractor_skills')
    .select('skill_name')
    .eq('contractor_id', user.id);

  const contractorSkills = (skillsData || []).map(skill => skill.skill_name);

  return (
    <DiscoverClient 
      user={user}
      jobs={jobs}
      contractorLocation={contractorLocation}
      contractorSkills={contractorSkills}
    />
  );
}

