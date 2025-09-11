import { supabase } from '../config/supabase';
import {
  ContractorProfile,
  ContractorMatch,
  ContractorSkill,
  Review,
  LocationData,
} from '../types';
import { logger } from '../utils/logger';

export class ContractorService {
  static async getNearbyContractors(
    homeownerLocation: LocationData,
    radiusKm: number = 25
  ): Promise<ContractorProfile[]> {
    try {
      const { data: contractors, error } = await supabase
        .from('users')
        .select(
          `
          *,
          contractor_skills (
            id,
            skill_name,
            created_at
          ),
          reviews:reviews!reviewed_id (
            id,
            rating,
            comment,
            created_at,
            reviewer:reviewer_id (
              first_name,
              last_name
            )
          )
        `
        )
        .eq('role', 'contractor')
        .eq('is_available', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;

      const contractorsWithDistance = contractors
        .map((contractor: any) => {
          const distance = this.calculateDistance(
            homeownerLocation.latitude,
            homeownerLocation.longitude,
            contractor.latitude,
            contractor.longitude
          );

          return {
            ...this.mapUserToContractorProfile(contractor),
            distance,
          };
        })
        .filter((contractor: any) => contractor.distance <= radiusKm)
        .sort((a: any, b: any) => a.distance - b.distance);

      return contractorsWithDistance;
    } catch (error) {
      logger.error('Error fetching nearby contractors:', error);
      throw error;
    }
  }

  static async getUnmatchedContractors(
    homeownerId: string,
    location: LocationData
  ): Promise<ContractorProfile[]> {
    try {
      const { data: matches, error: matchError } = await supabase
        .from('contractor_matches')
        .select('contractor_id')
        .eq('homeowner_id', homeownerId);

      if (matchError) throw matchError;

      const matchedContractorIds =
        matches?.map((m: any) => m.contractor_id) || [];

      const { data: contractors, error } = await supabase
        .from('users')
        .select(
          `
          *,
          contractor_skills (
            id,
            skill_name,
            created_at
          ),
          reviews:reviews!reviewed_id (
            id,
            rating,
            comment,
            created_at
          )
        `
        )
        .eq('role', 'contractor')
        .eq('is_available', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .not('id', 'in', `(${matchedContractorIds.join(',')})`);

      if (error) throw error;

      const contractorsWithDistance = contractors
        .map((contractor: any) => ({
          ...this.mapUserToContractorProfile(contractor),
          distance: this.calculateDistance(
            location.latitude,
            location.longitude,
            contractor.latitude,
            contractor.longitude
          ),
        }))
        .filter((contractor: any) => contractor.distance <= 25)
        .sort((a: any, b: any) => a.distance - b.distance);

      return contractorsWithDistance;
    } catch (error) {
      logger.error('Error fetching unmatched contractors:', error);
      throw error;
    }
  }

  static async recordContractorMatch(
    homeownerId: string,
    contractorId: string,
    action: 'like' | 'pass'
  ): Promise<ContractorMatch> {
    try {
      const { data, error } = await supabase
        .from('contractor_matches')
        .upsert({
          homeowner_id: homeownerId,
          contractor_id: contractorId,
          action,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        homeownerId: data.homeowner_id,
        contractorId: data.contractor_id,
        action: data.action,
        createdAt: data.created_at,
      };
    } catch (error) {
      logger.error('Error recording contractor match:', error);
      throw error;
    }
  }

  static async getLikedContractors(
    homeownerId: string
  ): Promise<ContractorProfile[]> {
    try {
      const { data: matches, error } = await supabase
        .from('contractor_matches')
        .select(
          `
          contractor_id,
          contractor:contractor_id (
            *,
            contractor_skills (
              id,
              skill_name,
              created_at
            ),
            reviews:reviews!reviewed_id (
              id,
              rating,
              comment,
              created_at
            )
          )
        `
        )
        .eq('homeowner_id', homeownerId)
        .eq('action', 'like');

      if (error) throw error;

      return (
        matches?.map((match: any) =>
          this.mapUserToContractorProfile(match.contractor)
        ) || []
      );
    } catch (error) {
      logger.error('Error fetching liked contractors:', error);
      throw error;
    }
  }

  static async addContractorSkill(
    contractorId: string,
    skillName: string
  ): Promise<ContractorSkill> {
    try {
      const { data, error } = await supabase
        .from('contractor_skills')
        .insert({
          contractor_id: contractorId,
          skill_name: skillName,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        contractorId: data.contractor_id,
        skillName: data.skill_name,
        createdAt: data.created_at,
      };
    } catch (error) {
      logger.error('Error adding contractor skill:', error);
      throw error;
    }
  }

  static async updateContractorLocation(
    contractorId: string,
    location: LocationData
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
        })
        .eq('id', contractorId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error updating contractor location:', error);
      throw error;
    }
  }

  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private static mapUserToContractorProfile(user: any): ContractorProfile {
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      created_at: user.created_at,
      updated_at: user.updated_at,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      createdAt: user.created_at,
      latitude: user.latitude,
      longitude: user.longitude,
      address: user.address,
      profileImageUrl: user.profile_image_url,
      bio: user.bio,
      rating: user.rating || 0,
      totalJobsCompleted: user.total_jobs_completed || 0,
      isAvailable: user.is_available,
      skills:
        user.contractor_skills?.map((skill: any) => ({
          id: skill.id,
          contractorId: user.id,
          skillName: skill.skill_name,
          createdAt: skill.created_at,
        })) || [],
      reviews:
        user.reviews?.map((review: any) => ({
          id: review.id,
          jobId: '',
          reviewerId: '',
          reviewedId: user.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.created_at,
        })) || [],
    };
  }
}
