/**
 * Safe-LUCB Critic Module
 *
 * Implements constrained contextual bandit policy with hard safety constraints (δ=0.001)
 *
 * Full Safe-LUCB algorithm with:
 * - Linear reward model: r(x, a) = θ^T x
 * - Linear safety model: v(x, a) = φ^T x
 * - UCB for reward: reward_ucb = θ^T x + β ||x||_A^{-1}
 * - UCB for safety: safety_ucb = φ^T x + γ ||x||_B^{-1}
 * - Constraint: safety_ucb ≤ δ_t
 * - Exploration bonus for safe arms
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ContextFeatureService } from './ContextFeatureService';
import {
  normalizeContext,
  dotProduct,
  matrixVectorNorm,
  matrixVectorProduct,
  inverseMatrix,
} from './CriticLinearAlgebra';
import { CriticFNRTracker } from './CriticFNRTracker';
import type { FNRResult } from './CriticFNRTracker';

interface CriticContext {
  context: number[]; // d_eff = 12 dimensional context vector
  delta_safety: number; // δ_t safety threshold
  arms?: string[]; // Available arms (default: ['automate', 'escalate'])
  stratum?: string; // Mondrian stratum for FNR tracking
  criticalHazardDetected?: boolean; // Whether critical hazard was detected
}

interface CriticDecision {
  arm: 'automate' | 'escalate';
  reason?: string;
  safetyUcb: number;
  rewardUcb: number;
  safetyThreshold: number;
  exploration: boolean;
}

interface ModelParameters {
  theta: number[]; // Reward model weights (d_eff = 12)
  phi: number[]; // Safety model weights (d_eff = 12)
  A: number[][]; // Reward covariance matrix (12x12)
  B: number[][]; // Safety covariance matrix (12x12)
  beta: number; // Reward confidence parameter
  gamma: number; // Safety confidence parameter
  n: number; // Number of observations
}

/**
 * Safe-LUCB Critic Module
 *
 * Maintains reward and safety models (θ, φ) and computes UCBs
 * using confidence intervals. Selects arm that maximizes reward
 * while satisfying safety constraint.
 */
export class CriticModule {
  private static readonly D_EFF = 12; // Context dimension
  private static readonly DEFAULT_BETA = 1.0; // Reward confidence parameter
  private static readonly DEFAULT_GAMMA = 2.0; // Safety confidence parameter (more conservative)
  private static readonly LAMBDA = 0.1; // Regularization parameter for ridge regression

  // Model cache (in production, these would be loaded from database)
  private static modelCache: ModelParameters | null = null;
  private static lastModelUpdate: number = 0;
  private static readonly MODEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Select arm using Safe-LUCB policy
   *
   * @param params - Context and safety threshold
   * @returns Decision with UCBs and selected arm
   */
  static async selectArm(params: CriticContext): Promise<CriticDecision> {
    const { context, delta_safety, stratum, criticalHazardDetected } = params;

    // Validate context vector using ContextFeatureService
    const validation = ContextFeatureService.validateContextVector(context);
    if (!validation.valid) {
      logger.warn('Context vector validation failed', {
        service: 'CriticModule',
        error: validation.error,
      });
      // Try to normalize context to correct dimension
      const normalizedCtx = normalizeContext(context, this.D_EFF);
      const normalizedValidation = ContextFeatureService.validateContextVector(normalizedCtx);
      if (!normalizedValidation.valid) {
        throw new Error(`Invalid context vector: ${normalizedValidation.error}`);
      }
      return this.selectArmWithContext(normalizedCtx, delta_safety, stratum, criticalHazardDetected);
    }

    return this.selectArmWithContext(context, delta_safety, stratum, criticalHazardDetected);
  }

