import { logger } from '../../utils/logger';
import { MLEngine } from '../ml-engine';
import type { JobPricingInput, JobComplexityMetrics } from './types';

export class ComplexityAnalysisService {
  /**
   * Analyze job complexity using ML and fallback methods
   */
  async analyzeJobComplexity(input: JobPricingInput): Promise<JobComplexityMetrics> {
    try {
      // Use real ML service for advanced job complexity analysis
      const mlAnalysis = await MLEngine.analyzeJob(
        input.description,
        input.category,
        input.photos
      );

      // Convert ML analysis to our expected format
      return {
        textComplexity: mlAnalysis.overallComplexity,
        skillRequirements: mlAnalysis.skillRequirements,
        timeEstimate: mlAnalysis.timeEstimate,
        materialComplexity: this.assessMaterialComplexity(input.description),
        riskLevel:
          mlAnalysis.riskLevel === 'critical'
            ? 0.9
            : mlAnalysis.riskLevel === 'high'
              ? 0.7
              : mlAnalysis.riskLevel === 'medium'
                ? 0.4
                : 0.2,
      };
    } catch (error) {
      logger.warn('ML complexity analysis failed, using fallback', error);

      // Fallback to rule-based analysis
      const textComplexity = this.analyzeTextComplexity(input.description);
      const skillRequirements = this.extractSkillRequirements(
        input.title,
        input.description,
        input.category
      );
      const timeEstimate = this.estimateTimeRequirement(input);
      const materialComplexity = this.assessMaterialComplexity(
        input.description
      );
      const riskLevel = this.assessRiskLevel(input);

      return {
        textComplexity,
        skillRequirements,
        timeEstimate,
        materialComplexity,
        riskLevel,
      };
    }
  }

  /**
   * Analyze text complexity based on keywords and structure
   */
  private analyzeTextComplexity(description: string): number {
    const complexityKeywords = [
      'complex', 'difficult', 'specialist', 'custom', 'bespoke', 'rewire',
      'structural', 'emergency', 'urgent', 'multiple', 'complicated',
      'professional', 'certified', 'licensed'
    ];

    const simpleKeywords = [
      'simple', 'basic', 'easy', 'quick', 'minor', 'small', 'touch-up',
      'clean', 'tidy', 'straightforward'
    ];

    const words = description.toLowerCase().split(/\s+/);
    let complexity = 0.5; // Base complexity

    complexityKeywords.forEach((keyword) => {
      if (description.toLowerCase().includes(keyword)) {
        complexity += 0.1;
      }
    });

    simpleKeywords.forEach((keyword) => {
      if (description.toLowerCase().includes(keyword)) {
        complexity -= 0.1;
      }
    });

    // Adjust based on description length (longer = more complex)
    complexity += Math.min(words.length / 100, 0.3);

    return Math.max(0, Math.min(1, complexity));
  }

  /**
   * Extract skill requirements from job description
   */
  private extractSkillRequirements(
    title: string,
    description: string,
    category: string
  ): string[] {
    const text = `${title} ${description}`.toLowerCase();
    const skills: string[] = [];

    const skillMap = {
      plumbing: ['leak', 'pipe', 'drain', 'toilet', 'shower', 'tap', 'boiler'],
      electrical: ['wire', 'socket', 'light', 'switch', 'fuse', 'circuit', 'power'],
      carpentry: ['wood', 'door', 'window', 'cabinet', 'shelf', 'frame', 'timber'],
      painting: ['paint', 'wall', 'ceiling', 'brush', 'roller', 'colour', 'decoration'],
      roofing: ['roof', 'tile', 'gutter', 'chimney', 'slate', 'leak', 'repair'],
      heating: ['heating', 'radiator', 'thermostat', 'boiler', 'gas', 'temperature'],
      flooring: ['floor', 'carpet', 'laminate', 'tile', 'vinyl', 'hardwood'],
      gardening: ['garden', 'lawn', 'tree', 'hedge', 'plant', 'grass', 'landscape'],
    };

    Object.entries(skillMap).forEach(([skill, keywords]) => {
      if (
        keywords.some((keyword) => text.includes(keyword)) ||
        category === skill
      ) {
        skills.push(skill);
      }
    });

    return skills.length > 0 ? skills : [category];
  }

  /**
   * Estimate time requirement for the job
   */
  private estimateTimeRequirement(input: JobPricingInput): number {
    if (input.estimatedDuration) {
      return input.estimatedDuration;
    }

    // Base time estimates by category (hours)
    const baseTimeMap: Record<string, number> = {
      cleaning: 2,
      painting: 8,
      plumbing: 4,
      electrical: 3,
      carpentry: 6,
      gardening: 4,
      handyman: 3,
      roofing: 12,
      heating: 6,
      flooring: 10,
    };

    let baseTime = baseTimeMap[input.category] || 4;

    // Adjust based on description keywords
    const timeModifiers = {
      emergency: 0.5,
      quick: 0.7,
      major: 2.0,
      complete: 1.8,
      full: 1.5,
      multiple: 1.4,
      entire: 1.6,
    };

    Object.entries(timeModifiers).forEach(([keyword, modifier]) => {
      if (input.description.toLowerCase().includes(keyword)) {
        baseTime *= modifier;
      }
    });

    return Math.max(1, Math.min(40, baseTime)); // 1-40 hour range
  }

  /**
   * Assess material complexity from description
   */
  private assessMaterialComplexity(description: string): number {
    const materialKeywords = [
      'materials', 'supplies', 'parts', 'components', 'specialist',
      'custom', 'bespoke', 'premium', 'quality', 'branded'
    ];

    const simpleMaterialKeywords = [
      'basic', 'standard', 'simple', 'common', 'readily available'
    ];

    let complexity = 0.5;

    materialKeywords.forEach((keyword) => {
      if (description.toLowerCase().includes(keyword)) {
        complexity += 0.1;
      }
    });

    simpleMaterialKeywords.forEach((keyword) => {
      if (description.toLowerCase().includes(keyword)) {
        complexity -= 0.1;
      }
    });

    return Math.max(0, Math.min(1, complexity));
  }

  /**
   * Assess risk level based on job characteristics
   */
  private assessRiskLevel(input: JobPricingInput): number {
    const highRiskKeywords = [
      'electrical', 'gas', 'structural', 'height', 'asbestos', 'emergency',
      'urgent', 'dangerous', 'hazardous', 'certified', 'licensed'
    ];

    const lowRiskKeywords = [
      'cleaning', 'painting', 'simple', 'basic', 'low', 'safe'
    ];

    let riskLevel = 0.3; // Base risk

    highRiskKeywords.forEach((keyword) => {
      if (input.description.toLowerCase().includes(keyword) || 
          input.category.toLowerCase().includes(keyword)) {
        riskLevel += 0.2;
      }
    });

    lowRiskKeywords.forEach((keyword) => {
      if (input.description.toLowerCase().includes(keyword) || 
          input.category.toLowerCase().includes(keyword)) {
        riskLevel -= 0.1;
      }
    });

    // Adjust based on urgency
    if (input.urgency === 'high') riskLevel += 0.2;
    if (input.urgency === 'low') riskLevel -= 0.1;

    return Math.max(0.1, Math.min(1, riskLevel));
  }
}
