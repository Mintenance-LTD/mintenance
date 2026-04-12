/**
 * Fallback assessment helpers for offline/error scenarios.
 * Extracted from UnifiedAIServiceMobile to keep the main service under 500 lines.
 */

import type { BuildingAssessment } from '@mintenance/ai-core';

type FallbackSeverity = 'early' | 'developing' | 'significant' | 'dangerous';

/**
 * Estimate severity from job category when the API is unavailable.
 * Returns a 4-tier severity value.
 */
export function estimateSeverityFromCategory(
  category: string
): FallbackSeverity {
  const severityMap: Record<string, FallbackSeverity> = {
    emergency: 'dangerous',
    structural: 'dangerous',
    plumbing_leak: 'significant',
    electrical: 'significant',
    roofing: 'significant',
    painting: 'early',
    cleaning: 'early',
  };
  return severityMap[category.toLowerCase()] || 'developing';
}

/**
 * Build a minimal BuildingAssessment for offline scenarios.
 * Used when the /api/building-surveyor/assess endpoint is unavailable.
 */
export function buildFallbackAssessment(
  images: string[],
  jobDetails?: { category?: string }
): BuildingAssessment {
  const category = jobDetails?.category || 'general';
  const severity = estimateSeverityFromCategory(category);

  return {
    id: `fallback_${Date.now()}`,
    timestamp: new Date().toISOString(),
    damageAssessment: {
      damageType: category,
      severity,
      confidence: 60,
      description: 'Assessment generated using fallback rules',
      detectedIssues: [],
    },
    safetyHazards: {
      hasSafetyHazards: severity === 'dangerous',
      criticalFlags:
        severity === 'dangerous' ? ['Requires immediate attention'] : [],
      immediateActionRequired: severity === 'dangerous',
      riskLevel: severity === 'dangerous' ? 'high' : 'medium',
      details: 'Fallback assessment - professional inspection recommended',
    },
    insuranceRisk: {
      riskScore: 50,
      category: 'medium',
      factors: ['Unable to perform detailed assessment'],
      recommendedAction: 'Professional assessment required',
    },
    complianceFlags: [],
    recommendations: ['Get professional assessment', 'Document all damage'],
    estimatedCost: {
      min: 500,
      max: 5000,
      likely: 2000,
      currency: 'GBP',
      confidence: 30,
    },
    confidence: 60,
    metadata: {
      model: 'fallback',
      version: '1.0',
      processingTime: 0,
      imageCount: images.length,
      apiCalls: [],
      costTracking: {
        estimatedCost: 0,
        actualCost: 0,
        breakdown: {},
      },
    },
  };
}
