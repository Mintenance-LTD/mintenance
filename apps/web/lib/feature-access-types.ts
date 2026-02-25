/**
 * Feature Access Type Definitions
 */

export type ContractorSubscriptionTier = 'free' | 'basic' | 'professional' | 'enterprise';
export type HomeownerSubscriptionTier = 'free' | 'landlord' | 'agency';
export type SubscriptionTier = ContractorSubscriptionTier | HomeownerSubscriptionTier;
export type UserRole = 'homeowner' | 'contractor' | 'admin';

export interface FeatureLimit {
  // Contractor tiers
  free?: number | boolean | 'unlimited';
  basic?: number | boolean | 'unlimited';
  professional?: number | boolean | 'unlimited';
  enterprise?: number | boolean | 'unlimited';
  // Homeowner tiers (backward-compatible: `homeowner: true` means all tiers)
  homeowner?: boolean;
  homeowner_free?: number | boolean | 'unlimited';
  homeowner_landlord?: number | boolean | 'unlimited';
  homeowner_agency?: number | boolean | 'unlimited';
}

export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  limits: FeatureLimit;
  upgradeMessage?: string;
  learnMoreUrl?: string;
}
