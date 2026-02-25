/**
 * API Endpoint for Enhanced Three-Way Fusion Assessment
 *
 * This endpoint uses the new EnhancedHybridInferenceService that performs
 * real-time three-way Bayesian fusion with YOLO, SAM3, and GPT-4.
 *
 * OWASP Security: Rate limited to prevent API cost abuse
 */

import { NextResponse } from 'next/server';
import { EnhancedHybridInferenceService } from '@/lib/services/building-surveyor/EnhancedHybridInferenceService';
import { EnhancedBayesianFusionService } from '@/lib/services/building-surveyor/EnhancedBayesianFusionService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { rateLimiter } from '@/lib/rate-limiter';
import { withApiHandler } from '@/lib/api/with-api-handler';
import type { AssessmentContext } from '@/lib/services/building-surveyor/types';

const assessmentRequestSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1).max(10),
  context: z.object({
    propertyType: z.enum(['residential', 'commercial', 'industrial']).optional(),
    location: z.string().optional(),
    ageOfProperty: z.number().min(0).max(500).optional(),
    assessmentId: z.string().uuid().optional(),
    previousDamage: z.array(z.string()).optional(),
    weatherConditions: z.string().optional(),
  }).optional(),
  options: z.object({
    includeFusionDetails: z.boolean().default(true),
    includeModelOutputs: z.boolean().default(false),
    includePerformanceMetrics: z.boolean().default(true),
  }).optional(),
});

/**
 * POST /api/building-surveyor/assess-with-fusion
 * Three-way Bayesian fusion assessment (YOLO + SAM3 + GPT-4)
 */
export const POST = withApiHandler({ rateLimit: false }, async (request, { user }) => {
  const startTime = Date.now();

  // Custom rate limit for expensive multi-model analysis (5/min)
  const identifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') || 'anonymous';

  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `building-surveyor-fusion:${identifier}`,
    windowMs: 60000,
    maxRequests: 5,
  });

  if (!rateLimitResult.allowed) {
    logger.warn('Building surveyor fusion rate limit exceeded', { service: 'building-surveyor-fusion', identifier });
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'X-RateLimit-Limit': '5', 'X-RateLimit-Remaining': String(rateLimitResult.remaining), 'Retry-After': String(rateLimitResult.retryAfter || 60) } }
    );
  }

  const body = await request.json();
  const validationResult = assessmentRequestSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json({ error: 'Invalid request', details: validationResult.error.errors }, { status: 400 });
  }

  const { imageUrls, context, options } = validationResult.data;

  logger.info('Processing fusion assessment request', { endpoint: '/api/building-surveyor/assess-with-fusion', userId: user.id, imageCount: imageUrls.length, context });

  const result = await EnhancedHybridInferenceService.assessDamageWithFusion(imageUrls, context as AssessmentContext);

  const response: { [key: string]: unknown; success: boolean; assessment: unknown; route: unknown; agreementScore: unknown; fallbacksUsed: unknown; fusionDetails?: { [key: string]: unknown }; modelOutputs?: { [key: string]: unknown }; performance?: { [key: string]: unknown } } = {
    success: true,
    assessment: result.assessment,
    route: result.route,
    agreementScore: result.agreementScore,
    fallbacksUsed: result.fallbacksUsed,
  };

  if (options?.includeFusionDetails) {
    response.fusionDetails = {
      confidence: result.fusionOutput.mean * 100,
      uncertaintyLevel: result.fusionOutput.uncertaintyLevel,
      confidenceInterval: [result.fusionOutput.confidenceInterval[0] * 100, result.fusionOutput.confidenceInterval[1] * 100],
      attentionWeights: result.fusionOutput.attentionWeights,
      modalityAgreement: result.fusionOutput.modalityAgreement * 100,
      refinedBoxesCount: result.fusionOutput.refinedBoundingBoxes?.length || 0,
      metrics: { entropyReduction: result.fusionOutput.fusionMetrics.entropyReduction, informationGain: result.fusionOutput.fusionMetrics.informationGain, effectiveSampleSize: result.fusionOutput.fusionMetrics.effectiveSampleSize },
    };
    if (result.fusionOutput.adaptiveWeightUpdate) {
      response.fusionDetails.suggestedWeights = { weights: result.fusionOutput.adaptiveWeightUpdate.suggested, reason: result.fusionOutput.adaptiveWeightUpdate.reason };
    }
  }

  if (options?.includeModelOutputs) {
    response.modelOutputs = {};
    if (result.yoloOutput) response.modelOutputs.yolo = { detectionsCount: result.yoloOutput.detections.length, avgConfidence: result.yoloOutput.confidence, inferenceMs: result.yoloOutput.inferenceMs };
    if (result.sam3Output) response.modelOutputs.sam3 = { damageDetected: result.sam3Output.damageDetected, damageTypes: result.sam3Output.damageTypes, averagePresenceScore: result.sam3Output.averagePresenceScore, inferenceMs: result.sam3Output.inferenceMs };
    if (result.gpt4Output) response.modelOutputs.gpt4 = { confidence: result.gpt4Output.confidence, inferenceMs: result.gpt4Output.inferenceMs };
  }

  if (options?.includePerformanceMetrics) {
    const availability = EnhancedHybridInferenceService.getServiceAvailability();
    response.performance = {
      totalInferenceMs: result.totalInferenceMs,
      parallelExecutionMs: result.parallelExecutionMs,
      fusionMs: result.fusionMs,
      apiResponseMs: Date.now() - startTime,
      serviceAvailability: { yolo: availability.yolo.available, sam3: availability.sam3.available, gpt4: availability.gpt4.available },
    };
  }

  logger.info('Fusion assessment completed', { endpoint: '/api/building-surveyor/assess-with-fusion', userId: user.id, route: result.route, agreementScore: result.agreementScore, totalMs: Date.now() - startTime });

  return NextResponse.json(response);
});

