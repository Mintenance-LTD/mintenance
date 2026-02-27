import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import type { MaterialSwapSuggestion, ProcessOptimization, EcoJobRecommendation, SustainabilityMetrics, SustainableMaterialRow } from './types';

export class MaterialAdvisor {
  async getSustainableMaterialAlternatives(originalMaterials: string[]): Promise<MaterialSwapSuggestion[]> {
    try {
      const suggestions: MaterialSwapSuggestion[] = [];
      for (const material of originalMaterials) {
        const alternatives = await this.findSustainableAlternatives(material);
        suggestions.push(...alternatives);
      }
      return suggestions.sort((a, b) => b.carbon_reduction - a.carbon_reduction);
    } catch (error) {
      logger.error('Failed to get sustainable alternatives', error);
      return [];
    }
  }

  async generateEcoRecommendations(params: { jobDetails: { title: string; description: string; category: string }; currentImpact: SustainabilityMetrics; location: string }): Promise<EcoJobRecommendation> {
    const materialSwaps = await this.generateMaterialSwaps(params.jobDetails.category);
    const processOptimizations = this.generateProcessOptimizations(params.currentImpact);
    const potentialReduction = materialSwaps.reduce((sum, swap) => sum + swap.carbon_reduction, 0) + processOptimizations.reduce((sum, opt) => sum + opt.carbon_reduction, 0);
    return {
      job_id: '',
      sustainability_improvements: { material_swaps: materialSwaps, process_optimizations: processOptimizations, energy_efficiency_tips: this.getEnergyEfficiencyTips(params.jobDetails.category), waste_reduction_strategies: this.getWasteReductionStrategies(params.jobDetails.category) },
      potential_carbon_reduction: potentialReduction,
      estimated_cost_impact: this.calculateCostImpact(materialSwaps),
      difficulty_level: 'moderate', roi_timeframe: '12-18 months',
    };
  }

  async generateMaterialSwaps(category: string): Promise<MaterialSwapSuggestion[]> {
    const swapDatabase: Record<string, MaterialSwapSuggestion[]> = {
      painting: [
        { original_material: 'Standard Paint', sustainable_alternative: 'Low-VOC Paint', benefits: ['Better indoor air quality', 'Reduced chemical emissions'], carbon_reduction: 2.5, cost_difference: 15, availability: 'readily_available' },
        { original_material: 'Plastic-based Primer', sustainable_alternative: 'Water-based Primer', benefits: ['Biodegradable', 'Non-toxic'], carbon_reduction: 1.8, cost_difference: 8, availability: 'readily_available' },
      ],
      carpentry: [{ original_material: 'MDF Boards', sustainable_alternative: 'FSC-certified Plywood', benefits: ['Sustainably sourced', 'Better durability'], carbon_reduction: 8.5, cost_difference: 25, availability: 'order_required' }],
      plumbing: [{ original_material: 'PVC Pipes', sustainable_alternative: 'PEX Pipes', benefits: ['Longer lifespan', 'Better insulation'], carbon_reduction: 3.2, cost_difference: 12, availability: 'readily_available' }],
    };
    return swapDatabase[category] || [];
  }

  generateProcessOptimizations(currentImpact: SustainabilityMetrics): ProcessOptimization[] {
    const optimizations: ProcessOptimization[] = [];
    if (currentImpact.transportation_emissions_kg > 5) {
      optimizations.push({ area: 'transportation', description: 'Route optimization and electric vehicle usage', implementation_steps: ['Plan efficient routes to minimize travel', 'Consider electric or hybrid vehicles', 'Combine multiple jobs in same area'], carbon_reduction: currentImpact.transportation_emissions_kg * 0.3, cost_savings: 50, difficulty: 'easy' });
    }
    if (currentImpact.waste_generated_kg > 10) {
      optimizations.push({ area: 'waste_management', description: 'Implement comprehensive waste sorting and recycling', implementation_steps: ['Sort materials on-site', 'Partner with local recycling facilities', 'Reuse materials where possible'], carbon_reduction: currentImpact.waste_generated_kg * 0.5, cost_savings: 30, difficulty: 'moderate' });
    }
    return optimizations;
  }

  getEnergyEfficiencyTips(category: string): string[] {
    const tipDatabase: Record<string, string[]> = {
      electrical: ['Use LED bulbs instead of incandescent', 'Install smart thermostats for better energy management', 'Consider solar-powered options where applicable'],
      plumbing: ['Install low-flow fixtures to reduce water usage', 'Insulate pipes to reduce energy loss', 'Use tankless water heaters for better efficiency'],
      heating: ['Upgrade to high-efficiency boilers', 'Improve home insulation', 'Install programmable thermostats'],
    };
    return tipDatabase[category] || ['Use energy-efficient tools and equipment', 'Work during daylight hours when possible', 'Turn off equipment when not in use'];
  }

  getWasteReductionStrategies(_category: string): string[] {
    return ['Measure twice, cut once to reduce material waste', 'Donate or sell leftover materials', 'Use digital receipts and documentation', 'Choose packaging-minimal products', 'Implement a job-site recycling program'];
  }

  calculateCostImpact(materialSwaps: MaterialSwapSuggestion[]): number {
    return materialSwaps.reduce((total, swap) => total + swap.cost_difference, 0);
  }

  async findSustainableAlternatives(material: string): Promise<MaterialSwapSuggestion[]> {
    const { data, error } = await supabase.from('sustainable_materials').select('*').contains('alternative_to', [material]);
    if (error) return [];
    return (data || []).map((item: SustainableMaterialRow) => ({ original_material: material, sustainable_alternative: item.name, benefits: item.certification_labels, carbon_reduction: item.carbon_intensity, cost_difference: item.cost_premium_percentage, availability: item.local_availability ? 'readily_available' : 'order_required' }));
  }

  async getMaterialCarbonData(material: string): Promise<{ carbon_intensity: number }> {
    const { data, error } = await supabase.from('sustainable_materials').select('carbon_intensity').eq('name', material).single();
    if (error) return { carbon_intensity: 5 };
    return data;
  }
}