  /**
   * Select arm with normalized context
   */
  private static async selectArmWithContext(
    context: number[],
    delta_safety: number,
    stratum?: string,
    criticalHazardDetected?: boolean
  ): Promise<CriticDecision> {
    // Load or initialize models
    const models = await this.loadModels();

    // Compute reward UCB: reward_ucb = θ^T x + β ||x||_A^{-1}
    const rewardUcb = this.computeRewardUCB(context, models);

    // Compute safety LCB: safety_lcb = φ^T x - γ ||x||_B^{-1}
    // Using LOWER confidence bound for pessimistic safety assessment
    const safetyLcb = this.computeSafetyLCB(context, models);

    // For backward compatibility, also compute deprecated UCB
    const safetyUcb = this.computeSafetyUCB(context, models);

    // Safety constraint: NEVER automate if safety_lcb < δ_t
    // This is the CORRECT formulation - we need high confidence that it's safe
    if (safetyLcb < delta_safety) {
      return {
        arm: 'escalate',
        reason: `Safety LCB (${safetyLcb.toFixed(4)}) below threshold (${delta_safety}) - insufficient confidence in safety`,
        safetyUcb, // Keep for compatibility but it's deprecated
        rewardUcb,
        safetyThreshold: delta_safety,
        exploration: false,
      };
    }

    // FNR constraint: Check False Negative Rate if stratum is provided
    if (stratum) {
      const fnrResult = await CriticFNRTracker.getFNRWithFallback(stratum);

      // Log FNR metadata for monitoring
      logger.info('FNR check with statistical validation', {
        service: 'CriticModule',
        stratum,
        stratumUsed: fnrResult.stratumUsed,
        fallbackLevel: fnrResult.fallbackLevel,
        fnr: fnrResult.fnr,
        fnrUpperBound: fnrResult.fnrUpperBound,
        sampleSize: fnrResult.sampleSize,
        shouldEscalate: fnrResult.shouldEscalate,
      });

      if (fnrResult.shouldEscalate) {
        return {
          arm: 'escalate',
          reason: fnrResult.reason || 'FNR constraint violated',
          safetyUcb,
          rewardUcb,
          safetyThreshold: delta_safety,
          exploration: false,
        };
      }
    }

    // If safe, check if reward is high enough to automate
    // Threshold: reward_ucb > 0.5 (can be tuned based on historical data)
    const rewardThreshold = 0.5;

    if (rewardUcb > rewardThreshold) {
      // Check if we should explore (for arms with high uncertainty)
      const exploration = this.shouldExplore(context, models);

      return {
        arm: 'automate',
        safetyUcb,
        rewardUcb,
        safetyThreshold: delta_safety,
        exploration,
      };
    }

    // Default: escalate (low reward)
    return {
      arm: 'escalate',
      reason: `Reward UCB (${rewardUcb.toFixed(4)}) below threshold (${rewardThreshold})`,
      safetyUcb,
      rewardUcb,
      safetyThreshold: delta_safety,
      exploration: false,
    };
  }

  /**
   * Compute reward UCB (Upper Confidence Bound for reward)
   *
   * reward_ucb = θ^T x + β ||x||_A^{-1}
   * where θ is learned reward model and A is reward covariance matrix
   */
  private static computeRewardUCB(
    context: number[],
    models: ModelParameters
  ): number {
    // Mean reward: θ^T x
    const meanReward = dotProduct(models.theta, context);

    // Confidence interval: β ||x||_A^{-1}
    const confidenceInterval = models.beta * matrixVectorNorm(
      context,
      models.A
    );

    return meanReward + confidenceInterval;
  }

  /**
   * Compute safety UCB (Upper Confidence Bound for safety violation)
   *
   * safety_ucb = φ^T x + γ ||x||_B^{-1}
   * where φ is learned safety model and B is safety covariance matrix
   *
   * WARNING: This method is DEPRECATED and incorrectly uses optimistic bounds for safety.
   * Use computeSafetyLCB() instead for proper pessimistic safety guarantees.
   */
  private static computeSafetyUCB(
    context: number[],
    models: ModelParameters
  ): number {
    // Mean safety violation: φ^T x
    const meanSafety = dotProduct(models.phi, context);

    // Confidence interval: γ ||x||_B^{-1}
    const confidenceInterval = models.gamma * matrixVectorNorm(
      context,
      models.B
    );

    return meanSafety + confidenceInterval;
  }

  /**
   * Compute safety LCB (Lower Confidence Bound for safety)
   *
   * safety_lcb = φ^T x - γ ||x||_B^{-1}
   * where φ is learned safety model and B is safety covariance matrix
   *
   * This uses a PESSIMISTIC bound for safety - we assume the worst case
   * within our confidence interval. This is the correct approach for safety-critical
   * decisions where false negatives (missing hazards) are costly.
   */
  private static computeSafetyLCB(
    context: number[],
    models: ModelParameters
  ): number {
    // Mean safety score: φ^T x
    const meanSafety = dotProduct(models.phi, context);

    // Confidence interval: γ ||x||_B^{-1}
    const confidenceInterval = models.gamma * matrixVectorNorm(
      context,
      models.B
    );

    // Return LOWER bound (pessimistic about safety)
    return meanSafety - confidenceInterval;
  }

  /**
   * Determine if we should explore (high uncertainty)
   */
  private static shouldExplore(
    context: number[],
    models: ModelParameters
  ): boolean {
    // Explore if we have few observations or high uncertainty
    if (models.n < 100) {
      return true; // Always explore early
    }

    // High uncertainty if confidence intervals are large
    const rewardUncertainty = matrixVectorNorm(context, models.A);
    const safetyUncertainty = matrixVectorNorm(context, models.B);

    // Explore if uncertainty is high relative to mean
    return rewardUncertainty > 0.1 || safetyUncertainty > 0.1;
  }

