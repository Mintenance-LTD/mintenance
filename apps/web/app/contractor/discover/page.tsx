import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ContractorDiscoverClient } from './components/ContractorDiscoverClient';

interface Job {
  id: string;
  title: string;
  description: string;
  category: string | null;
  budget: number;
  priority: string | null;
  photos: string[] | null;
  created_at: string;
  homeowner: {
    first_name: string;
    last_name: string;
    profile_image_url: string | null;
    rating: number | null;
  } | null;
  property: {
    address: string;
    postcode: string;
  } | null;
  matchScore: number;
}

export const metadata = {
  title: 'Discover Jobs | Mintenance',
  description: 'Browse and save available jobs that match your skills',
};

// Calculate match score based on various factors
function calculateMatchScore(
  job: any,
  contractorSkills: string[],
  contractorCity: string | null
): number {
  let score = 50; // Base score

  // Category/skill match (40 points max)
  if (job.category && contractorSkills.length > 0) {
    const categoryLower = job.category.toLowerCase();
    const hasMatchingSkill = contractorSkills.some(skill =>
      categoryLower.includes(skill.toLowerCase()) || skill.toLowerCase().includes(categoryLower)
    );
    if (hasMatchingSkill) {
      score += 40;
    } else {
      score += 10; // Partial credit for having skills
    }
  }

  // Location match (20 points max)
  if (contractorCity && job.property?.address) {
    const addressLower = job.property.address.toLowerCase();
    const cityLower = contractorCity.toLowerCase();
    if (addressLower.includes(cityLower)) {
      score += 20;
    } else {
      score += 5; // Partial credit
    }
  }

  // Budget alignment (15 points max)
  if (job.budget) {
    if (job.budget >= 5000) score += 15; // High value jobs
    else if (job.budget >= 1000) score += 10; // Medium value
    else score += 5; // Lower value
  }

  // Priority/urgency (10 points max)
  if (job.priority === 'high') score += 10;
  else if (job.priority === 'medium') score += 5;

  // Recent posting bonus (5 points max)
  const daysSincePosted = Math.floor(
    (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSincePosted <= 1) score += 5;
  else if (daysSincePosted <= 3) score += 3;

  return Math.min(Math.max(score, 0), 100); // Clamp between 0-100
}

export default async function ContractorDiscoverPage2025() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch contractor's skills and location in parallel
  const [contractorSkillsResponse, contractorProfileResponse] = await Promise.all([
    serverSupabase
      .from('contractor_skills')
      .select('skill_name')
      .eq('contractor_id', user.id),
    serverSupabase
      .from('users')
      .select('city, address, postcode, latitude, longitude')
      .eq('id', user.id)
      .single(),
  ]);

  const contractorSkills =
    contractorSkillsResponse.data?.map(s => s.skill_name) || [];
  const contractorCity = contractorProfileResponse.data?.city || null;
  const contractorLocation = contractorProfileResponse.data || null;

  // Fetch available jobs that contractor hasn't already bid on, including AI assessments
  const { data: jobs, error } = await serverSupabase
    .from('jobs')
    .select(
      `
      id,
      title,
      description,
      budget,
      status,
      created_at,
      homeowner_id,
      contractor_id,
      location,
      category,
      priority,
      photos,
      latitude,
      longitude,
      building_assessments!building_assessments_job_id_fkey(
        id,
        severity,
        damage_type,
        confidence,
        urgency,
        assessment_data,
        created_at
      )
    `
    )
    .in('status', ['posted'])
    .is('contractor_id', null)
    .order('created_at', { ascending: false })
    .limit(50);

  // Debug logging
  console.log('[DISCOVER] Contractor ID:', user.id);
  console.log('[DISCOVER] Contractor Location:', contractorLocation);
  console.log('[DISCOVER] Query Error:', error);
  console.log('[DISCOVER] Jobs Fetched:', jobs?.length || 0);
  console.log('[DISCOVER] First 3 Jobs:', jobs?.slice(0, 3).map(j => ({
    id: j.id,
    title: j.title,
    status: j.status,
    lat: j.latitude,
    lng: j.longitude,
    location: j.location
  })));

  if (error) {
    console.error('Error fetching jobs:', error);
  }

  // Fetch homeowner data separately for better error handling
  const jobsWithDetails = await Promise.all(
    (jobs || []).map(async job => {
      const homeownerResponse = await serverSupabase
        .from('users')
        .select('first_name, last_name, profile_image_url, rating')
        .eq('id', job.homeowner_id)
        .single();

      return {
        ...job,
        category: job.category || null,
        priority: job.priority || null,
        photos: job.photos || null,
        homeowner: homeownerResponse.data ? {
          ...homeownerResponse.data,
          rating: homeownerResponse.data.rating || null
        } : null,
        property: job.location ? {
          address: job.location,
          postcode: job.location.match(/[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/gi)?.[0] || ''
        } : null,
      };
    })
  );

  // Filter out jobs that contractor has already bid on (with 48h cooldown after rejection)
  // BID FILTERING LOGIC:
  // - Hide jobs with active bids (pending, accepted)
  // - Hide recently rejected bids (< 48 hours ago)
  // - Show rejected bids after 48 hours cooldown
  const { data: existingBids } = await serverSupabase
    .from('bids')
    .select('job_id, status, updated_at, created_at')
    .eq('contractor_id', user.id);

  const now = Date.now();
  const REJECTION_COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

  const bidJobIds = new Set(
    existingBids
      ?.filter(bid => {
        // Always hide jobs with active bids
        if (bid.status === 'pending' || bid.status === 'accepted') {
          return true;
        }

        // For rejected bids, only hide if within 48h cooldown period
        if (bid.status === 'rejected') {
          const rejectionTime = new Date(bid.updated_at || bid.created_at).getTime();
          const timeSinceRejection = now - rejectionTime;
          return timeSinceRejection < REJECTION_COOLDOWN_MS; // Hide if within 48h
        }

        // Don't filter out other statuses (withdrawn, expired, etc.)
        return false;
      })
      .map(b => b.job_id) || []
  );

  // Calculate match scores and filter
  const availableJobs: Job[] = jobsWithDetails
    .filter(job => !bidJobIds.has(job.id))
    .map(job => ({
      ...job,
      matchScore: calculateMatchScore(job, contractorSkills, contractorCity),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  return (
    <ContractorDiscoverClient
      jobs={availableJobs}
      contractorId={user.id}
      contractorLocation={contractorLocation}
    />
  );
}
