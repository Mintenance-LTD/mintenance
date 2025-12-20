/**
 * Advanced ML Service - Lightweight Implementation
 *
 * Provides basic ML functionality without complex dependencies
 */

import { Job, ContractorProfile } from '../types';
import { logger } from '../utils/logger';

interface PricingFactors {
  complexity: number;
  location: string;
  urgency: 'low' | 'medium' | 'high';
  category: string;
  seasonalMultiplier: number;
}

interface MLPricingResult {
  suggestedPrice: number;
  confidence: number;
  factors: PricingFactors;
  range: { min: number; max: number };
}

interface ContractorMatchScore {
  contractorId: string;
  score: number;
  factors: {
    skills: number;
    location: number;
    rating: number;
    availability: number;
  };
}

export class AdvancedMLService {
  private basePrices: Record<string, number> = {
    plumbing: 120,
    electrical: 150,
    gardening: 80,
    cleaning: 60,
    painting: 100,
    carpentry: 140,
    handyman: 90,
  };

  /**
   * Analyze job and provide ML-powered pricing suggestions
   */
  public async analyzePricing(job: Partial<Job>): Promise<MLPricingResult> {
    try {
      logger.info('Analyzing job pricing with ML', { jobId: job.id, category: job.category });

      const basePrice = this.getBasePrice(job.category || 'handyman');
      const complexity = this.calculateComplexity(job);
      const urgencyMultiplier = this.getUrgencyMultiplier(job.priority || 'medium');
      const locationMultiplier = this.getLocationMultiplier(job.location || '');

      const suggestedPrice = Math.round(basePrice * complexity * urgencyMultiplier * locationMultiplier);

      return {
        suggestedPrice,
        confidence: 0.85,
        factors: {
          complexity,
          location: job.location || '',
          urgency: job.priority || 'medium',
          category: job.category || 'handyman',
          seasonalMultiplier: 1.0,
        },
        range: {
          min: Math.round(suggestedPrice * 0.8),
          max: Math.round(suggestedPrice * 1.3),
        },
      };
    } catch (error) {
      logger.error('ML pricing analysis failed', error);

      // Return fallback pricing
      const basePrice = this.getBasePrice(job.category || 'handyman');
      return {
        suggestedPrice: basePrice,
        confidence: 0.5,
        factors: {
          complexity: 1.0,
          location: job.location || '',
          urgency: job.priority || 'medium',
          category: job.category || 'handyman',
          seasonalMultiplier: 1.0,
        },
        range: {
          min: Math.round(basePrice * 0.8),
          max: Math.round(basePrice * 1.2),
        },
      };
    }
  }

  /**
   * Find and rank contractors using ML scoring
   */
  public async matchContractors(
    job: Partial<Job>,
    contractors: ContractorProfile[]
  ): Promise<ContractorMatchScore[]> {
    try {
      logger.info('Matching contractors with ML', { jobId: job.id, contractorCount: contractors.length });

      const matches = contractors.map(contractor => {
        const skillScore = this.calculateSkillMatch(job, contractor);
        const locationScore = this.calculateLocationScore(job, contractor);
        const ratingScore = (contractor.rating || 4.0) / 5.0;
        const availabilityScore = contractor.isAvailable ? 1.0 : 0.5;

        const overallScore = (
          skillScore * 0.4 +
          locationScore * 0.3 +
          ratingScore * 0.2 +
          availabilityScore * 0.1
        );

        return {
          contractorId: contractor.id,
          score: Math.round(overallScore * 100) / 100,
          factors: {
            skills: skillScore,
            location: locationScore,
            rating: ratingScore,
            availability: availabilityScore,
          },
        };
      });

      // Sort by score descending
      return matches.sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('ML contractor matching failed', error);

      // Return simple fallback scoring
      return contractors.map(contractor => ({
        contractorId: contractor.id,
        score: 0.7,
        factors: {
          skills: 0.7,
          location: 0.7,
          rating: 0.7,
          availability: 0.7,
        },
      }));
    }
  }

  /**
   * Simple demand prediction
   */
  public async predictDemand(location: string, category: string): Promise<{
    demandLevel: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    confidence: number;
  }> {
    try {
      logger.info('Predicting demand with ML', { location, category });

      // Simulate ML prediction with basic logic
      const basedemand = this.getBaseDemand(category);
      const locationFactor = this.getLocationDemandFactor(location);
      const demandLevel = Math.min(1.0, basedemand * locationFactor);

      return {
        demandLevel,
        trend: demandLevel > 0.7 ? 'increasing' : demandLevel < 0.4 ? 'decreasing' : 'stable',
        confidence: 0.75,
      };
    } catch (error) {
      logger.error('ML demand prediction failed', error);
      return {
        demandLevel: 0.5,
        trend: 'stable',
        confidence: 0.5,
      };
    }
  }

  private getBasePrice(category: string): number {
    return this.basePrices[category.toLowerCase()] || this.basePrices.handyman;
  }

  private calculateComplexity(job: Partial<Job>): number {
    let complexity = 1.0;

    // Increase complexity based on description length (more details = more complex)
    if (job.description) {
      const wordCount = job.description.split(' ').length;
      complexity += Math.min(0.5, wordCount / 100);
    }

    // Increase complexity if budget is high (suggests complex job)
    if (job.budget && job.budget > 500) {
      complexity += 0.3;
    }

    return Math.min(2.0, complexity);
  }

  private getUrgencyMultiplier(urgency: 'low' | 'medium' | 'high'): number {
    const multipliers = { low: 1.0, medium: 1.2, high: 1.5 };
    return multipliers[urgency];
  }

  private getLocationMultiplier(location: string): number {
    const lowerLocation = location.toLowerCase();

    // Simple location-based pricing
    if (lowerLocation.includes('london') || lowerLocation.includes('central')) {
      return 1.4;
    }
    if (lowerLocation.includes('manchester') || lowerLocation.includes('birmingham')) {
      return 1.2;
    }
    return 1.0;
  }

  private calculateSkillMatch(job: Partial<Job>, contractor: ContractorProfile): number {
    if (!job.category || !contractor.skills) return 0.5;

    const jobCategory = job.category.toLowerCase();
    const contractorSkills = contractor.skills.map(s => s.skillName.toLowerCase());

    // Direct category match
    if (contractorSkills.includes(jobCategory)) {
      return 1.0;
    }

    // Partial matches
    if (contractorSkills.some(skill => skill.includes(jobCategory) || jobCategory.includes(skill))) {
      return 0.8;
    }

    return 0.3;
  }

  private calculateLocationScore(job: Partial<Job>, contractor: ContractorProfile): number {
    // For now, assume all contractors can work anywhere with decreasing preference by distance
    // In a real implementation, this would use actual geographical distance
    return 0.8;
  }

  private getBaseDemand(category: string): number {
    const demands: Record<string, number> = {
      plumbing: 0.8,
      electrical: 0.7,
      gardening: 0.9,
      cleaning: 0.85,
      painting: 0.6,
      carpentry: 0.65,
      handyman: 0.75,
    };
    return demands[category.toLowerCase()] || 0.6;
  }

  private getLocationDemandFactor(location: string): number {
    const lowerLocation = location.toLowerCase();

    if (lowerLocation.includes('london')) return 1.3;
    if (lowerLocation.includes('manchester') || lowerLocation.includes('birmingham')) return 1.1;
    if (lowerLocation.includes('rural') || lowerLocation.includes('countryside')) return 0.7;

    return 1.0;
  }
}

// Export singleton instance
export const advancedMLService = new AdvancedMLService();
export default advancedMLService;