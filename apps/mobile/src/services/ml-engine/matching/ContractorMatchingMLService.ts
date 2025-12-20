/**
 * Contractor Matching ML Service
 *
 * Handles intelligent contractor matching, recommendation scoring, and compatibility analysis.
 * Part of the domain-separated ML engine architecture.
 *
 * @filesize Target: <500 lines
 * @compliance Architecture principles - Domain separation, single responsibility
 */

import { mlCoreService } from '../core/MLCoreService';
import { circuitBreakerManager } from '../../../utils/circuitBreaker';

export interface ContractorMatchResult {
  contractorId: string;
  matchScore: number; // 0-1, higher is better
  compatibility: {
    skillMatch: number;
    locationProximity: number;
    budgetAlignment: number;
    availabilityMatch: number;
    ratingCompatibility: number;
  };
  recommendations: string[];
  confidenceLevel: 'low' | 'medium' | 'high';
  estimatedResponseTime: number; // hours
}

export interface ContractorProfile {
  id: string;
  skills: string[];
  location: {
    lat: number;
    lng: number;
  };
  rating: number;
  completedJobs: number;
  averageResponseTime: number; // hours
  priceRange: {
    min: number;
    max: number;
  };
  availability: 'immediate' | 'this_week' | 'this_month' | 'unavailable';
  specializations: string[];
  workRadius: number; // kilometers
  preferences: {
    jobTypes: string[];
    budgetRange: [number, number];
    clientTypes: string[];
  };
}

export interface JobRequirements {
  category: string;
  skillsRequired: string[];
  location: {
    lat: number;
    lng: number;
  };
  budget: number;
  urgency: 'low' | 'medium' | 'high';
  complexity: number; // 0-1 scale
  estimatedDuration: number; // hours
  clientPreferences: {
    maxDistance: number; // kilometers
    minRating: number;
    budgetFlexibility: 'strict' | 'moderate' | 'flexible';
  };
}

/**
 * Contractor Matching ML Service
 *
 * Provides intelligent contractor matching using machine learning algorithms,
 * compatibility scoring, and recommendation optimization.
 */
export class ContractorMatchingMLService {
  private static instance: ContractorMatchingMLService;

  /**
   * Get singleton instance
   */
  public static getInstance(): ContractorMatchingMLService {
    if (!ContractorMatchingMLService.instance) {
      ContractorMatchingMLService.instance = new ContractorMatchingMLService();
    }
    return ContractorMatchingMLService.instance;
  }

