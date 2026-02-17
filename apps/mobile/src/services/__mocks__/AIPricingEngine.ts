// Mock for AIPricingEngine
export const aiPricingEngine = {
  analyzePricing: jest.fn(() =>
    Promise.resolve({
      suggestedPrice: { min: 100, max: 300, optimal: 200 },
      confidence: 0.7,
      factors: [],
      marketData: { averagePrice: 200, demandLevel: 'medium', competitorCount: 8 },
      recommendations: [],
      complexity: 'moderate',
    })
  ),
};

export class AIPricingEngine {
  analyzePricing = aiPricingEngine.analyzePricing;
}

export default AIPricingEngine;
