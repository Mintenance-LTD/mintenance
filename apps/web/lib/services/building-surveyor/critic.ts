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

interface CriticContext {
  context: number[]; // d_eff = 12 dimensional context vector
  delta_safety: number; // δ_t safety threshold
  arms?: string[]; // Available arms (default: ['automate', 'escalate'])
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
    const { context, delta_safety } = params;

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
      return this.selectArmWithContext(normalizedContext, delta_safety);
    }

    return this.selectArmWithContext(context, delta_safety);
  }

  /**
   * Select arm with normalized context
   */
  private static async selectArmWithContext(
    context: number[],
    delta_safety: number
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
        const params = data.parameters as any;
        this.modelCache = {
          theta: params.theta || this.initializeTheta(),
          phi: params.phi || this.initializePhi(),
          A: params.A || this.initializeCovariance(),
          B: params.B || this.initializeCovariance(),
          beta: params.beta || this.DEFAULT_BETA,
          gamma: params.gamma || this.DEFAULT_GAMMA,
          n: params.n || 0,
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
   * Update models from feedback
   * 
   * Called after outcome is observed to update θ and φ
   * using online ridge regression
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

      // Update reward model (θ) using ridge regression
      models.theta = this.updateRidgeRegression(
        models.theta,
        models.A,
        normalizedContext,
        params.reward,
        this.LAMBDA
      );

      // Update safety model (φ) using ridge regression
      const safetyLabel = params.safetyViolation ? 1.0 : 0.0;
      models.phi = this.updateRidgeRegression(
        models.phi,
        models.B,
        normalizedContext,
        safetyLabel,
        this.LAMBDA
      );

      // Update covariance matrices (Sherman-Morrison formula)
      models.A = this.updateCovariance(models.A, normalizedContext, this.LAMBDA);
      models.B = this.updateCovariance(models.B, normalizedContext, this.LAMBDA);

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
   * Update ridge regression weights
   */
  private static updateRidgeRegression(
    weights: number[],
    covariance: number[][],
    context: number[],
    label: number,
    lambda: number
  ): number[] {
    // Online ridge regression update
    // θ_new = θ_old + A^{-1} x (y - θ^T x) / (1 + x^T A^{-1} x)
    
    const prediction = this.dotProduct(weights, context);
    const error = label - prediction;
    
    // Compute A^{-1} x
    const invAx = this.matrixVectorProduct(this.inverseMatrix(covariance), context);
    
    // Compute x^T A^{-1} x
    const xInvAx = this.dotProduct(context, invAx);
    
    // Update weights
    const stepSize = error / (1 + xInvAx);
    return weights.map((w, i) => w + invAx[i] * stepSize);
  }

  /**
   * Update covariance matrix using Sherman-Morrison formula
   */
  private static updateCovariance(
    A: number[][],
    x: number[],
    lambda: number
  ): number[][] {
    // A_new = A_old - (A_old x x^T A_old) / (1 + x^T A_old x)
    const Ax = this.matrixVectorProduct(A, x);
    const xAx = this.dotProduct(x, Ax);
    const denominator = 1 + xAx;

    const newA: number[][] = [];
    for (let i = 0; i < A.length; i++) {
      newA[i] = [];
      for (let j = 0; j < A[i].length; j++) {
        newA[i][j] = A[i][j] - (Ax[i] * Ax[j]) / denominator;
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
}
