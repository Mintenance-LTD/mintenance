import { NextRequest, NextResponse } from 'next/server';
import { BuildingSurveyorService } from '@/lib/services/building-surveyor';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';
import { logger } from '@mintenance/shared';
import { handleAPIError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import * as crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const demoRequestSchema = z.object({
  imageUrls: z.array(z.string()).min(1).max(3),
  context: z.object({
    propertyType: z.enum(['residential', 'commercial', 'industrial']).optional(),
    ageOfProperty: z.number().optional(),
    location: z.string().optional(),
  }).optional(),
});

/**
 * PUBLIC API endpoint for Building Surveyor damage assessment demo
 * This is a simplified version for the /try-mint-ai page
 * Does NOT require authentication (for demo purposes only)
 */
export async function POST(request: NextRequest) {
    console.log('=== DEMO ROUTE CALLED ===');
    logger.info('Building Surveyor Demo: Request received', {
      service: 'mint-ai-demo',
    });

    try {
  // Strict rate limiting for public endpoint
  const identifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     'anonymous';

  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `mint-ai-demo:${identifier}`,
    windowMs: 60000, // 1 minute
    maxRequests: 3, // Only 3 demo requests per minute
  });

  if (!rateLimitResult.allowed) {
    logger.warn('Mint AI demo rate limit exceeded', {
      service: 'mint-ai-demo',
      identifier,
    });

    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': '3',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

        // Parse and validate request
        const body = await request.json();
        const validationResult = demoRequestSchema.safeParse(body);

        if (!validationResult.success) {
          throw new BadRequestError('Invalid request data');
        }

        const { imageUrls, context } = validationResult.data;

        logger.info('Demo assessment starting', {
          service: 'mint-ai-demo',
          imageCount: imageUrls.length,
          identifier,
        });

        // Generate cache key for deduplication
        const cacheKey = crypto
          .createHash('sha256')
          .update(imageUrls.sort().join('|'))
          .digest('hex');

        console.log('=== ABOUT TO CREATE ASSESSMENT RECORD ===');
        logger.info('About to create demo assessment record', {
          service: 'mint-ai-demo',
          cacheKey,
        });

        // Create placeholder assessment record (shadow_mode = true, user_id = null)
        // This enables training data capture for demo assessments
        const { data: placeholderRow, error: insertError } = await serverSupabase
          .from('building_assessments')
          .insert({
            user_id: null,  // NULL allowed when shadow_mode = true
            shadow_mode: true,  // Demo assessments run in shadow mode
            cache_key: cacheKey,
            damage_type: 'pending',  // Will be updated after assessment
            severity: 'midway',  // Placeholder
            confidence: 0,
            safety_score: 50,
            compliance_score: 50,
            insurance_risk_score: 50,
            urgency: 'monitor',
            assessment_data: {},
            validation_status: 'pending',
          })
          .select('id')
          .single();

        logger.info('Database insert completed', {
          service: 'mint-ai-demo',
          hasError: !!insertError,
          hasPlaceholder: !!placeholderRow,
          placeholderId: placeholderRow?.id,
        });

        const assessmentId = placeholderRow?.id;

        if (insertError || !assessmentId) {
          logger.error('Failed to create demo assessment record', {
            service: 'mint-ai-demo',
            error: insertError,
            errorMessage: insertError?.message,
            errorCode: insertError?.code,
            errorDetails: insertError?.details,
            placeholderRowExists: !!placeholderRow,
            assessmentIdValue: assessmentId,
          });
          // Continue without assessmentId (training data won't be captured but assessment will work)
        } else {
          logger.info('Demo assessment record created successfully', {
            service: 'mint-ai-demo',
            assessmentId,
            shadowMode: true,
          });
        }

        // Perform assessment using the Building Surveyor service
        // Pass assessmentId through context to enable training data capture
        const assessment: Phase1BuildingAssessment = await BuildingSurveyorService.assessDamage(
            imageUrls,
            {
                propertyType: context?.propertyType || 'residential',
                ageOfProperty: context?.ageOfProperty,
                location: context?.location,
                assessmentId,  // Enable training data capture for demo
            }
        );

        // Update assessment record with actual results
        if (assessmentId) {
          await serverSupabase
            .from('building_assessments')
            .update({
              damage_type: assessment.damageAssessment?.damageType || 'unknown',
              severity: assessment.damageAssessment?.severity || 'midway',
              confidence: assessment.damageAssessment?.confidence || 0,
              safety_score: assessment.safetyHazards?.overallSafetyScore || 50,
              compliance_score: assessment.compliance?.complianceScore || 50,
              insurance_risk_score: assessment.insuranceRisk?.riskScore || 50,
              urgency: assessment.urgency?.urgency || 'monitor',
              assessment_data: assessment as unknown as Record<string, unknown>,
            })
            .eq('id', assessmentId);
        }

        logger.info('Demo assessment completed', {
          service: 'mint-ai-demo',
          identifier,
          assessmentId,
          damageType: assessment.damageAssessment?.damageType,
        });

        // Build response payload
        const responsePayload = {
          damageAssessment: assessment.damageAssessment,
          costEstimate: assessment.contractorAdvice?.estimatedCost,
          urgency: assessment.urgency,
          safetyHazards: assessment.safetyHazards,
          compliance: assessment.compliance,
          insuranceRisk: assessment.insuranceRisk,
          recommendations: [
            assessment.homeownerExplanation?.whatToDo,
            ...(assessment.contractorAdvice?.repairNeeded || []),
          ].filter(Boolean),
          decisionResult: assessment.decisionResult,
          // Include materials (enriched with database pricing)
          materials: assessment.contractorAdvice?.materials || [],
          // Include assessmentId for training feedback (Phase 2)
          assessmentId: assessmentId || null,
        };

        // Log what we're returning to help debug frontend issues
        logger.info('Demo API response payload', {
          service: 'mint-ai-demo',
          hasAssessmentId: !!responsePayload.assessmentId,
          assessmentId: responsePayload.assessmentId,
          materialsCount: responsePayload.materials?.length || 0,
        });

        // Return full assessment for the demo page
        return NextResponse.json(responsePayload);

    } catch (error) {
        logger.error('Demo assessment error', error, {
          service: 'mint-ai-demo',
        });
        return handleAPIError(error);
    }
}

/**
 * Format cost range for display
 */
function formatCostRange(cost?: { min: number; max: number }): string {
    if (!cost || (cost.min === 0 && cost.max === 0)) {
        return 'Contact for quote';
    }

    const formatter = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    return `${formatter.format(cost.min)}-${formatter.format(cost.max)}`;
}

/**
 * Format urgency for display
 */
function formatUrgency(urgency: string): string {
    const urgencyMap: Record<string, string> = {
        'immediate': 'Immediate action required',
        'urgent': 'Within 24-48 hours',
        'soon': 'Within 1 week',
        'moderate': 'Within 2-4 weeks',
        'low': 'Plan for future',
    };

    return urgencyMap[urgency.toLowerCase()] || urgency;
}
