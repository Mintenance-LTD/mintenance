import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

// =====================================================
// CORE INTERFACES AND TYPES
// =====================================================

export interface SustainabilityMetrics {
  id: string;
  entity_id: string; // contractor_id or job_id
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
  overall_score: number; // 0-100
  environmental_score: number; // 0-100
  social_score: number; // 0-100
  governance_score: number; // 0-100
  certification_level: 'bronze' | 'silver' | 'gold' | 'platinum';
  last_calculated: string;
}

export interface GreenCertification {
  id: string;
  contractor_id: string;
  certification_type: string; // 'energy_efficient', 'waste_reduction', 'sustainable_materials', etc.
  issuing_body: string;
  certification_date: string;
  expiry_date: string;
  verification_status: 'pending' | 'verified' | 'expired';
  score_boost: number; // Points added to ESG score
}

export interface SustainableMaterial {
  id: string;
  name: string;
  category: string;
  carbon_intensity: number; // kg CO2 per unit
  recyclability_score: number; // 0-100
  local_availability: boolean;
  certification_labels: string[];
  cost_premium_percentage: number;
  alternative_to: string[]; // Traditional materials this replaces
}

export interface EcoJobRecommendation {
  job_id: string;
  sustainability_improvements: {
    material_swaps: MaterialSwapSuggestion[];
    process_optimizations: ProcessOptimization[];
    energy_efficiency_tips: string[];
    waste_reduction_strategies: string[];
  };
  potential_carbon_reduction: number; // kg CO2
  estimated_cost_impact: number; // £ or percentage
  difficulty_level: 'easy' | 'moderate' | 'complex';
  roi_timeframe: string; // "6 months", "2 years", etc.
}

export interface MaterialSwapSuggestion {
  original_material: string;
  sustainable_alternative: string;
  benefits: string[];
  carbon_reduction: number; // kg CO2
  cost_difference: number; // £ or percentage
  availability: 'readily_available' | 'order_required' | 'special_order';
}

export interface ProcessOptimization {
  area: string; // 'transportation', 'waste_management', 'energy_usage'
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
  equipment_efficiency_rating: number; // 0-100
}

export interface JobSustainabilityAnalysis {
  job_id: string;
  predicted_impact: SustainabilityMetrics;
  improvement_suggestions: EcoJobRecommendation;
  green_contractor_recommendations: string[];
  sustainability_score: number; // 0-100
  certification_eligible: boolean;
}

// =====================================================
// SUSTAINABILITY CALCULATION ENGINE
// =====================================================

class SustainabilityEngine {

  // Calculate comprehensive ESG score for contractors
  async calculateContractorESGScore(contractorId: string): Promise<ESGScore> {
    try {
      const [
        sustainabilityMetrics,
        certifications,
        jobHistory,
        clientFeedback
      ] = await Promise.all([
        this.getContractorSustainabilityMetrics(contractorId),
        this.getContractorCertifications(contractorId),
        this.getContractorJobHistory(contractorId),
        this.getContractorSustainabilityFeedback(contractorId)
      ]);

      // Environmental Score (40% of overall)
      const environmentalScore = this.calculateEnvironmentalScore({
        carbonFootprint: sustainabilityMetrics.carbon_footprint_kg,
        renewableEnergyUse: sustainabilityMetrics.renewable_energy_percentage,
        wasteReduction: 100 - sustainabilityMetrics.waste_generated_kg,
        localSourcing: sustainabilityMetrics.local_sourcing_percentage,
        recycledMaterials: sustainabilityMetrics.recycled_materials_percentage
      });

      // Social Score (35% of overall)
      const socialScore = this.calculateSocialScore({
        communityImpactProjects: jobHistory.community_projects || 0,
        fairEmploymentPractices: jobHistory.employment_score || 80,
        clientEducation: jobHistory.education_initiatives || 0,
        localJobCreation: jobHistory.local_employment_percentage || 50,
        diversityInclusion: jobHistory.diversity_score || 70
      });

      // Governance Score (25% of overall)
      const governanceScore = this.calculateGovernanceScore({
        certificationCompliance: certifications.length > 0 ? 90 : 50,
        transparencyRating: clientFeedback.transparency_score || 75,
        ethicalPractices: clientFeedback.ethics_score || 80,
        reportingQuality: sustainabilityMetrics ? 85 : 40,
        stakeholderEngagement: clientFeedback.engagement_score || 70
      });

      // Overall weighted score
      const overallScore = Math.round(
        (environmentalScore * 0.4) +
        (socialScore * 0.35) +
        (governanceScore * 0.25)
      );

      // Determine certification level
      const certificationLevel = this.determineCertificationLevel(overallScore);

      const esgScore: ESGScore = {
        overall_score: overallScore,
        environmental_score: environmentalScore,
        social_score: socialScore,
        governance_score: governanceScore,
        certification_level: certificationLevel,
        last_calculated: new Date().toISOString()
      };

      // Store the score in database
      await this.storeESGScore(contractorId, esgScore);

      logger.info('ESG score calculated', {
        contractorId,
        overallScore,
        certificationLevel
      });

      return esgScore;
    } catch (error) {
      logger.error('Failed to calculate ESG score', error);
      throw error;
    }
  }