/**
 * GET /api/building-surveyor/assess-with-fusion
 * Retrieve fusion statistics
 */
export const GET = withApiHandler({}, async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'summary';

  let response: unknown = {};

  switch (type) {
    case 'performance':
      response = EnhancedHybridInferenceService.getPerformanceMetrics();
      break;
    case 'availability':
      response = EnhancedHybridInferenceService.getServiceAvailability();
      break;
    case 'fusion-stats':
      response = EnhancedBayesianFusionService.getFusionStatistics();
      break;
    default: {
      const metrics = EnhancedHybridInferenceService.getPerformanceMetrics();
      const availability = EnhancedHybridInferenceService.getServiceAvailability();
      const fusionStats = EnhancedBayesianFusionService.getFusionStatistics();
      response = {
        performance: { totalAssessments: metrics.totalInferences, threeWayFusionRate: metrics.totalInferences > 0 ? (metrics.threeWayFusions / metrics.totalInferences) * 100 : 0, averageInferenceMs: metrics.averageInferenceMs, sam3UsageRate: metrics.sam3UsageRate * 100, fallbackRate: metrics.fallbackRate * 100 },
        services: { yolo: availability.yolo.available ? 'online' : 'offline', sam3: availability.sam3.available ? 'online' : 'offline', gpt4: availability.gpt4.available ? 'online' : 'offline' },
        fusion: { currentWeights: fusionStats.currentWeights, averageAgreement: fusionStats.averageAgreement * 100, weightStability: fusionStats.weightStability * 100 },
      };
    }
  }

  logger.info('Fusion stats retrieved', { service: 'building-surveyor-fusion', userId: user.id, type });
  return NextResponse.json({ success: true, type, data: response, timestamp: new Date().toISOString() });
});

/**
 * OPTIONS endpoint for CORS preflight
 *
 * SECURITY (VULN-007): Removed wildcard CORS handler
 * CORS is now handled globally by middleware with whitelist-based origin validation
 * @see apps/web/lib/cors for secure CORS implementation
 */
