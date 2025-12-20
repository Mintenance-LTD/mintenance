/**
 * Assessment Accuracy Metrics Service
 * 
 * Tracks and analyzes assessment accuracy over time
 * Measures improvements from learned features and Titans
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { Phase1BuildingAssessment } from './types';

export interface AccuracyMetrics {
  period: {
    start: Date;
    end: Date;
  };
  totalAssessments: number;
  validatedAssessments: number;
  overallAccuracy: number;
  componentAccuracy: {
    damageType: number;
    severity: number;
    urgency: number;
    confidence: number;
    cost: number;
  };
  accuracyByPropertyType: {
    residential: number;
    commercial: number;
  };
  accuracyTrend: {
    date: Date;
    accuracy: number;
  }[];
  improvementRate: number; // Accuracy improvement per week
}

export interface AccuracyComparison {
  baseline: AccuracyMetrics;
  withLearnedFeatures: AccuracyMetrics;
  withTitans: AccuracyMetrics;
  withBoth: AccuracyMetrics;
  improvements: {
    learnedFeatures: number;
    titans: number;
    both: number;
  };
}

/**
 * Assessment Accuracy Metrics Service
 */
export class AssessmentAccuracyMetrics {
  private static readonly ASSESSMENTS_TABLE = 'building_assessments';
  private static readonly VALIDATIONS_TABLE = 'assessment_validations'; // Assumed to exist

  /**
   * Calculate accuracy metrics for a period
   */
  static async calculateMetrics(
    startDate?: Date,
    endDate?: Date,
    agentName?: string
  ): Promise<AccuracyMetrics> {
    try {
      const period = {
        start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: endDate || new Date(),
      };

      // Get validated assessments
      const validatedAssessments = await this.getValidatedAssessments(period, agentName);
      
      if (validatedAssessments.length === 0) {
        return this.emptyMetrics(period);
      }

      // Calculate component accuracies
      const componentAccuracy = this.calculateComponentAccuracy(validatedAssessments);
      
      // Calculate overall accuracy
      const overallAccuracy = (
        componentAccuracy.damageType * 0.3 +
        componentAccuracy.severity * 0.25 +
        componentAccuracy.urgency * 0.15 +
        componentAccuracy.confidence * 0.1 +
        componentAccuracy.cost * 0.2
      );

      // Calculate accuracy by property type
      const accuracyByPropertyType = this.calculateAccuracyByPropertyType(validatedAssessments);

      // Calculate accuracy trend (weekly)
      const accuracyTrend = this.calculateAccuracyTrend(validatedAssessments, period);

      // Calculate improvement rate
      const improvementRate = this.calculateImprovementRate(accuracyTrend);

      // Get total assessments (validated and unvalidated)
      const totalAssessments = await this.getTotalAssessments(period, agentName);

      return {
        period,
        totalAssessments,
        validatedAssessments: validatedAssessments.length,
        overallAccuracy,
        componentAccuracy,
        accuracyByPropertyType,
        accuracyTrend,
        improvementRate,
      };
    } catch (error) {
      logger.error('Failed to calculate accuracy metrics', error, {
        service: 'AssessmentAccuracyMetrics',
      });
      throw error;
    }
  }

  /**
   * Compare accuracy across different configurations
   */
  static async compareConfigurations(
    period: { start: Date; end: Date }
  ): Promise<AccuracyComparison> {
    try {
      // Get metrics for each configuration
      const baseline = await this.calculateMetrics(
        period.start,
        period.end,
        'building-surveyor-baseline' // Would need baseline agent
      );

      const withLearnedFeatures = await this.calculateMetrics(
        period.start,
        period.end,
        'building-surveyor-learned' // Would need learned-only agent
      );

      const withTitans = await this.calculateMetrics(
        period.start,
        period.end,
        'building-surveyor-titans' // Would need Titans-only agent
      );

      const withBoth = await this.calculateMetrics(
        period.start,
        period.end,
        'building-surveyor' // Current agent with both
      );

      // Calculate improvements
      const improvements = {
        learnedFeatures: withLearnedFeatures.overallAccuracy - baseline.overallAccuracy,
        titans: withTitans.overallAccuracy - baseline.overallAccuracy,
        both: withBoth.overallAccuracy - baseline.overallAccuracy,
      };

      return {
        baseline,
        withLearnedFeatures,
        withTitans,
        withBoth,
        improvements,
      };
    } catch (error) {
      logger.error('Failed to compare configurations', error, {
        service: 'AssessmentAccuracyMetrics',
      });
      throw error;
    }
  }

