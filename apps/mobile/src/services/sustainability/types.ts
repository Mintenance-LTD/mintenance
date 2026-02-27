import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';

export interface SustainabilityMetrics {
  id: string;
  entity_id: string;
  entity_type: 'contractor' | 'job' | 'material';
  carbon_footprint_kg: number;
  water_usage_liters: number;
  waste_generated_kg: number;
  energy_usage_kwh: number;
  renewable_energy_percentage: number;
  local_sourcing_percentage: number;
  recycled_materials_percentage: number;
  transportation_emissions_kg: number;
  created_at: string;
  updated_at: string;
}

export interface ESGScore {
  overall_score: number;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  certification_level: 'bronze' | 'silver' | 'gold' | 'platinum';
  last_calculated: string;
}

export interface GreenCertification {
  id: string;
  contractor_id: string;
  certification_type: string;
  issuing_body: string;
  certification_date: string;
  expiry_date: string;
  verification_status: 'pending' | 'verified' | 'expired';
  score_boost: number;
}

export interface SustainableMaterial {
  id: string;
  name: string;
  category: string;
  carbon_intensity: number;
  recyclability_score: number;
  local_availability: boolean;
  certification_labels: string[];
  cost_premium_percentage: number;
  alternative_to: string[];
}

export interface EcoJobRecommendation {
  job_id: string;
  sustainability_improvements: {
    material_swaps: MaterialSwapSuggestion[];
    process_optimizations: ProcessOptimization[];
    energy_efficiency_tips: string[];
    waste_reduction_strategies: string[];
  };
  potential_carbon_reduction: number;
  estimated_cost_impact: number;
  difficulty_level: 'easy' | 'moderate' | 'complex';
  roi_timeframe: string;
}

export interface MaterialSwapSuggestion {
  original_material: string;
  sustainable_alternative: string;
  benefits: string[];
  carbon_reduction: number;
  cost_difference: number;
  availability: 'readily_available' | 'order_required' | 'special_order';
}

export interface ProcessOptimization {
  area: string;
  description: string;
  implementation_steps: string[];
  carbon_reduction: number;
  cost_savings: number;
  difficulty: 'easy' | 'moderate' | 'complex';
}

export interface ContractorESGProfile {
  contractor_id: string;
  esg_score: ESGScore;
  certifications: GreenCertification[];
  sustainability_metrics: SustainabilityMetrics;
  green_job_percentage: number;
  carbon_neutral_pledge: boolean;
  sustainability_initiatives: string[];
  community_impact_projects: number;
  client_education_sessions: number;
  equipment_efficiency_rating: number;
}

export interface JobSustainabilityAnalysis {
  job_id: string;
  predicted_impact: SustainabilityMetrics;
  improvement_suggestions: EcoJobRecommendation;
  green_contractor_recommendations: string[];
  sustainability_score: number;
  certification_eligible: boolean;
}

export interface JobHistoryMetrics {
  community_projects: number;
  employment_score: number;
  education_initiatives: number;
  local_employment_percentage: number;
  diversity_score: number;
}

export interface SustainabilityFeedback {
  transparency_score: number;
  ethics_score: number;
  engagement_score: number;
}

export interface SustainableMaterialRow {
  name: string;
  certification_labels: string[];
  carbon_intensity: number;
  cost_premium_percentage: number;
  local_availability: boolean;
}

export interface ESGScoreRow {
  contractor_id: string;
}
