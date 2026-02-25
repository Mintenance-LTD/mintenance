/**
 * CriticLinearAlgebra
 *
 * Pure linear algebra utilities for the Safe-LUCB Critic Module.
 * All functions are stateless and operate only on their arguments.
 */

import { logger } from '@mintenance/shared';

/**
 * Normalize context vector to the target dimension.
 * Truncates if too long, pads with zeros if too short.
 */
export function normalizeContext(context: number[], dimension = 12): number[] {
  if (context.length === dimension) {
    return context;
  }
  if (context.length > dimension) {
    return context.slice(0, dimension);
  }
  // Pad with zeros
  return [...context, ...new Array(dimension - context.length).fill(0)];
}

/**
 * Dot product of two vectors.
 */
export function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
}

/**
 * Matrix-vector product: A * x.
 */
export function matrixVectorProduct(A: number[][], x: number[]): number[] {
  return A.map(row => dotProduct(row, x));
}

/**
 * Compute ||x||_{A^{-1}} = sqrt(x^T A^{-1} x).
 */
export function matrixVectorNorm(x: number[], A: number[][]): number {
  const invA = inverseMatrix(A);
  const invAx = matrixVectorProduct(invA, x);
  const xInvAx = dotProduct(x, invAx);
  return Math.sqrt(Math.max(0, xInvAx));
}

/**
 * Matrix inverse using LU decomposition with partial pivoting.
 *
 * Implements robust matrix inversion for positive definite covariance matrices.
 * Uses numerical stability checks and handles near-singular matrices.
 * Tries Cholesky first (faster for PD matrices), falls back to LU.
 */
export function inverseMatrix(A: number[][]): number[][] {
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
    return regularizedIdentity(n);
  }

  // Try Cholesky decomposition first (faster for positive definite matrices)
  try {
    return inverseCholesky(A);
  } catch {
    // Fall back to LU decomposition if Cholesky fails
    logger.debug('Cholesky decomposition failed, using LU decomposition', {
      service: 'CriticModule',
    });
    return inverseLU(A);
  }
}

/**
 * Matrix inverse using Cholesky decomposition (for positive definite matrices).
 */
export function inverseCholesky(A: number[][]): number[][] {
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
 * Matrix inverse using LU decomposition with partial pivoting.
 */
export function inverseLU(A: number[][]): number[][] {
  const n = A.length;
  const inv: number[][] = [];

  // Create identity matrix columns
  for (let col = 0; col < n; col++) {
    const b = new Array(n).fill(0);
    b[col] = 1;

    // Solve A * x = b using LU decomposition
    const x = solveLU(A, b);

    for (let i = 0; i < n; i++) {
      if (!inv[i]) inv[i] = [];
      inv[i][col] = x[i];
    }
  }

  return inv;
}

/**
 * Solve linear system A * x = b using LU decomposition with partial pivoting.
 */
export function solveLU(A: number[][], b: number[]): number[] {
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
 * Return regularized identity matrix (fallback for singular matrices).
 */
export function regularizedIdentity(n: number): number[][] {
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
