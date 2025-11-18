/**
 * Insurance Risk Service
 * 
 * Handles insurance risk assessment and premium impact calculation
 * for building damage assessments.
 */

import type { PremiumImpact } from './types';

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
}

export interface InsuranceRiskResult {
  riskFactors: RiskFactor[];
  riskScore: number;
  premiumImpact: PremiumImpact;
  mitigationSuggestions: string[];
}

export class InsuranceRiskService {
  /**
   * Process insurance risk from AI response
   */
  static processInsuranceRisk(
    riskFactors: any[],
    riskScore?: number,
    premiumImpact?: any
  ): InsuranceRiskResult {
    const processedFactors = riskFactors.map((factor) => ({
      factor: factor.factor || 'unknown_risk',
      severity: factor.severity || 'medium',
      impact: factor.impact || 'May affect insurance coverage',
    }));

    const normalizedRiskScore = riskScore
      ? Math.max(0, Math.min(100, riskScore))
      : this.calculateRiskScore(processedFactors);

    const normalizedPremiumImpact = this.normalizePremiumImpact(premiumImpact);

    return {
      riskFactors: processedFactors,
      riskScore: normalizedRiskScore,
      premiumImpact: normalizedPremiumImpact,
      mitigationSuggestions:
        processedFactors.length > 0
          ? [
              'Address damage promptly',
              'Document all repairs',
              'Consider professional inspection',
            ]
          : [],
    };
  }

  /**
   * Calculate risk score from factors (0-100)
   * Higher score = higher risk
   */
  static calculateRiskScore(factors: RiskFactor[]): number {
    if (factors.length === 0) {
      return 0; // No factors = no risk
    }

    let score = 0;
    for (const factor of factors) {
      switch (factor.severity) {
        case 'high':
          score += 30;
          break;
        case 'medium':
          score += 15;
          break;
        case 'low':
          score += 5;
          break;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Normalize premium impact
   */
  private static normalizePremiumImpact(impact: any): PremiumImpact {
    const valid: PremiumImpact[] = ['none', 'low', 'medium', 'high'];
    if (valid.includes(impact)) {
      return impact;
    }
    const i = String(impact).toLowerCase();
    if (i.includes('high') || i.includes('significant')) {
      return 'high';
    }
    if (i.includes('medium') || i.includes('moderate')) {
      return 'medium';
    }
    if (i.includes('low') || i.includes('minor')) {
      return 'low';
    }
    return 'none';
  }
}

