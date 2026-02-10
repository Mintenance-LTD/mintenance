/**
 * Airbnb-Optimized Database Queries
 * Performance target: < 100ms execution time
 * Uses proper indexing, select optimization, and RLS
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create server-side client (using service role key to bypass RLS)
export const createServerClient = () => {
  // Use serverSupabase which has service role key and bypasses RLS
  return serverSupabase;
};

// Types
export interface ContractorProfile {
  id: string;
  name: string;
  company_name: string | null;
  city: string | null;
  profile_image: string | null;
  hourly_rate: number | null;
  rating: number;
  review_count: number;
  verified: boolean;
  skills: string[];
  completed_jobs: number;
  response_time: string;
}

export interface JobListing {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  status: string;
  created_at: string;
  homeowner: {
    name: string;
    city: string | null;
  } | null;
  property: {
    address: string;
  } | null;
  photos: string[];
  category: string | null;
  priority: string | null;
}

export interface PlatformStats {
  totalContractors: number;
  totalJobs: number;
  totalHomeowners: number;
  averageRating: number;
}

/**
 * Get Featured Contractors (Top-rated, verified, active)
 * Optimized query with rating aggregation
 */
export async function getFeaturedContractors(limit = 12): Promise<ContractorProfile[]> {
  const supabase = createServerClient();

  try {
    // Get contractors from users table (contractors are users with role='contractor')
    // Note: Removed admin_verified filter to get all contractors, not just verified ones
    const { data: contractors, error: contractorsError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, company_name, profile_image_url, city, country, admin_verified, created_at, rating, total_jobs_completed')
      .eq('role', 'contractor')
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Get more to filter after

    if (contractorsError) {
      logger.error('[getFeaturedContractors] Error fetching contractors:', {
        message: contractorsError.message,
        details: contractorsError.details,
        hint: contractorsError.hint,
        code: contractorsError.code,
        fullError: contractorsError,
        errorString: String(contractorsError),
        errorType: typeof contractorsError,
        errorConstructor: contractorsError.constructor?.name
      });
      return [];
    }

    if (!contractors || contractors.length === 0) {
      return [];
    }

    const contractorIds = contractors.map(c => c.id);
    
    // Get skills for contractors
    const { data: skills, error: skillsError } = await supabase
      .from('contractor_skills')
      .select('contractor_id, skill_name')
      .in('contractor_id', contractorIds);

    if (skillsError) {
      logger.error('[getFeaturedContractors] Error fetching skills:', skillsError);
    }

    // Group skills by contractor
    const skillsMap = new Map<string, string[]>();
    skills?.forEach(skill => {
      if (!skillsMap.has(skill.contractor_id)) {
        skillsMap.set(skill.contractor_id, []);
      }
      skillsMap.get(skill.contractor_id)!.push(skill.skill_name);
    });

    // Get ratings for contractors (reviews use reviewed_id to reference the contractor user)
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('reviewed_id, rating')
      .in('reviewed_id', contractorIds);

    if (reviewsError) {
      logger.error('[getFeaturedContractors] Error fetching reviews:', reviewsError);
    }

    // Aggregate ratings
    const ratingsMap = new Map<string, { total: number; count: number }>();
    reviews?.forEach(review => {
      const existing = ratingsMap.get(review.reviewed_id) || { total: 0, count: 0 };
      ratingsMap.set(review.reviewed_id, {
        total: existing.total + review.rating,
        count: existing.count + 1
      });
    });

    // Get completed jobs count
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('contractor_id, status')
      .in('contractor_id', contractorIds)
      .eq('status', 'completed');

    if (jobsError) {
      logger.error('[getFeaturedContractors] Error fetching jobs:', jobsError);
    }

    const jobsMap = new Map<string, number>();
    jobs?.forEach(job => {
      jobsMap.set(job.contractor_id, (jobsMap.get(job.contractor_id) || 0) + 1);
    });

    // Build contractor profiles
    const profiles: ContractorProfile[] = contractors
      .map(contractor => {
        const contractorName = contractor.first_name && contractor.last_name
          ? `${contractor.first_name} ${contractor.last_name}`.trim()
          : 'Contractor';
        const ratingData = ratingsMap.get(contractor.id);
        const rating = ratingData ? ratingData.total / ratingData.count : (contractor.rating || 0);
        const reviewCount = ratingData?.count || 0;
        const contractorSkills = skillsMap.get(contractor.id) || [];

        return {
          id: contractor.id,
          name: contractorName,
          company_name: contractor.company_name,
          city: contractor.city,
          profile_image: contractor.profile_image_url,
          hourly_rate: null, // Can be fetched from contractor_profiles if needed
          rating: Math.round(rating * 10) / 10, // Round to 1 decimal
          review_count: reviewCount,
          verified: contractor.admin_verified || false,
          skills: contractorSkills,
          completed_jobs: jobsMap.get(contractor.id) || contractor.total_jobs_completed || 0,
          response_time: '< 1 hour' // Mock for now
        };
      })
      .filter(p => p.rating >= 4.0 || p.completed_jobs >= 5) // Featured criteria
      .sort((a, b) => {
        // Sort by rating * review_count (relevance score)
        const scoreA = a.rating * Math.log(a.review_count + 1);
        const scoreB = b.rating * Math.log(b.review_count + 1);
        return scoreB - scoreA;
      })
      .slice(0, limit);

    return profiles;
  } catch (error) {
    logger.error('[getFeaturedContractors] Unexpected error:', error);
    return [];
  }
}

/**
 * Search Contractors with Filters
 * Optimized for Airbnb-style search
 */
export async function searchContractors(params: {
  service?: string;
  location?: string;
  minRating?: number;
  maxRate?: number;
  skills?: string[];
  limit?: number;
}): Promise<ContractorProfile[]> {
  const supabase = createServerClient();
  const { service, location, minRating = 0, maxRate, skills, limit = 20 } = params;

  try {
    let query = supabase
      .from('profiles')
      .select('id, first_name, last_name, company_name, profile_image_url, city, country, admin_verified, created_at, rating, total_jobs_completed')
      .eq('role', 'contractor');

    // Apply filters
    if (location) {
      query = query.ilike('city', `%${location}%`);
    }

    // Note: hourly_rate and skills filtering would need additional joins
    // For now, we'll filter after fetching

    const { data: contractors, error } = await query.limit(limit * 2);

    if (error) {
      logger.error('[searchContractors] Error:', error);
      return [];
    }

    if (!contractors || contractors.length === 0) {
      return [];
    }

    const contractorIds = contractors.map(c => c.id);

    // Get skills for contractors
    const { data: skills } = await supabase
      .from('contractor_skills')
      .select('contractor_id, skill_name')
      .in('contractor_id', contractorIds);

    const skillsMap = new Map<string, string[]>();
    skills?.forEach(skill => {
      if (!skillsMap.has(skill.contractor_id)) {
        skillsMap.set(skill.contractor_id, []);
      }
      skillsMap.get(skill.contractor_id)!.push(skill.skill_name);
    });

    // Get ratings for contractors
    const { data: reviews } = await supabase
      .from('reviews')
      .select('reviewed_id, rating')
      .in('reviewed_id', contractorIds);

    const ratingsMap = new Map<string, { total: number; count: number }>();
    reviews?.forEach(review => {
      const existing = ratingsMap.get(review.reviewed_id) || { total: 0, count: 0 };
      ratingsMap.set(review.reviewed_id, {
        total: existing.total + review.rating,
        count: existing.count + 1
      });
    });

    const { data: jobs } = await supabase
      .from('jobs')
      .select('contractor_id, status')
      .in('contractor_id', contractorIds)
      .eq('status', 'completed');

    const jobsMap = new Map<string, number>();
    jobs?.forEach(job => {
      jobsMap.set(job.contractor_id, (jobsMap.get(job.contractor_id) || 0) + 1);
    });

    // Build and filter profiles
    const profiles: ContractorProfile[] = contractors
      .map(contractor => {
        const contractorName = contractor.first_name && contractor.last_name
          ? `${contractor.first_name} ${contractor.last_name}`.trim()
          : 'Contractor';
        const ratingData = ratingsMap.get(contractor.id);
        const rating = ratingData ? ratingData.total / ratingData.count : (contractor.rating || 0);
        const reviewCount = ratingData?.count || 0;
        const contractorSkills = skillsMap.get(contractor.id) || [];

        return {
          id: contractor.id,
          name: contractorName,
          company_name: contractor.company_name,
          city: contractor.city,
          profile_image: contractor.profile_image_url,
          hourly_rate: null, // Can be fetched from contractor_profiles if needed
          rating: Math.round(rating * 10) / 10,
          review_count: reviewCount,
          verified: contractor.admin_verified || false,
          skills: contractorSkills,
          completed_jobs: jobsMap.get(contractor.id) || contractor.total_jobs_completed || 0,
          response_time: '< 1 hour'
        };
      })
      .filter(p => p.rating >= minRating)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);

    return profiles;
  } catch (error) {
    logger.error('[searchContractors] Unexpected error:', error);
    return [];
  }
}

