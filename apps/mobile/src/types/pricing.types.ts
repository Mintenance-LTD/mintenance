/**
 * Pricing System Type Definitions
 * Central types for pricing calculations, complexity analysis, and ML predictions
 */

import type { PricingFactor } from './search';

/**
 * Complexity Analysis Result
 * Output from complexity analysis algorithms
 */
export interface ComplexityResult {
  overallComplexity: number;
  riskLevel: number;
  factors?: PricingFactor[];
}

/**
 * Machine Learning Prediction Result
 * Output from ML-based price prediction models
 */
export interface MLPrediction {
  suggestedPrice: {
    min: number;
    max: number;
    optimal: number;
  };
  confidence: number;
  complexity?: 'simple' | 'moderate' | 'complex' | 'specialist';
  factors?: PricingFactor[];
}
