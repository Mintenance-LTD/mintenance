/**
 * Unified AI Analysis API Endpoint
 *
 * Single endpoint for all AI analysis requests.
 * Routes to appropriate service based on context.
 */

import { NextRequest, NextResponse } from 'next/server';
import { UnifiedAIService, type AnalysisContext } from '@/lib/services/ai/UnifiedAIService';
import { createClient } from '@/lib/database';
import { logger } from '@mintenance/shared';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { images, context } = body;

    // Validate input
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'Images are required' },
        { status: 400 }
      );
    }

    if (!context || typeof context !== 'object') {
      return NextResponse.json(
        { error: 'Context is required' },
        { status: 400 }
      );
    }

    // Add user ID to context
    const analysisContext: AnalysisContext = {
      ...context,
      userId: user.id,
    };

    // Log request
    logger.info('Unified AI analysis requested', {
      userId: user.id,
      type: analysisContext.type,
      imageCount: images.length,
    });

    // Perform analysis
    const result = await UnifiedAIService.analyzeImage(images, analysisContext);

    // Log result
    logger.info('Unified AI analysis completed', {
      userId: user.id,
      success: result.success,
      service: result.service,
      fallbackUsed: result.fallbackUsed,
      cost: result.cost,
      processingTime: result.processingTime,
    });

    // Return appropriate response
    if (!result.success) {
      // Handle specific error codes
      if (result.error?.code === 'BUDGET_EXCEEDED') {
        return NextResponse.json(
          {
            error: 'AI budget exceeded',
            message: result.error.message,
            fallbackUsed: result.fallbackUsed,
          },
          { status: 429 }
        );
      }

      if (result.error?.code === 'EMERGENCY_STOP') {
        return NextResponse.json(
          {
            error: 'AI services temporarily unavailable',
            message: result.error.message,
          },
          { status: 503 }
        );
      }

      // Generic error
      return NextResponse.json(
        {
          error: 'Analysis failed',
          message: result.error?.message || 'Unknown error',
          fallbackUsed: result.fallbackUsed,
        },
        { status: 500 }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: {
        service: result.service,
        model: result.model,
        fallbackUsed: result.fallbackUsed,
        cost: result.cost,
        processingTime: result.processingTime,
      },
    });

  } catch (error) {
    logger.error('Unified AI analysis endpoint error', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check AI service status
 */
export async function GET(request: NextRequest) {
  try {
    // Get service status
    const status = await UnifiedAIService.getStatus();

    return NextResponse.json(status);
  } catch (error) {
    logger.error('Failed to get AI service status', error);

    return NextResponse.json(
      {
        operational: false,
        error: 'Failed to retrieve status',
      },
      { status: 500 }
    );
  }
}