  /**
   * Load models from database or initialize defaults
   */
  private static async loadModels(): Promise<ModelParameters> {
    // Check cache
    const now = Date.now();
    if (
      this.modelCache &&
      now - this.lastModelUpdate < this.MODEL_CACHE_TTL
    ) {
      return this.modelCache;
    }

    try {
      // Try to load from database
      const { data } = await serverSupabase
        .from('ab_critic_models')
        .select('*')
        .eq('model_type', 'safe_lucb')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (data && data.parameters) {
        const params = data.parameters as Partial<ModelParameters>;
        this.modelCache = {
          theta: (Array.isArray(params.theta) ? params.theta : undefined) || this.initializeTheta(),
          phi: (Array.isArray(params.phi) ? params.phi : undefined) || this.initializePhi(),
          A: (Array.isArray(params.A) && Array.isArray(params.A[0]) ? params.A : undefined) || this.initializeCovariance(),
          B: (Array.isArray(params.B) && Array.isArray(params.B[0]) ? params.B : undefined) || this.initializeCovariance(),
          beta: typeof params.beta === 'number' ? params.beta : this.DEFAULT_BETA,
          gamma: typeof params.gamma === 'number' ? params.gamma : this.DEFAULT_GAMMA,
          n: typeof params.n === 'number' ? params.n : 0,
        };
        this.lastModelUpdate = now;
        return this.modelCache;
      }
    } catch (error) {
      logger.warn('Failed to load critic models from database, using defaults', {
        service: 'CriticModule',
        error,
      });
    }

    // Initialize default models (conservative)
    this.modelCache = {
      theta: this.initializeTheta(),
      phi: this.initializePhi(),
      A: this.initializeCovariance(),
      B: this.initializeCovariance(),
      beta: this.DEFAULT_BETA,
      gamma: this.DEFAULT_GAMMA,
      n: 0,
    };
    this.lastModelUpdate = now;

    return this.modelCache;
  }

  /**
   * Initialize reward model weights (θ)
   * Conservative: assumes low reward for automation initially
   */
  private static initializeTheta(): number[] {
    // Initialize to small positive values (slight optimism)
    return new Array(this.D_EFF).fill(0.1);
  }

  /**
   * Initialize safety model weights (φ)
   * Conservative: assumes some safety risk initially
   */
  private static initializePhi(): number[] {
    // Initialize to small positive values (conservative safety estimate)
    return new Array(this.D_EFF).fill(0.001);
  }

