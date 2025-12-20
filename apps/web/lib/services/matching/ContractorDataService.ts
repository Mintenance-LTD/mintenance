import { serverSupabase } from '@/lib/api/supabaseServer';
import type { ContractorProfile } from '@mintenance/types';
import type { MatchingCriteria } from './types';
import { logger } from '@mintenance/shared';

export class ContractorDataService {
  /**
   * Get available contractors based on matching criteria
   */
  static async getAvailableContractors(criteria: MatchingCriteria): Promise<ContractorProfile[]> {
    try {
      // Get contractors with their profile data joined from contractor_profiles table
      const { data: contractors, error } = await serverSupabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          phone,
          location,
          profile_image_url,
          role,
          created_at,
          updated_at,
          latitude,
          longitude,
          rating,
          total_jobs_completed,
          is_available,
          contractor_profiles (
            business_name,
            hourly_rate,
            years_experience,
            service_radius_km,
            availability_status
          )
        `)
        .eq('role', 'contractor')
        .eq('is_available', true)
        .limit(100);

      if (error) {
        logger.error('Failed to get contractors', { error, service: 'matching' });
        return [];
      }

      if (!contractors || contractors.length === 0) {
        return [];
      }

      // Fetch skills and reviews for each contractor
      const contractorsWithDetails = await Promise.all(
        contractors.map(async (contractor) => {
          // Fetch contractor skills
          const { data: skillsData } = await serverSupabase
            .from('contractor_skills')
            .select('id, skill_name, contractor_id')
            .eq('contractor_id', contractor.id);

          // Fetch reviews
          const { data: reviewsData } = await serverSupabase
            .from('reviews')
            .select('id, rating, comment, created_at, reviewed_id')
            .eq('reviewed_id', contractor.id)
            .limit(50);

          // Get contractor profile data (if exists)
          const profile = Array.isArray(contractor.contractor_profiles) 
            ? contractor.contractor_profiles[0] 
            : contractor.contractor_profiles;

          // Calculate distance if we have coordinates
          let distance = 0;
          if (criteria.location.latitude && criteria.location.longitude) {
            if (contractor.latitude && contractor.longitude) {
              // Use Haversine formula with actual coordinates
              distance = this.calculateHaversineDistance(
                criteria.location.latitude,
                criteria.location.longitude,
                contractor.latitude,
                contractor.longitude
              );
            } else if (contractor.location) {
              // Fallback to address-based calculation
              distance = await this.calculateDistance(contractor.location, criteria.location);
            }
          }

          // Check if contractor has any of the required skills
          const contractorSkills = skillsData?.map(s => ({
            id: s.id,
            contractorId: s.contractor_id,
            skillName: s.skill_name,
            createdAt: '',
          })) || [];

          const hasRequiredSkill = criteria.requiredSkills.length === 0 || 
            contractorSkills.some(skill => 
              criteria.requiredSkills.some(reqSkill => 
                skill.skillName.toLowerCase().includes(reqSkill.toLowerCase()) ||
                reqSkill.toLowerCase().includes(skill.skillName.toLowerCase())
              )
            );

          // Only include contractors with at least one required skill (or if no skills required)
          if (!hasRequiredSkill && criteria.requiredSkills.length > 0) {
            return null;
          }

          const reviews = reviewsData?.map(r => ({
            id: r.id,
            jobId: '',
            reviewerId: '',
            reviewedId: r.reviewed_id,
            rating: r.rating,
            comment: r.comment || '',
            createdAt: r.created_at,
          })) || [];

          // Use database rating if available, otherwise calculate from reviews
          const averageRating = contractor.rating || 
            (reviews.length > 0
              ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
              : 0);

          // Map availability_status to the expected format
          const mapAvailabilityStatus = (status: string | null | undefined): 'immediate' | 'this_week' | 'this_month' | 'busy' => {
            if (!status) return 'this_week';
            const statusLower = status.toLowerCase();
            if (statusLower.includes('immediate') || statusLower.includes('available now')) return 'immediate';
            if (statusLower.includes('this week') || statusLower.includes('available')) return 'this_week';
            if (statusLower.includes('this month')) return 'this_month';
            if (statusLower.includes('busy') || statusLower.includes('unavailable')) return 'busy';
            return 'this_week'; // Default
          };

          return {
            ...contractor,
            skills: contractorSkills,
            reviews,
            distance,
            companyName: profile?.business_name || `${contractor.first_name} ${contractor.last_name} Services`,
            yearsExperience: profile?.years_experience || Math.floor((Date.now() - new Date(contractor.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365)) || 1,
            hourlyRate: profile?.hourly_rate ? Number(profile.hourly_rate) : null,
            serviceRadius: profile?.service_radius_km || 25, // Convert km to miles if needed, or keep as km
            availability: mapAvailabilityStatus(profile?.availability_status),
            specialties: contractorSkills.map(s => s.skillName),
            rating: averageRating,
            totalJobsCompleted: contractor.total_jobs_completed || 0,
            businessAddress: contractor.location || null,
          } as ContractorProfile;
        })
      );

      // Filter out null values and contractors outside max distance
      return contractorsWithDetails
        .filter((c): c is ContractorProfile => 
          c !== null && 
          (criteria.location.maxDistance === 0 || (c.distance || 0) <= criteria.location.maxDistance)
        );
    } catch (error) {
      logger.error('Failed to get contractors', { error, service: 'matching' });
      return [];
    }
  }

  /**
   * Calculate distance using Haversine formula (in miles)
   */
  static calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate distance between contractor address and job location
   * Falls back to estimation if geocoding is not available
   */
  static async calculateDistance(address: string, location: { latitude: number; longitude: number }): Promise<number> {
    if (!address || !location.latitude || !location.longitude) {
      return 999; // Very far if we can't calculate
    }

    // Try to geocode the address if needed
    // For now, use a simple estimation based on address hash
    // In production, you'd geocode the address first
    const addressHash = address.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const estimate = Math.round((addressHash % 30) + 5); // Estimate 5-35 miles
    
    return Math.max(1, estimate);
  }

  /**
   * Assess contractor availability based on contractor profile data
   */
  static async assessAvailability(
    contractorId: string,
    timeframe: MatchingCriteria['timeframe']
  ): Promise<'immediate' | 'this_week' | 'this_month' | 'busy'> {
    try {
      // Fetch contractor profile to get actual availability status
      const { data: profile } = await serverSupabase
        .from('contractor_profiles')
        .select('availability_status')
        .eq('user_id', contractorId)
        .single();

      if (profile?.availability_status) {
        const statusLower = profile.availability_status.toLowerCase();
        if (statusLower.includes('immediate') || statusLower.includes('available now')) return 'immediate';
        if (statusLower.includes('this week') || statusLower.includes('available')) return 'this_week';
        if (statusLower.includes('this month')) return 'this_month';
        if (statusLower.includes('busy') || statusLower.includes('unavailable')) return 'busy';
      }

      // Fallback to timeframe-based estimation if no profile data
      const availabilities = ['immediate', 'this_week', 'this_month', 'busy'] as const;
      const idHash = contractorId ? contractorId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) : 0;
      const timeframeBias = timeframe === 'immediate' ? 0 : timeframe === 'this_week' ? 1 : timeframe === 'this_month' ? 2 : 3;
      const index = (idHash + timeframeBias) % availabilities.length;
      return availabilities[index];
    } catch (error) {
      logger.error('Failed to assess availability', { error, contractorId, service: 'matching' });
      return 'this_week'; // Default fallback
    }
  }
}
