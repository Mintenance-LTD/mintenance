/**
 * Optimized Airbnb-style queries with N+1 query fixes and caching
 * Version 2: Performance optimized with single queries and proper caching
 */
import { createServerSupabaseClient } from '../api/supabaseServer';
import { logger } from '@mintenance/shared';
import { queryCache, DatabaseQueryCache } from '../services/cache/DatabaseQueryCache';
interface JobWithStatus {
  id: string;
  status: string;
}
interface ReviewData {
  rating: number;
}
interface ContractorWithRelations {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  profile_image_url: string | null;
  city: string | null;
  country: string | null;
  admin_verified: boolean | null;
  created_at: string;
  rating: number | null;
  total_jobs_completed: number | null;
  contractor_skills: Array<{ skill_name: string }>;
  contractor_jobs: JobWithStatus[];
  contractor_reviews: Array<{
    reviews: ReviewData[];
  }>;
}
export interface ContractorProfile {
  id: string;
  name: string;
  companyName: string | null;
  profileImageUrl: string | null;
  location: string;
  isVerified: boolean;
  skills: string[];
  rating: number;
  totalReviews: number;
  jobsCompleted: number;
  memberSince: string;
  responseRate: number;
  repeatClientRate: number;
}
/**
 * Get featured contractors with optimized single query
 * Fixes N+1 query problem by using Supabase's nested selects
 */
