/**
 * Pure math helpers for model evaluation metrics
 */

export function calculateF1Score(precision: number, recall: number): number {
  if (precision + recall === 0) return 0;
  return 2 * (precision * recall) / (precision + recall);
}

export function calculateImprovement(baseValue: number, newValue: number): number {
  if (baseValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - baseValue) / baseValue) * 100;
}

export function getModelSizeMB(modelPath: string): number {
  try {
    const stats = require('fs').statSync(modelPath);
    return stats.size / (1024 * 1024);
  } catch {
    return 0;
  }
}

export function calculateLinearTrend(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  const indices = Array.from({ length: n }, (_, i) => i);

  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}
