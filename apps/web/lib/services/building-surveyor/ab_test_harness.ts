/**
 * A/B Testing Harness for Safe AI Automation
 * 
 * Implements:
 * - Correlation-aware Bayesian fusion (w^T Σ w)
 * - Hierarchical Mondrian conformal prediction with SSBC
 * - Safe-LUCB contextual bandit policy
 * - Pre-registered A/B testing protocol
 */

import { logger } from '@mintenance/shared';
import { BuildingSurveyorService } from './BuildingSurveyorService';
import { DetectorFusionService } from './DetectorFusionService';
import { BayesianFusionService } from './BayesianFusionService';
import { SafetyAnalysisService } from './SafetyAnalysisService';
import { ContextFeatureService } from './ContextFeatureService';
import { ImageQualityService } from './ImageQualityService';
import { ImageAnalysisService, type ImageAnalysisResult } from '@/lib/services/ImageAnalysisService';
import type { AssessmentContext, RoboflowDetection } from './types';
import type { AITestResult, SafeLUCBResult } from './ab-test/ABTestTypes';
import { DELTA_SAFETY } from './ab-test/ABTestConfig';
import { mondrianConformalPrediction } from './ab-test/ABTestConformalPrediction';
import { runSafeLUCBPolicy } from './ab-test/ABTestSafeLUCB';
import { getOrCreateAssignment, logDecision, checkSeedSafeSet } from './ab-test/ABTestDatabase';
import { getCalibrationData, getDomainShiftWeight } from './ab-test/ABTestCalibration';
import { computeOODScore } from './ab-test/ABTestUtils';

export class ABTestIntegration {
  private experimentId: string;

  constructor(experimentId: string) {
    this.experimentId = experimentId;
  }

  /**
   * Main entry point: Assess damage with A/B testing
   */
  async assessDamageWithABTest(params: {
    assessmentId: string;
    userId: string;
    imageUrls: string[];
    propertyType: string;
    propertyAge: number;
    region: string;
  }): Promise<{
    decision: 'automate' | 'escalate';
    arm: 'control' | 'treatment';
    requiresHumanReview: boolean;
    message: string;
    aiResult?: AITestResult;
    decisionTimeSeconds: number;
  }> {
    const startTime = Date.now();

    try {
      // 1. Get or create user assignment
      const assignment = await getOrCreateAssignment(this.experimentId, params.userId);

      // 2. Run AI assessment with full pipeline
      const aiResult = await this.runAIAssessment({
        assessmentId: params.assessmentId,
        imageUrls: params.imageUrls,
        propertyType: params.propertyType,
        propertyAge: params.propertyAge,
        region: params.region,
      });

      // 3. Run Safe-LUCB policy (only for treatment arm)
      let decision: 'automate' | 'escalate';
      let escalationReason: string | undefined;
      let lucbResult: SafeLUCBResult | undefined;

      if (assignment.armName === 'control') {
        // Control: Always escalate (human-only)
        decision = 'escalate';
        escalationReason = 'Control arm: human review required';
        lucbResult = undefined;
      } else {
        // Treatment: Safe-LUCB decides
        lucbResult = await runSafeLUCBPolicy({ aiResult });
        decision = lucbResult.decision;
        escalationReason = lucbResult.escalationReason;
      }

      // 4. Log decision to database (reuse lucbResult to avoid duplicate call)
      await logDecision({
        experimentId: this.experimentId,
        assignmentId: assignment.id,
        assessmentId: params.assessmentId,
        armId: assignment.armId,
        decision,
        escalationReason,
        aiResult,
        lucbResult,
        deltaSafety: lucbResult?.safetyThreshold || DELTA_SAFETY,
      });

      const decisionTimeSeconds = (Date.now() - startTime) / 1000;

      return {
        decision,
        arm: assignment.armName as 'control' | 'treatment',
        requiresHumanReview: decision === 'escalate',
        message: decision === 'automate' 
          ? 'Assessment automated by Safe-LUCB policy'
          : escalationReason || 'Assessment requires human review',
        aiResult,
        decisionTimeSeconds,
      };
    } catch (error) {
      logger.error('A/B test assessment failed', error, {
        service: 'ABTestIntegration',
        assessmentId: params.assessmentId,
      });

      // Fail-safe: Always escalate on error
      return {
        decision: 'escalate',
        arm: 'control', // Default to control on error
        requiresHumanReview: true,
        message: 'Error in A/B test assessment - escalated for safety',
        decisionTimeSeconds: (Date.now() - startTime) / 1000,
      };
    }
  }

