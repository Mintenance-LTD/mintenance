import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Profile boost tier classification
 */
export type ProfileBoostTier = 'standard' | 'verified' | 'premium' | 'elite';

/**
 * Profile boost breakdown
 */
export interface ProfileBoostBreakdown {
  contractorId: string;

  // Base score
  baseTrustScore: number; // 0.0 - 1.0

  // Verification boosts (percentages)
  dbsCheckBoost: number; // 0-25%
  adminVerifiedBoost: number; // 0-15%
  phoneVerifiedBoost: number; // 0-5%
  emailVerifiedBoost: number; // 0-5%

  // Quality boosts (percentages)
  personalityAssessmentBoost: number; // 0-15%
  portfolioCompletenessBoost: number; // 0-10%
  certificationsBoost: number; // 0-10%
  insuranceVerifiedBoost: number; // 0-10%

  // Totals
  totalBoostPercentage: number; // Sum of all boosts
  rankingScore: number; // 0-100
  tier: ProfileBoostTier;

  // Metadata
  lastCalculatedAt: Date;
  calculationDetails: Record<string, any>;
}

/**
 * Service for calculating and managing contractor profile boosts
 * Combines trust scores with verification statuses to create a unified ranking system
 */
export class ProfileBoostService {
  /**
   * Calculate profile boost for a contractor
   * Calls the database function that does the actual calculation
   */
  static async calculateBoost(contractorId: string): Promise<ProfileBoostBreakdown | null> {
    try {
      const { data, error } = await serverSupabase.rpc('calculate_contractor_profile_boost', {
        p_contractor_id: contractorId,
      });

      if (error) {
        logger.error('Failed to calculate profile boost', {
          service: 'ProfileBoostService',
          contractorId,
          error: error.message,
        });
        return null;
      }

      if (!data || data.length === 0) {
        logger.warn('No boost data returned for contractor', {
          service: 'ProfileBoostService',
          contractorId,
        });
        return null;
      }

      const result = data[0];

      // Get full details from contractor_profile_boosts table
      const { data: boostData, error: boostError } = await serverSupabase
        .from('contractor_profile_boosts')
        .select('*')
        .eq('contractor_id', contractorId)
        .single();

      if (boostError || !boostData) {
        logger.error('Failed to fetch boost details', {
          service: 'ProfileBoostService',
          contractorId,
          error: boostError?.message,
        });
        return null;
      }

      return {
        contractorId,
        baseTrustScore: boostData.base_trust_score,
        dbsCheckBoost: boostData.dbs_check_boost,
        adminVerifiedBoost: boostData.admin_verified_boost,
        phoneVerifiedBoost: boostData.phone_verified_boost,
        emailVerifiedBoost: boostData.email_verified_boost,
        personalityAssessmentBoost: boostData.personality_assessment_boost,
        portfolioCompletenessBoost: boostData.portfolio_completeness_boost,
        certificationsBoost: boostData.certifications_boost,
        insuranceVerifiedBoost: boostData.insurance_verified_boost,
        totalBoostPercentage: boostData.total_boost_percentage,
        rankingScore: boostData.ranking_score,
        tier: boostData.tier as ProfileBoostTier,
        lastCalculatedAt: new Date(boostData.last_calculated_at),
        calculationDetails: boostData.calculation_details || {},
      };
    } catch (error) {
      logger.error('Error calculating profile boost', error, {
        service: 'ProfileBoostService',
        contractorId,
      });
      return null;
    }
  }

  /**
   * Get profile boost for a contractor (without recalculation)
   */
  static async getBoost(contractorId: string): Promise<ProfileBoostBreakdown | null> {
    try {
      const { data: boostData, error } = await serverSupabase
        .from('contractor_profile_boosts')
        .select('*')
        .eq('contractor_id', contractorId)
        .maybeSingle();

      if (error || !boostData) {
        // If no boost exists, calculate it
        return await this.calculateBoost(contractorId);
      }

      return {
        contractorId,
        baseTrustScore: boostData.base_trust_score,
        dbsCheckBoost: boostData.dbs_check_boost,
        adminVerifiedBoost: boostData.admin_verified_boost,
        phoneVerifiedBoost: boostData.phone_verified_boost,
        emailVerifiedBoost: boostData.email_verified_boost,
        personalityAssessmentBoost: boostData.personality_assessment_boost,
        portfolioCompletenessBoost: boostData.portfolio_completeness_boost,
        certificationsBoost: boostData.certifications_boost,
        insuranceVerifiedBoost: boostData.insurance_verified_boost,
        totalBoostPercentage: boostData.total_boost_percentage,
        rankingScore: boostData.ranking_score,
        tier: boostData.tier as ProfileBoostTier,
        lastCalculatedAt: new Date(boostData.last_calculated_at),
        calculationDetails: boostData.calculation_details || {},
      };
    } catch (error) {
      logger.error('Error getting profile boost', error, {
        service: 'ProfileBoostService',
        contractorId,
      });
      return null;
    }
  }

