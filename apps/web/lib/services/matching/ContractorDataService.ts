import { supabase } from '@/lib/supabase';
import type { ContractorProfile } from '@mintenance/types';
import type { MatchingCriteria } from './types';
import { logger } from '@/lib/logger';

export class ContractorDataService {
  /**
   * Get available contractors based on matching criteria
   */
  static async getAvailableContractors(criteria: MatchingCriteria): Promise<ContractorProfile[]> {
    try {
      // Get contractors with required skills
      const { data: contractors, error } = await supabase
        .from('users')
        .select(`
          *,
          contractor_skills!inner(skill_name),
          reviews(rating, comment, created_at)
        `)
        .eq('role', 'contractor')
        .in('contractor_skills.skill_name', criteria.requiredSkills.concat(criteria.preferredSkills || []))
        .limit(50);

      if (error) throw error;

      return contractors?.map(c => ({
        ...c,
        skills: c.contractor_skills || [],
        reviews: c.reviews || [],
        distance: 0, // Will be calculated later
        // Add default contractor profile fields
        companyName: `${c.first_name} ${c.last_name} Services`,
        yearsExperience: Math.floor(Math.random() * 15) + 1,
        hourlyRate: Math.floor(Math.random() * 100) + 50,
        serviceRadius: Math.floor(Math.random() * 30) + 10,
        availability: ['immediate', 'this_week', 'this_month', 'busy'][Math.floor(Math.random() * 4)] as any,
        specialties: c.contractor_skills?.map((s: any) => s.skill_name) || []
      })) || [];
    } catch (error) {
      logger.error('Failed to get contractors', error);
      return [];
    }
  }

  /**
   * Calculate distance between contractor address and job location
   */
  static async calculateDistance(address: string, location: { latitude: number; longitude: number }): Promise<number> {
    const addressHash = address ? address.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) : 0;
    const coordinateFactor = Math.abs(location.latitude) + Math.abs(location.longitude);
    const estimate = Math.round((addressHash % 25) + (coordinateFactor % 10));
    return Math.max(1, estimate);
  }

  /**
   * Assess contractor availability based on timeframe
   */
  static async assessAvailability(
    contractorId: string,
    timeframe: MatchingCriteria['timeframe']
  ): Promise<'immediate' | 'this_week' | 'this_month' | 'busy'> {
    const availabilities = ['immediate', 'this_week', 'this_month', 'busy'] as const;
    const idHash = contractorId ? contractorId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) : 0;
    const timeframeBias = timeframe === 'immediate' ? 0 : timeframe === 'this_week' ? 1 : timeframe === 'this_month' ? 2 : 3;
    const index = (idHash + timeframeBias) % availabilities.length;
    return availabilities[index];
  }
}
