import { ESGCalculator } from './sustainability/ESGCalculator';
import { JobAnalyzer } from './sustainability/JobAnalyzer';
import { MaterialAdvisor } from './sustainability/MaterialAdvisor';
import { CarbonTracker } from './sustainability/CarbonTracker';

// Re-export all public types for backward compatibility
export type {
  SustainabilityMetrics, ESGScore, GreenCertification, SustainableMaterial,
  EcoJobRecommendation, MaterialSwapSuggestion, ProcessOptimization,
  ContractorESGProfile, JobSustainabilityAnalysis,
} from './sustainability/types';

/**
 * SustainabilityEngine - Facade that composes ESG, job analysis, material advisory,
 * and carbon tracking capabilities. Split from 945-line monolith into focused modules.
 */
class SustainabilityEngine {
  private esgCalculator = new ESGCalculator();
  private jobAnalyzer = new JobAnalyzer();
  private materialAdvisor = new MaterialAdvisor();
  private carbonTracker = new CarbonTracker();

  async calculateContractorESGScore(contractorId: string) {
    return this.esgCalculator.calculateContractorESGScore(contractorId);
  }
  async analyzeJobSustainability(jobTitle: string, jobDescription: string, location: string, category: string) {
    return this.jobAnalyzer.analyzeJobSustainability(jobTitle, jobDescription, location, category);
  }
  async getSustainableMaterialAlternatives(originalMaterials: string[]) {
    return this.materialAdvisor.getSustainableMaterialAlternatives(originalMaterials);
  }
  async calculateJobCarbonFootprint(jobDetails: { materials: string[]; transportation_distance: number; energy_usage_hours: number; waste_generated: number }) {
    return this.carbonTracker.calculateJobCarbonFootprint(jobDetails);
  }
  async getContractorSustainabilityRanking(location: string, category?: string) {
    return this.carbonTracker.getContractorSustainabilityRanking(location, category);
  }
  async trackSustainabilityProgress(contractorId: string, timeframe: 'month' | 'quarter' | 'year') {
    return this.carbonTracker.trackSustainabilityProgress(contractorId, timeframe);
  }
}

export const sustainabilityEngine = new SustainabilityEngine();
