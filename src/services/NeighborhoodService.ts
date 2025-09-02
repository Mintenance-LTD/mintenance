import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export interface Neighborhood {
  id: string;
  name: string;
  postcode_prefix: string; // e.g., "SW1", "M1", "B1"
  center_latitude: number;
  center_longitude: number;
  radius_km: number;
  member_count: number;
  active_jobs_count: number;
  completed_jobs_count: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

export interface NeighborhoodStats {
  id: string;
  neighborhood_id: string;
  top_contractors: ContractorRanking[];
  popular_services: ServiceStats[];
  average_response_time: number; // minutes
  success_rate: number; // 0-1
  community_score: number; // 0-100
  recent_activity: ActivitySummary[];
  updated_at: string;
}

export interface ContractorRanking {
  contractor_id: string;
  contractor_name: string;
  contractor_avatar?: string;
  jobs_completed: number;
  average_rating: number;
  specialties: string[];
  response_time_avg: number; // minutes
  community_endorsements: number;
  rank_position: number;
}

export interface ServiceStats {
  service_type: string;
  jobs_count: number;
  average_price: number;
  satisfaction_rating: number;
  trending_score: number; // 0-1, higher = more trending
}

export interface ActivitySummary {
  type: 'job_completed' | 'contractor_joined' | 'review_posted' | 'referral_made';
  count: number;
  timeframe: '24h' | '7d' | '30d';
}

export interface NeighborReferral {
  id: string;
  referrer_id: string;
  referrer_name: string;
  referee_id: string;
  referee_name: string;
  neighborhood_id: string;
  contractor_id: string;
  job_id: string;
  status: 'pending' | 'accepted' | 'completed' | 'expired';
  reward_points: number;
  created_at: string;
  accepted_at?: string;
  completed_at?: string;
}

export interface CommunityEndorsement {
  id: string;
  endorser_id: string;
  contractor_id: string;
  neighborhood_id: string;
  skill: string;
  message?: string;
  weight: number; // Based on endorser's reputation
  created_at: string;
}

export interface NeighborhoodLeaderboard {
  neighborhood: Neighborhood;
  topContractors: ContractorRanking[];
  recentSuccesses: JobSuccess[];
  communityChampions: CommunityChampion[];
  trendinServices: ServiceStats[];
}

export interface JobSuccess {
  job_title: string;
  contractor_name: string;
  homeowner_name: string; // First name only
  completion_date: string;
  rating: number;
  before_photo?: string;
  after_photo?: string;
}

export interface CommunityChampion {
  user_id: string;
  user_name: string;
  avatar?: string;
  champion_type: 'referral_master' | 'review_hero' | 'quality_advocate' | 'helpful_neighbor';
  score: number;
  badge_level: 'bronze' | 'silver' | 'gold' | 'platinum';
}

class NeighborhoodService {
  
  // Get or create neighborhood based on postcode
  async getOrCreateNeighborhood(postcode: string, latitude: number, longitude: number): Promise<Neighborhood> {
    try {
      const postcodePrefix = this.extractPostcodePrefix(postcode);
      
      // Try to find existing neighborhood
      const { data: existing, error: findError } = await supabase
        .from('neighborhoods')
        .select('*')
        .eq('postcode_prefix', postcodePrefix)
        .single();

      if (existing && !findError) {
        return existing;
      }

      // Create new neighborhood
      const neighborhoodName = await this.generateNeighborhoodName(postcode, latitude, longitude);
      
      const { data: newNeighborhood, error: createError } = await supabase
        .from('neighborhoods')
        .insert({
          name: neighborhoodName,
          postcode_prefix: postcodePrefix,
          center_latitude: latitude,
          center_longitude: longitude,
          radius_km: this.calculateRadius(postcodePrefix),
          member_count: 1,
          active_jobs_count: 0,
          completed_jobs_count: 0,
          average_rating: 0.0
        })
        .select()
        .single();

      if (createError) throw createError;
      
      logger.info('Created new neighborhood', { 
        name: neighborhoodName, 
        postcode: postcodePrefix 
      });
      
      return newNeighborhood;
    } catch (error) {
      logger.error('Failed to get/create neighborhood', error);
      throw error;
    }
  }

  // Get neighborhood leaderboard
  async getNeighborhoodLeaderboard(neighborhoodId: string): Promise<NeighborhoodLeaderboard> {
    try {
      const [neighborhood, contractors, successes, champions, services] = await Promise.all([
        this.getNeighborhoodById(neighborhoodId),
        this.getTopContractors(neighborhoodId),
        this.getRecentJobSuccesses(neighborhoodId),
        this.getCommunityChampions(neighborhoodId),
        this.getTrendingServices(neighborhoodId)
      ]);

      return {
        neighborhood,
        topContractors: contractors,
        recentSuccesses: successes,
        communityChampions: champions,
        trendinServices: services
      };
    } catch (error) {
      logger.error('Failed to get neighborhood leaderboard', error);
      throw error;
    }
  }

  // Get top contractors in neighborhood
  async getTopContractors(neighborhoodId: string, limit: number = 10): Promise<ContractorRanking[]> {
    try {
      const { data, error } = await supabase
        .from('contractor_neighborhood_rankings')
        .select(`
          contractor_id,
          contractor_name,
          contractor_avatar,
          jobs_completed,
          average_rating,
          specialties,
          response_time_avg,
          community_endorsements,
          rank_position
        `)
        .eq('neighborhood_id', neighborhoodId)
        .order('rank_position', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get top contractors', error);
      return [];
    }
  }

  // Create neighbor referral
  async createNeighborReferral(
    referrerId: string, 
    contractorId: string, 
    jobId: string,
    refereeContact: string
  ): Promise<NeighborReferral> {
    try {
      // Get referrer's neighborhood
      const referrer = await this.getUserNeighborhood(referrerId);
      if (!referrer) {
        throw new Error('Referrer not found in any neighborhood');
      }

      const { data, error } = await supabase
        .from('neighbor_referrals')
        .insert({
          referrer_id: referrerId,
          contractor_id: contractorId,
          job_id: jobId,
          neighborhood_id: referrer.neighborhood_id,
          referee_contact: refereeContact,
          reward_points: this.calculateReferralReward(contractorId),
          status: 'pending'
        })
        .select(`
          *,
          referrer:users!referrer_id(first_name, last_name),
          contractor:users!contractor_id(first_name, last_name)
        `)
        .single();

      if (error) throw error;
      
      logger.info('Created neighbor referral', { 
        referrerId, 
        contractorId, 
        jobId 
      });
      
      return data;
    } catch (error) {
      logger.error('Failed to create neighbor referral', error);
      throw error;
    }
  }

  // Add community endorsement
  async addCommunityEndorsement(
    endorserId: string,
    contractorId: string,
    skill: string,
    message?: string
  ): Promise<CommunityEndorsement> {
    try {
      // Get endorser's neighborhood and reputation weight
      const endorser = await this.getUserNeighborhood(endorserId);
      if (!endorser) {
        throw new Error('Endorser not found in any neighborhood');
      }

      const weight = await this.calculateEndorsementWeight(endorserId);

      const { data, error } = await supabase
        .from('community_endorsements')
        .insert({
          endorser_id: endorserId,
          contractor_id: contractorId,
          neighborhood_id: endorser.neighborhood_id,
          skill,
          message,
          weight
        })
        .select()
        .single();

      if (error) throw error;

      // Update contractor's community endorsement count
      await this.updateContractorEndorsementCount(contractorId, endorser.neighborhood_id);
      
      logger.info('Added community endorsement', { 
        endorserId, 
        contractorId, 
        skill 
      });
      
      return data;
    } catch (error) {
      logger.error('Failed to add community endorsement', error);
      throw error;
    }
  }

  // Get neighborhood recommendations for user
  async getNeighborhoodRecommendations(userId: string): Promise<ContractorRanking[]> {
    try {
      const userNeighborhood = await this.getUserNeighborhood(userId);
      if (!userNeighborhood) {
        return [];
      }

      // Get contractors with community endorsements
      const { data, error } = await supabase
        .from('contractor_neighborhood_rankings')
        .select(`
          *,
          endorsements:community_endorsements(count)
        `)
        .eq('neighborhood_id', userNeighborhood.neighborhood_id)
        .gte('community_endorsements', 1)
        .order('community_endorsements', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get neighborhood recommendations', error);
      return [];
    }
  }

  // Get neighborhood activity feed
  async getNeighborhoodActivity(neighborhoodId: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('neighborhood_activity_feed')
        .select(`
          *,
          user:users!user_id(first_name, last_name, profileImageUrl),
          job:jobs!job_id(title),
          contractor:users!contractor_id(first_name, last_name)
        `)
        .eq('neighborhood_id', neighborhoodId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get neighborhood activity', error);
      return [];
    }
  }

  // Calculate community score for neighborhood
  async calculateCommunityScore(neighborhoodId: string): Promise<number> {
    try {
      const stats = await this.getNeighborhoodStats(neighborhoodId);
      
      // Factors for community score (0-100)
      const factors = {
        activity: Math.min(stats.completed_jobs_count / 50, 1) * 30, // Max 30 points
        satisfaction: stats.average_rating / 5 * 25, // Max 25 points
        engagement: Math.min(stats.community_endorsements / 20, 1) * 20, // Max 20 points
        response: Math.max(0, (1 - stats.average_response_time / 120)) * 15, // Max 15 points
        diversity: Math.min(stats.active_contractors / 10, 1) * 10 // Max 10 points
      };

      const totalScore = Object.values(factors).reduce((sum, score) => sum + score, 0);
      
      logger.debug('Calculated community score', { 
        neighborhoodId, 
        factors, 
        totalScore 
      });
      
      return Math.round(totalScore);
    } catch (error) {
      logger.error('Failed to calculate community score', error);
      return 0;
    }
  }

  // Private helper methods
  private extractPostcodePrefix(postcode: string): string {
    // UK postcode format: "SW1A 1AA" -> "SW1"
    const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
    const match = cleaned.match(/^([A-Z]{1,2}\d{1,2})/);
    return match ? match[1] : cleaned.substring(0, 3);
  }

  private async generateNeighborhoodName(postcode: string, lat: number, lng: number): Promise<string> {
    // In a real implementation, you might use reverse geocoding
    // For now, generate based on postcode
    const prefix = this.extractPostcodePrefix(postcode);
    const areaNames: Record<string, string> = {
      'SW1': 'Westminster',
      'SW3': 'Chelsea', 
      'SW7': 'South Kensington',
      'W1': 'West End',
      'WC1': 'Bloomsbury',
      'WC2': 'Covent Garden',
      'E1': 'Whitechapel',
      'E14': 'Canary Wharf',
      'N1': 'Islington',
      'SE1': 'South Bank',
      'M1': 'Manchester City Centre',
      'M4': 'Rusholme',
      'B1': 'Birmingham City Centre',
      'LS1': 'Leeds City Centre'
    };

    return areaNames[prefix] || `${prefix} Area`;
  }

  private calculateRadius(postcodePrefix: string): number {
    // London areas are smaller, other cities larger
    const londonPrefixes = ['SW', 'SE', 'NW', 'NE', 'W', 'E', 'WC', 'EC', 'N'];
    const isLondon = londonPrefixes.some(prefix => postcodePrefix.startsWith(prefix));
    return isLondon ? 1.5 : 3.0; // km
  }

  private calculateReferralReward(contractorId: string): number {
    // Base reward: 50 points
    // Could be enhanced based on contractor rating, job value, etc.
    return 50;
  }

  private async calculateEndorsementWeight(endorserId: string): Promise<number> {
    // Weight based on user's reputation in the community
    // More active, higher-rated users have higher weight
    try {
      const { data, error } = await supabase
        .from('user_community_stats')
        .select('jobs_completed, average_rating, endorsements_given')
        .eq('user_id', endorserId)
        .single();

      if (error || !data) return 1.0;

      const baseWeight = 1.0;
      const experienceBonus = Math.min(data.jobs_completed / 10, 0.5);
      const ratingBonus = (data.average_rating - 3) / 2 * 0.3;
      const activityBonus = Math.min(data.endorsements_given / 5, 0.2);

      return Math.max(0.5, baseWeight + experienceBonus + ratingBonus + activityBonus);
    } catch (error) {
      logger.warn('Failed to calculate endorsement weight', error);
      return 1.0;
    }
  }

  private async getNeighborhoodById(neighborhoodId: string): Promise<Neighborhood> {
    const { data, error } = await supabase
      .from('neighborhoods')
      .select('*')
      .eq('id', neighborhoodId)
      .single();

    if (error) throw error;
    return data;
  }

  private async getRecentJobSuccesses(neighborhoodId: string): Promise<JobSuccess[]> {
    const { data, error } = await supabase
      .from('neighborhood_job_successes')
      .select(`
        job_title,
        contractor_name,
        homeowner_name,
        completion_date,
        rating,
        before_photo,
        after_photo
      `)
      .eq('neighborhood_id', neighborhoodId)
      .order('completion_date', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  }

  private async getCommunityChampions(neighborhoodId: string): Promise<CommunityChampion[]> {
    const { data, error } = await supabase
      .from('community_champions')
      .select('*')
      .eq('neighborhood_id', neighborhoodId)
      .order('score', { ascending: false })
      .limit(5);

    if (error) throw error;
    return data || [];
  }

  private async getTrendingServices(neighborhoodId: string): Promise<ServiceStats[]> {
    const { data, error } = await supabase
      .from('neighborhood_service_stats')
      .select('*')
      .eq('neighborhood_id', neighborhoodId)
      .order('trending_score', { ascending: false })
      .limit(8);

    if (error) throw error;
    return data || [];
  }

  private async getUserNeighborhood(userId: string): Promise<{neighborhood_id: string} | null> {
    const { data, error } = await supabase
      .from('user_neighborhoods')
      .select('neighborhood_id')
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return data;
  }

  private async getNeighborhoodStats(neighborhoodId: string): Promise<any> {
    // Mock stats for now - in real implementation would query actual data
    return {
      completed_jobs_count: 45,
      average_rating: 4.6,
      community_endorsements: 15,
      average_response_time: 35,
      active_contractors: 12
    };
  }

  private async updateContractorEndorsementCount(contractorId: string, neighborhoodId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_contractor_endorsements', {
      contractor_id: contractorId,
      neighborhood_id: neighborhoodId
    });

    if (error) {
      logger.warn('Failed to update contractor endorsement count', error);
    }
  }
}

export const neighborhoodService = new NeighborhoodService();