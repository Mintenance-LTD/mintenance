import { logger } from '@mintenance/shared';
import { supabase } from '@/lib/supabase';
import type { DamageSeverity } from '../types';

const SERVICE_NAME = 'InternalDamageClassifier';

export async function getTrainingDataStats(): Promise<{
  totalValidatedSamples: number;
  damageTypeDistribution: Record<string, number>;
  severityDistribution: Record<DamageSeverity, number>;
  averageConfidence: number;
}> {
  try {
    const { count: totalCount, error: countError } = await supabase
      .from('building_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('validation_status', 'validated');

    if (countError) throw countError;

    const { data: assessments, error: assessmentsError } = await supabase
      .from('building_assessments')
      .select('damage_type, severity, confidence')
      .eq('validation_status', 'validated');

    if (assessmentsError) throw assessmentsError;

    const damageTypeDistribution: Record<string, number> = {};
    const severityDistribution: Record<DamageSeverity, number> = {
      early: 0,
      midway: 0,
      full: 0,
    };
    let totalConfidence = 0;

    for (const assessment of assessments || []) {
      const damageType = assessment.damage_type || 'unknown';
      damageTypeDistribution[damageType] =
        (damageTypeDistribution[damageType] || 0) + 1;
      const severity = assessment.severity as DamageSeverity;
      if (severity in severityDistribution) severityDistribution[severity]++;
      totalConfidence += assessment.confidence || 0;
    }

    return {
      totalValidatedSamples: totalCount || 0,
      damageTypeDistribution,
      severityDistribution,
      averageConfidence:
        (assessments?.length || 0) > 0
          ? totalConfidence / (assessments?.length || 1)
          : 0,
    };
  } catch (error) {
    logger.error('Failed to get training data stats', error, {
      service: SERVICE_NAME,
    });
    return {
      totalValidatedSamples: 0,
      damageTypeDistribution: {},
      severityDistribution: { early: 0, midway: 0, full: 0 },
      averageConfidence: 0,
    };
  }
}

export async function retrainModel(
  minSampleCount: number,
  minAccuracy: number,
  onReset: () => void
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const stats = await getTrainingDataStats();

    if (stats.totalValidatedSamples < minSampleCount) {
      return {
        success: false,
        error: `Insufficient training data. Need ${minSampleCount}, have ${stats.totalValidatedSamples}`,
      };
    }

    const { data: job, error } = await supabase
      .from('model_training_jobs')
      .insert({
        model_type: 'damage_classifier',
        sample_count: stats.totalValidatedSamples,
        status: 'pending',
        config: { minAccuracy, features: 'yolo_features' },
      })
      .select('id')
      .single();

    if (error) throw error;

    logger.info('Model retraining job created', {
      service: SERVICE_NAME,
      jobId: job.id,
      sampleCount: stats.totalValidatedSamples,
    });

    const { KnowledgeDistillationService } =
      await import('../KnowledgeDistillationService');
    const result = await KnowledgeDistillationService.trainDamageClassifier(
      job.id
    );

    if (result.success) {
      onReset();
      logger.info('Retraining completed, model cache cleared', {
        service: SERVICE_NAME,
        jobId: job.id,
        modelVersion: result.modelVersion,
        samplesUsed: result.samplesUsed,
      });
    }

    return { success: result.success, jobId: job.id, error: result.error };
  } catch (error) {
    logger.error('Failed to trigger retraining', error, {
      service: SERVICE_NAME,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
