export interface JobPricingInput {
  title: string;
  description: string;
  category: string;
  location: string;
  photos?: string[];
  homeownerBudget?: number;
  urgency?: 'low' | 'medium' | 'high';
  propertyType?: 'flat' | 'house' | 'commercial';
  estimatedDuration?: number; // hours
}

export interface PricingAnalysis {
  suggestedPrice: {
    min: number;
    max: number;
    optimal: number;
  };
  confidence: number; // 0-1
  factors: PricingFactor[];
  marketData: MarketContext;
  recommendations: string[];
  complexity: 'simple' | 'moderate' | 'complex' | 'specialist';
}

export interface PricingFactor {
  name: string;
  impact: number; // -1 to 1 (negative = reduces price, positive = increases)
  description: string;
  weight: number; // 0-1
}

export interface MarketContext {
  averagePrice: number;
  priceRange: [number, number];
  demandLevel: 'low' | 'medium' | 'high';
  seasonalFactor: number;
  locationMultiplier: number;
  contractorAvailability: number; // 0-1
}

export interface JobComplexityMetrics {
  textComplexity: number;
  skillRequirements: string[];
  timeEstimate: number;
  materialComplexity: number;
  riskLevel: number;
}

export interface LocationCoordinates {
  lat: number;
  lng: number;
  postcode: string;
}
