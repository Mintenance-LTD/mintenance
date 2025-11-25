/**
 * A/B Testing Harness for Safe AI Automation
 * 
 * Implements:
 * - Correlation-aware Bayesian fusion (w^T Σ w)
 * - Hierarchical Mondrian conformal prediction with SSBC
 * - Safe-LUCB contextual bandit policy
 * - Pre-registered A/B testing protocol
 */

import { logger, hashString } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BuildingSurveyorService } from './BuildingSurveyorService';
import { CriticModule } from './critic';
import { DetectorFusionService } from './DetectorFusionService';
import { BayesianFusionService } from './BayesianFusionService';
import { SafetyAnalysisService } from './SafetyAnalysisService';
import { ContextFeatureService } from './ContextFeatureService';
import { ImageQualityService } from './ImageQualityService';
import { ImageAnalysisService, type ImageAnalysisResult } from '@/lib/services/ImageAnalysisService';
import type { Phase1BuildingAssessment, AssessmentContext } from './types';

interface AITestResult {
  contextFeatures: Record<string, any>;
  detectorOutputs: {
    yolo: any;
    maskrcnn: any;
    sam: any;
  };
  fusionMean: number;
  fusionVariance: number;
  cpStratum: string;
  cpQuantile: number;
  cpPredictionSet: string[];
  safeLucbRewardUcb: number;
  safeLucbSafetyUcb: number;
  safeLucbSafetyThreshold: number;
  safeLucbExploration: boolean;
  predictedDamageType: string;
  predictedSeverity: string;
  predictedSafetyCritical: boolean;
  predictedHazards: any[];
}

interface SafeLUCBResult {
  decision: 'automate' | 'escalate';
  escalationReason?: string;
  safetyUcb: number;
  rewardUcb: number;
  safetyThreshold: number;
  exploration: boolean;
}

interface CalibrationDataPoint {
  trueClass: string;
  trueProbability: number;
  nonconformityScore: number;
  importanceWeight: number;
}

