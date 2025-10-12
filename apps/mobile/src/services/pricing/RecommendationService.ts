import type { JobPricingInput, PricingFactor } from './types';

export class RecommendationService {
  /**
   * Generate ML-enhanced recommendations
   */
  generateMLEnhancedRecommendations(
    input: JobPricingInput,
    pricing: any,
    factors: PricingFactor[],
    mlResult: any
  ): string[] {
    const recommendations: string[] = [];

    // Add ML recommendations from the result
    if (mlResult.recommendations && Array.isArray(mlResult.recommendations)) {
      recommendations.push(...mlResult.recommendations);
    }

    // Budget assessment recommendations
    if (mlResult.budgetAssessment) {
      if (mlResult.budgetAssessment.status === 'below_market') {
        recommendations.push(
          'Budget is below market rate - consider increasing budget or adjusting scope'
        );
      } else if (mlResult.budgetAssessment.status === 'above_market') {
        recommendations.push(
          'Budget is above market rate - good position for premium contractors'
        );
      }
    }

    // Market analysis recommendations
    const marketFactor = factors.find((f) => f.name.includes('Market'));
    if (marketFactor && marketFactor.impact > 0.1) {
      recommendations.push(
        'Market conditions favorable - consider higher end of price range'
      );
    }

    // Risk-based recommendations
    const riskFactor = factors.find((f) => f.name.includes('Risk'));
    if (riskFactor && riskFactor.impact > 0.3) {
      recommendations.push(
        'High-risk job identified - ensure adequate insurance coverage'
      );
    }

    // Skill-based recommendations
    const skillFactor = factors.find((f) => f.name.includes('Skill'));
    if (skillFactor && skillFactor.impact > 0.2) {
      recommendations.push(
        'Multiple skills required - consider specialist contractors'
      );
    }

    return recommendations;
  }

  /**
   * Generate basic recommendations for fallback scenarios
   */
  generateBasicRecommendations(input: JobPricingInput): string[] {
    const recommendations: string[] = [];

    // Category-specific recommendations
    if (input.category === 'electrical') {
      recommendations.push('Ensure contractor is certified for electrical work');
    }

    if (input.category === 'plumbing') {
      recommendations.push('Check if work requires building regulations approval');
    }

    if (input.category === 'heating') {
      recommendations.push('Verify contractor is Gas Safe registered');
    }

    // Urgency-based recommendations
    if (input.urgency === 'high') {
      recommendations.push('Emergency rates may apply - consider booking in advance next time');
    }

    if (input.urgency === 'low') {
      recommendations.push('Flexible timing may allow for better pricing');
    }

    // Budget-based recommendations
    if (input.homeownerBudget && input.homeownerBudget < 500) {
      recommendations.push('Consider breaking down large jobs into smaller phases');
    }

    if (input.homeownerBudget && input.homeownerBudget > 5000) {
      recommendations.push('Large project - consider detailed project management');
    }

    // General recommendations
    recommendations.push('Get multiple quotes to ensure competitive pricing');
    recommendations.push('Check contractor reviews and references');

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  /**
   * Generate seasonal recommendations
   */
  generateSeasonalRecommendations(): string[] {
    const month = new Date().getMonth();
    const recommendations: string[] = [];

    // Spring (March-May)
    if (month >= 2 && month <= 4) {
      recommendations.push('Spring is peak season - book early for best availability');
      recommendations.push('Outdoor work conditions are optimal');
    }

    // Summer (June-August)
    if (month >= 5 && month <= 7) {
      recommendations.push('Summer holidays may affect contractor availability');
      recommendations.push('Good weather for outdoor projects');
    }

    // Autumn (September-November)
    if (month >= 8 && month <= 10) {
      recommendations.push('Autumn is good for indoor projects');
      recommendations.push('Prepare for winter - heating and insulation work popular');
    }

    // Winter (December-February)
    if (month === 11 || month <= 1) {
      recommendations.push('Winter may have reduced demand - potential for better rates');
      recommendations.push('Indoor projects recommended due to weather');
    }

    return recommendations;
  }

  /**
   * Generate location-specific recommendations
   */
  generateLocationRecommendations(location: string): string[] {
    const recommendations: string[] = [];
    const normalizedLocation = location.toLowerCase();

    if (normalizedLocation.includes('london')) {
      recommendations.push('London premium applies - consider outer boroughs for better rates');
      recommendations.push('Congestion charges may affect travel costs');
    }

    if (normalizedLocation.includes('manchester') || normalizedLocation.includes('birmingham')) {
      recommendations.push('Major city location - good contractor availability');
    }

    if (normalizedLocation.includes('rural') || normalizedLocation.includes('countryside')) {
      recommendations.push('Rural location - travel costs may be higher');
      recommendations.push('Limited contractor choice - book well in advance');
    }

    return recommendations;
  }
}
