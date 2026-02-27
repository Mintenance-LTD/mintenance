import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import type { SustainabilityMetrics, JobSustainabilityAnalysis, EcoJobRecommendation, ESGScoreRow } from './types';
import { MaterialAdvisor } from './MaterialAdvisor';

export class JobAnalyzer {
  private materialAdvisor = new MaterialAdvisor();

  async analyzeJobSustainability(jobTitle: string, jobDescription: string, location: string, category: string): Promise<JobSustainabilityAnalysis> {
    try {
      const predictedImpact = await this.predictJobEnvironmentalImpact({ title: jobTitle, description: jobDescription, category, location });
      const improvementSuggestions = await this.materialAdvisor.generateEcoRecommendations({ jobDetails: { title: jobTitle, description: jobDescription, category }, currentImpact: predictedImpact, location });
      const greenContractors = await this.findGreenContractorsForJob(category, location, 70);
      const sustainabilityScore = this.calculateJobSustainabilityScore(predictedImpact);
      return { job_id: '', predicted_impact: predictedImpact, improvement_suggestions: improvementSuggestions, green_contractor_recommendations: greenContractors, sustainability_score: sustainabilityScore, certification_eligible: sustainabilityScore >= 75 };
    } catch (error) {
      logger.error('Failed to analyze job sustainability', error);
      throw error;
    }
  }

  async predictJobEnvironmentalImpact(jobDetails: { title: string; description: string; category: string; location: string }): Promise<SustainabilityMetrics> {
    const baseImpacts: Record<string, Partial<SustainabilityMetrics>> = {
      plumbing: { carbon_footprint_kg: 15, water_usage_liters: 50, waste_generated_kg: 5, energy_usage_kwh: 8 },
      electrical: { carbon_footprint_kg: 12, water_usage_liters: 5, waste_generated_kg: 8, energy_usage_kwh: 15 },
      painting: { carbon_footprint_kg: 25, water_usage_liters: 20, waste_generated_kg: 12, energy_usage_kwh: 10 },
      carpentry: { carbon_footprint_kg: 35, water_usage_liters: 15, waste_generated_kg: 20, energy_usage_kwh: 12 },
      gardening: { carbon_footprint_kg: 8, water_usage_liters: 100, waste_generated_kg: 30, energy_usage_kwh: 5 },
    };
    const baseImpact = baseImpacts[jobDetails.category] || baseImpacts.plumbing;
    const complexityMultiplier = this.assessJobComplexity(jobDetails.description);
    return {
      id: '', entity_id: '', entity_type: 'job',
      carbon_footprint_kg: (baseImpact.carbon_footprint_kg || 15) * complexityMultiplier,
      water_usage_liters: (baseImpact.water_usage_liters || 20) * complexityMultiplier,
      waste_generated_kg: (baseImpact.waste_generated_kg || 8) * complexityMultiplier,
      energy_usage_kwh: (baseImpact.energy_usage_kwh || 10) * complexityMultiplier,
      renewable_energy_percentage: 25, local_sourcing_percentage: 60, recycled_materials_percentage: 30,
      transportation_emissions_kg: this.calculateTransportationEmissions(jobDetails.location),
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
  }

  assessJobComplexity(description: string): number {
    const desc = description.toLowerCase();
    if (['renovation', 'installation', 'replacement', 'rewiring', 'major'].some((k) => desc.includes(k))) return 1.5;
    if (['touch-up', 'minor', 'quick', 'simple', 'small'].some((k) => desc.includes(k))) return 0.7;
    return 1.0;
  }

  calculateTransportationEmissions(location: string): number {
    const avgDistanceKm = location.toLowerCase().includes('london') ? 15 : 25;
    return avgDistanceKm * 0.2;
  }

  calculateJobSustainabilityScore(impact: SustainabilityMetrics): number {
    const carbonScore = Math.max(0, 100 - (impact.carbon_footprint_kg / 50) * 100);
    const wasteScore = Math.max(0, 100 - (impact.waste_generated_kg / 30) * 100);
    return Math.round(carbonScore * 0.4 + wasteScore * 0.25 + impact.renewable_energy_percentage * 0.2 + impact.recycled_materials_percentage * 0.15);
  }

  async findGreenContractorsForJob(_category: string, _location: string, minESGScore: number): Promise<string[]> {
    const { data, error } = await supabase.from('contractor_esg_scores').select('contractor_id').gte('overall_esg_score', minESGScore).order('overall_esg_score', { ascending: false }).limit(10);
    if (error) return [];
    return (data || []).map((item: ESGScoreRow) => item.contractor_id);
  }
}
