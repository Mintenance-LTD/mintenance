/**
 * ML Application Service
 *
 * High-level ML operations for specific business use cases
 */

import { logger } from '../../../utils/logger';
import { MLFeature } from './types';
import { MLInferenceEngine } from './MLInferenceEngine';

export class MLApplicationService {
  private inferenceEngine: MLInferenceEngine;
  private featureStore: Map<string, MLFeature[]> = new Map();

  constructor(inferenceEngine: MLInferenceEngine) {
    this.inferenceEngine = inferenceEngine;
  }

  /**
   * Smart contractor matching with ML
   */
  async findBestContractors(
    jobRequirements: {
      skills: string[];
      location: { lat: number; lng: number };
      budget: number;
      urgency: 'low' | 'medium' | 'high';
      complexity: number;
    },
    contractors: any[],
    limit: number = 10
  ): Promise<Array<{ contractor: any; score: number; explanation: string }>> {

    try {
      const results = [];

      for (const contractor of contractors) {
        // Prepare features for ML model
        const features: MLFeature[] = [
          { name: 'skills_match', type: 'numerical', value: this.calculateSkillsMatch(jobRequirements.skills, contractor.skills) },
          { name: 'location_distance', type: 'numerical', value: this.calculateDistance(jobRequirements.location, contractor.location) },
          { name: 'price_compatibility', type: 'numerical', value: this.calculatePriceCompatibility(jobRequirements.budget, contractor.hourlyRate) },
          { name: 'rating', type: 'numerical', value: contractor.rating || 0 },
          { name: 'availability', type: 'numerical', value: contractor.availability || 0.5 },
          { name: 'urgency_match', type: 'numerical', value: this.calculateUrgencyMatch(jobRequirements.urgency, contractor.responseTime) },
          { name: 'complexity_capability', type: 'numerical', value: this.calculateComplexityCapability(jobRequirements.complexity, contractor.experience) }
        ];

        // Get ML prediction
        const prediction = await this.inferenceEngine.predict('contractor_matching_v2', features);
        const score = prediction.output.score || prediction.confidence;

        // Generate explanation
        const explanation = this.generateMatchingExplanation(features, score);

        results.push({
          contractor,
          score,
          explanation
        });
      }

      // Sort by score and return top matches
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      logger.error('MLApplicationService', 'Contractor matching failed', error);
      return [];
    }
  }

  /**
   * Intelligent job recommendations
   */
  async getJobRecommendations(
    contractorId: string,
    contractorProfile: any,
    availableJobs: any[],
    limit: number = 20
  ): Promise<Array<{ job: any; score: number; reasons: string[] }>> {

    try {
      const results = [];

      for (const job of availableJobs) {
        // Prepare features
        const features: MLFeature[] = [
          { name: 'skills_compatibility', type: 'numerical', value: this.calculateSkillsMatch(job.requiredSkills, contractorProfile.skills) },
          { name: 'location_preference', type: 'numerical', value: this.calculateLocationPreference(job.location, contractorProfile.preferredAreas) },
          { name: 'budget_attractiveness', type: 'numerical', value: this.calculateBudgetAttractiveness(job.budget, contractorProfile.hourlyRate) },
          { name: 'job_complexity_fit', type: 'numerical', value: this.calculateComplexityFit(job.complexity, contractorProfile.experience) },
          { name: 'historical_success', type: 'numerical', value: this.calculateHistoricalSuccess(contractorProfile.jobHistory, job.category) },
          { name: 'time_preference', type: 'numerical', value: this.calculateTimePreference(job.schedule, contractorProfile.availability) }
        ];

        // Get recommendation score
        const prediction = await this.inferenceEngine.predict('job_recommendation_v1', features);
        const score = prediction.output.score || prediction.confidence;

        // Generate reasons
        const reasons = this.generateRecommendationReasons(features, score);

        results.push({
          job,
          score,
          reasons
        });
      }

      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      logger.error('MLApplicationService', 'Job recommendations failed', error);
      return [];
    }
  }

