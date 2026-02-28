import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import type {
  ESGScore,
  GreenCertification,
  SustainabilityMetrics,
  JobHistoryMetrics,
  SustainabilityFeedback,
} from './types';

export class ESGCalculator {
  async calculateContractorESGScore(contractorId: string): Promise<ESGScore> {
    try {
      const [sustainabilityMetrics, certifications, jobHistory, clientFeedback] = await Promise.all([
        this.getContractorSustainabilityMetrics(contractorId),
        this.getContractorCertifications(contractorId),
        this.getContractorJobHistory(contractorId),
        this.getContractorSustainabilityFeedback(contractorId),
      ]);

      const environmentalScore = this.calculateEnvironmentalScore({
        carbonFootprint: sustainabilityMetrics.carbon_footprint_kg,
        renewableEnergyUse: sustainabilityMetrics.renewable_energy_percentage,
        wasteReduction: 100 - sustainabilityMetrics.waste_generated_kg,
        localSourcing: sustainabilityMetrics.local_sourcing_percentage,
        recycledMaterials: sustainabilityMetrics.recycled_materials_percentage,
      });
      const socialScore = this.calculateSocialScore({
        communityImpactProjects: jobHistory.community_projects || 0,
        fairEmploymentPractices: jobHistory.employment_score || 80,
        clientEducation: jobHistory.education_initiatives || 0,
        localJobCreation: jobHistory.local_employment_percentage || 50,
        diversityInclusion: jobHistory.diversity_score || 70,
      });
      const governanceScore = this.calculateGovernanceScore({
        certificationCompliance: certifications.length > 0 ? 90 : 50,
        transparencyRating: clientFeedback.transparency_score || 75,
        ethicalPractices: clientFeedback.ethics_score || 80,
        reportingQuality: sustainabilityMetrics ? 85 : 40,
        stakeholderEngagement: clientFeedback.engagement_score || 70,
      });

      const overallScore = Math.round(environmentalScore * 0.4 + socialScore * 0.35 + governanceScore * 0.25);
      const certificationLevel = this.determineCertificationLevel(overallScore);
      const esgScore: ESGScore = {
        overall_score: overallScore, environmental_score: environmentalScore,
        social_score: socialScore, governance_score: governanceScore,
        certification_level: certificationLevel, last_calculated: new Date().toISOString(),
      };
      await this.storeESGScore(contractorId, esgScore);
      logger.info('ESG score calculated', { contractorId, overallScore, certificationLevel });
      return esgScore;
    } catch (error) {
      logger.error('Failed to calculate ESG score', error);
      throw error;
    }
  }

  calculateEnvironmentalScore(metrics: { carbonFootprint: number; renewableEnergyUse: number; wasteReduction: number; localSourcing: number; recycledMaterials: number }): number {
    const carbonScore = Math.max(0, 100 - (metrics.carbonFootprint / 100) * 100);
    const score = Math.round(carbonScore * 0.3 + metrics.renewableEnergyUse * 0.25 + metrics.wasteReduction * 0.2 + metrics.localSourcing * 0.15 + metrics.recycledMaterials * 0.1);
    return Math.min(100, Math.max(0, score));
  }

  calculateSocialScore(metrics: { communityImpactProjects: number; fairEmploymentPractices: number; clientEducation: number; localJobCreation: number; diversityInclusion: number }): number {
    const communityScore = Math.min(100, metrics.communityImpactProjects * 10);
    const educationScore = Math.min(100, metrics.clientEducation * 5);
    const score = Math.round(communityScore * 0.25 + metrics.fairEmploymentPractices * 0.25 + educationScore * 0.2 + metrics.localJobCreation * 0.15 + metrics.diversityInclusion * 0.15);
    return Math.min(100, Math.max(0, score));
  }

  calculateGovernanceScore(metrics: { certificationCompliance: number; transparencyRating: number; ethicalPractices: number; reportingQuality: number; stakeholderEngagement: number }): number {
    const score = Math.round(metrics.certificationCompliance * 0.25 + metrics.transparencyRating * 0.2 + metrics.ethicalPractices * 0.25 + metrics.reportingQuality * 0.15 + metrics.stakeholderEngagement * 0.15);
    return Math.min(100, Math.max(0, score));
  }

  determineCertificationLevel(score: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (score >= 90) return 'platinum';
    if (score >= 80) return 'gold';
    if (score >= 70) return 'silver';
    return 'bronze';
  }

  async getContractorSustainabilityMetrics(contractorId: string): Promise<SustainabilityMetrics> {
    const { data, error } = await supabase.from('sustainability_metrics').select('*').eq('entity_id', contractorId).eq('entity_type', 'contractor').order('created_at', { ascending: false }).limit(1).single();
    if (error) {
      return { id: '', entity_id: contractorId, entity_type: 'contractor', carbon_footprint_kg: 50, water_usage_liters: 100, waste_generated_kg: 25, energy_usage_kwh: 40, renewable_energy_percentage: 25, local_sourcing_percentage: 60, recycled_materials_percentage: 30, transportation_emissions_kg: 15, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    }
    return data;
  }

  async getContractorCertifications(contractorId: string): Promise<GreenCertification[]> {
    const { data, error } = await supabase.from('green_certifications').select('*').eq('contractor_id', contractorId).eq('verification_status', 'verified');
    if (error) return [];
    return data || [];
  }

  async getContractorJobHistory(_contractorId: string): Promise<JobHistoryMetrics> {
    return { community_projects: 2, employment_score: 85, education_initiatives: 5, local_employment_percentage: 80, diversity_score: 75 };
  }

  async getContractorSustainabilityFeedback(_contractorId: string): Promise<SustainabilityFeedback> {
    return { transparency_score: 82, ethics_score: 88, engagement_score: 79 };
  }

  private async storeESGScore(contractorId: string, esgScore: ESGScore): Promise<void> {
    const { error } = await supabase.from('contractor_esg_scores').upsert({ contractor_id: contractorId, overall_esg_score: esgScore.overall_score, environmental_score: esgScore.environmental_score, social_score: esgScore.social_score, governance_score: esgScore.governance_score, certification_level: esgScore.certification_level, last_calculated: esgScore.last_calculated, updated_at: new Date().toISOString() });
    if (error) logger.error('Failed to store ESG score', error);
  }
}