  /**
   * Get contractors by tier
   */
  static async getContractorsByTier(
    tier: ProfileBoostTier,
    limit: number = 50
  ): Promise<string[]> {
    try {
      const { data, error } = await serverSupabase
        .from('contractor_profile_boosts')
        .select('contractor_id')
        .eq('tier', tier)
        .order('ranking_score', { ascending: false })
        .limit(limit);

      if (error || !data) {
        return [];
      }

      return data.map(row => row.contractor_id);
    } catch (error) {
      logger.error('Error getting contractors by tier', error, {
        service: 'ProfileBoostService',
        tier,
      });
      return [];
    }
  }

  /**
   * Get top ranked contractors
   */
  static async getTopRankedContractors(limit: number = 20): Promise<ProfileBoostBreakdown[]> {
    try {
      const { data, error } = await serverSupabase
        .from('contractor_profile_boosts')
        .select('*')
        .order('ranking_score', { ascending: false })
        .limit(limit);

      if (error || !data) {
        return [];
      }

      return data.map(row => ({
        contractorId: row.contractor_id,
        baseTrustScore: row.base_trust_score,
        dbsCheckBoost: row.dbs_check_boost,
        adminVerifiedBoost: row.admin_verified_boost,
        phoneVerifiedBoost: row.phone_verified_boost,
        emailVerifiedBoost: row.email_verified_boost,
        personalityAssessmentBoost: row.personality_assessment_boost,
        portfolioCompletenessBoost: row.portfolio_completeness_boost,
        certificationsBoost: row.certifications_boost,
        insuranceVerifiedBoost: row.insurance_verified_boost,
        totalBoostPercentage: row.total_boost_percentage,
        rankingScore: row.ranking_score,
        tier: row.tier as ProfileBoostTier,
        lastCalculatedAt: new Date(row.last_calculated_at),
        calculationDetails: row.calculation_details || {},
      }));
    } catch (error) {
      logger.error('Error getting top ranked contractors', error, {
        service: 'ProfileBoostService',
      });
      return [];
    }
  }

  /**
   * Get missing verifications for a contractor (what they can improve)
   */
  static async getMissingVerifications(
    contractorId: string
  ): Promise<{
    category: string;
    name: string;
    potentialBoost: number;
    status: 'missing' | 'partial' | 'complete';
    actionUrl?: string;
  }[]> {
    try {
      const boost = await this.getBoost(contractorId);
      if (!boost) return [];

      const missing: {
        category: string;
        name: string;
        potentialBoost: number;
        status: 'missing' | 'partial' | 'complete';
        actionUrl?: string;
      }[] = [];

      // Check each verification type
      if (boost.dbsCheckBoost === 0) {
        missing.push({
          category: 'verification',
          name: 'DBS Check',
          potentialBoost: 25,
          status: 'missing',
          actionUrl: '/contractor/verification?tab=dbs',
        });
      } else if (boost.dbsCheckBoost < 25) {
        missing.push({
          category: 'verification',
          name: 'Enhanced DBS Check',
          potentialBoost: 25 - boost.dbsCheckBoost,
          status: 'partial',
          actionUrl: '/contractor/verification?tab=dbs',
        });
      }

      if (boost.adminVerifiedBoost === 0) {
        missing.push({
          category: 'verification',
          name: 'Admin Verification',
          potentialBoost: 15,
          status: 'missing',
          actionUrl: '/contractor/verification',
        });
      }

      if (boost.phoneVerifiedBoost === 0) {
        missing.push({
          category: 'verification',
          name: 'Phone Verification',
          potentialBoost: 5,
          status: 'missing',
          actionUrl: '/settings?tab=security',
        });
      }

      if (boost.emailVerifiedBoost === 0) {
        missing.push({
          category: 'verification',
          name: 'Email Verification',
          potentialBoost: 5,
          status: 'missing',
          actionUrl: '/settings?tab=security',
        });
      }

      if (boost.personalityAssessmentBoost === 0) {
        missing.push({
          category: 'quality',
          name: 'Personality Assessment',
          potentialBoost: 15,
          status: 'missing',
          actionUrl: '/contractor/assessment',
        });
      }

      if (boost.portfolioCompletenessBoost < 10) {
        missing.push({
          category: 'quality',
          name: 'Complete Portfolio (5+ items)',
          potentialBoost: 10 - boost.portfolioCompletenessBoost,
          status: boost.portfolioCompletenessBoost > 0 ? 'partial' : 'missing',
          actionUrl: '/contractor/portfolio',
        });
      }

      if (boost.certificationsBoost < 10) {
        missing.push({
          category: 'quality',
          name: 'Verified Skills (3+)',
          potentialBoost: 10 - boost.certificationsBoost,
          status: boost.certificationsBoost > 0 ? 'partial' : 'missing',
          actionUrl: '/contractor/profile?tab=skills',
        });
      }

      if (boost.insuranceVerifiedBoost === 0) {
        missing.push({
          category: 'verification',
          name: 'Insurance Verification',
          potentialBoost: 10,
          status: 'missing',
          actionUrl: '/contractor/verification?tab=insurance',
        });
      }

      // Sort by potential boost (highest first)
      missing.sort((a, b) => b.potentialBoost - a.potentialBoost);

      return missing;
    } catch (error) {
      logger.error('Error getting missing verifications', error, {
        service: 'ProfileBoostService',
        contractorId,
      });
      return [];
    }
  }