export class ABTestIntegration {
  private experimentId: string;
  private readonly D_EFF = 12; // Effective context dimension
  private readonly DELTA_SAFETY = 0.001; // δ_t safety threshold (default)
  private readonly DELTA_SAFETY_RAIL = 0.0001; // Stricter threshold for rail infrastructure
  private readonly DELTA_SAFETY_CONSTRUCTION = 0.0005; // Stricter threshold for construction sites

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
      const assignment = await this.getOrCreateAssignment(params.userId);

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
        lucbResult = await this.runSafeLUCBPolicy(aiResult);
        decision = lucbResult.decision;
        escalationReason = lucbResult.escalationReason;
      }

      // 4. Log decision to database (reuse lucbResult to avoid duplicate call)
      await this.logDecision({
        assignmentId: assignment.id,
        assessmentId: params.assessmentId,
        armId: assignment.armId,
        decision,
        escalationReason,
        aiResult,
        lucbResult,
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
    const cpResult = await this.mondrianConformalPrediction(
      fusionMean,
      fusionVariance,
      {
        propertyType: params.propertyType,
        propertyAge: params.propertyAge,
        region: params.region,
        damageCategory: assessment.damageAssessment.damageType,
      }
    );

    // 6. OOD detection (simplified: based on detector confidence distribution)
    const oodScore = this.computeOODScore(roboflowDetections, detectorFusionResult);

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
      safeLucbSafetyThreshold: this.DELTA_SAFETY,
      safeLucbExploration: false,
      predictedDamageType: assessment.damageAssessment.damageType,
      predictedSeverity: assessment.damageAssessment.severity,
      predictedSafetyCritical: assessment.safetyHazards.hasCriticalHazards,
      predictedHazards: assessment.safetyHazards.hazards,
    };
  }

  /**
   * 2B: Hierarchical Mondrian Conformal Prediction with SSBC
   * Enhanced with industrial scaling (rail, construction)
   */
  private async mondrianConformalPrediction(
    fusionMean: number,
    fusionVariance: number,
    context: {
      propertyType: string;
      propertyAge: number;
      region: string;
      damageCategory: string;
    }
  ): Promise<{
    stratum: string;
    quantile: number;
    predictionSet: string[];
  }> {
    // 1. Determine Mondrian stratum with enhanced stratification
    // Includes: property_type, age_bin, region, damage_category
    // Supports: residential, commercial, rail, construction
    // Future: Use learned CART tree for optimal stratification (18 strata)
    const ageBin = ContextFeatureService.getPropertyAgeBin(context.propertyAge);
    const damageCategory = this.normalizeDamageCategory(context.damageCategory);
    
    // Normalize property type (handle industrial types)
    const normalizedPropertyType = this.normalizePropertyType(context.propertyType);
    
    // Start with most specific stratum (4 dimensions)
    let stratum = `${normalizedPropertyType}_${ageBin}_${context.region}_${damageCategory}`;

    // 2. Hierarchical fallback: leaf → parent → grandparent → global
    let calibrationData = await this.getCalibrationData(stratum);

    if (!calibrationData || calibrationData.length < 50) {
      // Back off to parent (drop damage category)
      stratum = `${context.propertyType}_${ageBin}_${context.region}`;
      calibrationData = await this.getCalibrationData(stratum);
    }

    if (!calibrationData || calibrationData.length < 50) {
      // Back off to grandparent (drop region)
      stratum = `${context.propertyType}_${ageBin}`;
      calibrationData = await this.getCalibrationData(stratum);
    }

    if (!calibrationData || calibrationData.length < 50) {
      // Back off to great-grandparent (drop age bin)
      stratum = `${context.propertyType}`;
      calibrationData = await this.getCalibrationData(stratum);
    }

    if (!calibrationData || calibrationData.length < 50) {
      // Global fallback (weighted by importance)
      stratum = 'global';
      calibrationData = await this.getCalibrationData(stratum);
    }

    const n_cal = calibrationData.length;

    // 3. Small Sample Beta Correction (SSBC)
    const alpha = 0.10; // Target 90% coverage
    let alpha_prime = alpha;

    if (n_cal < 100) {
      // SSBC: α' = BetaInv(1-α; n+1, 1)
      alpha_prime = this.betaQuantile(1 - alpha, n_cal + 1, 1);
    }

    // 4. Importance weighting for distribution shift
    const domainShiftWeight = await this.getDomainShiftWeight(context);

    // 5. Compute conformal quantile (with weighting)
    const nonconformityScores = calibrationData.map(cal => 
      1 - cal.trueProbability
    );

    const weightedQuantile = this.weightedQuantile(
      nonconformityScores,
      calibrationData.map(() => domainShiftWeight),
      1 - alpha_prime
    );

    // 6. Construct prediction set
    const allClasses = [
      'cosmetic',
      'water_damage',
      'structural_minor',
      'structural_major',
      'electrical',
      'mold',
      'pest',
    ];

    const predictionSet = allClasses.filter(cls => {
      const score = 1 - fusionMean; // Simplified nonconformity
      return score <= weightedQuantile;
    });

    // Ensure at least true class is in set (safety)
    if (predictionSet.length === 0) {
      predictionSet.push(context.damageCategory);
    }

    return {
      stratum,
      quantile: weightedQuantile,
      predictionSet,
    };
  }

  /**
   * 2C: Safe-LUCB Policy Decision
   */
  private async runSafeLUCBPolicy(aiResult: AITestResult): Promise<SafeLUCBResult> {
    // 1. Check if context is in SEED SAFE SET
    const seedSafeSet = await this.checkSeedSafeSet(aiResult.contextFeatures);

    if (!seedSafeSet.isSafe) {
      return {
        decision: 'escalate',
        escalationReason: `Context not in verified safe set (requires ≥1k historical validations with SFN=0, found ${seedSafeSet.historicalCount})`,
        safetyUcb: 1.0,
        rewardUcb: 0.0,
        safetyThreshold: this.DELTA_SAFETY,
        exploration: false,
      };
    }

    // 2. Construct context vector for critic (d_eff = 12)
    // Use ContextFeatureService to ensure consistency
    const contextVector = ContextFeatureService.constructContextVector({
      fusion_confidence: aiResult.fusionMean,
      fusion_variance: aiResult.fusionVariance,
      cp_set_size: aiResult.cpPredictionSet.length,
      safety_critical_candidate: aiResult.predictedSafetyCritical ? 1 : 0,
      lighting_quality: aiResult.contextFeatures.lighting_quality,
      image_clarity: aiResult.contextFeatures.image_clarity,
      property_age: aiResult.contextFeatures.property_age,
      property_age_bin: aiResult.contextFeatures.property_age_bin,
      num_damage_sites: aiResult.contextFeatures.num_damage_sites,
      detector_disagreement: aiResult.contextFeatures.detector_disagreement,
      ood_score: aiResult.contextFeatures.ood_score,
      region: aiResult.contextFeatures.region,
    });

    // 3. Adjust safety threshold for industrial contexts (stricter for rail/construction)
    // Extract property type from stratum (format: propertyType_ageBin_region_damageCategory)
    const stratumParts = aiResult.cpStratum.split('_');
    const propertyType = stratumParts.length > 0 ? this.normalizePropertyType(stratumParts[0]) : 'residential';
    const deltaSafety = this.getSafetyThreshold(propertyType);

    // 4. Call Safe-LUCB critic with stratum and critical hazard info
    const criticDecision = await this.callSafeLUCBCritic({
      context: contextVector,
      delta_safety: deltaSafety,
      stratum: aiResult.cpStratum,
      criticalHazardDetected: aiResult.predictedSafetyCritical,
    });

    // 4. Safety gate: NEVER automate unless safety-UCB ≤ δ_t
    if (criticDecision.arm === 'automate' && 
        criticDecision.safetyUcb > criticDecision.safetyThreshold) {
      return {
        decision: 'escalate',
        escalationReason: `Safety UCB (${criticDecision.safetyUcb.toFixed(4)}) exceeds threshold (${criticDecision.safetyThreshold})`,
        safetyUcb: criticDecision.safetyUcb,
        rewardUcb: criticDecision.rewardUcb,
        safetyThreshold: criticDecision.safetyThreshold,
        exploration: criticDecision.exploration,
      };
    }

    return {
      decision: criticDecision.arm as 'automate' | 'escalate',
      escalationReason: criticDecision.arm === 'escalate' 
        ? criticDecision.reason 
        : undefined,
      safetyUcb: criticDecision.safetyUcb,
      rewardUcb: criticDecision.rewardUcb,
      safetyThreshold: criticDecision.safetyThreshold,
      exploration: criticDecision.exploration,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  // Variance calculation moved to DetectorFusionService

  /**
   * Compute Beta quantile (inverse CDF) using numerical approximation
   * 
   * Implements BetaInv(1-α; n+1, 1) for Small Sample Beta Correction (SSBC)
   * Uses Newton-Raphson method for numerical root finding
   */
  private betaQuantile(p: number, a: number, b: number): number {
    // For Beta(α, β), we want the p-th quantile
    // Special case: Beta(n+1, 1) has closed form: p^(1/(n+1))
    if (b === 1) {
      return Math.pow(p, 1 / a);
    }

    // For Beta(1, n+1), use: 1 - (1-p)^(1/(n+1))
    if (a === 1) {
      return 1 - Math.pow(1 - p, 1 / b);
    }

    // General case: use Newton-Raphson to solve BetaCDF(x; a, b) = p
    // BetaCDF(x; a, b) = I_x(a, b) where I_x is the regularized incomplete beta function
    return this.betaQuantileNewtonRaphson(p, a, b);
  }

  /**
   * Compute Beta quantile using Newton-Raphson method
   */
  private betaQuantileNewtonRaphson(p: number, a: number, b: number, maxIterations: number = 50): number {
    // Initial guess: use normal approximation for Beta distribution
    const mean = a / (a + b);
    const variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
    let x = Math.max(0.001, Math.min(0.999, mean));

    const tolerance = 1e-6;

    for (let i = 0; i < maxIterations; i++) {
      const cdf = this.betaCDF(x, a, b);
      const pdf = this.betaPDF(x, a, b);

      if (Math.abs(pdf) < 1e-10) {
        // Avoid division by zero
        break;
      }

      const error = cdf - p;
      if (Math.abs(error) < tolerance) {
        break;
      }

      // Newton-Raphson: x_new = x - (CDF(x) - p) / PDF(x)
      x = x - error / pdf;
      
      // Clamp to valid range
      x = Math.max(0.001, Math.min(0.999, x));
    }

    return x;
  }

  /**
   * Compute Beta CDF (regularized incomplete beta function)
   * Uses continued fraction approximation
   */
  private betaCDF(x: number, a: number, b: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Use symmetry: I_x(a, b) = 1 - I_{1-x}(b, a)
    if (x > 0.5) {
      return 1 - this.betaCDF(1 - x, b, a);
    }

    // For small x, use series expansion
    // I_x(a, b) = (x^a / (a * B(a, b))) * (1 + sum of terms)
    const beta = this.betaFunction(a, b);
    const term1 = Math.pow(x, a) / (a * beta);
    
    // Simplified: use first few terms of series
    let sum = 1;
    let term = 1;
    for (let i = 1; i < 20; i++) {
      term *= (a + i - 1) * x / ((a + b + i - 1) * i);
      sum += term;
      if (Math.abs(term) < 1e-10) break;
    }

    return term1 * sum;
  }

  /**
   * Compute Beta PDF
   */
  private betaPDF(x: number, a: number, b: number): number {
    if (x <= 0 || x >= 1) return 0;
    const beta = this.betaFunction(a, b);
    return Math.pow(x, a - 1) * Math.pow(1 - x, b - 1) / beta;
  }

  /**
   * Compute Beta function B(a, b) = Gamma(a) * Gamma(b) / Gamma(a + b)
   * Uses logarithms for numerical stability
   */
  private betaFunction(a: number, b: number): number {
    // B(a, b) = exp(logGamma(a) + logGamma(b) - logGamma(a + b))
    return Math.exp(this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b));
  }

  /**
   * Compute log Gamma function using Stirling's approximation
   */
  private logGamma(z: number): number {
    if (z < 12) {
      // Use recurrence: logGamma(z) = logGamma(z+1) - log(z)
      return this.logGamma(z + 1) - Math.log(z);
    }

    // Stirling's approximation for large z
    const c = [
      0.99999999999999709182,
      57.156235665862923517,
      -59.597960355475491248,
      14.136097974741747174,
      -0.49191381609762019978,
      0.33994649984811888699e-4,
      0.46523628927048575665e-4,
      -0.98374475304879564677e-4,
      0.15808870322491248884e-3,
      -0.21026444172410488319e-3,
      0.21743961811521264320e-3,
      -0.16431810653676389022e-3,
      0.84418223983852743293e-4,
      -0.26190838401581408670e-4,
      0.36899182659531622704e-5,
    ];

    let ser = c[0];
    for (let i = 1; i < c.length; i++) {
      ser += c[i] / (z + i - 1);
    }

    const t = z + 5.2421875;
    return Math.log(2.5066282746310005 * ser / z) + (z - 0.5) * Math.log(t) - t;
  }

  private async getCalibrationData(stratum: string): Promise<CalibrationDataPoint[]> {
    const { data } = await serverSupabase
      .from('ab_calibration_data')
      .select('*')
      .eq('stratum', stratum)
      .order('created_at', { ascending: false })
      .limit(1000);

    return (data || []).map(d => ({
      trueClass: d.true_class,
      trueProbability: parseFloat(d.true_probability),
      nonconformityScore: parseFloat(d.nonconformity_score),
      importanceWeight: parseFloat(d.importance_weight || '1.0'),
    }));
  }

  private async getDomainShiftWeight(context: any): Promise<number> {
    // Domain classifier approach (logistic density ratio)
    // For now, return conservative weight
    return 1.0;
  }

  private weightedQuantile(
    scores: number[],
    weights: number[],
    percentile: number
  ): number {
    const sorted = scores
      .map((score, i) => ({ score, weight: weights[i] }))
      .sort((a, b) => a.score - b.score);

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let cumWeight = 0;

    for (const item of sorted) {
      cumWeight += item.weight;
      if (cumWeight / totalWeight >= percentile) {
        return item.score;
      }
    }

    return sorted[sorted.length - 1]?.score || 0;
  }

  private async checkSeedSafeSet(context: Record<string, any>): Promise<{
    isSafe: boolean;
    historicalCount: number;
    historicalSfnRate: number;
    wilsonUpper: number;
  }> {
    // Extract property type from context (may need to be inferred from other fields)
    // For now, assume it's stored in context or use a default
    const propertyType = context.property_type || 'residential';
    const propertyAgeBin = context.property_age_bin || '50-100';
    const region = context.region || 'unknown';

    const { data } = await serverSupabase
      .from('ab_historical_validations')
      .select('*')
      .eq('property_type', propertyType)
      .eq('property_age_bin', propertyAgeBin)
      .eq('region', region)
      .gte('validated_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

    if (!data || data.length < 1000) {
      return {
        isSafe: false,
        historicalCount: data?.length || 0,
        historicalSfnRate: 1.0,
        wilsonUpper: 1.0,
      };
    }

    const sfnCount = data.filter(v => v.sfn === true).length;
    const sfnRate = sfnCount / data.length;

    // Wilson score upper bound
    const wilsonUpper = this.wilsonScoreUpper(sfnCount, data.length, 0.95);

    const isSafe = sfnCount === 0 && wilsonUpper <= 0.005; // ≤0.5%

    return {
      isSafe,
      historicalCount: data.length,
      historicalSfnRate: sfnRate,
      wilsonUpper,
    };
  }

  private wilsonScoreUpper(successes: number, trials: number, confidence: number): number {
    const z = 1.96; // 95% confidence
    const p = successes / trials;
    const denominator = 1 + z ** 2 / trials;
    const center = (p + z ** 2 / (2 * trials)) / denominator;
    const margin = z * Math.sqrt((p * (1 - p) / trials + z ** 2 / (4 * trials ** 2))) / denominator;
    return Math.min(1.0, center + margin);
  }

  // Safety critical check moved to SafetyAnalysisService

  // Age bin and encoding methods moved to ContextFeatureService

  /**
   * Normalize damage category for stratification
   * Maps various damage types to canonical categories for consistent stratification
   */
  /**
   * Normalize property type for stratification
   * Maps industrial types (rail, construction) to standardized names
   */
  private normalizePropertyType(propertyType: string): string {
    const normalized = propertyType.toLowerCase().trim();
    
    // Industrial types
    if (normalized.includes('rail') || normalized.includes('railway') || normalized.includes('track')) {
      return 'rail';
    }
    if (normalized.includes('construction') || normalized.includes('site') || normalized.includes('infrastructure')) {
      return 'construction';
    }
    
    // Standard types
    if (normalized.includes('residential') || normalized.includes('home') || normalized.includes('house')) {
      return 'residential';
    }
    if (normalized.includes('commercial') || normalized.includes('business') || normalized.includes('office')) {
      return 'commercial';
    }
    
    // Default
    return normalized || 'residential';
  }

  /**
   * Get safety threshold based on property type
   * Industrial contexts (rail, construction) require stricter thresholds
   */
  private getSafetyThreshold(propertyType: string): number {
    const normalized = this.normalizePropertyType(propertyType);
    
    if (normalized === 'rail') {
      return this.DELTA_SAFETY_RAIL;
    }
    if (normalized === 'construction') {
      return this.DELTA_SAFETY_CONSTRUCTION;
    }
    
    return this.DELTA_SAFETY;
  }

  private normalizeDamageCategory(damageType: string): string {
    const normalized = damageType.toLowerCase().trim();
    
    // Map to canonical categories
    if (normalized.includes('structural') || normalized.includes('foundation')) {
      return 'structural';
    }
    if (normalized.includes('water') || normalized.includes('leak') || normalized.includes('flood')) {
      return 'water_damage';
    }
    if (normalized.includes('electrical') || normalized.includes('wiring')) {
      return 'electrical';
    }
    if (normalized.includes('mold') || normalized.includes('fungus')) {
      return 'mold';
    }
    if (normalized.includes('pest') || normalized.includes('termite') || normalized.includes('rodent')) {
      return 'pest';
    }
    if (normalized.includes('fire') || normalized.includes('smoke')) {
      return 'fire';
    }
    if (normalized.includes('roof') || normalized.includes('siding') || normalized.includes('exterior')) {
      return 'exterior';
    }
    
    // Default: cosmetic or unknown
    return 'cosmetic';
  }

  /**
   * Compute OOD (Out-of-Distribution) score
   * 
   * Detects unusual patterns that suggest the input is outside the training distribution.
   * Higher score = more likely to be OOD.
   */
  private computeOODScore(
    roboflowDetections: any[],
    fusionResult: { fusionMean: number; fusionVariance: number; disagreementVariance: number }
  ): number {
    // OOD indicators:
    // 1. Very low detector confidence (unusual patterns)
    // 2. High variance/disagreement (uncertainty)
    // 3. No detections (unusual for property damage images)
    
    let oodScore = 0.0;

    // Low confidence suggests OOD
    if (fusionResult.fusionMean < 0.3) {
      oodScore += 0.4;
    } else if (fusionResult.fusionMean < 0.5) {
      oodScore += 0.2;
    }

    // High variance suggests uncertainty/OOD
    if (fusionResult.fusionVariance > 0.2) {
      oodScore += 0.3;
    } else if (fusionResult.fusionVariance > 0.1) {
      oodScore += 0.15;
    }

    // High disagreement suggests OOD
    if (fusionResult.disagreementVariance > 0.15) {
      oodScore += 0.2;
    }

    // No detections is unusual
    if (roboflowDetections.length === 0) {
      oodScore += 0.1;
    }

    return Math.min(1.0, oodScore);
  }

  private async callSafeLUCBCritic(params: {
    context: number[];
    delta_safety: number;
    stratum?: string;
    criticalHazardDetected?: boolean;
  }): Promise<{
    arm: 'automate' | 'escalate';
    reason?: string;
    safetyUcb: number;
    rewardUcb: number;
    safetyThreshold: number;
    exploration: boolean;
  }> {
    // Call Safe-LUCB critic module
    const decision = await CriticModule.selectArm({
      context: params.context,
      delta_safety: params.delta_safety,
      arms: ['automate', 'escalate'],
      stratum: params.stratum,
      criticalHazardDetected: params.criticalHazardDetected,
    });

    // Record outcome if decision was made (async, non-blocking)
    if (params.stratum && decision.arm === 'automate') {
      CriticModule.recordOutcome(
        params.stratum,
        decision.arm,
        params.criticalHazardDetected || false
      ).catch((error) => {
        logger.error('Failed to record FNR outcome', {
          service: 'ABTestIntegration',
          stratum: params.stratum,
          error,
        });
      });
    }

    return decision;
  }

  private async getOrCreateAssignment(userId: string): Promise<{
    id: string;
    armId: string;
    armName: string;
  }> {
    // Check existing assignment
    const { data: existing } = await serverSupabase
      .from('ab_assignments')
      .select('id, arm_id, ab_arms!inner(name)')
      .eq('experiment_id', this.experimentId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return {
        id: existing.id,
        armId: existing.arm_id,
        armName: (existing.ab_arms as any).name,
      };
    }

    // Create new assignment (deterministic hashing)
    const { data: arms } = await serverSupabase
      .from('ab_arms')
      .select('id, name')
      .eq('experiment_id', this.experimentId);

    if (!arms || arms.length < 2) {
      throw new Error('Experiment must have control and treatment arms');
    }

    const assignmentHash = hashString(`${userId}_${this.experimentId}`);
    const armIndex = assignmentHash % 2;
    const selectedArm = arms[armIndex];

    const { data: assignment, error } = await serverSupabase
      .from('ab_assignments')
      .insert({
        experiment_id: this.experimentId,
        user_id: userId,
        arm_id: selectedArm.id,
        assignment_hash: assignmentHash.toString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: assignment.id,
      armId: selectedArm.id,
      armName: selectedArm.name,
    };
  }

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

  private async logDecision(params: {
    assignmentId: string;
    assessmentId: string;
    armId: string;
    decision: 'automate' | 'escalate';
    escalationReason?: string;
    aiResult: AITestResult;
    lucbResult?: SafeLUCBResult;
  }): Promise<void> {
    await serverSupabase.from('ab_decisions').insert({
      experiment_id: this.experimentId,
      assignment_id: params.assignmentId,
      assessment_id: params.assessmentId,
      arm_id: params.armId,
      decision: params.decision,
      escalation_reason: params.escalationReason,
      fusion_mean: params.aiResult.fusionMean,
      fusion_variance: params.aiResult.fusionVariance,
      cp_stratum: params.aiResult.cpStratum,
      cp_quantile: params.aiResult.cpQuantile,
      cp_prediction_set: params.aiResult.cpPredictionSet,
      safety_ucb: params.lucbResult?.safetyUcb || 0,
      reward_ucb: params.lucbResult?.rewardUcb || 0,
      safety_threshold: params.lucbResult?.safetyThreshold || this.DELTA_SAFETY,
      exploration: params.lucbResult?.exploration || false,
      context_features: params.aiResult.contextFeatures,
      detector_outputs: params.aiResult.detectorOutputs,
      decision_time_ms: Date.now(),
    });
  }

}