  /**
   * 2A: Run AI Assessment with Correlation-Aware Fusion
   */
  private async runAIAssessment(params: {
    assessmentId: string;
    imageUrls: string[];
    propertyType: string;
    propertyAge: number;
    region: string;
  }): Promise<AITestResult> {
    // 1. Call existing BuildingSurveyorService
    const assessment = await BuildingSurveyorService.assessDamage(
      params.imageUrls,
      {
        propertyType: params.propertyType as 'residential' | 'commercial' | 'industrial',
        ageOfProperty: params.propertyAge,
        location: params.region,
      }
    );

    // 2. Extract detector outputs from evidence
    const roboflowDetections = assessment.evidence?.roboflowDetections || [];

    // 3. Extract image quality metrics
    // Get vision analysis from assessment evidence or re-analyze if needed
    let visionAnalysis: ImageAnalysisResult | null = null;
    const visionSummary = assessment.evidence?.visionAnalysis;
    
    if (visionSummary) {
      // Convert VisionAnalysisSummary to ImageAnalysisResult format for ImageQualityService
      visionAnalysis = {
        labels: visionSummary.labels || [],
        objects: visionSummary.objects || [],
        text: [], // Not available in summary
        detectedFeatures: visionSummary.detectedFeatures || [],
        propertyType: visionSummary.propertyType,
        condition: visionSummary.condition,
        complexity: visionSummary.complexity,
        suggestedCategories: visionSummary.suggestedCategories || [],
        estimatedCostFactors: {
          sizeMultiplier: 1.0,
          complexityMultiplier: visionSummary.complexity === 'complex' ? 1.5 : visionSummary.complexity === 'moderate' ? 1.2 : 1.0,
          conditionMultiplier: visionSummary.condition === 'poor' ? 1.5 : visionSummary.condition === 'fair' ? 1.2 : 1.0,
        },
        confidence: visionSummary.confidence,
      };
    } else {
      // Try to get from ImageAnalysisService cache
      visionAnalysis = await ImageAnalysisService.analyzePropertyImages(params.imageUrls, 1);
    }
    
    const imageQuality = await ImageQualityService.getAverageQualityMetrics(
      params.imageUrls,
      visionAnalysis
    );

    // 4. Use DetectorFusionService for correlation-aware Bayesian fusion (detector-level)
    // Includes drift detection and weight adjustment (paper's Drift Monitor → Adjust Weights)
    const detectorFusionResult = await DetectorFusionService.fuseDetectors(
      roboflowDetections,
      assessment.damageAssessment.confidence,
      {
        propertyType: params.propertyType,
        region: params.region,
        season: this.getCurrentSeason(),
      }
    );

    // 4b. Use BayesianFusionService for high-level evidence fusion (SAM 3 + GPT-4 + Scene Graph)
    // This implements the paper's Bayesian Fusion with variance tracking
    const sam3Evidence = assessment.evidence?.sam3Segmentation;
    let sam3EvidenceFormatted = null;
    
    // Format SAM 3 evidence for BayesianFusionService
    if (sam3Evidence && 'damage_types' in sam3Evidence) {
      const damageTypes: Record<string, { confidence: number; numInstances: number }> = {};
      let totalConfidence = 0;
      let totalInstances = 0;
      
      for (const [damageType, data] of Object.entries(sam3Evidence.damage_types)) {
        const avgScore = data.scores && data.scores.length > 0
          ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
          : 0.5;
        damageTypes[damageType] = {
          confidence: avgScore,
          numInstances: data.num_instances || 0,
        };
        totalConfidence += avgScore * (data.num_instances || 0);
        totalInstances += data.num_instances || 0;
      }
      
      sam3EvidenceFormatted = {
        damageTypes,
        overallConfidence: totalInstances > 0 ? totalConfidence / totalInstances : 0.5,
      };
    }
    
    const bayesianFusionResult = BayesianFusionService.fuseEvidence({
      sam3Evidence: sam3EvidenceFormatted,
      gpt4Assessment: {
        severity: assessment.damageAssessment.severity,
        confidence: assessment.damageAssessment.confidence,
        damageType: assessment.damageAssessment.damageType,
        hasCriticalHazards: assessment.safetyHazards.hasCriticalHazards,
      },
      sceneGraphFeatures: assessment.evidence?.sceneGraphFeatures || null,
    });

    // Use Bayesian fusion results (more sophisticated) if available, otherwise fall back to detector fusion
    const fusionMean = bayesianFusionResult.mean || detectorFusionResult.fusionMean;
    const fusionVariance = bayesianFusionResult.variance || detectorFusionResult.fusionVariance;
    const detectorOutputs = detectorFusionResult.detectorOutputs;

    // 5. Conformal prediction with hierarchical Mondrian + SSBC
    const cpResult = await mondrianConformalPrediction({
      fusionMean,
      fusionVariance,
      context: {
        propertyType: params.propertyType,
        propertyAge: params.propertyAge,
        region: params.region,
        damageCategory: assessment.damageAssessment.damageType,
      },
      getCalibrationData,
      getDomainShiftWeight,
    });

    // 6. OOD detection (simplified: based on detector confidence distribution)
    const oodScore = computeOODScore(roboflowDetections, detectorFusionResult);

    // 7. Context features (d_eff = 12)
    const contextFeatures = {
      fusion_confidence: fusionMean,
      fusion_variance: fusionVariance,
      cp_set_size: cpResult.predictionSet.length,
      safety_critical_candidate: SafetyAnalysisService.isSafetyCritical(
        assessment.damageAssessment.damageType
      ) ? 1 : 0,
      lighting_quality: imageQuality.lightingQuality,
      image_clarity: imageQuality.imageClarity,
      property_age: params.propertyAge,
      property_age_bin: ContextFeatureService.getPropertyAgeBin(params.propertyAge),
      num_damage_sites: assessment.damageAssessment.detectedItems?.length || 1,
      detector_disagreement: Math.sqrt(detectorFusionResult.disagreementVariance),
      ood_score: oodScore,
      region: params.region,
    };

    return {
      contextFeatures,
      detectorOutputs,
      fusionMean,
      fusionVariance,
      cpStratum: cpResult.stratum,
      cpQuantile: cpResult.quantile,
      cpPredictionSet: cpResult.predictionSet,
      safeLucbRewardUcb: 0, // Set by policy
      safeLucbSafetyUcb: 0,
      safeLucbSafetyThreshold: DELTA_SAFETY,
      safeLucbExploration: false,
      predictedDamageType: assessment.damageAssessment.damageType,
      predictedSeverity: assessment.damageAssessment.severity,
      predictedSafetyCritical: assessment.safetyHazards.hasCriticalHazards,
      predictedHazards: assessment.safetyHazards.hazards,
    };
  }

  // Methods extracted to separate modules:
  // - mondrianConformalPrediction -> ab-test/ABTestConformalPrediction.ts
  // - runSafeLUCBPolicy -> ab-test/ABTestSafeLUCB.ts
  // - All math utilities -> ab-test/ABTestMathUtils.ts
  // - All utility functions -> ab-test/ABTestUtils.ts
  // - Database operations -> ab-test/ABTestDatabase.ts
  // - Calibration data -> ab-test/ABTestCalibration.ts

  /**
   * Get current season for drift detection
   */
  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  // logDecision method extracted to ab-test/ABTestDatabase.ts

}