  /**
   * Predictive pricing with ML
   */
  async predictJobPrice(
    jobDetails: {
      category: string;
      description: string;
      location: any;
      complexity: number;
      materials: string[];
      timeEstimate: number;
    }
  ): Promise<{
    estimatedPrice: number;
    priceRange: { min: number; max: number };
    confidence: number;
    factors: Array<{ factor: string; impact: number }>;
  }> {

    try {
      // Extract features from job details
      const features: MLFeature[] = [
        { name: 'job_complexity', type: 'numerical', value: jobDetails.complexity },
        { name: 'time_estimate', type: 'numerical', value: jobDetails.timeEstimate },
        { name: 'materials_cost', type: 'numerical', value: this.estimateMaterialsCost(jobDetails.materials) },
        { name: 'location_factor', type: 'numerical', value: this.getLocationPriceFactor(jobDetails.location) },
        { name: 'season_factor', type: 'numerical', value: this.getSeasonFactor() },
        { name: 'category_base_rate', type: 'numerical', value: this.getCategoryBaseRate(jobDetails.category) },
        { name: 'description_complexity', type: 'numerical', value: this.analyzeDescriptionComplexity(jobDetails.description) }
      ];

      // Get price prediction
      const prediction = await this.inferenceEngine.predict('price_prediction_v1', features);
      const estimatedPrice = prediction.output.price || 0;
      const confidence = prediction.confidence;

      // Calculate price range based on confidence
      const uncertainty = (1 - confidence) * 0.3; // 30% max uncertainty
      const priceRange = {
        min: estimatedPrice * (1 - uncertainty),
        max: estimatedPrice * (1 + uncertainty)
      };

      // Analyze feature importance
      const factors = features.map(feature => ({
        factor: feature.name,
        impact: this.calculateFeatureImpact(feature, estimatedPrice)
      })).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

      return {
        estimatedPrice,
        priceRange,
        confidence,
        factors
      };

    } catch (error) {
      logger.error('MLApplicationService', 'Price prediction failed', error);
      return {
        estimatedPrice: 0,
        priceRange: { min: 0, max: 0 },
        confidence: 0,
        factors: []
      };
    }
  }

  /**
   * Fraud detection
   */
  async detectFraud(
    transactionData: {
      userId: string;
      amount: number;
      paymentMethod: string;
      deviceInfo: any;
      location: any;
      timestamp: number;
    }
  ): Promise<{
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    reasons: string[];
    recommendedAction: string;
  }> {

    try {
      // Prepare fraud detection features
      const features: MLFeature[] = [
        { name: 'transaction_amount', type: 'numerical', value: transactionData.amount },
        { name: 'time_of_day', type: 'numerical', value: new Date(transactionData.timestamp).getHours() },
        { name: 'user_velocity', type: 'numerical', value: this.calculateUserVelocity(transactionData.userId) },
        { name: 'device_risk', type: 'numerical', value: this.calculateDeviceRisk(transactionData.deviceInfo) },
        { name: 'location_risk', type: 'numerical', value: this.calculateLocationRisk(transactionData.location, transactionData.userId) },
        { name: 'payment_method_risk', type: 'numerical', value: this.calculatePaymentMethodRisk(transactionData.paymentMethod) },
        { name: 'amount_deviation', type: 'numerical', value: this.calculateAmountDeviation(transactionData.userId, transactionData.amount) }
      ];

      // Get fraud prediction
      const prediction = await this.inferenceEngine.predict('fraud_detection_v1', features);
      const riskScore = prediction.output.riskScore || prediction.confidence;

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (riskScore < 0.3) riskLevel = 'low';
      else if (riskScore < 0.6) riskLevel = 'medium';
      else if (riskScore < 0.8) riskLevel = 'high';
      else riskLevel = 'critical';

      // Generate reasons
      const reasons = this.generateFraudReasons(features, riskScore);

      // Recommend action
      const recommendedAction = this.getRecommendedFraudAction(riskLevel, riskScore);

      return {
        riskScore,
        riskLevel,
        reasons,
        recommendedAction
      };

    } catch (error) {
      logger.error('MLApplicationService', 'Fraud detection failed', error);
      return {
        riskScore: 0,
        riskLevel: 'low',
        reasons: ['Analysis failed'],
        recommendedAction: 'Allow transaction'
      };
    }
  }

