import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { JobsNearYouClient } from './components/JobsNearYouClient';

export const metadata = {
  title: 'Jobs Near You | Mintenance',
  description: 'Find jobs near your location',
};

export default async function JobsNearYouPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch contractor location
  const { data: contractor } = await serverSupabase
    .from('users')
    .select('latitude, longitude, city, country, address')
    .eq('id', user.id)
    .single();

  // Fetch contractor skills
  const { data: contractorSkills } = await serverSupabase
    .from('contractor_skills')
    .select('skill_name')
    .eq('contractor_id', user.id);

  const contractorSkillNames = contractorSkills?.map(s => s.skill_name) || [];

  // Fetch all open jobs posted by homeowners
  // Include required_skills in the query
  const { data: jobs } = await serverSupabase
    .from('jobs')
    .select(`
      id,
      title,
      description,
      budget,
      location,
      category,
      status,
      created_at,
      photos,
      required_skills,
      homeowner_id,
      homeowner:homeowner_id (
        first_name,
        last_name,
        email
      )
    `)
    .in('status', ['posted', 'open'])
    .is('contractor_id', null) // Only jobs not yet assigned
    .order('created_at', { ascending: false });

  return (
    <JobsNearYouClient
      contractorLocation={{
        latitude: contractor?.latitude,
        longitude: contractor?.longitude,
        city: contractor?.city,
        country: contractor?.country,
        address: contractor?.address,
      }}
      contractorSkills={contractorSkillNames}
      jobs={(jobs || []) as any}
    />
  );
}

