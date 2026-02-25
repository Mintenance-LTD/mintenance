export interface BidSubmissionClient2025Props {
  job: {
    id: string;
    title: string;
    description?: string;
    budget?: string;
    location?: string;
    category?: string;
    createdAt?: string;
    photos?: string[];
    homeowner?: {
      first_name?: string;
      last_name?: string;
      email?: string;
      profile_image_url?: string;
    };
  };
  existingBid?: {
    amount: number;
    description: string;
    lineItems?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    taxRate?: number;
    terms?: string;
    estimatedDuration?: number;
    proposedStartDate?: string;
  };
}

export interface LineItem {
  id: string;
  description: string;
  type: 'labor' | 'material' | 'equipment';
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PricingSuggestion {
  priceRange: {
    min: number;
    recommended: number;
    max: number;
  };
  marketData: {
    averageBid: number;
    medianBid: number;
    rangeMin: number;
    rangeMax: number;
  };
  winProbability: number;
  competitivenessLevel: 'too_low' | 'competitive' | 'premium' | 'too_high';
  competitivenessScore: number;
  confidenceScore: number;
  reasoning: string;
  factors?: {
    complexityFactor?: number;
    locationFactor?: number;
    contractorTierFactor?: number;
    marketDemandFactor?: number;
    sampleSize?: number;
  };
  costBreakdown?: {
    materials: number;
    labor: number;
    overhead: number;
    profit: number;
    total: number;
  };
}