  /**
   * Get validated assessments with original and validated data
   */
  private static async getValidatedAssessments(
    period: { start: Date; end: Date },
    agentName?: string
  ): Promise<Array<{
    original: Phase1BuildingAssessment;
    validated: Phase1BuildingAssessment;
    propertyType?: string;
    validatedAt: Date;
  }>> {
    // This would query the validations table
    // For now, return empty array as placeholder
    // In production, would join building_assessments with assessment_validations
    
    const { data, error } = await serverSupabase
      .from(this.ASSESSMENTS_TABLE)
      .select(`
        id,
        assessment_data,
        created_at,
        user_id
      `)
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString())
      .not('assessment_data', 'is', null);

    if (error || !data) {
      logger.warn('Failed to fetch assessments for accuracy calculation', {
        service: 'AssessmentAccuracyMetrics',
        error: error?.message,
      });
      return [];
    }

    // In production, would also fetch validated assessments
    // For now, return empty (would need validation table structure)
    return [];
  }

  /**
   * Calculate component-level accuracy
   */
  private static calculateComponentAccuracy(
    validatedAssessments: Array<{
      original: Phase1BuildingAssessment;
      validated: Phase1BuildingAssessment;
    }>
  ): AccuracyMetrics['componentAccuracy'] {
    if (validatedAssessments.length === 0) {
      return {
        damageType: 0,
        severity: 0,
        urgency: 0,
        confidence: 0,
        cost: 0,
      };
    }

    let damageTypeCorrect = 0;
    let severityCorrect = 0;
    let urgencyCorrect = 0;
    let confidenceErrorSum = 0;
    let costErrorSum = 0;

    for (const { original, validated } of validatedAssessments) {
      // Damage type
      if (original.damageAssessment.damageType === validated.damageAssessment.damageType) {
        damageTypeCorrect++;
      }

      // Severity
      if (original.damageAssessment.severity === validated.damageAssessment.severity) {
        severityCorrect++;
      }

      // Urgency
      if (original.urgency.urgency === validated.urgency.urgency) {
        urgencyCorrect++;
      }

      // Confidence error
      const confidenceError = Math.abs(
        original.damageAssessment.confidence - validated.damageAssessment.confidence
      ) / 100;
      confidenceErrorSum += confidenceError;

      // Cost error
      if (original.contractorAdvice?.estimatedCost?.recommended &&
          validated.contractorAdvice?.estimatedCost?.recommended) {
        const costError = Math.abs(
          (validated.contractorAdvice.estimatedCost.recommended -
           original.contractorAdvice.estimatedCost.recommended) /
          original.contractorAdvice.estimatedCost.recommended
        );
        costErrorSum += costError;
      }
    }

    const total = validatedAssessments.length;

    return {
      damageType: damageTypeCorrect / total,
      severity: severityCorrect / total,
      urgency: urgencyCorrect / total,
      confidence: 1 - (confidenceErrorSum / total), // Convert error to accuracy
      cost: 1 - Math.min(1, costErrorSum / total), // Convert error to accuracy
    };
  }

  /**
   * Calculate accuracy by property type
   */
  private static calculateAccuracyByPropertyType(
    validatedAssessments: Array<{
      original: Phase1BuildingAssessment;
      validated: Phase1BuildingAssessment;
      propertyType?: string;
    }>
  ): AccuracyMetrics['accuracyByPropertyType'] {
    const residential = validatedAssessments.filter(a => 
      a.propertyType === 'residential' || 
      a.original.evidence?.visionAnalysis?.propertyType === 'residential'
    );
    const commercial = validatedAssessments.filter(a => 
      a.propertyType === 'commercial' || 
      a.original.evidence?.visionAnalysis?.propertyType === 'commercial'
    );

    return {
      residential: residential.length > 0 
        ? this.calculateComponentAccuracy(residential).damageType 
        : 0,
      commercial: commercial.length > 0 
        ? this.calculateComponentAccuracy(commercial).damageType 
        : 0,
    };
  }

  /**
   * Calculate accuracy trend over time
   */
  private static calculateAccuracyTrend(
    validatedAssessments: Array<{
      original: Phase1BuildingAssessment;
      validated: Phase1BuildingAssessment;
      validatedAt: Date;
    }>,
    period: { start: Date; end: Date }
  ): AccuracyMetrics['accuracyTrend'] {
    // Group by week
    const weeklyGroups = new Map<string, typeof validatedAssessments>();

    for (const assessment of validatedAssessments) {
      const weekKey = this.getWeekKey(assessment.validatedAt);
      const group = weeklyGroups.get(weekKey) || [];
      group.push(assessment);
      weeklyGroups.set(weekKey, group);
    }

    const trend: AccuracyMetrics['accuracyTrend'] = [];

    for (const [weekKey, assessments] of weeklyGroups.entries()) {
      const componentAccuracy = this.calculateComponentAccuracy(assessments);
      const accuracy = (
        componentAccuracy.damageType * 0.3 +
        componentAccuracy.severity * 0.25 +
        componentAccuracy.urgency * 0.15 +
        componentAccuracy.confidence * 0.1 +
        componentAccuracy.cost * 0.2
      );

      trend.push({
        date: this.parseWeekKey(weekKey),
        accuracy,
      });
    }

    return trend.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Calculate improvement rate (accuracy change per week)
   */
  private static calculateImprovementRate(
    trend: AccuracyMetrics['accuracyTrend']
  ): number {
    if (trend.length < 2) return 0;

    const first = trend[0].accuracy;
    const last = trend[trend.length - 1].accuracy;
    const weeks = trend.length;

    return (last - first) / weeks;
  }

  /**
   * Get total assessments count
   */
  private static async getTotalAssessments(
    period: { start: Date; end: Date },
    agentName?: string
  ): Promise<number> {
    let query = serverSupabase
      .from(this.ASSESSMENTS_TABLE)
      .select('id', { count: 'exact', head: true })
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString());

    const { count, error } = await query;

    if (error) {
      logger.warn('Failed to get total assessments count', {
        service: 'AssessmentAccuracyMetrics',
        error: error.message,
      });
      return 0;
    }

    return count || 0;
  }

  /**
   * Get week key for grouping (YYYY-WW format)
   */
  private static getWeekKey(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7); // Thursday of week
    const week1 = new Date(d.getFullYear(), 0, 4);
    return `${d.getFullYear()}-W${Math.ceil((((d.getTime() - week1.getTime()) / 86400000) + 1) / 7)}`;
  }

  /**
   * Parse week key to date
   */
  private static parseWeekKey(weekKey: string): Date {
    const [year, week] = weekKey.split('-W').map(Number);
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    return ISOweekStart;
  }

  /**
   * Return empty metrics structure
   */
  private static emptyMetrics(period: { start: Date; end: Date }): AccuracyMetrics {
    return {
      period,
      totalAssessments: 0,
      validatedAssessments: 0,
      overallAccuracy: 0,
      componentAccuracy: {
        damageType: 0,
        severity: 0,
        urgency: 0,
        confidence: 0,
        cost: 0,
      },
      accuracyByPropertyType: {
        residential: 0,
        commercial: 0,
      },
      accuracyTrend: [],
      improvementRate: 0,
    };
  }
}

