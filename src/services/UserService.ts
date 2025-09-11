import { supabase } from '../config/supabase';
import { User } from '../types';
import { logger } from '../utils/logger';


export interface ContractorStats {
  activeJobs: number;
  monthlyEarnings: number;
  rating: number;
  completedJobs: number;
  totalJobsCompleted: number;
  responseTime: string;
  successRate: number;
  todaysAppointments: number;
  nextAppointment?: {
    time: string;
    client: string;
    location: string;
    type: string;
    jobId: string;
  };
}

export interface UserProfile extends User {
  skills?: Array<{ skillName: string }>;
  reviews?: Array<{
    rating: number;
    comment: string;
    reviewer: string;
    createdAt: string;
  }>;
  distance?: number;
}

export class UserService {
  /**
   * Get comprehensive contractor statistics from real database
   */
  static async getContractorStats(contractorId: string): Promise<ContractorStats> {
    try {
      // Get contractor's jobs statistics
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, status, budget, created_at, updated_at, homeowner_id')
        .eq('contractor_id', contractorId);

      if (jobsError) throw jobsError;

      // Get contractor's ratings
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', contractorId);

      if (reviewsError) throw reviewsError;

      // Get today's appointments (jobs starting today)
      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const { data: todaysJobs, error: todaysError } = await supabase
        .from('jobs')
        .select(`
          id, title, location, created_at,
          homeowner:homeowner_id (
            first_name, last_name
          )
        `)
        .eq('contractor_id', contractorId)
        .in('status', ['assigned', 'in_progress'])
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        .order('created_at', { ascending: true });

      if (todaysError) throw todaysError;

      // Calculate statistics
      const activeJobs = jobs?.filter(job => ['assigned', 'in_progress'].includes(job.status)).length || 0;
      const completedJobs = jobs?.filter(job => job.status === 'completed').length || 0;
      
      // Calculate monthly earnings (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyEarnings = jobs?.filter(job => {
        const jobDate = new Date(job.updated_at);
        return job.status === 'completed' && 
               jobDate.getMonth() === currentMonth && 
               jobDate.getFullYear() === currentYear;
      }).reduce((total, job) => total + parseFloat(job.budget.toString()), 0) || 0;

      // Calculate average rating
      const avgRating = reviews && reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;

      // Calculate response time (mock for now - would need message timestamps)
      const responseTime = avgRating >= 4.5 ? '< 1h' : avgRating >= 4.0 ? '< 2h' : '< 4h';

      // Success rate calculation
      const totalJobs = jobs?.length || 0;
      const successRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

