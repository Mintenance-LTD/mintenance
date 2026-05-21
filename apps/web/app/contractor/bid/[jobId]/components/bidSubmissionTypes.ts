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
    lineItems?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
      // Property Rooms Slice 2 — persisted on bids.line_items so
      // existing bids re-hydrate with their unit + room link.
      unit?: 'item' | 'sqm';
      room_id?: string | null;
    }>;
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
  // Property Rooms Slice 2 (2026-05-21): optional per-m² billing.
  // When unit === 'sqm' the row is quoted per square metre — quantity
  // is interpreted as m² and the qty label changes in the UI.
  // Defaults to 'item' (back-compat with all existing bids).
  unit?: 'item' | 'sqm';
  // Optional link to one of the job's room-scope rows. When set, the
  // homeowner sees on the bid which room each line item targets.
  room_id?: string | null;
}

/**
 * Property Rooms Slice 2 — read-only room scope passed into the
 * bid composer so contractors can link each line item to a specific
 * room. Comes from /api/jobs/[id]/rooms.
 */
export interface BidJobRoomScope {
  id: string;
  property_room_id: string | null;
  name: string;
  room_type: string;
  size_sqm_at_post: number | null;
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
