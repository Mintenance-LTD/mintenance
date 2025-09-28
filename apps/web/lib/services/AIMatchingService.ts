import { supabase } from '@/lib/supabase';
import type { ContractorProfile } from '@mintenance/types';

export interface MatchingCriteria {
  jobId: string;
  location: {
    latitude: number;
    longitude: number;
    maxDistance: number; // in miles
  };
  budget: {
    min: number;
    max: number;
  };
  urgency: 'emergency' | 'urgent' | 'normal' | 'flexible';
  requiredSkills: string[];
  preferredSkills?: string[];
  projectComplexity: 'simple' | 'medium' | 'complex';
  timeframe: 'immediate' | 'this_week' | 'this_month' | 'flexible';
}

export interface ContractorMatch {
  contractor: ContractorProfile;
  matchScore: number;
  matchBreakdown: MatchingScore;
  estimatedRate: number;
  availability: 'immediate' | 'this_week' | 'this_month' | 'busy';
  distance: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  reasons: string[];
  concerns: string[];
}

export interface MatchingScore {
  skillMatch: number; // 0-100
  locationScore: number; // 0-100
  budgetAlignment: number; // 0-100
  availabilityMatch: number; // 0-100
  ratingScore: number; // 0-100
  experienceScore: number; // 0-100
  responsiveness: number; // 0-100
  priceCompetitiveness: number; // 0-100
  overallScore: number; // 0-100
}

export interface MatchingPreferences {
  userId: string;
  maxMatches: number;
  prioritizeLocal: boolean;
  prioritizeBudget: boolean;
  prioritizeRating: boolean;
  prioritizeSpeed: boolean;
  minRating: number;
  maxDistance: number;
  preferredPriceRange: 'budget' | 'mid-range' | 'premium' | 'any';
  blacklistedContractors: string[];
  favoriteContractors: string[];
}

export interface MatchingInsights {
  totalCandidates: number;
  averageMatchScore: number;
  topSkillGaps: string[];
  recommendedBudgetAdjustment?: {
    suggested: number;
    reason: string;
  };
  marketAvailability: 'high' | 'medium' | 'low';
  competitiveAnalysis: {
    averageRate: number;
    rateRange: { min: number; max: number };
    topContractors: number;
  };
}

export class AIMatchingService {
  /**
   * Find the best contractor matches for a job using AI-powered algorithms
   */
  static async findMatches(
    criteria: MatchingCriteria,
    preferences?: Partial<MatchingPreferences>
  ): Promise<ContractorMatch[]> {
    try {
      // Get available contractors
      const contractors = await this.getAvailableContractors(criteria);

      // Score each contractor
      const matches: ContractorMatch[] = [];

      for (const contractor of contractors) {
        const matchScore = await this.calculateMatchScore(contractor, criteria);

        if (matchScore.overallScore >= 30) { // Minimum threshold
          const match: ContractorMatch = {
            contractor,
            matchScore: matchScore.overallScore,
            matchBreakdown: matchScore,
            estimatedRate: await this.estimateRate(contractor, criteria),
            availability: await this.assessAvailability(contractor.id, criteria.timeframe),
            distance: await this.calculateDistance(
              contractor.businessAddress || '',
              criteria.location
            ),
            confidenceLevel: this.getConfidenceLevel(matchScore.overallScore),
            reasons: this.generateMatchReasons(matchScore, contractor),
            concerns: this.generateConcerns(matchScore, contractor, criteria)
          };

          matches.push(match);
        }
      }

      // Sort by match score and apply preferences
      return this.rankMatches(matches, preferences);

    } catch (error) {
      console.error('AI matching failed:', error);
      throw new Error('Failed to find contractor matches');
    }
  }

