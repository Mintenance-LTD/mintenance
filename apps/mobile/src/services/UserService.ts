import { supabase } from '../config/supabase';
import { User } from '@mintenance/types';
import { logger } from '../utils/logger';

interface DatabaseJobRow {
  id: string;
  status: string;
  budget: number;
  created_at: string;
  updated_at: string;
  homeowner_id: string;
  contractor_id?: string;
  title?: string;
  location?: string;
}
interface DatabaseReviewRow {
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: {
    first_name?: string;
    last_name?: string;
  };
}
interface DatabaseUserRow {
  id: string;
  email?: string; // not selected on cross-user reads (PII protection)
  first_name: string;
  last_name: string;
  role: 'homeowner' | 'contractor' | 'admin';
  phone?: string; // not selected on cross-user reads (PII protection)
  bio?: string;
  profile_image_url?: string;
  created_at: string;
  updated_at?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  contractor_skills?: DatabaseSkillRow[];
}
interface DatabaseSkillRow {
  skill_name: string;
}
interface DatabaseTodaysJobRow {
  id: string;
  title: string;
  location: string;
  scheduled_start_date: string;
  homeowner?: {
    first_name?: string;
    last_name?: string;
  };
}
interface DatabaseContractorRow {
  id: string;
  first_name: string;
  last_name: string;
  bio?: string;
  profile_image_url?: string;
  phone?: string;
  contractor_skills?: DatabaseSkillRow[];
}
export interface ScheduledJob {
  time: string;
  client: string;
  location: string;
  type: string;
  jobId: string;
}
export interface ContractorStats {
  activeJobs: number;
  monthlyEarnings: number;
  rating: number;
  completedJobs: number;
  totalJobs: number;
  totalJobsCompleted: number;
  responseTime: string;
  successRate: number;
  todaysAppointments: number;
  nextAppointment?: ScheduledJob;
  todaysJobs: ScheduledJob[];
}
export interface UserProfile extends User {
  skills?: { skillName: string }[];
  reviews?: {
    rating: number;
    comment: string;
    reviewer: string;
    createdAt: string;
  }[];
  distance?: number;
}

export class UserService {
  static async getContractorStats(
    contractorId: string
  ): Promise<ContractorStats> {
    try {
      // Use shared query from @mintenance/data-access for consistent computation
      // (same logic as web API — eliminates mobile vs server computation divergence)
      const { fetchContractorStats } = await import('@mintenance/data-access');
      const stats = await fetchContractorStats(supabase, contractorId);

      // Estimate response time from rating (until real message tracking)
      const responseTime =
        stats.avgRating >= 4.5
          ? '< 1h'
          : stats.avgRating >= 4.0
            ? '< 2h'
            : '< 4h';

      // Map today's scheduled jobs to the mobile format
      const scheduledJobs: ScheduledJob[] = (
        stats.todaysAppointments as DatabaseTodaysJobRow[]
      ).map((job) => ({
        time: new Date(job.scheduled_start_date).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
        client:
          `${job.homeowner?.first_name || ''} ${job.homeowner?.last_name || ''}`.trim() ||
          'Client',
        location: job.location,
        type: job.title,
        jobId: job.id,
      }));

      return {
        activeJobs: stats.activeJobs,
        monthlyEarnings: Math.round(stats.monthlyEarnings),
        rating: stats.avgRating,
        completedJobs: stats.completedJobs,
        totalJobs: stats.activeJobs + stats.completedJobs,
        totalJobsCompleted: stats.completedJobs,
        responseTime,
        successRate: stats.successRate,
        todaysAppointments: scheduledJobs.length,
        nextAppointment: scheduledJobs[0],
        todaysJobs: scheduledJobs,
      };
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error(String(error));
      logger.error('Error fetching contractor stats:', errorInstance);
      // Return default values on error
      return {
        activeJobs: 0,
        monthlyEarnings: 0,
        rating: 0,
        completedJobs: 0,
        totalJobs: 0,
        totalJobsCompleted: 0,
        responseTime: '< 2h',
        successRate: 0,
        todaysAppointments: 0,
        todaysJobs: [],
      };
    }
  }

  /**
   * Get user profile by ID with additional contractor data
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data: user, error } = await supabase
        .from('profiles')
        .select(
          `
          id, role, first_name, last_name, bio, city, country, profile_image_url, avatar_url, rating, total_jobs_completed, verified, admin_verified, skills, is_available, company_name, hourly_rate, years_experience, portfolio_images, created_at,
          contractor_skills (
            skill_name
          )
        `
        )
        .eq('id', userId)
        .single();

      if (error) throw error;

      const typedUser = user as DatabaseUserRow;

      // Get reviews for this user if they're a contractor
      let reviews;
      if (typedUser.role === 'contractor') {
        const { data: reviewData, error: reviewError } = await supabase
          .from('reviews')
          .select(
            `
            rating,
            comment,
            created_at,
            reviewer:reviewer_id (
              first_name,
              last_name
            )
          `
          )
          .eq('reviewed_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!reviewError) {
          const typedReviewData = (reviewData || []) as DatabaseReviewRow[];
          reviews = typedReviewData.map((review) => ({
            rating: review.rating,
            comment: review.comment,
            reviewer:
              `${review.reviewer?.first_name || ''} ${review.reviewer?.last_name || ''}`.trim(),
            createdAt: review.created_at,
          }));
        }
      }

      return {
        id: typedUser.id,
        email: typedUser.email || '', // omitted on cross-user reads (PII)
        first_name: typedUser.first_name,
        last_name: typedUser.last_name,
        role: typedUser.role,
        phone: typedUser.phone, // omitted on cross-user reads (PII)
        bio: typedUser.bio,
        profile_image_url: typedUser.profile_image_url,
        created_at: typedUser.created_at,
        updated_at: typedUser.updated_at || typedUser.created_at,
        skills: typedUser.contractor_skills?.map((s) => ({
          skillName: s.skill_name,
        })),
        reviews,
      };
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error(String(error));
      logger.error('Error fetching user profile:', errorInstance);
      return null;
    }
  }

  /**
   * Get homeowner profile data for job cards
   */
  static async getHomeownerForJob(homeownerId: string): Promise<{
    name: string;
    rating: number;
    reviewCount: number;
    memberSince: string;
  } | null> {
    try {
      const { data: user, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, created_at, rating')
        .eq('id', homeownerId)
        .single();

      if (error) throw error;

      // Get review count for this homeowner
      const { count: reviewCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('reviewer_id', homeownerId);

      return {
        name:
          `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
        rating: user.rating || 0,
        reviewCount: reviewCount || 0,
        memberSince: new Date(user.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        }),
      };
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error(String(error));
      logger.error('Error fetching homeowner data:', errorInstance);
      return null;
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(
    userId: string,
    updates: Partial<User>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: updates.first_name || updates.firstName,
          last_name: updates.last_name || updates.lastName,
          phone: updates.phone,
          bio: updates.bio,
          profile_image_url: updates.profile_image_url,
          location: updates.location,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      return !error;
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error(String(error));
      logger.error('Error updating user profile:', errorInstance);
      return false;
    }
  }

  /**
   * Get nearby contractors with distance calculation
   */
  static async getNearbyContractors(
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
          const distance = this.calculateDistance(
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
            distance: this.calculateDistance(
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
   * Calculate distance between two points using Haversine formula
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get contractors that previously worked with a homeowner
   */
  static async getPreviousContractors(
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
            .eq('reviewed_id', contractor.id)
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
}