      // Get next appointment
      let nextAppointment;
      if (todaysJobs && todaysJobs.length > 0) {
        const nextJob = todaysJobs[0];
        nextAppointment = {
          time: new Date(nextJob.created_at).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
          }),
          client: `${(nextJob.homeowner as any)?.first_name || ''} ${(nextJob.homeowner as any)?.last_name || ''}`.trim() || 'Client',
          location: nextJob.location,
          type: nextJob.title,
          jobId: nextJob.id
        };
      }

      return {
        activeJobs,
        monthlyEarnings: Math.round(monthlyEarnings),
        rating: Math.round(avgRating * 10) / 10,
        completedJobs,
        totalJobsCompleted: completedJobs,
        responseTime,
        successRate,
        todaysAppointments: todaysJobs?.length || 0,
        nextAppointment
      };

    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      logger.error('Error fetching contractor stats:', errorInstance);
      // Return default values on error
      return {
        activeJobs: 0,
        monthlyEarnings: 0,
        rating: 0,
        completedJobs: 0,
        totalJobsCompleted: 0,
        responseTime: '< 2h',
        successRate: 0,
        todaysAppointments: 0
      };
    }
  }

  /**
   * Get user profile by ID with additional contractor data
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          *,
          contractor_skills (
            skill_name
          )
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Get reviews for this user if they're a contractor
      let reviews;
      if (user.role === 'contractor') {
        const { data: reviewData, error: reviewError } = await supabase
          .from('reviews')
          .select(`
            rating,
            comment,
            created_at,
            reviewer:reviewer_id (
              first_name,
              last_name
            )
          `)
          .eq('reviewed_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!reviewError) {
          reviews = reviewData.map(review => ({
            rating: review.rating,
            comment: review.comment,
            reviewer: `${(review.reviewer as any)?.first_name || ''} ${(review.reviewer as any)?.last_name || ''}`.trim(),
            createdAt: review.created_at
          }));
        }
      }

      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        phone: user.phone,
        address: user.address,
        bio: user.bio,
        profileImageUrl: user.profile_image_url,
        created_at: user.created_at,
        updated_at: user.updated_at
      };

    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
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
        .from('users')
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
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
        rating: user.rating || 0,
        reviewCount: reviewCount || 0,
        memberSince: new Date(user.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        })
      };

    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      logger.error('Error fetching homeowner data:', errorInstance);
      return null;
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId: string, updates: Partial<User>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          phone: updates.phone,
          bio: updates.bio,
          profile_image_url: updates.profileImageUrl,
          latitude: updates.latitude,
          longitude: updates.longitude,
          address: updates.address,
          is_available: updates.isAvailable,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      return !error;
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
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
      let query = supabase
        .from('users')
        .select(`
          *,
          contractor_skills (
            skill_name
          )
        `)
        .eq('role', 'contractor')
        .eq('is_available', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      const { data: contractors, error } = await query;

      if (error) throw error;

      // Calculate distances and filter by radius
      const nearbyContractors = contractors
        .filter(contractor => {
          const distance = this.calculateDistance(
            userLatitude,
            userLongitude,
            contractor.latitude,
            contractor.longitude
          );
          return distance <= radiusKm;
        })
        .map(contractor => ({
          id: contractor.id,
          email: contractor.email,
          first_name: contractor.first_name,
          last_name: contractor.last_name,
          role: contractor.role,
          phone: contractor.phone,
          address: contractor.address,
          bio: contractor.bio,
          profileImageUrl: contractor.profile_image_url,
          created_at: contractor.created_at,
          updated_at: contractor.updated_at
        } as UserProfile));

      return nearbyContractors;

    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
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
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get contractors that previously worked with a homeowner
   */
  static async getPreviousContractors(homeownerId: string): Promise<UserProfile[]> {
    try {
      // Get completed jobs for this homeowner with contractor info
      const { data: completedJobs, error } = await supabase
        .from('jobs')
        .select(`
          contractor_id,
          contractor:contractor_id (
            id,
            first_name,
            last_name,
            bio,
            profile_image_url,
            phone,
            address,
            contractor_skills (
              skill_name
            )
          )
        `)
        .eq('homeowner_id', homeownerId)
        .eq('status', 'completed')
        .not('contractor_id', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (!completedJobs || completedJobs.length === 0) {
        return [];
      }

      // Get unique contractors (avoid duplicates if they worked multiple jobs)
      const uniqueContractors = new Map();
      
      for (const job of completedJobs) {
        const contractor = job.contractor as any;
        if (contractor && !uniqueContractors.has(contractor.id)) {
          // Get reviews for this contractor
          const { data: reviews } = await supabase
            .from('reviews')
            .select('rating, comment, created_at')
            .eq('reviewed_id', contractor.id)
            .eq('reviewer_id', homeownerId)
            .order('created_at', { ascending: false })
            .limit(1);

          const contractorProfile: UserProfile = {
            id: contractor.id,
            email: '', // Not needed for display
            first_name: contractor.first_name,
            last_name: contractor.last_name,
            role: 'contractor',
            phone: contractor.phone,
            address: contractor.address,
            bio: contractor.bio,
            profileImageUrl: contractor.profile_image_url,
            created_at: '',
            updated_at: '',
            skills: contractor.contractor_skills?.map((s: any) => ({ skillName: s.skill_name })) || [],
            reviews: reviews?.map(review => ({
              rating: review.rating,
              comment: review.comment,
              reviewer: 'You',
              createdAt: review.created_at
            })) || []
          };

          uniqueContractors.set(contractor.id, contractorProfile);
        }
      }

      return Array.from(uniqueContractors.values()).slice(0, 5); // Return max 5 previous contractors

    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      logger.error('Error fetching previous contractors:', errorInstance);
      return [];
    }
  }
}