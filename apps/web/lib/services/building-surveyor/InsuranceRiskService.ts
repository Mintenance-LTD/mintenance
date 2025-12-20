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
    riskFactors: Array<{ factor?: string; severity?: string; impact?: string }>,
    riskScore?: number,
    premiumImpact?: string | PremiumImpact
  ): InsuranceRiskResult {
    const processedFactors: RiskFactor[] = riskFactors.map((factor) => {
      const severity = factor.severity as 'low' | 'medium' | 'high';
      return {
        factor: factor.factor || 'unknown_risk',
        severity: (severity === 'low' || severity === 'medium' || severity === 'high') ? severity : 'medium',
        impact: factor.impact || 'May affect insurance coverage',
      };
    });

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
  private static normalizePremiumImpact(impact: string | PremiumImpact | undefined | null): PremiumImpact {
    const valid: PremiumImpact[] = ['none', 'low', 'medium', 'high'];
    if (impact && typeof impact === 'string' && valid.includes(impact as PremiumImpact)) {
      return impact as PremiumImpact;
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

