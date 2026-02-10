import { logger } from '@mintenance/shared';
import { memoryManager } from '../../ml-engine/memory/MemoryManager';
import { ImageQualityService } from '../ImageQualityService';
import { extractDetectionFeatures } from '../feature-extractor';
import { isLearnedFeaturesEnabled, getLearnedFeatureExtractor } from '../initialization/BuildingSurveyorInitializationService';
import type {
  AssessmentContext,
  Phase1BuildingAssessment,
  RoboflowDetection,
  VisionAnalysisSummary,
} from '../types';
import type { DamageTypeSegmentation } from '../SAM3Service';
import type { MemoryQueryResult } from '../../ml-engine/memory/types';

const AGENT_NAME = 'building-surveyor';

export interface FeatureExtractionResult {
  finalFeatures: number[];
  sceneGraphFeatures: unknown;
  sceneGraph: unknown;
  memoryAdjustments: number[];
  imageQuality: { lightingQuality: number; imageClarity: number };
}

/**
 * Extracts features from evidence: scene graph, detection vectors, memory adjustments,
 * and image quality metrics.
 */
export async function extractAllFeatures(
  validatedImageUrls: string[],
  roboflowDetections: RoboflowDetection[],
  visionAnalysis: VisionAnalysisSummary | null,
  sam3Segmentation: DamageTypeSegmentation | undefined,
  context?: AssessmentContext,
): Promise<{
  finalFeatures: number[];
  sceneGraphFeatures: unknown;
  sceneGraph: unknown;
  memoryAdjustments: number[];
  imageQuality: { lightingQuality: number; imageClarity: number };
}> {
  // Image quality metrics
  const imageQuality = await ImageQualityService.getAverageQualityMetrics(
    validatedImageUrls,
    visionAnalysis,
  );

  // Scene graph
  const { SceneGraphBuilder } = await import('../scene_graph');
  const { SceneGraphFeatureExtractor } = await import('../scene_graph_features');

  const sceneGraph = SceneGraphBuilder.buildSceneGraph(
    roboflowDetections,
    visionAnalysis,
    validatedImageUrls.length,
    sam3Segmentation,
  );

  const sceneGraphFeatures = SceneGraphFeatureExtractor.extractFeatures(sceneGraph);

  // Detection features (fallback)
  const features = await extractDetectionFeatures(
    validatedImageUrls,
    context,
    undefined,
    roboflowDetections,
    visionAnalysis,
    isLearnedFeaturesEnabled(),
    getLearnedFeatureExtractor(),
  );

  const finalFeatures = sceneGraph.nodes.length > 0
    ? sceneGraphFeatures.featureVector
    : features;

  // Memory adjustments
  const memoryAdjustments: number[] = [0, 0, 0, 0, 0];
  try {
    const memorySystem = memoryManager.getMemorySystem(AGENT_NAME);
    const useTitans = process.env.USE_TITANS === 'true' || false;

    let processedFeatures = finalFeatures;
    if (useTitans && memorySystem) {
      processedFeatures = await memorySystem.processWithTitans(finalFeatures);
    }

    const memoryResults: MemoryQueryResult[] = [];
    for (let level = 0; level < 3; level++) {
      const result = await memoryManager.query(AGENT_NAME, processedFeatures.slice(0, 40), level);
      if (result.values && result.values.length === 5) {
        memoryResults.push(result);
      }
    }

    if (memoryResults.length > 0) {
      let totalWeight = 0;
      const combined = [0, 0, 0, 0, 0];
      for (const result of memoryResults) {
        const weight = result.confidence;
        totalWeight += weight;
        for (let i = 0; i < 5; i++) {
          combined[i] += result.values[i] * weight;
        }
      }
      if (totalWeight > 0) {
        for (let i = 0; i < 5; i++) {
          memoryAdjustments[i] = combined[i] / totalWeight;
        }
      }
    }
  } catch (memoryError) {
    logger.warn('Memory query failed, continuing without adjustments', {
      service: 'BuildingSurveyorService',
      error: memoryError,
    });
  }

  return {
    finalFeatures,
    sceneGraphFeatures,
    sceneGraph,
    memoryAdjustments,
    imageQuality,
  };
}
