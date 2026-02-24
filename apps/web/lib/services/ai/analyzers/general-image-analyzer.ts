/**
 * General image analysis fallback.
 * Google Cloud Vision removed — GPT-4o handles visual analysis directly.
 * Returns fallback data to maintain interface compatibility.
 */

import type { AnalysisContext, AnalysisResult, GeneralImageAnalysis } from './types';

/**
 * Analyze general images — returns fallback since Google Vision was removed.
 * Image analysis is now handled by GPT-4o directly in the Building Surveyor pipeline.
 */
export async function analyzeGeneralImage(
  images: string[],
  _context: AnalysisContext,
  startTime: number
): Promise<AnalysisResult<GeneralImageAnalysis>> {
  return {
    success: true,
    data: generateFallbackImageAnalysis(),
    fallbackUsed: true,
    cost: 0,
    service: 'fallback',
    processingTime: Date.now() - startTime,
  };
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
      issues: ['Google Vision removed — use GPT-4o for analysis'],
    },
  };
}
