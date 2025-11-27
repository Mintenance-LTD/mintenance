/**
 * Mathematical utilities for A/B Testing
 * 
 * Implements Beta distribution functions for Small Sample Beta Correction (SSBC)
 * in hierarchical Mondrian conformal prediction
 */

/**
 * Compute Beta quantile (inverse CDF) using numerical approximation
 * 
 * Implements BetaInv(1-α; n+1, 1) for Small Sample Beta Correction (SSBC)
 * Uses Newton-Raphson method for numerical root finding
 */
export function betaQuantile(p: number, a: number, b: number): number {
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
  return betaQuantileNewtonRaphson(p, a, b);
}

/**
 * Compute Beta quantile using Newton-Raphson method
 */
function betaQuantileNewtonRaphson(p: number, a: number, b: number, maxIterations: number = 50): number {
  // Initial guess: use normal approximation for Beta distribution
  const mean = a / (a + b);
  const variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
  let x = Math.max(0.001, Math.min(0.999, mean));

  const tolerance = 1e-6;

  for (let i = 0; i < maxIterations; i++) {
    const cdf = betaCDF(x, a, b);
    const pdf = betaPDF(x, a, b);

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
export function betaCDF(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use symmetry: I_x(a, b) = 1 - I_{1-x}(b, a)
  if (x > 0.5) {
    return 1 - betaCDF(1 - x, b, a);
  }

  // For small x, use series expansion
  // I_x(a, b) = (x^a / (a * B(a, b))) * (1 + sum of terms)
  const beta = betaFunction(a, b);
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
export function betaPDF(x: number, a: number, b: number): number {
  if (x <= 0 || x >= 1) return 0;
  const beta = betaFunction(a, b);
  return Math.pow(x, a - 1) * Math.pow(1 - x, b - 1) / beta;
}

/**
 * Compute Beta function B(a, b) = Gamma(a) * Gamma(b) / Gamma(a + b)
 * Uses logarithms for numerical stability
 */
export function betaFunction(a: number, b: number): number {
  // B(a, b) = exp(logGamma(a) + logGamma(b) - logGamma(a + b))
  return Math.exp(logGamma(a) + logGamma(b) - logGamma(a + b));
}

/**
 * Compute log Gamma function using Stirling's approximation
 */
export function logGamma(z: number): number {
  if (z < 12) {
    // Use recurrence: logGamma(z) = logGamma(z+1) - log(z)
    return logGamma(z + 1) - Math.log(z);
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

/**
 * Compute weighted quantile
 */
export function weightedQuantile(
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

/**
 * Compute Wilson score upper bound
 */
export function wilsonScoreUpper(successes: number, trials: number, confidence: number): number {
  const z = 1.96; // 95% confidence
  const p = successes / trials;
  const denominator = 1 + z ** 2 / trials;
  const center = (p + z ** 2 / (2 * trials)) / denominator;
  const margin = z * Math.sqrt((p * (1 - p) / trials + z ** 2 / (4 * trials ** 2))) / denominator;
  return Math.min(1.0, center + margin);
}

