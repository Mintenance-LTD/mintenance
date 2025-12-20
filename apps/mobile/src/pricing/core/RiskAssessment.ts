/**
 * RISK ASSESSMENT MODULE
 * Specialized component for analyzing job risk factors and safety considerations
 *
 * Extracted from AIPricingEngine.ts for better modularity
 * Handles safety evaluation, insurance requirements, and risk-based pricing adjustments
 */

import { logger } from '../../utils/logger';

export interface JobRiskInput {
  title: string;
  description: string;
  category: string;
  location: string;
  urgency?: 'low' | 'medium' | 'high';
  propertyType?: 'flat' | 'house' | 'commercial';
  estimatedDuration?: number;
  photos?: string[];
}

export interface RiskAnalysisResult {
  riskLevel: number; // 0-1 scale
  riskCategory: 'low' | 'medium' | 'high' | 'extreme';
  factors: RiskFactor[];
  safetyRecommendations: string[];
  insuranceRequirements: string[];
  pricingImpact: number; // Multiplier for pricing
}

export interface RiskFactor {
  type: 'safety' | 'technical' | 'environmental' | 'regulatory';
  name: string;
  severity: number; // 0-1
  description: string;
  mitigation?: string;
}

export class RiskAssessment {
  private riskKeywords: Map<string, number> = new Map([
    // Electrical risks
    ['electrical', 0.15],
    ['wiring', 0.12],
    ['fuse', 0.1],
    ['circuit', 0.1],
    ['voltage', 0.15],
    ['shock', 0.2],

    // Gas risks
    ['gas', 0.2],
    ['boiler', 0.15],
    ['heating', 0.1],
    ['carbon monoxide', 0.25],
    ['leak', 0.18],

    // Structural risks
    ['structural', 0.18],
    ['foundation', 0.2],
    ['load bearing', 0.22],
    ['demolition', 0.25],
    ['excavation', 0.2],

    // Height/Access risks
    ['roof', 0.18],
    ['height', 0.15],
    ['ladder', 0.12],
    ['scaffolding', 0.16],
    ['aerial', 0.14],

    // Emergency/Damage risks
    ['emergency', 0.15],
    ['urgent', 0.12],
    ['damage', 0.1],
    ['flood', 0.18],
    ['fire damage', 0.2],

    // Safety concerns
    ['asbestos', 0.3],
    ['hazardous', 0.25],
    ['dangerous', 0.2],
    ['safety', 0.1],
    ['toxic', 0.25],
  ]);

  private categoryRiskLevels: Map<string, number> = new Map([
    // High-risk categories
    ['electrical', 0.25],
    ['gas', 0.3],
    ['roofing', 0.22],
    ['structural', 0.28],
    ['demolition', 0.35],
    ['asbestos', 0.4],

    // Medium-risk categories
    ['plumbing', 0.15],
    ['heating', 0.18],
    ['carpentry', 0.12],
    ['tiling', 0.1],

    // Lower-risk categories
    ['painting', 0.08],
    ['cleaning', 0.05],
    ['gardening', 0.06],
    ['handyman', 0.1],
  ]);

  private propertyTypeMultipliers: Map<string, number> = new Map([
    ['commercial', 1.3], // Higher risk due to regulations
    ['house', 1.0], // Standard risk
    ['flat', 0.9], // Slightly lower risk
  ]);

  /**
   * Perform comprehensive risk assessment for a job
   */
  public async assessJobRisk(input: JobRiskInput): Promise<RiskAnalysisResult> {
    try {
      logger.info('Performing risk assessment', {
        category: input.category,
        urgency: input.urgency,
        propertyType: input.propertyType,
      });

      const factors = await this.identifyRiskFactors(input);
      const riskLevel = this.calculateOverallRisk(factors, input);
      const riskCategory = this.categorizeRisk(riskLevel);
      const safetyRecommendations = this.generateSafetyRecommendations(
        factors,
        input
      );
      const insuranceRequirements = this.determineInsuranceRequirements(
        factors,
        riskLevel
      );
      const pricingImpact = this.calculatePricingImpact(riskLevel, factors);

      const result: RiskAnalysisResult = {
        riskLevel,
        riskCategory,
        factors,
        safetyRecommendations,
        insuranceRequirements,
        pricingImpact,
      };

      logger.debug('Risk assessment completed', {
        riskLevel,
        riskCategory,
        factorCount: factors.length,
        pricingImpact,
      });

      return result;
    } catch (error) {
      logger.error('Risk assessment failed', error);

      // Return safe defaults with higher risk assumption
      return {
        riskLevel: 0.5,
        riskCategory: 'medium',
        factors: [
          {
            type: 'technical',
            name: 'Assessment Error',
            severity: 0.5,
            description: 'Unable to complete full risk assessment',
          },
        ],
        safetyRecommendations: ['Proceed with standard safety precautions'],
        insuranceRequirements: ['Ensure adequate public liability insurance'],
        pricingImpact: 1.2, // 20% safety margin
      };
    }
  }