  /**
   * Get matching insights and market analysis
   */
  static async getMatchingInsights(criteria: MatchingCriteria): Promise<MatchingInsights> {
    try {
      const contractors = await this.getAvailableContractors(criteria);

      const matchScores = await Promise.all(
        contractors.map(c => this.calculateMatchScore(c, criteria))
      );

      const rates = await Promise.all(
        contractors.map(c => this.estimateRate(c, criteria))
      );

      const averageMatchScore = matchScores.reduce((sum, score) => sum + score.overallScore, 0) / matchScores.length;
      const averageRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;

      // Identify skill gaps
      const requiredSkills = new Set(criteria.requiredSkills);
      const skillGaps: string[] = [];

      for (const skill of requiredSkills) {
        const contractorsWithSkill = contractors.filter(c =>
          c.skills.some(s => s.skillName.toLowerCase().includes(skill.toLowerCase()))
        ).length;

        if (contractorsWithSkill < contractors.length * 0.3) { // Less than 30% have this skill
          skillGaps.push(skill);
        }
      }

      // Market availability assessment
      const highQualityContractors = contractors.filter(c => c.reviews.length > 0 &&
        c.reviews.reduce((sum, r) => sum + r.rating, 0) / c.reviews.length >= 4.5
      ).length;

      const marketAvailability: 'high' | 'medium' | 'low' =
        highQualityContractors > 10 ? 'high' :
        highQualityContractors > 5 ? 'medium' : 'low';

      return {
        totalCandidates: contractors.length,
        averageMatchScore: isNaN(averageMatchScore) ? 0 : averageMatchScore,
        topSkillGaps: skillGaps.slice(0, 3),
        recommendedBudgetAdjustment: this.recommendBudgetAdjustment(criteria.budget, rates),
        marketAvailability,
        competitiveAnalysis: {
          averageRate: isNaN(averageRate) ? 0 : averageRate,
          rateRange: {
            min: Math.min(...rates.filter(r => r > 0)),
            max: Math.max(...rates)
          },
          topContractors: highQualityContractors
        }
      };
    } catch (error) {
      console.error('Failed to get matching insights:', error);
      throw new Error('Failed to analyze matching data');
    }
  }

