import { BuildingSurveyorService } from './BuildingSurveyorService';
import { logger } from '@mintenance/shared';
import type { Phase1BuildingAssessment, AssessmentContext } from './types';

/**
 * Synthetic Data Generation Service
 * 
 * Uses GPT-4 Vision to generate synthetic training data by:
 * - Creating variations of existing validated assessments
 * - Generating edge case scenarios
 * - Augmenting training dataset with diverse examples
 * 
 * This helps accelerate Phase 1 data collection and improves model robustness.
 */
export class SyntheticDataService {
  /**
   * Generate synthetic assessment variations from a base image
   * Creates multiple variations with different damage types/severities
   */
  static async generateVariations(
    baseImageUrl: string,
    baseAssessment: Phase1BuildingAssessment,
    count = 3
  ): Promise<Phase1BuildingAssessment[]> {
    try {
      const variations: Phase1BuildingAssessment[] = [];

      for (let i = 0; i < count; i++) {
        // Create variation prompt
        const variationPrompt = this.buildVariationPrompt(baseAssessment, i);

        // Generate variation using GPT-4
        const variation = await BuildingSurveyorService.assessDamage(
          [baseImageUrl],
          {
            propertyDetails: variationPrompt,
          }
        );

        variations.push(variation);

        // Rate limit protection
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      logger.info('Generated synthetic variations', {
        service: 'SyntheticDataService',
        baseImageUrl,
        count: variations.length,
      });

      return variations;
    } catch (error) {
      logger.error('Error generating synthetic variations', error, {
        service: 'SyntheticDataService',
      });
      throw error;
    }
  }

  /**
   * Generate edge case scenarios for training
   * Creates assessments for rare but important damage types
   */
  static async generateEdgeCases(
    imageUrl: string,
    edgeCaseType: 'structural_failure' | 'asbestos' | 'mold_toxicity' | 'lead_paint' | 'foundation_issue'
  ): Promise<Phase1BuildingAssessment> {
    try {
      const context: AssessmentContext = {
        propertyDetails: this.getEdgeCasePrompt(edgeCaseType),
      };

      const assessment = await BuildingSurveyorService.assessDamage([imageUrl], context);

      logger.info('Generated edge case assessment', {
        service: 'SyntheticDataService',
        edgeCaseType,
        imageUrl,
      });

      return assessment;
    } catch (error) {
      logger.error('Error generating edge case', error, {
        service: 'SyntheticDataService',
        edgeCaseType,
      });
      throw error;
    }
  }

  /**
   * Build variation prompt for GPT-4
   */
  private static buildVariationPrompt(
    baseAssessment: Phase1BuildingAssessment,
    variationIndex: number
  ): string {
    const variations = [
      `Consider this damage from a different angle - it may appear more severe than initially assessed.`,
      `Analyze this damage assuming the property is 50+ years old and may have underlying structural issues.`,
      `Evaluate this damage considering recent extreme weather conditions that may have accelerated deterioration.`,
      `Assess this damage as if it's in a commercial building with higher foot traffic and wear.`,
      `Review this damage assuming it's been present for several months without intervention.`,
    ];

    return variations[variationIndex % variations.length];
  }

  /**
   * Get edge case prompt for specific damage type
   */
  private static getEdgeCasePrompt(edgeCaseType: string): string {
    const prompts: Record<string, string> = {
      structural_failure:
        'This appears to be a structural failure. Look for signs of foundation issues, load-bearing wall damage, or structural integrity concerns. This is a critical safety issue.',
      asbestos:
        'This building may contain asbestos materials. Look for signs of asbestos-containing materials (ACM) that may be damaged or disturbed. This requires specialized handling.',
      mold_toxicity:
        'This area shows signs of water damage that may have led to toxic mold growth. Assess for black mold, Stachybotrys, or other toxic varieties. Consider health implications.',
      lead_paint:
        'This appears to be an older property that may contain lead-based paint. Look for chipping, peeling, or deteriorating paint that could pose lead exposure risks.',
      foundation_issue:
        'This property shows signs of foundation problems. Look for cracks, settling, water intrusion, or structural shifts that indicate foundation damage.',
    };

    return prompts[edgeCaseType] || 'Analyze this damage carefully, considering it may be an edge case requiring specialized assessment.';
  }

  /**
   * Generate synthetic training dataset
   * Creates a batch of synthetic assessments for training
   */
  static async generateTrainingBatch(
    baseImageUrls: string[],
    variationsPerImage = 2,
    includeEdgeCases = true
  ): Promise<Phase1BuildingAssessment[]> {
    try {
      const syntheticAssessments: Phase1BuildingAssessment[] = [];

      // Generate variations for each base image
      for (const imageUrl of baseImageUrls) {
        // Get base assessment
        const baseAssessment = await BuildingSurveyorService.assessDamage([imageUrl]);

        // Generate variations
        const variations = await this.generateVariations(
          imageUrl,
          baseAssessment,
          variationsPerImage
        );

        syntheticAssessments.push(...variations);

        // Rate limit protection
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Generate edge cases if requested
      if (includeEdgeCases && baseImageUrls.length > 0) {
        const edgeCaseTypes: Array<'structural_failure' | 'asbestos' | 'mold_toxicity' | 'lead_paint' | 'foundation_issue'> = [
          'structural_failure',
          'asbestos',
          'mold_toxicity',
        ];

        for (const edgeCaseType of edgeCaseTypes) {
          if (baseImageUrls[0]) {
            const edgeCase = await this.generateEdgeCases(baseImageUrls[0], edgeCaseType);
            syntheticAssessments.push(edgeCase);
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }

      logger.info('Generated synthetic training batch', {
        service: 'SyntheticDataService',
        baseImages: baseImageUrls.length,
        totalGenerated: syntheticAssessments.length,
      });

      return syntheticAssessments;
    } catch (error) {
      logger.error('Error generating training batch', error, {
        service: 'SyntheticDataService',
      });
      throw error;
    }
  }
}

