import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import type { SustainabilityMetrics } from './types';
import { MaterialAdvisor } from './MaterialAdvisor';

export class CarbonTracker {
  private materialAdvisor = new MaterialAdvisor();

  async calculateJobCarbonFootprint(jobDetails: { materials: string[]; transportation_distance: number; energy_usage_hours: number; waste_generated: number }): Promise<number> {
    try {
      let totalCarbonKg = 0;
      for (const material of jobDetails.materials) {
        const materialData = await this.materialAdvisor.getMaterialCarbonData(material);
        totalCarbonKg += materialData.carbon_intensity;
      }
      totalCarbonKg += jobDetails.transportation_distance * 0.2;
      totalCarbonKg += jobDetails.energy_usage_hours * 0.5 * 0.233;
      totalCarbonKg += jobDetails.waste_generated * 0.5;
      return Math.round(totalCarbonKg * 100) / 100;
    } catch (error) {
      logger.error('Failed to calculate carbon footprint', error);
      return 0;
    }
  }

  async getContractorSustainabilityRanking(_location: string, _category?: string): Promise<Record<string, unknown>[]> {
    try {
      const { data, error } = await supabase.from('contractor_esg_profiles').select('contractor_id, overall_esg_score, certification_level, green_job_percentage, users!contractor_id(first_name, last_name)').gte('overall_esg_score', 60).order('overall_esg_score', { ascending: false }).limit(20);
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get sustainability ranking', error);
      return [];
    }
  }

  async trackSustainabilityProgress(contractorId: string, timeframe: 'month' | 'quarter' | 'year'): Promise<{ trend: 'improving' | 'declining' | 'stable' | 'insufficient_data' | 'error'; improvement?: number; carbon_reduction_kg?: number; waste_reduction_kg?: number; renewable_increase_percent?: number; timeframe: 'month' | 'quarter' | 'year'; data_points?: number }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      if (timeframe === 'month') startDate.setMonth(startDate.getMonth() - 1);
      else if (timeframe === 'quarter') startDate.setMonth(startDate.getMonth() - 3);
      else startDate.setFullYear(startDate.getFullYear() - 1);

      const { data, error } = await supabase.from('sustainability_metrics').select('*').eq('entity_id', contractorId).eq('entity_type', 'contractor').gte('created_at', startDate.toISOString()).order('created_at', { ascending: true });
      if (error) throw error;
      if (!data || data.length < 2) return { trend: 'insufficient_data', improvement: 0, timeframe };

      const firstMetric = data[0] as SustainabilityMetrics;
      const latestMetric = data[data.length - 1] as SustainabilityMetrics;
      const carbonReduction = firstMetric.carbon_footprint_kg - latestMetric.carbon_footprint_kg;
      return {
        trend: carbonReduction > 0 ? 'improving' : carbonReduction < 0 ? 'declining' : 'stable',
        carbon_reduction_kg: carbonReduction,
        waste_reduction_kg: firstMetric.waste_generated_kg - latestMetric.waste_generated_kg,
        renewable_increase_percent: latestMetric.renewable_energy_percentage - firstMetric.renewable_energy_percentage,
        timeframe, data_points: data.length,
      };
    } catch (error) {
      logger.error('Failed to track sustainability progress', error);
      return { trend: 'error', improvement: 0, timeframe };
    }
  }
}