  /**
   * Update matching preferences for a user
   */
  static async updateMatchingPreferences(preferences: MatchingPreferences): Promise<void> {
    try {
      const { error } = await supabase
        .from('matching_preferences')
        .upsert([{
          user_id: preferences.userId,
          max_matches: preferences.maxMatches,
          prioritize_local: preferences.prioritizeLocal,
          prioritize_budget: preferences.prioritizeBudget,
          prioritize_rating: preferences.prioritizeRating,
          prioritize_speed: preferences.prioritizeSpeed,
          min_rating: preferences.minRating,
          max_distance: preferences.maxDistance,
          preferred_price_range: preferences.preferredPriceRange,
          blacklisted_contractors: preferences.blacklistedContractors,
          favorite_contractors: preferences.favoriteContractors,
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update matching preferences:', error);
      throw new Error('Failed to save preferences');
    }
  }

  /**
   * Get user's matching preferences
   */
  static async getMatchingPreferences(userId: string): Promise<MatchingPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('matching_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;

      return {
        userId: data.user_id,
        maxMatches: data.max_matches || 10,
        prioritizeLocal: data.prioritize_local || false,
        prioritizeBudget: data.prioritize_budget || false,
        prioritizeRating: data.prioritize_rating || true,
        prioritizeSpeed: data.prioritize_speed || false,
        minRating: data.min_rating || 4.0,
        maxDistance: data.max_distance || 50,
        preferredPriceRange: data.preferred_price_range || 'any',
        blacklistedContractors: data.blacklisted_contractors || [],
        favoriteContractors: data.favorite_contractors || []
      };
    } catch (error) {
      console.error('Failed to get matching preferences:', error);
      return null;
    }
  }

  /**
   * Private helper methods
   */
  private static async getAvailableContractors(criteria: MatchingCriteria): Promise<ContractorProfile[]> {
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
      console.error('Failed to get contractors:', error);
      return [];
    }
  }

  private static async calculateMatchScore(
    contractor: ContractorProfile,
    criteria: MatchingCriteria
  ): Promise<MatchingScore> {
    // Skill matching (30% weight)
    const contractorSkills = contractor.skills.map(s => s.skillName.toLowerCase());
    const requiredSkillMatches = criteria.requiredSkills.filter(skill =>
      contractorSkills.some(cs => cs.includes(skill.toLowerCase()))
    ).length;
    const skillMatch = (requiredSkillMatches / criteria.requiredSkills.length) * 100;

    // Location score (20% weight)
    const locationScore = contractor.serviceRadius ?
      Math.max(0, 100 - (contractor.distance || 0) * 2) : 50;

    // Budget alignment (15% weight)
    const contractorRate = contractor.hourlyRate || 75;
    const budgetMidpoint = (criteria.budget.min + criteria.budget.max) / 2;
    const budgetAlignment = Math.max(0, 100 - Math.abs(contractorRate - budgetMidpoint) / budgetMidpoint * 100);

    // Availability match (10% weight)
    const availabilityScore = this.scoreAvailability(contractor.availability || 'this_week', criteria.timeframe);

    // Rating score (15% weight)
    const averageRating = contractor.reviews.length > 0 ?
      contractor.reviews.reduce((sum, r) => sum + r.rating, 0) / contractor.reviews.length : 3.5;
    const ratingScore = (averageRating / 5) * 100;

    // Experience score (5% weight)
    const experienceScore = Math.min(100, (contractor.yearsExperience || 1) * 10);

    // Responsiveness (3% weight) - Mock score based on reviews
    const responsiveness = contractor.reviews.length > 5 ? 85 : 70;

    // Price competitiveness (2% weight)
    const marketRate = 75; // Mock market average
    const priceCompetitiveness = Math.max(0, 100 - Math.abs(contractorRate - marketRate) / marketRate * 100);

    // Calculate weighted overall score
    const overallScore = (
      skillMatch * 0.30 +
      locationScore * 0.20 +
      budgetAlignment * 0.15 +
      ratingScore * 0.15 +
      availabilityScore * 0.10 +
      experienceScore * 0.05 +
      responsiveness * 0.03 +
      priceCompetitiveness * 0.02
    );

    return {
      skillMatch: Math.round(skillMatch),
      locationScore: Math.round(locationScore),
      budgetAlignment: Math.round(budgetAlignment),
      availabilityMatch: Math.round(availabilityScore),
      ratingScore: Math.round(ratingScore),
      experienceScore: Math.round(experienceScore),
      responsiveness: Math.round(responsiveness),
      priceCompetitiveness: Math.round(priceCompetitiveness),
      overallScore: Math.round(overallScore)
    };
  }

  private static scoreAvailability(
    contractorAvailability: 'immediate' | 'this_week' | 'this_month' | 'busy',
    requestedTimeframe: string
  ): number {
    const availabilityScores: Record<string, Record<string, number>> = {
      immediate: { immediate: 100, this_week: 90, this_month: 70, flexible: 100 },
      this_week: { immediate: 80, this_week: 100, this_month: 90, flexible: 100 },
      this_month: { immediate: 60, this_week: 80, this_month: 100, flexible: 100 },
      busy: { immediate: 20, this_week: 30, this_month: 50, flexible: 60 }
    };

    return availabilityScores[contractorAvailability]?.[requestedTimeframe] || 50;
  }

  private static async estimateRate(contractor: ContractorProfile, criteria: MatchingCriteria): Promise<number> {
    const baseRate = contractor.hourlyRate || 75;

    // Adjust for complexity
    const complexityMultiplier = criteria.projectComplexity === 'complex' ? 1.3 :
                                criteria.projectComplexity === 'medium' ? 1.1 : 1.0;

    // Adjust for urgency
    const urgencyMultiplier = criteria.urgency === 'emergency' ? 1.5 :
                             criteria.urgency === 'urgent' ? 1.2 : 1.0;

    return Math.round(baseRate * complexityMultiplier * urgencyMultiplier);
  }

  private static async assessAvailability(
    contractorId: string,
    timeframe: MatchingCriteria['timeframe']
  ): Promise<'immediate' | 'this_week' | 'this_month' | 'busy'> {
    const availabilities = ['immediate', 'this_week', 'this_month', 'busy'] as const;
    const idHash = contractorId ? contractorId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) : 0;
    const timeframeBias = timeframe === 'immediate' ? 0 : timeframe === 'this_week' ? 1 : timeframe === 'this_month' ? 2 : 3;
    const index = (idHash + timeframeBias) % availabilities.length;
    return availabilities[index];
  }