  /**
   * Identify specific risk factors from job description
   */
  private async identifyRiskFactors(
    input: JobRiskInput
  ): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];
    const text = `${input.title} ${input.description}`.toLowerCase();

    // Analyze text for risk keywords
    this.riskKeywords.forEach((severity, keyword) => {
      if (text.includes(keyword)) {
        factors.push({
          type: this.classifyRiskType(keyword),
          name: this.formatRiskName(keyword),
          severity,
          description: `Detected: ${keyword}`,
          mitigation: this.getMitigation(keyword),
        });
      }
    });

    // Category-based risks
    const categoryRisk = this.categoryRiskLevels.get(input.category);
    if (categoryRisk && categoryRisk > 0.15) {
      factors.push({
        type: 'technical',
        name: 'Category Risk',
        severity: categoryRisk,
        description: `${input.category} work carries inherent risks`,
        mitigation: 'Follow industry-specific safety protocols',
      });
    }

    // Urgency-based risks
    if (input.urgency === 'high') {
      factors.push({
        type: 'technical',
        name: 'Urgency Risk',
        severity: 0.15,
        description: 'Emergency work may involve rushed conditions',
        mitigation: 'Take extra care despite time pressure',
      });
    }

    // Property type risks
    if (input.propertyType === 'commercial') {
      factors.push({
        type: 'regulatory',
        name: 'Commercial Property',
        severity: 0.12,
        description: 'Commercial work requires additional compliance',
        mitigation: 'Ensure all commercial regulations are followed',
      });
    }

    // Duration-based risks
    if (input.estimatedDuration && input.estimatedDuration > 40) {
      factors.push({
        type: 'safety',
        name: 'Extended Duration',
        severity: 0.1,
        description: 'Long-duration work increases fatigue risk',
        mitigation: 'Plan for adequate breaks and safety checks',
      });
    }

    return factors;
  }

  /**
   * Calculate overall risk level from individual factors
   */
  private calculateOverallRisk(
    factors: RiskFactor[],
    input: JobRiskInput
  ): number {
    const baseRisk = 0.15; // Minimum base risk for any job

    // Sum weighted risk factors
    const factorRisk = factors.reduce((sum, factor) => {
      const weight = this.getRiskWeight(factor.type);
      return sum + factor.severity * weight;
    }, 0);

    // Property type multiplier
    const propertyMultiplier =
      this.propertyTypeMultipliers.get(input.propertyType || 'house') || 1.0;

    // Location-based adjustments
    let locationRisk = 0;
    if (input.location.toLowerCase().includes('london')) {
      locationRisk += 0.05; // Urban complexity
    }

    const totalRisk =
      (baseRisk + factorRisk) * propertyMultiplier + locationRisk;

    return Math.min(1.0, Math.max(0.1, totalRisk)); // Clamp between 0.1 and 1.0
  }

  /**
   * Categorize overall risk level
   */
  private categorizeRisk(
    riskLevel: number
  ): 'low' | 'medium' | 'high' | 'extreme' {
    if (riskLevel >= 0.8) return 'extreme';
    if (riskLevel >= 0.6) return 'high';
    if (riskLevel >= 0.35) return 'medium';
    return 'low';
  }

  /**
   * Generate safety recommendations based on risk factors
   */
  private generateSafetyRecommendations(
    factors: RiskFactor[],
    input: JobRiskInput
  ): string[] {
    const recommendations: string[] = [];

    // Base recommendations
    recommendations.push(
      'Ensure all work complies with current safety regulations'
    );
    recommendations.push('Use appropriate personal protective equipment (PPE)');

    // Factor-specific recommendations
    factors.forEach((factor) => {
      if (factor.mitigation) {
        recommendations.push(factor.mitigation);
      }

      // Additional specific recommendations
      if (factor.name.toLowerCase().includes('electrical')) {
        recommendations.push(
          'Turn off power at main breaker before starting electrical work'
        );
        recommendations.push(
          'Use a qualified electrician for complex electrical tasks'
        );
      }

      if (factor.name.toLowerCase().includes('gas')) {
        recommendations.push(
          'Only Gas Safe registered engineers should work on gas appliances'
        );
        recommendations.push('Install gas detection equipment during work');
      }

      if (
        factor.name.toLowerCase().includes('height') ||
        factor.name.toLowerCase().includes('roof')
      ) {
        recommendations.push('Use appropriate fall protection equipment');
        recommendations.push('Consider weather conditions for height work');
      }

      if (factor.name.toLowerCase().includes('structural')) {
        recommendations.push(
          'Obtain structural engineer approval before proceeding'
        );
        recommendations.push(
          'Check for load-bearing elements before alterations'
        );
      }
    });

    // High-risk job recommendations
    if (factors.some((f) => f.severity > 0.2)) {
      recommendations.push(
        'Consider hiring specialists for high-risk elements'
      );
      recommendations.push('Obtain additional safety equipment and training');
      recommendations.push('Notify relevant authorities if required');
    }

    return Array.from(new Set(recommendations)); // Remove duplicates
  }

  /**
   * Determine insurance requirements based on risk
   */
  private determineInsuranceRequirements(
    factors: RiskFactor[],
    riskLevel: number
  ): string[] {
    const requirements: string[] = [];

    // Base insurance
    requirements.push('Minimum £1M public liability insurance required');

    // Risk-based additional requirements
    if (riskLevel > 0.4) {
      requirements.push('Professional indemnity insurance recommended');
    }

    if (riskLevel > 0.6) {
      requirements.push(
        'Increased public liability coverage (£2M+) recommended'
      );
      requirements.push(
        'Employer liability insurance required if using subcontractors'
      );
    }

    if (riskLevel > 0.8) {
      requirements.push('Specialist high-risk work insurance required');
      requirements.push('Equipment insurance recommended');
    }

    // Factor-specific requirements
    factors.forEach((factor) => {
      if (factor.name.toLowerCase().includes('electrical')) {
        requirements.push('Electrical work insurance coverage');
      }

      if (factor.name.toLowerCase().includes('gas')) {
        requirements.push('Gas work liability coverage');
      }

      if (factor.name.toLowerCase().includes('structural')) {
        requirements.push('Structural alteration insurance');
      }
    });

    return Array.from(new Set(requirements)); // Remove duplicates
  }

  /**
   * Calculate pricing impact based on risk assessment
   */
  private calculatePricingImpact(
    riskLevel: number,
    factors: RiskFactor[]
  ): number {
    let multiplier = 1.0;

    // Base risk premium
    multiplier += riskLevel * 0.4; // Up to 40% premium for extreme risk

    // High-severity factor bonuses
    factors.forEach((factor) => {
      if (factor.severity > 0.25) {
        multiplier += 0.1; // 10% per high-severity factor
      }
    });

    // Regulatory factors
    const regulatoryFactors = factors.filter((f) => f.type === 'regulatory');
    if (regulatoryFactors.length > 0) {
      multiplier += regulatoryFactors.length * 0.05; // 5% per regulatory factor
    }

    return Math.min(2.0, Math.max(1.0, multiplier)); // Cap at 100% premium
  }

  /**
   * Classify risk type based on keyword
   */
  private classifyRiskType(
    keyword: string
  ): 'safety' | 'technical' | 'environmental' | 'regulatory' {
    const safetyKeywords = [
      'dangerous',
      'safety',
      'hazardous',
      'toxic',
      'shock',
    ];
    const environmentalKeywords = [
      'asbestos',
      'leak',
      'flood',
      'carbon monoxide',
    ];
    const regulatoryKeywords = ['gas', 'electrical', 'structural'];

    if (safetyKeywords.includes(keyword)) return 'safety';
    if (environmentalKeywords.includes(keyword)) return 'environmental';
    if (regulatoryKeywords.includes(keyword)) return 'regulatory';
    return 'technical';
  }

  /**
   * Format risk name for display
   */
  private formatRiskName(keyword: string): string {
    return `${keyword
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')} Risk`;
  }

  /**
   * Get mitigation advice for specific risks
   */
  private getMitigation(keyword: string): string {
    const mitigations: Record<string, string> = {
      electrical:
        'Use qualified electrician and proper lockout/tagout procedures',
      gas: 'Only use Gas Safe registered professionals',
      height: 'Use appropriate fall protection and safety harnesses',
      structural: 'Obtain structural engineer assessment before work',
      asbestos: 'Require asbestos survey and licensed removal if present',
      hazardous: 'Follow COSHH regulations for hazardous substances',
      emergency: 'Take extra care despite time pressure',
      roof: 'Check weather conditions and use proper safety equipment',
    };

    return mitigations[keyword] || 'Follow industry best practices';
  }

  /**
   * Get weight for different risk types
   */
  private getRiskWeight(
    type: 'safety' | 'technical' | 'environmental' | 'regulatory'
  ): number {
    const weights = {
      safety: 1.0, // Highest priority
      environmental: 0.9,
      regulatory: 0.8,
      technical: 0.7,
    };

    return weights[type];
  }

  /**
   * Quick risk check for basic assessments
   */
  public quickRiskCheck(
    category: string,
    description: string
  ): {
    level: 'low' | 'medium' | 'high';
    warnings: string[];
  } {
    const text = description.toLowerCase();
    let riskScore = 0.1;
    const warnings: string[] = [];

    // Check for high-risk keywords
    this.riskKeywords.forEach((severity, keyword) => {
      if (text.includes(keyword) && severity > 0.2) {
        riskScore += severity;
        warnings.push(`High-risk element detected: ${keyword}`);
      }
    });

    // Check category risk
    const categoryRisk = this.categoryRiskLevels.get(category) || 0.1;
    riskScore += categoryRisk;

    let level: 'low' | 'medium' | 'high' = 'low';
    if (riskScore > 0.6) level = 'high';
    else if (riskScore > 0.3) level = 'medium';

    return { level, warnings };
  }
}

// Export singleton instance
export const riskAssessment = new RiskAssessment();