export async function getFeaturedContractorsOptimized(limit = 12): Promise<ContractorProfile[]> {
  const supabase = createServerSupabaseClient();
  // Use cache for featured contractors (10 minute TTL)
  const cacheOptions = DatabaseQueryCache.CachePresets.featuredContractors();
  return queryCache.get(
    cacheOptions.key,
    async () => {
      try {
        // Single optimized query with all relations
        const { data: contractors, error } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            company_name,
            profile_image_url,
            city,
            country,
            admin_verified,
            created_at,
            rating,
            total_jobs_completed,
            contractor_skills!contractor_skills_contractor_id_fkey (
              skill_name
            ),
            contractor_jobs:jobs!jobs_contractor_id_fkey (
              id,
              status
            ),
            contractor_reviews:jobs!jobs_contractor_id_fkey (
              reviews!reviews_job_id_fkey (
                rating
              )
            )
          `)
          .eq('role', 'contractor')
          .order('created_at', { ascending: false })
          .limit(limit * 2) as { data: ContractorWithRelations[] | null; error: Error | { message: string; code?: string } | null };
        if (error) {
          logger.error('[getFeaturedContractorsOptimized] Query error:', {
            message: error.message,
            ...('code' in error ? { code: (error as Record<string, unknown>).code } : {}),
            ...('details' in error ? { details: (error as Record<string, unknown>).details } : {}),
          });
          return [];
        }
        if (!contractors || contractors.length === 0) {
          return [];
        }
        // Process contractors and build profiles
        const profiles: ContractorProfile[] = contractors
          .map(contractor => {
            // Calculate rating from nested reviews
            const allReviews = contractor.contractor_reviews?.flatMap(job =>
              job.reviews || []
            ) || [];
            const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
            const reviewCount = allReviews.length;
            const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
            // Count completed jobs
            const completedJobs = contractor.contractor_jobs?.filter(
              job => job.status === 'completed'
            ).length || 0;
            // Extract skills
            const skills = contractor.contractor_skills?.map(s => s.skill_name) || [];
            // Build name
            const contractorName = contractor.first_name && contractor.last_name
              ? `${contractor.first_name} ${contractor.last_name}`.trim()
              : contractor.company_name || 'Contractor';
            // Build location
            const location = [contractor.city, contractor.country]
              .filter(Boolean)
              .join(', ') || 'Location not specified';
            return {
              id: contractor.id,
              name: contractorName,
              companyName: contractor.company_name,
              profileImageUrl: contractor.profile_image_url,
              location,
              isVerified: contractor.admin_verified || false,
              skills: skills.slice(0, 5), // Limit to 5 skills for display
              rating: Math.round(averageRating * 10) / 10,
              totalReviews: reviewCount,
              jobsCompleted: completedJobs,
              memberSince: new Date(contractor.created_at).getFullYear().toString(),
              responseRate: 95 + Math.random() * 5, // Mock for now
              repeatClientRate: 85 + Math.random() * 15, // Mock for now
            };
          })
          .filter(profile => profile.jobsCompleted > 0 || profile.skills.length > 0)
          .sort((a, b) => {
            // Sort by composite score
            const scoreA = (a.rating * a.totalReviews) + (a.jobsCompleted * 10);
            const scoreB = (b.rating * b.totalReviews) + (b.jobsCompleted * 10);
            return scoreB - scoreA;
          })
          .slice(0, limit);
        return profiles;
      } catch (error) {
        logger.error('[getFeaturedContractorsOptimized] Unexpected error:', error);
        return [];
      }
    },
    cacheOptions
  );
}
/**
 * Search contractors with optimized query and caching
 */
export async function searchContractorsOptimized(
  searchParams: {
    query?: string;
    skills?: string[];
    location?: string;
    minRating?: number;
    verified?: boolean;
  },
  limit = 20
): Promise<ContractorProfile[]> {
  const supabase = createServerSupabaseClient();
  // Cache search results for 2 minutes
  const cacheKey = `contractor-search:${JSON.stringify(searchParams)}`;
  return queryCache.get(
    cacheKey,
    async () => {
      try {
        // Build the query
        let query = supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            company_name,
            profile_image_url,
            city,
            country,
            admin_verified,
            created_at,
            rating,
            total_jobs_completed,
            contractor_skills!contractor_skills_contractor_id_fkey (
              skill_name
            ),
            contractor_jobs:jobs!jobs_contractor_id_fkey (
              id,
              status
            ),
            contractor_reviews:jobs!jobs_contractor_id_fkey (
              reviews!reviews_job_id_fkey (
                rating
              )
            )
          `)
          .eq('role', 'contractor');
        // Apply filters — sanitise user input to prevent PostgREST filter injection
        if (searchParams.query) {
          const sanitised = searchParams.query.replace(/[%_\\(),."']/g, '');
          if (sanitised.length > 0) {
            const searchTerm = `%${sanitised}%`;
            query = query.or(
              `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},company_name.ilike.${searchTerm}`
            );
          }
        }
        if (searchParams.location) {
          const sanitised = searchParams.location.replace(/[%_\\(),."']/g, '');
          if (sanitised.length > 0) {
            const locationTerm = `%${sanitised}%`;
            query = query.or(`city.ilike.${locationTerm},country.ilike.${locationTerm}`);
          }
        }
        if (searchParams.verified) {
          query = query.eq('admin_verified', true);
        }
        // Execute query
        const { data: contractors, error } = await query.limit(limit * 2) as {
          data: ContractorWithRelations[] | null;
          error: Error | { message: string; code?: string } | null
        };
        if (error) {
          logger.error('[searchContractorsOptimized] Query error:', error);
          return [];
        }
        if (!contractors || contractors.length === 0) {
          return [];
        }
        // Process and filter results
        let profiles: ContractorProfile[] = contractors
          .map(contractor => {
            // Calculate rating
            const allReviews = contractor.contractor_reviews?.flatMap(job =>
              job.reviews || []
            ) || [];
            const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
            const reviewCount = allReviews.length;
            const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
            // Count completed jobs
            const completedJobs = contractor.contractor_jobs?.filter(
              job => job.status === 'completed'
            ).length || 0;
            // Extract skills
            const skills = contractor.contractor_skills?.map(s => s.skill_name) || [];
            // Build profile
            const contractorName = contractor.first_name && contractor.last_name
              ? `${contractor.first_name} ${contractor.last_name}`.trim()
              : contractor.company_name || 'Contractor';
            const location = [contractor.city, contractor.country]
              .filter(Boolean)
              .join(', ') || 'Location not specified';
            return {
              id: contractor.id,
              name: contractorName,
              companyName: contractor.company_name,
              profileImageUrl: contractor.profile_image_url,
              location,
              isVerified: contractor.admin_verified || false,
              skills,
              rating: Math.round(averageRating * 10) / 10,
              totalReviews: reviewCount,
              jobsCompleted: completedJobs,
              memberSince: new Date(contractor.created_at).getFullYear().toString(),
              responseRate: 95 + Math.random() * 5,
              repeatClientRate: 85 + Math.random() * 15,
            };
          });
        // Apply post-processing filters
        if (searchParams.skills && searchParams.skills.length > 0) {
          profiles = profiles.filter(p =>
            searchParams.skills!.some(skill =>
              p.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
            )
          );
        }
        if (searchParams.minRating) {
          profiles = profiles.filter(p => p.rating >= searchParams.minRating!);
        }
        // Sort by relevance
        profiles.sort((a, b) => {
          // Prioritize verified contractors
          if (a.isVerified !== b.isVerified) {
            return a.isVerified ? -1 : 1;
          }
          // Then by rating and review count
          const scoreA = (a.rating * a.totalReviews) + (a.jobsCompleted * 5);
          const scoreB = (b.rating * b.totalReviews) + (b.jobsCompleted * 5);
          return scoreB - scoreA;
        });
        return profiles.slice(0, limit);
      } catch (error) {
        logger.error('[searchContractorsOptimized] Unexpected error:', error);
        return [];
      }
    },
    { ttl: 2 * 60 * 1000 } // 2 minute cache
  );
}
/**
 * Get contractor profile with all details - optimized version
 */
export async function getContractorProfileOptimized(contractorId: string): Promise<ContractorProfile | null> {
  const supabase = createServerSupabaseClient();
  // Use cache for individual contractor profiles (15 minute TTL)
  const cacheOptions = DatabaseQueryCache.CachePresets.contractorProfile(contractorId);
  return queryCache.get(
    cacheOptions.key,
    async () => {
      try {
        // Single query to get all contractor data
        const { data: contractor, error } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            company_name,
            profile_image_url,
            city,
            country,
            admin_verified,
            created_at,
            rating,
            total_jobs_completed,
            bio,
            license_number,
            insurance_verified,
            background_check_verified,
            contractor_skills!contractor_skills_contractor_id_fkey (
              skill_name,
              skill_icon
            ),
            contractor_jobs:jobs!jobs_contractor_id_fkey (
              id,
              status,
              title,
              created_at,
              completed_at
            ),
            contractor_reviews:jobs!jobs_contractor_id_fkey (
              reviews!reviews_job_id_fkey (
                rating,
                comment,
                created_at,
                reviewer:reviewer_id (
                  first_name,
                  last_name
                )
              )
            )
          `)
          .eq('id', contractorId)
          .eq('role', 'contractor')
          .single() as { data: ContractorWithRelations & { bio?: string; license_number?: string; insurance_verified?: boolean; background_check_verified?: boolean } | null; error: Error | { message: string; code?: string } | null };
        if (error || !contractor) {
          logger.error('[getContractorProfileOptimized] Error or no data:', error);
          return null;
        }
        // Process all reviews
        const allReviews = contractor.contractor_reviews?.flatMap((job: { reviews?: ReviewData[] }) =>
          job.reviews || []
        ) || [];
        const totalRating = allReviews.reduce((sum: number, r: ReviewData) => sum + r.rating, 0);
        const reviewCount = allReviews.length;
        const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
        // Count completed jobs
        const completedJobs = contractor.contractor_jobs?.filter(
          (job: JobWithStatus) => job.status === 'completed'
        ).length || 0;
        // Extract skills
        const skills = contractor.contractor_skills?.map((s: { skill_name: string }) => s.skill_name) || [];
        // Build profile
        const contractorName = contractor.first_name && contractor.last_name
          ? `${contractor.first_name} ${contractor.last_name}`.trim()
          : contractor.company_name || 'Contractor';
        const location = [contractor.city, contractor.country]
          .filter(Boolean)
          .join(', ') || 'Location not specified';
        return {
          id: contractor.id,
          name: contractorName,
          companyName: contractor.company_name,
          profileImageUrl: contractor.profile_image_url,
          location,
          isVerified: contractor.admin_verified || false,
          skills,
          rating: Math.round(averageRating * 10) / 10,
          totalReviews: reviewCount,
          jobsCompleted: completedJobs,
          memberSince: new Date(contractor.created_at).getFullYear().toString(),
          responseRate: 95 + Math.random() * 5,
          repeatClientRate: 85 + Math.random() * 15,
          bio: contractor.bio,
          licenseNumber: contractor.license_number,
          insuranceVerified: contractor.insurance_verified,
          backgroundCheckVerified: contractor.background_check_verified,
          recentReviews: allReviews.slice(0, 5),
          recentJobs: contractor.contractor_jobs?.slice(0, 10) || [],
        } as ContractorProfile & {
          bio?: string;
          licenseNumber?: string;
          insuranceVerified?: boolean;
          backgroundCheckVerified?: boolean;
          recentReviews: unknown[];
          recentJobs: unknown[];
        };
      } catch (error) {
        logger.error('[getContractorProfileOptimized] Unexpected error:', error);
        return null;
      }
    },
    cacheOptions
  );
}
/**
 * Invalidate contractor-related caches when data changes
 */
export async function invalidateContractorCache(contractorId?: string) {
  if (contractorId) {
    // Invalidate specific contractor
    await queryCache.invalidate([
      `contractor:${contractorId}`,
      `contractor-search:*`, // Invalidate all search results
    ]);
  } else {
    // Invalidate all contractor caches
    await queryCache.invalidate([
      'featured-contractors',
      'contractor:*',
      'contractor-search:*',
    ]);
  }
}
// Export the optimized versions as the default implementations
export const getFeaturedContractors = getFeaturedContractorsOptimized;
export const searchContractors = searchContractorsOptimized;
export const getContractorProfile = getContractorProfileOptimized;