  /**
   * Initialize covariance matrix (identity with regularization)
   */
  private static initializeCovariance(): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < this.D_EFF; i++) {
      matrix[i] = [];
      for (let j = 0; j < this.D_EFF; j++) {
        matrix[i][j] = i === j ? 1.0 + this.LAMBDA : 0.0;
      }
    }
    return matrix;
  }

  /**
   * Update models from feedback using Recursive Least Squares (RLS)
   *
   * Called after outcome is observed to update θ and φ
   * using Recursive Least Squares (RLS) algorithm
   *
   * RLS Update:
   * - A_t = A_{t-1} + x_t x_t^T  (covariance update)
   * - b_t = b_{t-1} + x_t y_t    (target update)
   * - θ_t = A_t^{-1} b_t          (weight update via Sherman-Morrison)
   */
  static async updateFromFeedback(params: {
    context: number[];
    arm: 'automate' | 'escalate';
    reward: number; // Observed reward (e.g., 1 if correct, 0 if incorrect)
    safetyViolation: boolean; // True if SFN occurred
  }): Promise<void> {
    try {
      const models = await this.loadModels();
      const normalizedCtx = normalizeContext(params.context, this.D_EFF);

      // Update reward model (θ) using RLS
      models.theta = this.updateRLS(
        models.theta,
        models.A,
        normalizedCtx,
        params.reward,
        this.LAMBDA
      );

      // Update safety model (φ) using RLS
      const safetyLabel = params.safetyViolation ? 1.0 : 0.0;
      models.phi = this.updateRLS(
        models.phi,
        models.B,
        normalizedCtx,
        safetyLabel,
        this.LAMBDA
      );

      // Update covariance matrices (Sherman-Morrison formula for RLS)
      models.A = this.updateCovarianceRLS(models.A, normalizedCtx, this.LAMBDA);
      models.B = this.updateCovarianceRLS(models.B, normalizedCtx, this.LAMBDA);

      // Increment observation count
      models.n += 1;

      // Save to database (async, don't block)
      this.saveModels(models).catch((error) => {
        logger.error('Failed to save critic models', {
          service: 'CriticModule',
          error,
        });
      });

      // Update cache
      this.modelCache = models;
      this.lastModelUpdate = Date.now();
    } catch (error) {
      logger.error('Failed to update critic models from feedback', {
        service: 'CriticModule',
        error,
      });
    }
  }

  /**
   * Update weights using Recursive Least Squares (RLS)
   *
   * RLS algorithm:
   * 1. Update covariance: A_t = A_{t-1} + x_t x_t^T + λI (regularization)
   * 2. Update target vector: b_t = b_{t-1} + x_t y_t
   * 3. Solve for weights: θ_t = A_t^{-1} b_t
   *
   * Using Sherman-Morrison formula for efficient A^{-1} update:
   * A_t^{-1} = A_{t-1}^{-1} - (A_{t-1}^{-1} x x^T A_{t-1}^{-1}) / (1 + x^T A_{t-1}^{-1} x)
   */
  private static updateRLS(
    weights: number[],
    covariance: number[][],
    context: number[],
    label: number,
    lambda: number
  ): number[] {
    // RLS update using Sherman-Morrison formula
    // θ_t = θ_{t-1} + (A_t^{-1} x_t) * (y_t - θ_{t-1}^T x_t)

    const prediction = dotProduct(weights, context);
    const error = label - prediction;

    // Compute A^{-1} x (using current covariance)
    const invAx = matrixVectorProduct(inverseMatrix(covariance), context);

    // Compute x^T A^{-1} x
    const xInvAx = dotProduct(context, invAx);

    // RLS weight update: θ_t = θ_{t-1} + (A^{-1} x) * error / (1 + x^T A^{-1} x)
    const stepSize = error / (1 + xInvAx);
    return weights.map((w, i) => w + invAx[i] * stepSize);
  }

  /**
   * Update covariance matrix using Sherman-Morrison formula for RLS
   *
   * RLS covariance update:
   * A_t = A_{t-1} + x_t x_t^T + λI (regularization)
   *
   * For efficient A^{-1} update using Sherman-Morrison:
   * If A_t = A_{t-1} + x x^T, then:
   * A_t^{-1} = A_{t-1}^{-1} - (A_{t-1}^{-1} x x^T A_{t-1}^{-1}) / (1 + x^T A_{t-1}^{-1} x)
   *
   * But we update A directly (not A^{-1}), so:
   * A_t = A_{t-1} + x x^T + λI (where λ is small regularization)
   */
  private static updateCovarianceRLS(
    A: number[][],
    x: number[],
    lambda: number
  ): number[][] {
    // RLS covariance update: A_t = A_{t-1} + x x^T + λI
    // Note: This is the direct update (for covariance matrix)
    // The inverse is updated separately using Sherman-Morrison when needed

    const newA: number[][] = [];
    for (let i = 0; i < A.length; i++) {
      newA[i] = [];
      for (let j = 0; j < A[i].length; j++) {
        // A_t = A_{t-1} + x x^T + λI
        newA[i][j] = A[i][j] + x[i] * x[j] + (i === j ? lambda : 0);
      }
    }

    return newA;
  }

  /**
   * Save models to database
   */
  private static async saveModels(models: ModelParameters): Promise<void> {
    await serverSupabase.from('ab_critic_models').upsert({
      model_type: 'safe_lucb',
      parameters: {
        theta: models.theta,
        phi: models.phi,
        A: models.A,
        B: models.B,
        beta: models.beta,
        gamma: models.gamma,
        n: models.n,
      },
      updated_at: new Date().toISOString(),
    });
  }

  // ============================================================================
  // FNR Delegation Methods (public API preserved for callers)
  // Implementation lives in CriticFNRTracker
  // ============================================================================

  /** @see CriticFNRTracker.getFNR */
  static async getFNR(stratum: string): Promise<FNRResult> {
    return CriticFNRTracker.getFNR(stratum);
  }

  /** @see CriticFNRTracker.getFNRWithFallback */
  static async getFNRWithFallback(stratum: string): Promise<
    FNRResult & { stratumUsed: string; fallbackLevel: number }
  > {
    return CriticFNRTracker.getFNRWithFallback(stratum);
  }

  /** @see CriticFNRTracker.recordOutcome */
  static async recordOutcome(
    stratum: string,
    decision: 'automate' | 'escalate',
    actualCriticalHazard: boolean
  ): Promise<void> {
    return CriticFNRTracker.recordOutcome(stratum, decision, actualCriticalHazard);
  }
}