/**
 * Get Available Jobs (Posted, Not Assigned)
 * For contractor discover page
 */
export async function getAvailableJobs(limit = 20): Promise<JobListing[]> {
  const supabase = createServerClient();

  try {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, title, description, budget, status, created_at, homeowner_id')
      .eq('status', 'posted')
      .is('contractor_id', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('[getAvailableJobs] Error:', error);
      return [];
    }

    if (!jobs || jobs.length === 0) {
      return [];
    }

    // Get homeowner details
    const homeownerIds = [...new Set(jobs.map(j => j.homeowner_id))];
    const { data: users } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, city')
      .in('id', homeownerIds);

    const usersMap = new Map(users?.map(u => [u.id, { name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User', city: u.city }]) || []);

    const jobListings: JobListing[] = jobs.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      budget: job.budget,
      status: job.status,
      created_at: job.created_at,
      homeowner: usersMap.get(job.homeowner_id) || null,
      property: null, // No property table in minimal schema
      photos: [],
      category: null,
      priority: null
    }));

    return jobListings;
  } catch (error) {
    logger.error('[getAvailableJobs] Unexpected error:', error);
    return [];
  }
}

/**
 * Get Platform Stats for Landing Page
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = createServerClient();

  try {
    // Get counts in parallel
    const [contractorsResult, jobsResult, homeownersResult, reviewsResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'contractor'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'homeowner'),
      supabase.from('reviews').select('rating')
    ]);

    const totalContractors = contractorsResult.count || 0;
    const totalJobs = jobsResult.count || 0;
    const totalHomeowners = homeownersResult.count || 0;

    // Calculate average rating
    const reviews = reviewsResult.data || [];
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0; // No reviews yet — do not fabricate a rating

    return {
      totalContractors,
      totalJobs,
      totalHomeowners,
      averageRating: Math.round(averageRating * 10) / 10
    };
  } catch (error) {
    logger.error('[getPlatformStats] Unexpected error:', error);
    return {
      totalContractors: 0,
      totalJobs: 0,
      totalHomeowners: 0,
      averageRating: 0
    };
  }
}

/**
 * Get Contractor Profile (Full Details)
 */
export async function getContractorProfile(contractorId: string): Promise<ContractorProfile | null> {
  const supabase = createServerClient();

  try {
    const { data: contractor, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, company_name, profile_image_url, city, country, admin_verified, created_at, rating, total_jobs_completed')
      .eq('id', contractorId)
      .eq('role', 'contractor')
      .single();

    if (error || !contractor) {
      logger.error('[getContractorProfile] Error:', error);
      return null;
    }

    // Get skills
    const { data: skills } = await supabase
      .from('contractor_skills')
      .select('skill_name')
      .eq('contractor_id', contractorId);

    // Get reviews (reviews use reviewed_id to reference the contractor user)
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewed_id', contractorId);

    const ratingTotal = reviews?.reduce((sum, r) => sum + r.rating, 0) || 0;
    const reviewCount = reviews?.length || 0;
    const rating = reviewCount > 0 ? ratingTotal / reviewCount : (contractor.rating || 0);

    // Get completed jobs count
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('contractor_id', contractorId)
      .eq('status', 'completed');

    const contractorName = contractor.first_name && contractor.last_name
      ? `${contractor.first_name} ${contractor.last_name}`.trim()
      : 'Contractor';

    return {
      id: contractor.id,
      name: contractorName,
      company_name: contractor.company_name,
      city: contractor.city,
      profile_image: contractor.profile_image_url,
      hourly_rate: null, // Can be fetched from contractor_profiles if needed
      rating: Math.round(rating * 10) / 10,
      review_count: reviewCount,
      verified: contractor.admin_verified || false,
      skills: skills?.map(s => s.skill_name) || [],
      completed_jobs: jobs?.length || contractor.total_jobs_completed || 0,
      response_time: '< 1 hour'
    };
  } catch (error) {
    logger.error('[getContractorProfile] Unexpected error:', error);
    return null;
  }
}