  // Feature calculation methods
  private calculateSkillsMatch(requiredSkills: string[], contractorSkills: string[]): number {
    if (!requiredSkills.length) return 1;
    const matches = requiredSkills.filter(skill =>
      contractorSkills.some(cSkill => cSkill.toLowerCase().includes(skill.toLowerCase()))
    );
    return matches.length / requiredSkills.length;
  }

  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private calculatePriceCompatibility(budget: number, hourlyRate: number): number {
    if (!hourlyRate) return 0.5;
    const estimatedCost = hourlyRate * 8;
    return Math.max(0, Math.min(1, budget / estimatedCost));
  }

  private calculateUrgencyMatch(urgency: string, responseTime: number): number {
    const urgencyWeights = { low: 0.3, medium: 0.6, high: 0.9 };
    const urgencyWeight = urgencyWeights[urgency as keyof typeof urgencyWeights] || 0.5;
    const responseScore = Math.max(0, Math.min(1, 1 - (responseTime / 24)));
    return urgencyWeight * responseScore;
  }

  private calculateComplexityCapability(jobComplexity: number, experience: any): number {
    const experienceLevel = experience?.level || 1;
    const experienceYears = experience?.years || 0;
    const capability = (experienceLevel * 0.6) + (Math.min(experienceYears / 10, 1) * 0.4);
    return Math.min(1, capability / jobComplexity);
  }

  private generateMatchingExplanation(features: MLFeature[], score: number): string {
    const topFeatures = features
      .sort((a, b) => (b.value as number) - (a.value as number))
      .slice(0, 3);
    return `Match score: ${(score * 100).toFixed(1)}%. Top factors: ${topFeatures.map(f => f.name).join(', ')}`;
  }

  private generateRecommendationReasons(features: MLFeature[], score: number): string[] {
    return features
      .filter(f => (f.value as number) > 0.7)
      .map(f => `High ${f.name.replace('_', ' ')}: ${((f.value as number) * 100).toFixed(1)}%`);
  }

  private generateFraudReasons(features: MLFeature[], riskScore: number): string[] {
    return features
      .filter(f => (f.value as number) > 0.6)
      .map(f => `Elevated ${f.name.replace('_', ' ')}`);
  }

  private getRecommendedFraudAction(riskLevel: string, riskScore: number): string {
    switch (riskLevel) {
      case 'low': return 'Allow transaction';
      case 'medium': return 'Additional verification required';
      case 'high': return 'Manual review required';
      case 'critical': return 'Block transaction';
      default: return 'Allow transaction';
    }
  }

  // Placeholder calculation methods
  private calculateLocationPreference(jobLocation: any, preferredAreas: any[]): number { return Math.random(); }
  private calculateBudgetAttractiveness(budget: number, hourlyRate: number): number { return Math.random(); }
  private calculateComplexityFit(jobComplexity: number, experience: any): number { return Math.random(); }
  private calculateHistoricalSuccess(jobHistory: any[], category: string): number { return Math.random(); }
  private calculateTimePreference(schedule: any, availability: any): number { return Math.random(); }
  private estimateMaterialsCost(materials: string[]): number { return Math.random() * 500; }
  private getLocationPriceFactor(location: any): number { return Math.random() * 0.5 + 0.75; }
  private getSeasonFactor(): number { return Math.random() * 0.3 + 0.85; }
  private getCategoryBaseRate(category: string): number { return Math.random() * 100 + 50; }
  private analyzeDescriptionComplexity(description: string): number { return description.length / 100; }
  private calculateFeatureImpact(feature: MLFeature, price: number): number { return Math.random() * 20 - 10; }
  private calculateUserVelocity(userId: string): number { return Math.random(); }
  private calculateDeviceRisk(deviceInfo: any): number { return Math.random() * 0.3; }
  private calculateLocationRisk(location: any, userId: string): number { return Math.random() * 0.4; }
  private calculatePaymentMethodRisk(paymentMethod: string): number { return Math.random() * 0.2; }
  private calculateAmountDeviation(userId: string, amount: number): number { return Math.random() * 0.5; }
}
