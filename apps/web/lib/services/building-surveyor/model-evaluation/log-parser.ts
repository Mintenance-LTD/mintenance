/**
 * Fallback parser for extracting metrics from YOLO training log files
 */

import { readEvaluationArtifact } from './artifact-reader';
import type { ModelEvaluationMetrics } from './types';
import { calculateF1Score } from './metrics-math';

export async function parseMetricsFromLogs(outputDir: string): Promise<ModelEvaluationMetrics> {
  // Fallback implementation for parsing metrics from log files
  // This would parse the training output logs if JSON file is not available
  const logContent = readEvaluationArtifact(outputDir, 'training.log');

  if (logContent === undefined) {
    throw new Error('No metrics file or training logs found');
  }

  // Parse metrics using regex (example patterns for YOLO output)
  const mAP50Match = logContent.match(/mAP50:\s*([\d.]+)/);
  const mAP5095Match = logContent.match(/mAP50-95:\s*([\d.]+)/);
  const precisionMatch = logContent.match(/Precision:\s*([\d.]+)/);
  const recallMatch = logContent.match(/Recall:\s*([\d.]+)/);

  const precision = parseFloat(precisionMatch?.[1] || '0');
  const recall = parseFloat(recallMatch?.[1] || '0');

  return {
    test_metrics: {
      mAP50: parseFloat(mAP50Match?.[1] || '0'),
      mAP50_95: parseFloat(mAP5095Match?.[1] || '0'),
      precision,
      recall,
      f1_score: calculateF1Score(precision, recall)
    },
    validation_metrics: {
      val_loss: 0,
      val_accuracy: 0
    },
    evaluation_timestamp: new Date().toISOString(),
    model_version: 'parsed-from-logs',
    evaluation_type: 'training'
  };
}
