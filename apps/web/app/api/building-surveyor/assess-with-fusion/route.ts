/**
 * API Endpoint for Enhanced Three-Way Fusion Assessment
 *
 * This endpoint uses the new EnhancedHybridInferenceService that performs
 * real-time three-way Bayesian fusion with YOLO, SAM3, and GPT-4.
 */

import { NextRequest, NextResponse } from 'next/server';
import { EnhancedHybridInferenceService } from '@/lib/services/building-surveyor/EnhancedHybridInferenceService';
import { EnhancedBayesianFusionService } from '@/lib/services/building-surveyor/EnhancedBayesianFusionService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { AssessmentContext } from '@/lib/services/building-surveyor/types';

// Request validation schema
const assessmentRequestSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1).max(10),
  context: z.object({
    propertyType: z.enum(['residential', 'commercial', 'industrial']).optional(),
    location: z.string().optional(),
    ageOfProperty: z.number().min(0).max(500).optional(),
    assessmentId: z.string().uuid().optional(),
    previousDamage: z.array(z.string()).optional(),
    weatherConditions: z.string().optional()
  }).optional(),
  options: z.object({
    includeFusionDetails: z.boolean().default(true),
    includeModelOutputs: z.boolean().default(false),
    includePerformanceMetrics: z.boolean().default(true)
  }).optional()
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request
    const body = await request.json();
    const validationResult = assessmentRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { imageUrls, context, options } = validationResult.data;

    logger.info('Processing fusion assessment request', {
      endpoint: '/api/building-surveyor/assess-with-fusion',
      userId: session.user?.id,
      imageCount: imageUrls.length,
      context
    });

    // 3. Perform three-way fusion assessment
    const result = await EnhancedHybridInferenceService.assessDamageWithFusion(
      imageUrls,
      context as AssessmentContext
    );

    // 4. Prepare response based on options
    const response: any = {
      success: true,
      assessment: result.assessment,
      route: result.route,
      agreementScore: result.agreementScore,
      fallbacksUsed: result.fallbacksUsed
    };

    // Include fusion details if requested
    if (options?.includeFusionDetails) {
      response.fusionDetails = {
        confidence: result.fusionOutput.mean * 100,
        uncertaintyLevel: result.fusionOutput.uncertaintyLevel,
        confidenceInterval: [
          result.fusionOutput.confidenceInterval[0] * 100,
          result.fusionOutput.confidenceInterval[1] * 100
        ],
        attentionWeights: result.fusionOutput.attentionWeights,
        modalityAgreement: result.fusionOutput.modalityAgreement * 100,
        refinedBoxesCount: result.fusionOutput.refinedBoundingBoxes?.length || 0,
        metrics: {
          entropyReduction: result.fusionOutput.fusionMetrics.entropyReduction,
          informationGain: result.fusionOutput.fusionMetrics.informationGain,
          effectiveSampleSize: result.fusionOutput.fusionMetrics.effectiveSampleSize
        }
      };

      // Include adaptive weight suggestion if available
      if (result.fusionOutput.adaptiveWeightUpdate) {
        response.fusionDetails.suggestedWeights = {
          weights: result.fusionOutput.adaptiveWeightUpdate.suggested,
          reason: result.fusionOutput.adaptiveWeightUpdate.reason
        };
      }
    }

    // Include individual model outputs if requested
    if (options?.includeModelOutputs) {
      response.modelOutputs = {};

      if (result.yoloOutput) {
        response.modelOutputs.yolo = {
          detectionsCount: result.yoloOutput.detections.length,
          avgConfidence: result.yoloOutput.confidence,
          inferenceMs: result.yoloOutput.inferenceMs
        };
      }

      if (result.sam3Output) {
        response.modelOutputs.sam3 = {
          damageDetected: result.sam3Output.damageDetected,
          damageTypes: result.sam3Output.damageTypes,
          averagePresenceScore: result.sam3Output.averagePresenceScore,
          inferenceMs: result.sam3Output.inferenceMs
        };
      }

      if (result.gpt4Output) {
        response.modelOutputs.gpt4 = {
          confidence: result.gpt4Output.confidence,
          inferenceMs: result.gpt4Output.inferenceMs
        };
      }
    }

    // Include performance metrics if requested
    if (options?.includePerformanceMetrics) {
      response.performance = {
        totalInferenceMs: result.totalInferenceMs,
        parallelExecutionMs: result.parallelExecutionMs,
        fusionMs: result.fusionMs,
        apiResponseMs: Date.now() - startTime
      };

      // Add service availability status
      const availability = EnhancedHybridInferenceService.getServiceAvailability();
      response.performance.serviceAvailability = {
        yolo: availability.yolo.available,
        sam3: availability.sam3.available,
        gpt4: availability.gpt4.available
      };
    }

    // 5. Log success
    logger.info('Fusion assessment completed', {
      endpoint: '/api/building-surveyor/assess-with-fusion',
      userId: session.user?.id,
      route: result.route,
      agreementScore: result.agreementScore,
      uncertaintyLevel: result.fusionOutput.uncertaintyLevel,
      totalMs: Date.now() - startTime
    });

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Fusion assessment failed', error, {
      endpoint: '/api/building-surveyor/assess-with-fusion'
    });

    // Check if it's a specific error type
    if (error instanceof Error) {
      if (error.message.includes('SAM3 service not available')) {
        return NextResponse.json(
          {
            error: 'SAM3 service temporarily unavailable',
            message: 'Assessment will proceed with available models',
            fallbackRoute: 'gpt4_only'
          },
          { status: 503 }
        );
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'Please try again later'
          },
          { status: 429 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Assessment failed',
        message: 'An error occurred during damage assessment'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve fusion statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';

    let response: any = {};

    switch (type) {
      case 'performance':
        // Get performance metrics
        response = EnhancedHybridInferenceService.getPerformanceMetrics();
        break;

      case 'availability':
        // Get service availability
        response = EnhancedHybridInferenceService.getServiceAvailability();
        break;

      case 'fusion-stats':
        // Get fusion statistics
        response = EnhancedBayesianFusionService.getFusionStatistics();
        break;

      case 'summary':
      default:
        // Get combined summary
        const metrics = EnhancedHybridInferenceService.getPerformanceMetrics();
        const availability = EnhancedHybridInferenceService.getServiceAvailability();
        const fusionStats = EnhancedBayesianFusionService.getFusionStatistics();

        response = {
          performance: {
            totalAssessments: metrics.totalInferences,
            threeWayFusionRate: metrics.totalInferences > 0
              ? (metrics.threeWayFusions / metrics.totalInferences) * 100
              : 0,
            averageInferenceMs: metrics.averageInferenceMs,
            sam3UsageRate: metrics.sam3UsageRate * 100,
            fallbackRate: metrics.fallbackRate * 100
          },
          services: {
            yolo: availability.yolo.available ? 'online' : 'offline',
            sam3: availability.sam3.available ? 'online' : 'offline',
            gpt4: availability.gpt4.available ? 'online' : 'offline'
          },
          fusion: {
            currentWeights: fusionStats.currentWeights,
            averageAgreement: fusionStats.averageAgreement * 100,
            weightStability: fusionStats.weightStability * 100
          }
        };
        break;
    }

    return NextResponse.json({
      success: true,
      type,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get fusion statistics', error, {
      endpoint: '/api/building-surveyor/assess-with-fusion'
    });

    return NextResponse.json(
      { error: 'Failed to retrieve statistics' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS endpoint for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}