  /**
   * Recalculate all contractor boosts (admin function)
   * Use sparingly - expensive operation
   */
  static async recalculateAllBoosts(batchSize: number = 100): Promise<number> {
    try {
      // Get all contractors
      const { data: contractors, error } = await serverSupabase
        .from('users')
        .select('id')
        .eq('role', 'contractor');

      if (error || !contractors) {
        logger.error('Failed to fetch contractors for boost recalculation', {
          service: 'ProfileBoostService',
          error: error?.message,
        });
        return 0;
      }

      let updated = 0;

      // Process in batches
      for (let i = 0; i < contractors.length; i += batchSize) {
        const batch = contractors.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (contractor) => {
            const result = await this.calculateBoost(contractor.id);
            if (result) updated++;
          })
        );

        logger.info(`Processed batch ${Math.floor(i / batchSize) + 1}`, {
          service: 'ProfileBoostService',
          processed: Math.min(i + batchSize, contractors.length),
          total: contractors.length,
        });
      }

      logger.info('Completed boost recalculation for all contractors', {
        service: 'ProfileBoostService',
        totalContractors: contractors.length,
        updated,
      });

      return updated;
    } catch (error) {
      logger.error('Error recalculating all boosts', error, {
        service: 'ProfileBoostService',
      });
      return 0;
    }
  }

  /**
   * Get boost statistics (for admin dashboard)
   */
  static async getBoostStatistics(): Promise<{
    averageRankingScore: number;
    tierDistribution: Record<ProfileBoostTier, number>;
    averageBoostPercentage: number;
    topVerifications: { name: string; percentage: number }[];
  } | null> {
    try {
      const { data: boosts, error } = await serverSupabase
        .from('contractor_profile_boosts')
        .select('*');

      if (error || !boosts || boosts.length === 0) {
        return null;
      }

      const totalBoosts = boosts.length;

      // Calculate averages
      const averageRankingScore = boosts.reduce((sum, b) => sum + b.ranking_score, 0) / totalBoosts;
      const averageBoostPercentage = boosts.reduce((sum, b) => sum + b.total_boost_percentage, 0) / totalBoosts;

      // Tier distribution
      const tierDistribution: Record<ProfileBoostTier, number> = {
        elite: 0,
        premium: 0,
        verified: 0,
        standard: 0,
      };

      boosts.forEach(b => {
        tierDistribution[b.tier as ProfileBoostTier]++;
      });

      // Top verifications
      const verificationsSum = {
        dbs: boosts.filter(b => b.dbs_check_boost > 0).length,
        admin: boosts.filter(b => b.admin_verified_boost > 0).length,
        phone: boosts.filter(b => b.phone_verified_boost > 0).length,
        email: boosts.filter(b => b.email_verified_boost > 0).length,
        personality: boosts.filter(b => b.personality_assessment_boost > 0).length,
        portfolio: boosts.filter(b => b.portfolio_completeness_boost > 0).length,
        certifications: boosts.filter(b => b.certifications_boost > 0).length,
        insurance: boosts.filter(b => b.insurance_verified_boost > 0).length,
      };

      const topVerifications = Object.entries(verificationsSum)
        .map(([name, count]) => ({
          name,
          percentage: (count / totalBoosts) * 100,
        }))
        .sort((a, b) => b.percentage - a.percentage);

      return {
        averageRankingScore: Math.round(averageRankingScore),
        tierDistribution,
        averageBoostPercentage: Math.round(averageBoostPercentage),
        topVerifications,
      };
    } catch (error) {
      logger.error('Error getting boost statistics', error, {
        service: 'ProfileBoostService',
      });
      return null;
    }
  }
}
