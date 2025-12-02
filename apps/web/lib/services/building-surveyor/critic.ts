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
import { wilsonScoreUpper } from './ab-test/ABTestMathUtils';

interface FNRResult {
  fnr: number; // Point estimate of FNR (0-1)
  fnrUpperBound: number; // Wilson score upper bound (95% confidence)
  sampleSize: number; // Number of automated decisions in stratum
  confidence: number; // Confidence level (0-1)
  shouldEscalate: boolean; // True if FNR upper bound exceeds threshold OR sample size too small
  reason?: string; // Human-readable explanation
}

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

  // FNR tracking cache (stratum -> FNR stats)
  private static fnrCache: Map<string, { fnr: number; lastUpdated: number }> = new Map();
  private static readonly FNR_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

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
      const normalizedContext = this.normalizeContext(context);
      const normalizedValidation = ContextFeatureService.validateContextVector(normalizedContext);
      if (!normalizedValidation.valid) {
        throw new Error(`Invalid context vector: ${normalizedValidation.error}`);
      }
      return this.selectArmWithContext(normalizedContext, delta_safety, stratum, criticalHazardDetected);
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

    // Compute safety UCB: safety_ucb = φ^T x + γ ||x||_B^{-1}
    const safetyUcb = this.computeSafetyUCB(context, models);
    
    // Safety constraint: NEVER automate if safety_ucb > δ_t
    if (safetyUcb > delta_safety) {
      return {
        arm: 'escalate',
        reason: `Safety UCB (${safetyUcb.toFixed(4)}) exceeds threshold (${delta_safety})`,
        safetyUcb,
        rewardUcb,
        safetyThreshold: delta_safety,
        exploration: false,
      };
    }

    // FNR constraint: Check False Negative Rate if stratum is provided
    if (stratum) {
      const fnrResult = await this.getFNRWithFallback(stratum);

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
    const meanReward = this.dotProduct(models.theta, context);

    // Confidence interval: β ||x||_A^{-1}
    const confidenceInterval = models.beta * this.matrixVectorNorm(
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
   */
  private static computeSafetyUCB(
    context: number[],
    models: ModelParameters
  ): number {
    // Mean safety violation: φ^T x
    const meanSafety = this.dotProduct(models.phi, context);

    // Confidence interval: γ ||x||_B^{-1}
    const confidenceInterval = models.gamma * this.matrixVectorNorm(
      context,
      models.B
    );

    return meanSafety + confidenceInterval;
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
    const rewardUncertainty = this.matrixVectorNorm(context, models.A);
    const safetyUncertainty = this.matrixVectorNorm(context, models.B);
    
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
      const normalizedContext = this.normalizeContext(params.context);

      // Update reward model (θ) using RLS
      models.theta = this.updateRLS(
        models.theta,
        models.A,
        normalizedContext,
        params.reward,
        this.LAMBDA
      );

      // Update safety model (φ) using RLS
      const safetyLabel = params.safetyViolation ? 1.0 : 0.0;
      models.phi = this.updateRLS(
        models.phi,
        models.B,
        normalizedContext,
        safetyLabel,
        this.LAMBDA
      );

      // Update covariance matrices (Sherman-Morrison formula for RLS)
      models.A = this.updateCovarianceRLS(models.A, normalizedContext, this.LAMBDA);
      models.B = this.updateCovarianceRLS(models.B, normalizedContext, this.LAMBDA);

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
    
    const prediction = this.dotProduct(weights, context);
    const error = label - prediction;
    
    // Compute A^{-1} x (using current covariance)
    const invAx = this.matrixVectorProduct(this.inverseMatrix(covariance), context);
    
    // Compute x^T A^{-1} x
    const xInvAx = this.dotProduct(context, invAx);
    
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
  // Helper Methods
  // ============================================================================

  /**
   * Normalize context to correct dimension
   */
  private static normalizeContext(context: number[]): number[] {
    if (context.length === this.D_EFF) {
      return context;
    }
    if (context.length > this.D_EFF) {
      return context.slice(0, this.D_EFF);
    }
    // Pad with zeros
    return [...context, ...new Array(this.D_EFF - context.length).fill(0)];
  }

  /**
   * Dot product of two vectors
   */
  private static dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
  }

  /**
   * Matrix-vector product
   */
  private static matrixVectorProduct(A: number[][], x: number[]): number[] {
    return A.map(row => this.dotProduct(row, x));
  }

  /**
   * Compute ||x||_A^{-1} = sqrt(x^T A^{-1} x)
   */
  private static matrixVectorNorm(x: number[], A: number[][]): number {
    const invA = this.inverseMatrix(A);
    const invAx = this.matrixVectorProduct(invA, x);
    const xInvAx = this.dotProduct(x, invAx);
    return Math.sqrt(Math.max(0, xInvAx));
  }

  /**
   * Matrix inverse using LU decomposition with partial pivoting
   * 
   * Implements robust matrix inversion for positive definite covariance matrices.
   * Uses numerical stability checks and handles near-singular matrices.
   */
  private static inverseMatrix(A: number[][]): number[][] {
    const n = A.length;
    
    // Validate matrix dimensions
    if (n === 0 || A[0].length !== n) {
      throw new Error('Matrix must be square and non-empty');
    }

    // Check for numerical stability (condition number estimate)
    const maxAbs = Math.max(...A.flat().map(Math.abs));
    if (maxAbs < 1e-10) {
      logger.warn('Matrix is near-zero, using identity regularization', {
        service: 'CriticModule',
      });
      // Return regularized identity
      return this.regularizedIdentity(n);
    }

    // Try Cholesky decomposition first (faster for positive definite matrices)
    try {
      return this.inverseCholesky(A);
    } catch (error) {
      // Fall back to LU decomposition if Cholesky fails
      logger.debug('Cholesky decomposition failed, using LU decomposition', {
        service: 'CriticModule',
      });
      return this.inverseLU(A);
    }
  }

  /**
   * Matrix inverse using Cholesky decomposition (for positive definite matrices)
   */
  private static inverseCholesky(A: number[][]): number[][] {
    const n = A.length;
    
    // Compute Cholesky decomposition: A = L * L^T
    const L: number[][] = [];
    for (let i = 0; i < n; i++) {
      L[i] = new Array(n).fill(0);
    }

    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        if (j === i) {
          for (let k = 0; k < j; k++) {
            sum += L[j][k] * L[j][k];
          }
          const diag = A[j][j] - sum;
          if (diag <= 0) {
            throw new Error('Matrix is not positive definite');
          }
          L[j][j] = Math.sqrt(diag);
        } else {
          for (let k = 0; k < j; k++) {
            sum += L[i][k] * L[j][k];
          }
          L[i][j] = (A[i][j] - sum) / L[j][j];
        }
      }
    }

    // Solve L * L^T * X = I to get inverse
    // First solve L * Y = I, then L^T * X = Y
    const inv: number[][] = [];
    for (let i = 0; i < n; i++) {
      inv[i] = new Array(n).fill(0);
    }

    // Forward substitution: L * Y = I
    for (let col = 0; col < n; col++) {
      const y: number[] = [];
      for (let i = 0; i < n; i++) {
        let sum = i === col ? 1 : 0;
        for (let j = 0; j < i; j++) {
          sum -= L[i][j] * y[j];
        }
        y[i] = sum / L[i][i];
      }

      // Backward substitution: L^T * X = Y
      for (let i = n - 1; i >= 0; i--) {
        let sum = y[i];
        for (let j = i + 1; j < n; j++) {
          sum -= L[j][i] * inv[j][col];
        }
        inv[i][col] = sum / L[i][i];
      }
    }

    return inv;
  }

  /**
   * Matrix inverse using LU decomposition with partial pivoting
   */
  private static inverseLU(A: number[][]): number[][] {
    const n = A.length;
    const inv: number[][] = [];
    
    // Create identity matrix columns
    for (let col = 0; col < n; col++) {
      const b = new Array(n).fill(0);
      b[col] = 1;
      
      // Solve A * x = b using LU decomposition
      const x = this.solveLU(A, b);
      
      for (let i = 0; i < n; i++) {
        if (!inv[i]) inv[i] = [];
        inv[i][col] = x[i];
      }
    }

    return inv;
  }

  /**
   * Solve linear system A * x = b using LU decomposition with partial pivoting
   */
  private static solveLU(A: number[][], b: number[]): number[] {
    const n = A.length;
    
    // Create copies
    const LU: number[][] = A.map(row => [...row]);
    const x = [...b];
    const P: number[] = Array.from({ length: n }, (_, i) => i);

    // LU decomposition with partial pivoting
    for (let k = 0; k < n - 1; k++) {
      // Find pivot
      let maxIdx = k;
      let maxVal = Math.abs(LU[k][k]);
      for (let i = k + 1; i < n; i++) {
        if (Math.abs(LU[i][k]) > maxVal) {
          maxVal = Math.abs(LU[i][k]);
          maxIdx = i;
        }
      }

      // Swap rows
      if (maxIdx !== k) {
        [LU[k], LU[maxIdx]] = [LU[maxIdx], LU[k]];
        [x[k], x[maxIdx]] = [x[maxIdx], x[k]];
        [P[k], P[maxIdx]] = [P[maxIdx], P[k]];
      }

      // Check for singular matrix
      if (Math.abs(LU[k][k]) < 1e-10) {
        logger.warn('Near-singular matrix detected, using regularization', {
          service: 'CriticModule',
        });
        LU[k][k] = 1e-6; // Regularization
      }

      // Eliminate
      for (let i = k + 1; i < n; i++) {
        const factor = LU[i][k] / LU[k][k];
        LU[i][k] = factor;
        for (let j = k + 1; j < n; j++) {
          LU[i][j] -= factor * LU[k][j];
        }
      }
    }

    // Forward substitution: L * y = b
    for (let i = 1; i < n; i++) {
      for (let j = 0; j < i; j++) {
        x[i] -= LU[i][j] * x[j];
      }
    }

    // Backward substitution: U * x = y
    for (let i = n - 1; i >= 0; i--) {
      for (let j = i + 1; j < n; j++) {
        x[i] -= LU[i][j] * x[j];
      }
      if (Math.abs(LU[i][i]) < 1e-10) {
        x[i] = 0; // Handle near-zero pivot
      } else {
        x[i] /= LU[i][i];
      }
    }

    return x;
  }

  /**
   * Return regularized identity matrix (fallback for singular matrices)
   */
  private static regularizedIdentity(n: number): number[][] {
    const inv: number[][] = [];
    const lambda = 0.1; // Regularization parameter
    for (let i = 0; i < n; i++) {
      inv[i] = [];
      for (let j = 0; j < n; j++) {
        inv[i][j] = i === j ? 1.0 / lambda : 0.0;
      }
    }
    return inv;
  }

  // ============================================================================
  // FNR Tracking Methods
  // ============================================================================

  /**
   * Get False Negative Rate with statistical validation for a stratum
   *
   * Implements Wilson score confidence intervals for small samples (n < 100)
   * and validates sample size sufficiency (escalates if n < 10).
   *
   * @param stratum - Mondrian stratum identifier
   * @returns FNRResult with confidence intervals and escalation flag
   */
  static async getFNR(stratum: string): Promise<FNRResult> {
    try {
      // Load from database
      const { data, error } = await serverSupabase
        .from('ab_critic_fnr_tracking')
        .select('false_negatives, total_automated')
        .eq('stratum', stratum)
        .single();

      // Handle "not found" error (PGRST116)
      if (error && error.code === 'PGRST116') {
        return {
          fnr: 0,
          fnrUpperBound: 1.0, // Conservative: assume 100% FNR upper bound when no data
          sampleSize: 0,
          confidence: 0.95,
          shouldEscalate: true,
          reason: 'No data available for stratum - escalating for safety',
        };
      }

      // Handle other database errors
      if (error) {
        logger.error('Database error loading FNR', {
          service: 'CriticModule',
          stratum,
          error,
        });
        return {
          fnr: 0,
          fnrUpperBound: 1.0,
          sampleSize: 0,
          confidence: 0.95,
          shouldEscalate: true,
          reason: 'Database error - escalating for safety',
        };
      }

      const falseNegatives = data?.false_negatives || 0;
      const totalAutomated = data?.total_automated || 0;

      // Sample size validation
      if (totalAutomated < 10) {
        logger.warn('Insufficient sample size for FNR estimation', {
          service: 'CriticModule',
          stratum,
          sampleSize: totalAutomated,
        });
        return {
          fnr: totalAutomated > 0 ? falseNegatives / totalAutomated : 0,
          fnrUpperBound: 1.0,
          sampleSize: totalAutomated,
          confidence: 0.95,
          shouldEscalate: true,
          reason: `Insufficient sample size (n=${totalAutomated}) - need at least 10 observations`,
        };
      }

      // Compute point estimate
      const fnr = falseNegatives / totalAutomated;

      // Compute Wilson score upper bound for 95% confidence
      const fnrUpperBound = wilsonScoreUpper(falseNegatives, totalAutomated, 0.95);

      // Check if should escalate (5% threshold)
      const FNR_THRESHOLD = 0.05;
      const shouldEscalate = fnrUpperBound >= FNR_THRESHOLD;

      logger.debug('FNR computed with confidence interval', {
        service: 'CriticModule',
        stratum,
        fnr,
        fnrUpperBound,
        sampleSize: totalAutomated,
        shouldEscalate,
      });

      return {
        fnr,
        fnrUpperBound,
        sampleSize: totalAutomated,
        confidence: 0.95,
        shouldEscalate,
        reason: shouldEscalate
          ? `FNR upper bound (${(fnrUpperBound * 100).toFixed(2)}%) exceeds threshold (${FNR_THRESHOLD * 100}%)`
          : undefined,
      };
    } catch (error) {
      logger.error('Unexpected error computing FNR', {
        service: 'CriticModule',
        stratum,
        error,
      });
      // Conservative: escalate on error
      return {
        fnr: 0,
        fnrUpperBound: 1.0,
        sampleSize: 0,
        confidence: 0.95,
        shouldEscalate: true,
        reason: 'Unexpected error - escalating for safety',
      };
    }
  }

  /**
   * Get FNR with hierarchical fallback
   *
   * Implements fallback hierarchy for sparse strata:
   * 1. Specific stratum (e.g., "region:west|severity:high")
   * 2. Parent stratum (e.g., "region:west")
   * 3. Grandparent stratum (e.g., "global")
   * 4. Global default (if no data exists)
   *
   * @param stratum - Mondrian stratum identifier (e.g., "region:west|severity:high")
   * @returns FNRResult with metadata about which stratum was used
   */
  static async getFNRWithFallback(stratum: string): Promise<
    FNRResult & { stratumUsed: string; fallbackLevel: number }
  > {
    // Try specific stratum first
    const specificResult = await this.getFNR(stratum);
    if (specificResult.sampleSize >= 10) {
      return {
        ...specificResult,
        stratumUsed: stratum,
        fallbackLevel: 0,
      };
    }

    // Parse stratum to get parent (remove last component)
    const stratumParts = stratum.split('|');
    if (stratumParts.length > 1) {
      // Try parent stratum (e.g., "region:west|severity:high" -> "region:west")
      const parentStratum = stratumParts.slice(0, -1).join('|');
      const parentResult = await this.getFNR(parentStratum);
      if (parentResult.sampleSize >= 10) {
        logger.info('Using parent stratum FNR due to insufficient specific data', {
          service: 'CriticModule',
          specificStratum: stratum,
          parentStratum,
          specificSampleSize: specificResult.sampleSize,
          parentSampleSize: parentResult.sampleSize,
        });
        return {
          ...parentResult,
          stratumUsed: parentStratum,
          fallbackLevel: 1,
        };
      }

      // Try grandparent stratum if parent also insufficient
      if (stratumParts.length > 2) {
        const grandparentStratum = stratumParts.slice(0, -2).join('|');
        const grandparentResult = await this.getFNR(grandparentStratum);
        if (grandparentResult.sampleSize >= 10) {
          logger.info('Using grandparent stratum FNR due to insufficient parent data', {
            service: 'CriticModule',
            specificStratum: stratum,
            grandparentStratum,
            specificSampleSize: specificResult.sampleSize,
            grandparentSampleSize: grandparentResult.sampleSize,
          });
          return {
            ...grandparentResult,
            stratumUsed: grandparentStratum,
            fallbackLevel: 2,
          };
        }
      }
    }

    // Try global stratum as final fallback
    const globalResult = await this.getFNR('global');
    if (globalResult.sampleSize >= 10) {
      logger.warn('Using global stratum FNR due to insufficient hierarchical data', {
        service: 'CriticModule',
        specificStratum: stratum,
        specificSampleSize: specificResult.sampleSize,
        globalSampleSize: globalResult.sampleSize,
      });
      return {
        ...globalResult,
        stratumUsed: 'global',
        fallbackLevel: 3,
      };
    }

    // No sufficient data at any level - return specific result with escalation flag
    logger.error('Insufficient data at all stratum levels', {
      service: 'CriticModule',
      stratum,
      specificSampleSize: specificResult.sampleSize,
      globalSampleSize: globalResult.sampleSize,
    });
    return {
      ...specificResult,
      shouldEscalate: true,
      reason: 'Insufficient data at all stratum levels - escalating for safety',
      stratumUsed: stratum,
      fallbackLevel: 0,
    };
  }

  /**
   * Record outcome of an automated decision
   * 
   * @param stratum - Mondrian stratum identifier
   * @param decision - The decision that was made ('automate' or 'escalate')
   * @param actualCriticalHazard - Whether a critical hazard was actually present
   */
  static async recordOutcome(
    stratum: string,
    decision: 'automate' | 'escalate',
    actualCriticalHazard: boolean
  ): Promise<void> {
    // Only track outcomes for automated decisions
    if (decision !== 'automate') {
      return;
    }

    try {
      // Get current stats
      const { data: existing } = await serverSupabase
        .from('ab_critic_fnr_tracking')
        .select('total_automated, false_negatives')
        .eq('stratum', stratum)
        .single();

      const totalAutomated = (existing?.total_automated || 0) + 1;
      const falseNegatives = (existing?.false_negatives || 0) + (actualCriticalHazard ? 1 : 0);

      // Upsert FNR tracking
      await serverSupabase
        .from('ab_critic_fnr_tracking')
        .upsert({
          stratum,
          total_automated: totalAutomated,
          false_negatives: falseNegatives,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'stratum',
        });

      // Invalidate cache for this stratum
      this.fnrCache.delete(stratum);

      logger.debug('Recorded FNR outcome', {
        service: 'CriticModule',
        stratum,
        decision,
        actualCriticalHazard,
        totalAutomated,
        falseNegatives,
        fnr: falseNegatives / totalAutomated,
      });
    } catch (error) {
      logger.error('Failed to record FNR outcome', {
        service: 'CriticModule',
        stratum,
        decision,
        actualCriticalHazard,
        error,
      });
    }
  }

  /**
   * Persist FNR statistics to database (explicit save)
   */
  private static async persistFNR(stratum: string): Promise<void> {
    // This is handled by recordOutcome, but kept for explicit saves if needed
    await this.getFNR(stratum); // This will load and cache
  }

  /**
   * Load FNR statistics from database
   */
  private static async loadFNR(stratum: string): Promise<FNRResult> {
    return this.getFNR(stratum);
  }
}
