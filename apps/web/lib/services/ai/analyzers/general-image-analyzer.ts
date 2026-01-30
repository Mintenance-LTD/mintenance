/**
 * General image analysis using ImageAnalysisService with aggregation and fallback.
 */

import { logger } from '@mintenance/shared';
import { ImageAnalysisService } from '../../ImageAnalysisService';
import type { AnalysisContext, AnalysisResult, GeneralImageAnalysis } from './types';

/**
 * Analyze general images using Image Analysis Service.
 */
export async function analyzeGeneralImage(
  images: string[],
  _context: AnalysisContext,
  startTime: number
): Promise<AnalysisResult<GeneralImageAnalysis>> {
  try {
    const analysisPromises = images.map(image =>
      ImageAnalysisService.analyzeImage(image)
    );

    const results = await Promise.all(analysisPromises);

    const aggregated: GeneralImageAnalysis = {
      labels: [],
      objects: [],
      text: [],
      safeSearch: {
        adult: 'VERY_UNLIKELY',
        violence: 'VERY_UNLIKELY',
      },
      dominantColors: [],
      quality: {
        score: 0,
        issues: [],
      },
    };

    for (const result of results) {
      if (result) {
        aggregated.labels.push(...(result.labels || []));
        aggregated.objects.push(...(result.objects || []));
        aggregated.text.push(...(result.text || []));
        if (result.safeSearch) {
          if (compareSafeSearchLevel(result.safeSearch.adult, aggregated.safeSearch.adult) > 0) {
            aggregated.safeSearch.adult = result.safeSearch.adult;
          }
          if (compareSafeSearchLevel(result.safeSearch.violence, aggregated.safeSearch.violence) > 0) {
            aggregated.safeSearch.violence = result.safeSearch.violence;
          }
        }
      }
    }

    aggregated.labels = deduplicateAndSort(aggregated.labels);
    aggregated.objects = deduplicateAndSort(aggregated.objects);
    aggregated.text = [...new Set(aggregated.text)];

    return {
      success: true,
      data: aggregated,
      fallbackUsed: false,
      cost: images.length * 0.0015,
      service: 'image-analysis',
      model: 'google-vision',
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('General image analysis failed', error);

    return {
      success: true,
      data: generateFallbackImageAnalysis(),
      fallbackUsed: true,
      cost: 0,
      service: 'fallback',
      processingTime: Date.now() - startTime,
    };
  }
}

export function generateFallbackImageAnalysis(): GeneralImageAnalysis {
  return {
    labels: [
      { name: 'image', confidence: 1.0 },
      { name: 'photo', confidence: 0.9 },
    ],
    objects: [],
    text: [],
    safeSearch: {
      adult: 'VERY_UNLIKELY',
      violence: 'VERY_UNLIKELY',
    },
    dominantColors: [],
    quality: {
      score: 0.5,
      issues: ['Analysis unavailable'],
    },
  };
}

function compareSafeSearchLevel(level1: string, level2: string): number {
  const levels = ['VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];
  return levels.indexOf(level1) - levels.indexOf(level2);
}

function deduplicateAndSort<T extends { name: string; confidence: number }>(
  items: T[]
): T[] {
  const map = new Map<string, T>();

  for (const item of items) {
    const existing = map.get(item.name);
    if (!existing || item.confidence > existing.confidence) {
      map.set(item.name, item);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.confidence - a.confidence);
}
