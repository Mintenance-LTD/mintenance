import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import {
  DatabaseUserRow,
  DatabaseContractorRow,
  DatabaseReviewRow,
  UserProfile,
} from './types';

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get nearby contractors with distance calculation
 */
export async function getNearbyContractors(
  userLatitude: number,
  userLongitude: number,
  radiusKm: number = 25,
  skillFilter?: string
): Promise<UserProfile[]> {
  try {
    const query = supabase
      .from('profiles')
      .select(
        `
          id, role, first_name, last_name, bio, city, country, profile_image_url, avatar_url, rating, total_jobs_completed, verified, admin_verified, skills, is_available, company_name, hourly_rate, years_experience, latitude, longitude, created_at,
          contractor_skills (
            skill_name
          )
        `
      )
      .eq('role', 'contractor')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    const { data: contractors, error } = await query;

    if (error) throw error;

    const typedContractors = (contractors || []) as DatabaseUserRow[];

    // Calculate distances and filter by radius
    const nearbyContractors = typedContractors
      .filter((contractor) => {
        const distance = calculateDistance(
          userLatitude,
          userLongitude,
          contractor.latitude!,
          contractor.longitude!
        );
        return distance <= radiusKm;
      })
      .map(
        (contractor): UserProfile => ({
          id: contractor.id,
          email: contractor.email || '', // omitted on cross-user reads (PII)
          first_name: contractor.first_name,
          last_name: contractor.last_name,
          role: contractor.role,
          phone: contractor.phone, // omitted on cross-user reads (PII)
          bio: contractor.bio,
          profile_image_url: contractor.profile_image_url,
          created_at: contractor.created_at,
          updated_at: contractor.updated_at || contractor.created_at,
          skills: contractor.contractor_skills?.map((s) => ({
            skillName: s.skill_name,
          })),
          distance: calculateDistance(
            userLatitude,
            userLongitude,
            contractor.latitude!,
            contractor.longitude!
          ),
        })
      );

    return nearbyContractors;
  } catch (error) {
    const errorInstance =
      error instanceof Error ? error : new Error(String(error));
    logger.error('Error fetching nearby contractors:', errorInstance);
    return [];
  }
}

/**
 * Get contractors that previously worked with a homeowner
 */
export async function getPreviousContractors(
  homeownerId: string
): Promise<UserProfile[]> {
  try {
    // Get completed jobs for this homeowner with contractor info
    const { data: completedJobs, error } = await supabase
      .from('jobs')
      .select(
        `
          contractor_id,
          contractor:contractor_id (
            id,
            first_name,
            last_name,
            bio,
            profile_image_url,
            phone,
            contractor_skills (
              skill_name
            )
          )
        `
      )
      .eq('homeowner_id', homeownerId)
      .eq('status', 'completed')
      .not('contractor_id', 'is', null)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (!completedJobs || completedJobs.length === 0) {
      return [];
    }

    interface JobWithContractor {
      contractor_id: string;
      contractor: DatabaseContractorRow;
    }

    const typedJobs = completedJobs as unknown as JobWithContractor[];

    // Get unique contractors (avoid duplicates if they worked multiple jobs)
    const uniqueContractors = new Map<string, UserProfile>();

    for (const job of typedJobs) {
      const contractor = job.contractor;
      if (contractor && !uniqueContractors.has(contractor.id)) {
        // Get reviews for this contractor
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating, comment, created_at')
          .eq('reviewee_id', contractor.id)
          .eq('reviewer_id', homeownerId)
          .order('created_at', { ascending: false })
          .limit(1);

        const typedReviews = (reviews || []) as DatabaseReviewRow[];

        const contractorProfile: UserProfile = {
          id: contractor.id,
          email: '', // Not needed for display
          first_name: contractor.first_name,
          last_name: contractor.last_name,
          role: 'contractor',
          phone: contractor.phone,
          bio: contractor.bio,
          profile_image_url: contractor.profile_image_url,
          created_at: '',
          updated_at: '',
          skills:
            contractor.contractor_skills?.map((s) => ({
              skillName: s.skill_name,
            })) || [],
          reviews:
            typedReviews.map((review) => ({
              rating: review.rating,
              comment: review.comment,
              reviewer: 'You',
              createdAt: review.created_at,
            })) || [],
        };

        uniqueContractors.set(contractor.id, contractorProfile);
      }
    }

    return Array.from(uniqueContractors.values()).slice(0, 5); // Return max 5 previous contractors
  } catch (error) {
    const errorInstance =
      error instanceof Error ? error : new Error(String(error));
    logger.error('Error fetching previous contractors:', errorInstance);
    return [];
  }
}