  // Analyze job sustainability and provide recommendations
  async analyzeJobSustainability(
    jobTitle: string,
    jobDescription: string,
    location: string,
    category: string
  ): Promise<JobSustainabilityAnalysis> {
    try {
      // Predict environmental impact based on job details
      const predictedImpact = await this.predictJobEnvironmentalImpact({
        title: jobTitle,
        description: jobDescription,
        category,
        location
      });

      // Generate improvement suggestions
      const improvementSuggestions = await this.generateEcoRecommendations({
        jobDetails: { title: jobTitle, description: jobDescription, category },
        currentImpact: predictedImpact,
        location
      });

      // Find green contractors for this job
      const greenContractors = await this.findGreenContractorsForJob(
        category,
        location,
        70 // Minimum ESG score
      );

      // Calculate overall sustainability score
      const sustainabilityScore = this.calculateJobSustainabilityScore(predictedImpact);

      // Check if eligible for green certification
      const certificationEligible = sustainabilityScore >= 75;

      return {
        job_id: '', // Will be set when job is created
        predicted_impact: predictedImpact,
        improvement_suggestions: improvementSuggestions,
        green_contractor_recommendations: greenContractors,
        sustainability_score: sustainabilityScore,
        certification_eligible: certificationEligible
      };
    } catch (error) {
      logger.error('Failed to analyze job sustainability', error);
      throw error;
    }
  }

  // Get sustainable material alternatives
  async getSustainableMaterialAlternatives(
    originalMaterials: string[]
  ): Promise<MaterialSwapSuggestion[]> {
    try {
      const suggestions: MaterialSwapSuggestion[] = [];

      for (const material of originalMaterials) {
        const alternatives = await this.findSustainableAlternatives(material);
        suggestions.push(...alternatives);
      }

      // Sort by carbon reduction potential
      return suggestions.sort((a, b) => b.carbon_reduction - a.carbon_reduction);
    } catch (error) {
      logger.error('Failed to get sustainable alternatives', error);
      return [];
    }
  }

  // Calculate carbon footprint for a job
  async calculateJobCarbonFootprint(jobDetails: {
    materials: string[];
    transportation_distance: number;
    energy_usage_hours: number;
    waste_generated: number;
  }): Promise<number> {
    try {
      let totalCarbonKg = 0;

      // Material carbon footprint
      for (const material of jobDetails.materials) {
        const materialData = await this.getMaterialCarbonData(material);
        totalCarbonKg += materialData.carbon_intensity;
      }

      // Transportation emissions (kg CO2 per km)
      const transportationEmissions = jobDetails.transportation_distance * 0.2;
      totalCarbonKg += transportationEmissions;

      // Energy usage emissions (kg CO2 per kWh) - UK grid average
      const energyEmissions = jobDetails.energy_usage_hours * 0.5 * 0.233;
      totalCarbonKg += energyEmissions;

      // Waste processing emissions
      const wasteEmissions = jobDetails.waste_generated * 0.5;
      totalCarbonKg += wasteEmissions;

      return Math.round(totalCarbonKg * 100) / 100;
    } catch (error) {
      logger.error('Failed to calculate carbon footprint', error);
      return 0;
    }
  }