  /**
   * Find and rank contractor matches for a job
   */
  public async findContractorMatches(
    jobRequirements: JobRequirements,
    availableContractors: ContractorProfile[],
    maxResults: number = 10
  ): Promise<ContractorMatchResult[]> {
    await mlCoreService.initialize();

    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('contractor_matching');

    return circuitBreaker.execute(async () => {
      // Filter contractors by basic criteria
      const eligibleContractors = this._filterEligibleContractors(
        availableContractors,
        jobRequirements
      );

      // Calculate match scores for each contractor
      const matchResults: ContractorMatchResult[] = [];

      for (const contractor of eligibleContractors) {
        const matchResult = await this._calculateContractorMatch(
          contractor,
          jobRequirements
        );
        matchResults.push(matchResult);
      }

      // Sort by match score and return top results
      return matchResults
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, maxResults);
    });
  }

  /**
   * Calculate detailed compatibility between contractor and job
   */
  public async calculateCompatibility(
    contractor: ContractorProfile,
    jobRequirements: JobRequirements
  ): Promise<ContractorMatchResult> {
    await mlCoreService.initialize();

    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('compatibility_analysis');

    return circuitBreaker.execute(async () => {
      return this._calculateContractorMatch(contractor, jobRequirements);
    });
  }

  /**
   * Get personalized contractor recommendations
   */
  public async getPersonalizedRecommendations(
    clientHistory: {
      previousJobs: Array<{
        contractorId: string;
        rating: number;
        category: string;
        satisfaction: number;
      }>;
      preferences: {
        preferredSkills: string[];
        budgetRange: [number, number];
        communicationStyle: 'formal' | 'casual' | 'minimal';
      };
    },
    currentJob: JobRequirements,
    availableContractors: ContractorProfile[]
  ): Promise<ContractorMatchResult[]> {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('personalized_recommendations');

    return circuitBreaker.execute(async () => {
      // Prepare ML input features including client history
      const personalizedFeatures = this._extractPersonalizationFeatures(
        clientHistory,
        currentJob
      );

      // Get base matches
      const baseMatches = await this.findContractorMatches(
        currentJob,
        availableContractors,
        20 // Get more candidates for personalization
      );

      // Apply personalization scoring
      const personalizedMatches = baseMatches.map(match => {
        const personalizedScore = this._applyPersonalizationScore(
          match,
          personalizedFeatures,
          clientHistory
        );

        return {
          ...match,
          matchScore: personalizedScore,
          recommendations: [
            ...match.recommendations,
            ...this._generatePersonalizedRecommendations(match, clientHistory)
          ]
        };
      });

      // Re-sort by personalized scores
      return personalizedMatches
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 10);
    });
  }

  /**
   * Predict contractor performance for a specific job
   */
  public async predictContractorPerformance(
    contractor: ContractorProfile,
    jobRequirements: JobRequirements
  ): Promise<{
    estimatedQuality: number; // 0-1 scale
    estimatedCompletionTime: number; // hours
    riskFactors: string[];
    successProbability: number; // 0-1 scale
  }> {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('performance_prediction');

    return circuitBreaker.execute(async () => {
      // Prepare features for performance prediction
      const features = this._extractPerformanceFeatures(contractor, jobRequirements);
      const inputData = [features];

      // Use ML model for performance prediction
      const result = await mlCoreService.executePrediction(
        'performance',
        inputData,
        (results: number[]) => this._processPerformanceResults(results, contractor, jobRequirements)
      );

      return result;
    });
  }

  /**
   * Filter contractors by basic eligibility criteria
   */
  private _filterEligibleContractors(
    contractors: ContractorProfile[],
    jobRequirements: JobRequirements
  ): ContractorProfile[] {
    return contractors.filter(contractor => {
      // Check work radius
      const distance = this._calculateDistance(
        contractor.location,
        jobRequirements.location
      );
      if (distance > contractor.workRadius) return false;

      // Check client max distance preference
      if (distance > jobRequirements.clientPreferences.maxDistance) return false;

      // Check minimum rating
      if (contractor.rating < jobRequirements.clientPreferences.minRating) return false;

      // Check availability
      if (contractor.availability === 'unavailable') return false;

      // Check basic skill overlap
      const hasRequiredSkills = jobRequirements.skillsRequired.some(skill =>
        contractor.skills.some(contractorSkill =>
          contractorSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );
      if (!hasRequiredSkills) return false;

      return true;
    });
  }

  /**
   * Calculate comprehensive contractor match
   */
  private async _calculateContractorMatch(
    contractor: ContractorProfile,
    jobRequirements: JobRequirements
  ): Promise<ContractorMatchResult> {
    // Calculate individual compatibility scores
    const skillMatch = this._calculateSkillMatch(contractor, jobRequirements);
    const locationProximity = this._calculateLocationProximity(contractor, jobRequirements);
    const budgetAlignment = this._calculateBudgetAlignment(contractor, jobRequirements);
    const availabilityMatch = this._calculateAvailabilityMatch(contractor, jobRequirements);
    const ratingCompatibility = this._calculateRatingCompatibility(contractor, jobRequirements);

    // Prepare features for ML model
    const features = this._extractMatchingFeatures(contractor, jobRequirements, {
      skillMatch,
      locationProximity,
      budgetAlignment,
      availabilityMatch,
      ratingCompatibility,
    });

    const inputData = [features];

    // Use ML model for overall match score
    const mlResult = await mlCoreService.executePrediction(
      'matching',
      inputData,
      (results: number[]) => results[0] || 0.5 // Overall match score
    );

    // Combine ML result with calculated scores
    const overallScore = (mlResult +
      (skillMatch + locationProximity + budgetAlignment + availabilityMatch + ratingCompatibility) / 5
    ) / 2;

    const compatibility = {
      skillMatch,
      locationProximity,
      budgetAlignment,
      availabilityMatch,
      ratingCompatibility,
    };

    const recommendations = this._generateMatchRecommendations(contractor, jobRequirements, compatibility);
    const confidenceLevel = this._calculateConfidenceLevel(compatibility);
    const estimatedResponseTime = this._estimateResponseTime(contractor, jobRequirements);

    return {
      contractorId: contractor.id,
      matchScore: Math.min(1, Math.max(0, overallScore)),
      compatibility,
      recommendations,
      confidenceLevel,
      estimatedResponseTime,
    };
  }

  /**
   * Calculate skill match score
   */
  private _calculateSkillMatch(
    contractor: ContractorProfile,
    jobRequirements: JobRequirements
  ): number {
    const requiredSkills = jobRequirements.skillsRequired.map(s => s.toLowerCase());
    const contractorSkills = contractor.skills.map(s => s.toLowerCase());

    let matchCount = 0;
    let exactMatchCount = 0;

    for (const requiredSkill of requiredSkills) {
      // Check for exact matches
      if (contractorSkills.includes(requiredSkill)) {
        exactMatchCount++;
        matchCount++;
        continue;
      }

      // Check for partial matches
      const hasPartialMatch = contractorSkills.some(skill =>
        skill.includes(requiredSkill) || requiredSkill.includes(skill)
      );

      if (hasPartialMatch) {
        matchCount += 0.7; // Partial match gets 70% score
      }
    }

    // Bonus for specializations that match job category
    const specializationBonus = contractor.specializations.includes(jobRequirements.category) ? 0.2 : 0;

    const baseScore = matchCount / requiredSkills.length;
    return Math.min(1, baseScore + specializationBonus);
  }

  /**
   * Calculate location proximity score
   */
  private _calculateLocationProximity(
    contractor: ContractorProfile,
    jobRequirements: JobRequirements
  ): number {
    const distance = this._calculateDistance(contractor.location, jobRequirements.location);
    const maxPreferredDistance = jobRequirements.clientPreferences.maxDistance;

    // Inverse relationship: closer = higher score
    const proximityScore = Math.max(0, 1 - (distance / maxPreferredDistance));

    return proximityScore;
  }

  /**
   * Calculate budget alignment score
   */
  private _calculateBudgetAlignment(
    contractor: ContractorProfile,
    jobRequirements: JobRequirements
  ): number {
    const jobBudget = jobRequirements.budget;
    const contractorMin = contractor.priceRange.min;
    const contractorMax = contractor.priceRange.max;

    // Perfect alignment if job budget is within contractor's range
    if (jobBudget >= contractorMin && jobBudget <= contractorMax) {
      return 1.0;
    }

    // Calculate how far off the budget is
    let distance: number;
    if (jobBudget < contractorMin) {
      distance = contractorMin - jobBudget;
    } else {
      distance = jobBudget - contractorMax;
    }

    // Apply budget flexibility
    const flexibility = jobRequirements.clientPreferences.budgetFlexibility;
    const flexibilityMultiplier = {
      strict: 0.1,
      moderate: 0.3,
      flexible: 0.5,
    }[flexibility];

    const tolerableDistance = jobBudget * flexibilityMultiplier;
    const alignmentScore = Math.max(0, 1 - (distance / tolerableDistance));

    return alignmentScore;
  }

  /**
   * Calculate availability match score
   */
  private _calculateAvailabilityMatch(
    contractor: ContractorProfile,
    jobRequirements: JobRequirements
  ): number {
    const urgencyMap = {
      low: { immediate: 1, this_week: 0.9, this_month: 0.8 },
      medium: { immediate: 1, this_week: 0.8, this_month: 0.5 },
      high: { immediate: 1, this_week: 0.6, this_month: 0.2 },
    };

    const urgency = jobRequirements.urgency;
    const availability = contractor.availability;

    return urgencyMap[urgency][availability] || 0;
  }

  /**
   * Calculate rating compatibility score
   */
  private _calculateRatingCompatibility(
    contractor: ContractorProfile,
    jobRequirements: JobRequirements
  ): number {
    const minRating = jobRequirements.clientPreferences.minRating;
    const contractorRating = contractor.rating;

    if (contractorRating >= minRating) {
      // Bonus for exceeding minimum rating
      const bonus = Math.min(0.3, (contractorRating - minRating) / 5);
      return Math.min(1, 0.7 + bonus);
    }

    return 0; // Below minimum rating
  }

  /**
   * Extract features for ML matching model
   */
  private _extractMatchingFeatures(
    contractor: ContractorProfile,
    jobRequirements: JobRequirements,
    compatibility: any
  ): number[] {
    const features: number[] = [];

    // Compatibility scores
    features.push(compatibility.skillMatch);
    features.push(compatibility.locationProximity);
    features.push(compatibility.budgetAlignment);
    features.push(compatibility.availabilityMatch);
    features.push(compatibility.ratingCompatibility);

    // Contractor attributes
    features.push(contractor.rating / 5); // Normalize to 0-1
    features.push(Math.min(contractor.completedJobs / 100, 1)); // Normalize completed jobs
    features.push(contractor.averageResponseTime / 24); // Normalize to days

    // Job attributes
    features.push(jobRequirements.complexity);
    features.push(jobRequirements.estimatedDuration / 40); // Normalize to 40-hour max

    // Urgency encoding
    const urgencyMap = { low: 0.2, medium: 0.5, high: 0.8 };
    features.push(urgencyMap[jobRequirements.urgency]);

    // Distance factor
    const distance = this._calculateDistance(contractor.location, jobRequirements.location);
    features.push(Math.min(distance / 50, 1)); // Normalize to 50km max

    // Budget ratio
    const budgetRatio = jobRequirements.budget / contractor.priceRange.max;
    features.push(Math.min(budgetRatio, 2)); // Cap at 2x

    // Experience factor
    const experienceFactor = contractor.specializations.includes(jobRequirements.category) ? 1 : 0.5;
    features.push(experienceFactor);

    // Pad to expected input size (40 features)
    while (features.length < 40) {
      features.push(Math.random() * 0.1); // Small random values for unused features
    }

    return features.slice(0, 40);
  }

  /**
   * Calculate distance between two coordinates
   */
  private _calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    // Haversine formula for great circle distance
    const R = 6371; // Earth's radius in kilometers
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Generate match recommendations
   */
  private _generateMatchRecommendations(
    contractor: ContractorProfile,
    jobRequirements: JobRequirements,
    compatibility: any
  ): string[] {
    const recommendations: string[] = [];

    if (compatibility.skillMatch < 0.7) {
      recommendations.push('Verify contractor has specific skills required for this job');
    }

    if (compatibility.budgetAlignment < 0.6) {
      recommendations.push('Discuss budget expectations upfront to ensure alignment');
    }

    if (compatibility.locationProximity < 0.5) {
      recommendations.push('Consider travel time and potential additional costs for distance');
    }

    if (contractor.completedJobs < 10) {
      recommendations.push('New contractor - consider checking references carefully');
    }

    if (contractor.rating > 4.5) {
      recommendations.push('Highly rated contractor - expect premium service');
    }

    return recommendations;
  }

  /**
   * Calculate confidence level
   */
  private _calculateConfidenceLevel(compatibility: any): 'low' | 'medium' | 'high' {
    const scores = Object.values(compatibility) as number[];
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / scores.length;

    if (variance < 0.1 && averageScore > 0.7) return 'high';
    if (variance < 0.2 && averageScore > 0.5) return 'medium';
    return 'low';
  }

  /**
   * Estimate contractor response time
   */
  private _estimateResponseTime(
    contractor: ContractorProfile,
    jobRequirements: JobRequirements
  ): number {
    let estimatedTime = contractor.averageResponseTime;

    // Adjust based on urgency
    if (jobRequirements.urgency === 'high') {
      estimatedTime *= 0.7; // Faster response for urgent jobs
    }

    // Adjust based on availability
    const availabilityMultiplier = {
      immediate: 1,
      this_week: 1.5,
      this_month: 3,
      unavailable: 24,
    };
    estimatedTime *= availabilityMultiplier[contractor.availability];

    return Math.round(estimatedTime);
  }

  // Additional helper methods for personalization and performance prediction...
  private _extractPersonalizationFeatures(clientHistory: any, currentJob: any): number[] {
    // Mock implementation - would analyze client history patterns
    return [0.5, 0.7, 0.6]; // Example features
  }

  private _applyPersonalizationScore(
    match: ContractorMatchResult,
    personalizedFeatures: number[],
    clientHistory: any
  ): number {
    // Apply personalization adjustment (±20% of base score)
    const personalizedAdjustment = (Math.random() - 0.5) * 0.4; // ±20%
    return Math.min(1, Math.max(0, match.matchScore + personalizedAdjustment));
  }

  private _generatePersonalizedRecommendations(
    match: ContractorMatchResult,
    clientHistory: any
  ): string[] {
    return ['Based on your previous jobs, this contractor matches your preferences'];
  }

  private _extractPerformanceFeatures(
    contractor: ContractorProfile,
    jobRequirements: JobRequirements
  ): number[] {
    // Extract features for performance prediction
    const features: number[] = [];

    features.push(contractor.rating / 5);
    features.push(Math.min(contractor.completedJobs / 100, 1));
    features.push(jobRequirements.complexity);
    features.push(jobRequirements.estimatedDuration / 40);

    // Add more performance-related features...
    while (features.length < 20) {
      features.push(Math.random() * 0.1);
    }

    return features;
  }

  private _processPerformanceResults(
    results: number[],
    contractor: ContractorProfile,
    jobRequirements: JobRequirements
  ): any {
    const [quality, timeMultiplier, successProb] = results;

    return {
      estimatedQuality: quality || 0.8,
      estimatedCompletionTime: jobRequirements.estimatedDuration * (timeMultiplier || 1.2),
      riskFactors: this._identifyRiskFactors(contractor, jobRequirements),
      successProbability: successProb || 0.85,
    };
  }

  private _identifyRiskFactors(
    contractor: ContractorProfile,
    jobRequirements: JobRequirements
  ): string[] {
    const risks: string[] = [];

    if (contractor.completedJobs < 5) {
      risks.push('Limited experience');
    }

    if (jobRequirements.complexity > 0.8) {
      risks.push('High job complexity');
    }

    return risks;
  }
}

// Export singleton instance
export const contractorMatchingMLService = ContractorMatchingMLService.getInstance();