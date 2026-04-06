/**
 * Standalone evaluation functions
 */

import { existsSync } from 'fs';
import path from 'path';

/**
 * Run quick evaluation on a model file
 */
export async function quickEvaluate(
  modelPath: string,
  testImages: string[]
): Promise<{
  detections: number;
  avgConfidence: number;
  processingTimeMs: number;
}> {
  const startTime = Date.now();

  // This would integrate with the actual YOLO inference service
  // For now, returning placeholder

  return {
    detections: 0,
    avgConfidence: 0,
    processingTimeMs: Date.now() - startTime
  };
}

/**
 * Validate model file integrity
 */
export function validateModelFile(modelPath: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!existsSync(modelPath)) {
    errors.push('Model file does not exist');
  }

  const ext = path.extname(modelPath);
  if (!['.pt', '.onnx', '.torchscript'].includes(ext)) {
    errors.push(`Unsupported model format: ${ext}`);
  }

  try {
    const stats = require('fs').statSync(modelPath);
    if (stats.size > 500 * 1024 * 1024) {  // 500MB limit
      errors.push('Model file exceeds maximum size limit (500MB)');
    }
    if (stats.size < 1024) {  // 1KB minimum
      errors.push('Model file is suspiciously small');
    }
  } catch (error) {
    errors.push('Cannot read model file stats');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