  // Get contractor sustainability ranking
  async getContractorSustainabilityRanking(location: string, category?: string) : Promise<void> {
    try {
      const { data, error } = await supabase
        .from('contractor_esg_profiles')
        .select(`
          contractor_id,
          overall_esg_score,
          certification_level,
          green_job_percentage,
          users!contractor_id(first_name, last_name)
        `)
        .gte('overall_esg_score', 60)
        .order('overall_esg_score', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get sustainability ranking', error);
      return [];
    }
  }

  // Track sustainability improvements over time
  async trackSustainabilityProgress(contractorId: string, timeframe: 'month' | 'quarter' | 'year') : Promise<void> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const { data, error } = await supabase
        .from('sustainability_metrics')
        .select('*')
        .eq('entity_id', contractorId)
        .eq('entity_type', 'contractor')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Calculate trends and improvements
      if (!data || data.length < 2) {
        return { trend: 'insufficient_data', improvement: 0 };
      }

      const firstMetric = data[0];
      const latestMetric = data[data.length - 1];

      const carbonReduction = firstMetric.carbon_footprint_kg - latestMetric.carbon_footprint_kg;
      const wasteReduction = firstMetric.waste_generated_kg - latestMetric.waste_generated_kg;
      const renewableIncrease = latestMetric.renewable_energy_percentage - firstMetric.renewable_energy_percentage;

      return {
        trend: carbonReduction > 0 ? 'improving' : carbonReduction < 0 ? 'declining' : 'stable',
        carbon_reduction_kg: carbonReduction,
        waste_reduction_kg: wasteReduction,
        renewable_increase_percent: renewableIncrease,
        timeframe,
        data_points: data.length
      };
    } catch (error) {
      logger.error('Failed to track sustainability progress', error);
      return { trend: 'error', improvement: 0 };
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private calculateEnvironmentalScore(metrics: {
    carbonFootprint: number;
    renewableEnergyUse: number;
    wasteReduction: number;
    localSourcing: number;
    recycledMaterials: number;
  }): number {
    // Score components (0-100 each)
    const carbonScore = Math.max(0, 100 - (metrics.carbonFootprint / 100 * 100));
    const renewableScore = metrics.renewableEnergyUse;
    const wasteScore = metrics.wasteReduction;
    const localScore = metrics.localSourcing;
    const recyclingScore = metrics.recycledMaterials;

    // Weighted average
    const environmentalScore = Math.round(
      (carbonScore * 0.3) +
      (renewableScore * 0.25) +
      (wasteScore * 0.2) +
      (localScore * 0.15) +
      (recyclingScore * 0.1)
    );

    return Math.min(100, Math.max(0, environmentalScore));
  }

  private calculateSocialScore(metrics: {
    communityImpactProjects: number;
    fairEmploymentPractices: number;
    clientEducation: number;
    localJobCreation: number;
    diversityInclusion: number;
  }): number {
    // Normalize community projects (0-100 scale)
    const communityScore = Math.min(100, metrics.communityImpactProjects * 10);
    const educationScore = Math.min(100, metrics.clientEducation * 5);

    const socialScore = Math.round(
      (communityScore * 0.25) +
      (metrics.fairEmploymentPractices * 0.25) +
      (educationScore * 0.2) +
      (metrics.localJobCreation * 0.15) +
      (metrics.diversityInclusion * 0.15)
    );

    return Math.min(100, Math.max(0, socialScore));
  }

  private calculateGovernanceScore(metrics: {
    certificationCompliance: number;
    transparencyRating: number;
    ethicalPractices: number;
    reportingQuality: number;
    stakeholderEngagement: number;
  }): number {
    const governanceScore = Math.round(
      (metrics.certificationCompliance * 0.25) +
      (metrics.transparencyRating * 0.2) +
      (metrics.ethicalPractices * 0.25) +
      (metrics.reportingQuality * 0.15) +
      (metrics.stakeholderEngagement * 0.15)
    );

    return Math.min(100, Math.max(0, governanceScore));
  }

  private determineCertificationLevel(score: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (score >= 90) return 'platinum';
    if (score >= 80) return 'gold';
    if (score >= 70) return 'silver';
    return 'bronze';
  }

  private async predictJobEnvironmentalImpact(jobDetails: {
    title: string;
    description: string;
    category: string;
    location: string;
  }): Promise<SustainabilityMetrics> {
    // Basic prediction algorithm - in real implementation would use ML
    const baseImpacts: Record<string, Partial<SustainabilityMetrics>> = {
      plumbing: {
        carbon_footprint_kg: 15,
        water_usage_liters: 50,
        waste_generated_kg: 5,
        energy_usage_kwh: 8
      },
      electrical: {
        carbon_footprint_kg: 12,
        water_usage_liters: 5,
        waste_generated_kg: 8,
        energy_usage_kwh: 15
      },
      painting: {
        carbon_footprint_kg: 25,
        water_usage_liters: 20,
        waste_generated_kg: 12,
        energy_usage_kwh: 10
      },
      carpentry: {
        carbon_footprint_kg: 35,
        water_usage_liters: 15,
        waste_generated_kg: 20,
        energy_usage_kwh: 12
      },
      gardening: {
        carbon_footprint_kg: 8,
        water_usage_liters: 100,
        waste_generated_kg: 30,
        energy_usage_kwh: 5
      }
    };

    const baseImpact = baseImpacts[jobDetails.category] || baseImpacts.plumbing;

    // Adjust for job complexity (simple algorithm)
    const complexityMultiplier = this.assessJobComplexity(jobDetails.description);

    return {
      id: '',
      entity_id: '',
      entity_type: 'job',
      carbon_footprint_kg: (baseImpact.carbon_footprint_kg || 15) * complexityMultiplier,
      water_usage_liters: (baseImpact.water_usage_liters || 20) * complexityMultiplier,
      waste_generated_kg: (baseImpact.waste_generated_kg || 8) * complexityMultiplier,
      energy_usage_kwh: (baseImpact.energy_usage_kwh || 10) * complexityMultiplier,
      renewable_energy_percentage: 25, // UK average
      local_sourcing_percentage: 60,
      recycled_materials_percentage: 30,
      transportation_emissions_kg: this.calculateTransportationEmissions(jobDetails.location),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private assessJobComplexity(description: string): number {
    const complexityKeywords = {
      high: ['renovation', 'installation', 'replacement', 'rewiring', 'major'],
      medium: ['repair', 'fix', 'maintenance', 'service', 'check'],
      low: ['touch-up', 'minor', 'quick', 'simple', 'small']
    };

    const desc = description.toLowerCase();

    if (complexityKeywords.high.some(keyword => desc.includes(keyword))) return 1.5;
    if (complexityKeywords.low.some(keyword => desc.includes(keyword))) return 0.7;
    return 1.0; // medium complexity default
  }

  private calculateTransportationEmissions(location: string): number {
    // Basic calculation - in real implementation would use actual distance data
    const isLondon = location.toLowerCase().includes('london');
    const avgDistanceKm = isLondon ? 15 : 25; // Average contractor travel distance
    const emissionFactorKgPerKm = 0.2; // Average van emissions
    
    return avgDistanceKm * emissionFactorKgPerKm;
  }

  private async generateEcoRecommendations(params: {
    jobDetails: { title: string; description: string; category: string };
    currentImpact: SustainabilityMetrics;
    location: string;
  }): Promise<EcoJobRecommendation> {
    // Generate material swap suggestions
    const materialSwaps = await this.generateMaterialSwaps(params.jobDetails.category);
    
    // Generate process optimizations
    const processOptimizations = this.generateProcessOptimizations(params.currentImpact);

    // Calculate potential carbon reduction
    const potentialReduction = materialSwaps.reduce((sum, swap) => sum + swap.carbon_reduction, 0) +
                              processOptimizations.reduce((sum, opt) => sum + opt.carbon_reduction, 0);

    return {
      job_id: '',
      sustainability_improvements: {
        material_swaps: materialSwaps,
        process_optimizations: processOptimizations,
        energy_efficiency_tips: this.getEnergyEfficiencyTips(params.jobDetails.category),
        waste_reduction_strategies: this.getWasteReductionStrategies(params.jobDetails.category)
      },
      potential_carbon_reduction: potentialReduction,
      estimated_cost_impact: this.calculateCostImpact(materialSwaps),
      difficulty_level: 'moderate',
      roi_timeframe: '12-18 months'
    };
  }

  private async generateMaterialSwaps(category: string): Promise<MaterialSwapSuggestion[]> {
    const swapDatabase: Record<string, MaterialSwapSuggestion[]> = {
      painting: [
        {
          original_material: 'Standard Paint',
          sustainable_alternative: 'Low-VOC Paint',
          benefits: ['Better indoor air quality', 'Reduced chemical emissions'],
          carbon_reduction: 2.5,
          cost_difference: 15, // 15% premium
          availability: 'readily_available'
        },
        {
          original_material: 'Plastic-based Primer',
          sustainable_alternative: 'Water-based Primer',
          benefits: ['Biodegradable', 'Non-toxic'],
          carbon_reduction: 1.8,
          cost_difference: 8,
          availability: 'readily_available'
        }
      ],
      carpentry: [
        {
          original_material: 'MDF Boards',
          sustainable_alternative: 'FSC-certified Plywood',
          benefits: ['Sustainably sourced', 'Better durability'],
          carbon_reduction: 8.5,
          cost_difference: 25,
          availability: 'order_required'
        }
      ],
      plumbing: [
        {
          original_material: 'PVC Pipes',
          sustainable_alternative: 'PEX Pipes',
          benefits: ['Longer lifespan', 'Better insulation'],
          carbon_reduction: 3.2,
          cost_difference: 12,
          availability: 'readily_available'
        }
      ]
    };

    return swapDatabase[category] || [];
  }

  private generateProcessOptimizations(currentImpact: SustainabilityMetrics): ProcessOptimization[] {
    const optimizations: ProcessOptimization[] = [];

    // Transportation optimization
    if (currentImpact.transportation_emissions_kg > 5) {
      optimizations.push({
        area: 'transportation',
        description: 'Route optimization and electric vehicle usage',
        implementation_steps: [
          'Plan efficient routes to minimize travel',
          'Consider electric or hybrid vehicles',
          'Combine multiple jobs in same area'
        ],
        carbon_reduction: currentImpact.transportation_emissions_kg * 0.3,
        cost_savings: 50,
        difficulty: 'easy'
      });
    }

    // Waste management optimization
    if (currentImpact.waste_generated_kg > 10) {
      optimizations.push({
        area: 'waste_management',
        description: 'Implement comprehensive waste sorting and recycling',
        implementation_steps: [
          'Sort materials on-site',
          'Partner with local recycling facilities',
          'Reuse materials where possible'
        ],
        carbon_reduction: currentImpact.waste_generated_kg * 0.5,
        cost_savings: 30,
        difficulty: 'moderate'
      });
    }

    return optimizations;
  }

  private getEnergyEfficiencyTips(category: string): string[] {
    const tipDatabase: Record<string, string[]> = {
      electrical: [
        'Use LED bulbs instead of incandescent',
        'Install smart thermostats for better energy management',
        'Consider solar-powered options where applicable'
      ],
      plumbing: [
        'Install low-flow fixtures to reduce water usage',
        'Insulate pipes to reduce energy loss',
        'Use tankless water heaters for better efficiency'
      ],
      heating: [
        'Upgrade to high-efficiency boilers',
        'Improve home insulation',
        'Install programmable thermostats'
      ]
    };

    return tipDatabase[category] || [
      'Use energy-efficient tools and equipment',
      'Work during daylight hours when possible',
      'Turn off equipment when not in use'
    ];
  }

  private getWasteReductionStrategies(category: string): string[] {
    return [
      'Measure twice, cut once to reduce material waste',
      'Donate or sell leftover materials',
      'Use digital receipts and documentation',
      'Choose packaging-minimal products',
      'Implement a job-site recycling program'
    ];
  }

  private calculateCostImpact(materialSwaps: MaterialSwapSuggestion[]): number {
    return materialSwaps.reduce((total, swap) => total + swap.cost_difference, 0);
  }

  private calculateJobSustainabilityScore(impact: SustainabilityMetrics): number {
    // Scoring algorithm based on various factors
    const carbonScore = Math.max(0, 100 - (impact.carbon_footprint_kg / 50 * 100));
    const wasteScore = Math.max(0, 100 - (impact.waste_generated_kg / 30 * 100));
    const renewableScore = impact.renewable_energy_percentage;
    const recyclingScore = impact.recycled_materials_percentage;

    return Math.round(
      (carbonScore * 0.4) +
      (wasteScore * 0.25) +
      (renewableScore * 0.2) +
      (recyclingScore * 0.15)
    );
  }

  // Database interaction methods
  private async getContractorSustainabilityMetrics(contractorId: string): Promise<SustainabilityMetrics> {
    const { data, error } = await supabase
      .from('sustainability_metrics')
      .select('*')
      .eq('entity_id', contractorId)
      .eq('entity_type', 'contractor')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // Return default metrics if none exist
      return {
        id: '',
        entity_id: contractorId,
        entity_type: 'contractor',
        carbon_footprint_kg: 50,
        water_usage_liters: 100,
        waste_generated_kg: 25,
        energy_usage_kwh: 40,
        renewable_energy_percentage: 25,
        local_sourcing_percentage: 60,
        recycled_materials_percentage: 30,
        transportation_emissions_kg: 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    return data;
  }

  private async getContractorCertifications(contractorId: string): Promise<GreenCertification[]> {
    const { data, error } = await supabase
      .from('green_certifications')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('verification_status', 'verified');

    if (error) return [];
    return data || [];
  }

  private async getContractorJobHistory(contractorId: string): Promise<any> {
    // Mock data - in real implementation would query actual job history
    return {
      community_projects: 2,
      employment_score: 85,
      education_initiatives: 5,
      local_employment_percentage: 80,
      diversity_score: 75
    };
  }

  private async getContractorSustainabilityFeedback(contractorId: string): Promise<any> {
    // Mock data - in real implementation would query client feedback
    return {
      transparency_score: 82,
      ethics_score: 88,
      engagement_score: 79
    };
  }

  private async storeESGScore(contractorId: string, esgScore: ESGScore): Promise<void> {
    const { error } = await supabase
      .from('contractor_esg_scores')
      .upsert({
        contractor_id: contractorId,
        overall_esg_score: esgScore.overall_score,
        environmental_score: esgScore.environmental_score,
        social_score: esgScore.social_score,
        governance_score: esgScore.governance_score,
        certification_level: esgScore.certification_level,
        last_calculated: esgScore.last_calculated,
        updated_at: new Date().toISOString()
      });

    if (error) {
      logger.error('Failed to store ESG score', error);
    }
  }

  private async findSustainableAlternatives(material: string): Promise<MaterialSwapSuggestion[]> {
    const { data, error } = await supabase
      .from('sustainable_materials')
      .select('*')
      .contains('alternative_to', [material]);

    if (error) return [];

    return (data || []).map(item => ({
      original_material: material,
      sustainable_alternative: item.name,
      benefits: item.certification_labels,
      carbon_reduction: item.carbon_intensity,
      cost_difference: item.cost_premium_percentage,
      availability: item.local_availability ? 'readily_available' : 'order_required'
    }));
  }

  private async getMaterialCarbonData(material: string): Promise<{ carbon_intensity: number }> {
    const { data, error } = await supabase
      .from('sustainable_materials')
      .select('carbon_intensity')
      .eq('name', material)
      .single();

    if (error) {
      // Return default carbon intensity if material not found
      return { carbon_intensity: 5 };
    }

    return data;
  }

  private async findGreenContractorsForJob(
    category: string,
    location: string,
    minESGScore: number
  ): Promise<string[]> {
    const { data, error } = await supabase
      .from('contractor_esg_scores')
      .select('contractor_id')
      .gte('overall_esg_score', minESGScore)
      .order('overall_esg_score', { ascending: false })
      .limit(10);

    if (error) return [];
    return (data || []).map(item => item.contractor_id);
  }
}

export const sustainabilityEngine = new SustainabilityEngine();