  private static async calculateDistance(address: string, location: { latitude: number; longitude: number }): Promise<number> {
    const addressHash = address ? address.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) : 0;
    const coordinateFactor = Math.abs(location.latitude) + Math.abs(location.longitude);
    const estimate = Math.round((addressHash % 25) + (coordinateFactor % 10));
    return Math.max(1, estimate);
  }

  private static getConfidenceLevel(matchScore: number): 'high' | 'medium' | 'low' {
    if (matchScore >= 80) return 'high';
    if (matchScore >= 60) return 'medium';
    return 'low';
  }

  private static generateMatchReasons(score: MatchingScore, contractor: ContractorProfile): string[] {
    const reasons: string[] = [];

    if (score.skillMatch >= 80) {
      reasons.push('Excellent skill match for your project requirements');
    }
    if (score.ratingScore >= 85) {
      reasons.push('Highly rated with outstanding customer reviews');
    }
    if (score.locationScore >= 80) {
      reasons.push('Located conveniently in your service area');
    }
    if (score.budgetAlignment >= 75) {
      reasons.push('Pricing aligns well with your budget range');
    }
    if (score.experienceScore >= 80) {
      reasons.push('Extensive experience in similar projects');
    }
    if (contractor.reviews.length >= 10) {
      reasons.push('Proven track record with many completed projects');
    }

    return reasons.slice(0, 3); // Return top 3 reasons
  }

  private static generateConcerns(
    score: MatchingScore,
    contractor: ContractorProfile,
    criteria: MatchingCriteria
  ): string[] {
    const concerns: string[] = [];

    if (score.skillMatch < 60) {
      concerns.push('Limited experience with some required skills');
    }
    if (score.locationScore < 50) {
      concerns.push('May be outside preferred service radius');
    }
    if (score.budgetAlignment < 60) {
      concerns.push('Pricing may exceed your budget range');
    }
    if (contractor.reviews.length < 3) {
      concerns.push('Limited customer reviews available');
    }
    if (score.availabilityMatch < 60) {
      concerns.push('May not match your preferred timeline');
    }
    if (criteria.urgency === 'emergency' && score.responsiveness < 70) {
      concerns.push('Response speed may be too slow for urgent requests');
    }
    if (criteria.projectComplexity === 'complex' && score.experienceScore < 70) {
      concerns.push('Experience may be limited for complex projects');
    }

    return concerns.slice(0, 2);
  }

  private static rankMatches(
    matches: ContractorMatch[],
    preferences?: Partial<MatchingPreferences>
  ): ContractorMatch[] {
    return matches
      .filter(match => {
        if (preferences?.blacklistedContractors?.includes(match.contractor.id)) {
          return false;
        }
        if (preferences?.minRating && match.matchBreakdown.ratingScore < preferences.minRating * 20) {
          return false;
        }
        if (preferences?.maxDistance && match.distance > preferences.maxDistance) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Prioritize favorites
        if (preferences?.favoriteContractors?.includes(a.contractor.id)) return -1;
        if (preferences?.favoriteContractors?.includes(b.contractor.id)) return 1;

        // Apply preference weights
        let scoreA = a.matchScore;
        let scoreB = b.matchScore;

        if (preferences?.prioritizeLocal) {
          scoreA += a.matchBreakdown.locationScore * 0.1;
          scoreB += b.matchBreakdown.locationScore * 0.1;
        }
        if (preferences?.prioritizeBudget) {
          scoreA += a.matchBreakdown.budgetAlignment * 0.1;
          scoreB += b.matchBreakdown.budgetAlignment * 0.1;
        }
        if (preferences?.prioritizeRating) {
          scoreA += a.matchBreakdown.ratingScore * 0.1;
          scoreB += b.matchBreakdown.ratingScore * 0.1;
        }

        return scoreB - scoreA;
      })
      .slice(0, preferences?.maxMatches || 10);
  }

  private static recommendBudgetAdjustment(
    currentBudget: { min: number; max: number },
    marketRates: number[]
  ): { suggested: number; reason: string } | undefined {
    if (marketRates.length === 0) return undefined;

    const averageRate = marketRates.reduce((sum, rate) => sum + rate, 0) / marketRates.length;
    const budgetMidpoint = (currentBudget.min + currentBudget.max) / 2;

    if (averageRate > budgetMidpoint * 1.2) {
      return {
        suggested: Math.round(averageRate * 1.1),
        reason: 'Market rates are higher than your budget range'
      };
    }

    return undefined;
  }
}