/**
 * Model evaluation + deployment decisioning.
 *
 * Extracted from `ContinuousLearningService.ts` (2026-04-26).
 *
 * `evaluateAndDeploy()` is the post-training entry point:
 *   - First model? Deploy directly.
 *   - Improvement below threshold? Reject.
 *   - A/B testing enabled? Create + start an A/B test.
 *   - Auto-deploy enabled? Direct production swap.
 *   - Otherwise? Manual deployment required.
 *
 * `deployModel()` is the actual production-table swap (deactivate
 * old, activate new) — extracted as a private helper so the A/B
 * resolution path can also use it.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ModelEvaluationService } from '../ModelEvaluationService';
import { ModelABTestingService } from '../ModelABTestingService';
import { pipelineConfig } from './types';

/**
 * Activate a new model in the yolo_models table by atomically
 * deactivating the previous active row + activating the new version.
 *
 * Logs but doesn't throw on the deactivate step (we want activation
 * to proceed even if the previous row was already inactive). Throws
 * on the activate step because that's the actual deployment we care
 * about.
 */
async function deployModel(
  _modelPath: string,
  modelVersion: string
): Promise<void> {
  try {
    const supabase = serverSupabase;

    await supabase
      .from('yolo_models')
      .update({ is_active: false })
      .eq('is_active', true);

    await supabase
      .from('yolo_models')
      .update({ is_active: true })
      .eq('version', modelVersion);

    logger.info('Model deployed successfully', { modelVersion });
  } catch (error) {
    logger.error('Failed to deploy model', { error });
    throw error;
  }
}

/**
 * Evaluate a newly trained model + decide what to do with it.
 *
 * Returns whether the model was deployed, the reason for the
 * decision, and (when applicable) the A/B test ID it was placed
 * into. Callers use this to update training-job rows + surface
 * the outcome in the admin dashboard.
 */
export async function evaluateAndDeploy(
  modelPath: string,
  modelVersion: string
): Promise<{
  deployed: boolean;
  reason: string;
  abTestId?: string;
}> {
  try {
    logger.info('Evaluating model for deployment', { modelPath, modelVersion });

    const newModelMetrics =
      await ModelEvaluationService.evaluateModel(modelPath);

    const { data: currentModel } = await serverSupabase
      .from('yolo_models')
      .select('version, storage_path')
      .eq('is_active', true)
      .single();

    if (!currentModel) {
      // No current model, deploy immediately
      logger.info('No current model, deploying new model', { modelVersion });
      return { deployed: true, reason: 'First model deployment' };
    }

    const comparison = await ModelEvaluationService.compareModels(
      currentModel.storage_path,
      modelPath
    );

    if (!comparison.comparison.meets_deployment_threshold) {
      return {
        deployed: false,
        reason: `Improvement below threshold: ${comparison.comparison.recommendation}`,
      };
    }

    if (pipelineConfig.abTestingEnabled) {
      const abTest = await ModelABTestingService.createABTest({
        name: `Model ${currentModel.version} vs ${modelVersion}`,
        description: 'Automated continuous learning deployment',
        control_model: {
          version: currentModel.version,
          path: currentModel.storage_path,
        },
        treatment_model: {
          version: modelVersion,
          path: modelPath,
          metrics: newModelMetrics,
        },
        traffic_split: {
          control_percentage: 100 - pipelineConfig.abTestTrafficSplit,
          treatment_percentage: pipelineConfig.abTestTrafficSplit,
        },
        minimum_sample_size: pipelineConfig.abTestMinSamples,
        maximum_duration_days: 7,
        confidence_level: 0.95,
        success_metrics: {
          primary_metric: 'mAP50',
          minimum_improvement: pipelineConfig.minImprovementForDeployment,
          guardrail_metrics: [
            { metric: 'precision', max_degradation: 0.05 },
            { metric: 'recall', max_degradation: 0.05 },
          ],
        },
        auto_deploy_on_success: pipelineConfig.autoDeployOnSuccess,
        auto_rollback_on_failure: pipelineConfig.autoRollbackOnFailure,
      });

      await ModelABTestingService.startTest(abTest.test_id);

      return {
        deployed: false, // Not immediately deployed, in A/B test
        reason: 'Model deployed to A/B test',
        abTestId: abTest.test_id,
      };
    } else if (pipelineConfig.autoDeployOnSuccess) {
      await deployModel(modelPath, modelVersion);
      return {
        deployed: true,
        reason: 'Automated deployment (no A/B test)',
      };
    } else {
      return {
        deployed: false,
        reason: 'Manual deployment required',
      };
    }
  } catch (error) {
    logger.error('Failed to evaluate and deploy model', { error });
    throw error;
  }
}
