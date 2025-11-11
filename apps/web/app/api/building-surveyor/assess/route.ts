import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { BuildingSurveyorService } from '@/lib/services/building-surveyor/BuildingSurveyorService';
import { DataCollectionService } from '@/lib/services/building-surveyor/DataCollectionService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import crypto from 'crypto';
import { requireCSRF } from '@/lib/csrf';

const assessRequestSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1).max(4),
  context: z
    .object({
      location: z.string().optional(),
      propertyType: z.enum(['residential', 'commercial', 'industrial']).optional(),
      ageOfProperty: z.number().optional(),
      propertyDetails: z.string().optional(),
    })
    .optional(),
});

/**
 * Generate cache key from image URLs
 */
function generateCacheKey(imageUrls: string[]): string {
  const hash = crypto
    .createHash('sha256')
    .update(imageUrls.sort().join('|'))
    .digest('hex');
  return `building_assessment:${hash}`;
}

/**
 * POST /api/building-surveyor/assess
 * 
 * Assess building damage from photos using GPT-4 Vision
 */
export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
// 1. Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate request
    const body = await request.json();
    const validationResult = assessRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { imageUrls, context } = validationResult.data;

    // 3. Validate image URLs are accessible
    // (Basic check - in production, you might want to verify they're from your storage)
    for (const url of imageUrls) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return NextResponse.json(
          { error: 'Invalid image URL format' },
          { status: 400 }
        );
      }
    }

    // 4. Check cache (optional - using database cache)
    const cacheKey = generateCacheKey(imageUrls);
    const { data: cachedAssessment } = await serverSupabase
      .from('building_assessments')
      .select('assessment_data, created_at')
      .eq('cache_key', cacheKey)
      .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 7 days
      .single();

    if (cachedAssessment?.assessment_data) {
      logger.info('Returning cached assessment', {
        service: 'building-surveyor-api',
        userId: user.id,
        cacheKey,
      });
      return NextResponse.json(cachedAssessment.assessment_data);
    }

    // 5. Call Building Surveyor Service
    const assessment = await BuildingSurveyorService.assessDamage(imageUrls, context);

    // 6. Save assessment to database (for training data collection)
    try {
      const { error: saveError } = await serverSupabase.from('building_assessments').insert({
        user_id: user.id,
        cache_key: cacheKey,
        damage_type: assessment.damageAssessment.damageType,
        severity: assessment.damageAssessment.severity,
        confidence: assessment.damageAssessment.confidence,
        safety_score: assessment.safetyHazards.overallSafetyScore,
        compliance_score: assessment.compliance.complianceScore,
        insurance_risk_score: assessment.insuranceRisk.riskScore,
        urgency: assessment.urgency.urgency,
        assessment_data: assessment,
        validation_status: 'pending', // Needs human review
        created_at: new Date().toISOString(),
      });

      if (saveError) {
        logger.warn('Failed to save assessment to database', {
          service: 'building-surveyor-api',
          error: saveError,
        });
        // Don't fail the request if save fails
      }

      // Save image associations
      if (!saveError) {
        const { data: savedAssessment } = await serverSupabase
          .from('building_assessments')
          .select('id')
          .eq('cache_key', cacheKey)
          .single();

        if (savedAssessment) {
          const imageInserts = imageUrls.map((url, index) => ({
            assessment_id: savedAssessment.id,
            image_url: url,
            image_index: index,
          }));

          await serverSupabase.from('assessment_images').insert(imageInserts);

          // Attempt auto-validation for high-confidence assessments
          const autoValidationResult = await DataCollectionService.autoValidateIfHighConfidence(
            assessment,
            savedAssessment.id
          );

          if (autoValidationResult.autoValidated) {
            logger.info('Assessment auto-validated', {
              service: 'building-surveyor-api',
              assessmentId: savedAssessment.id,
              userId: user.id,
              reason: autoValidationResult.reason,
            });
          } else {
            logger.info('Assessment requires human review', {
              service: 'building-surveyor-api',
              assessmentId: savedAssessment.id,
              userId: user.id,
              reason: autoValidationResult.reason,
            });
          }
        }
      }
    } catch (dbError) {
      logger.warn('Database error saving assessment', {
        service: 'building-surveyor-api',
        error: dbError,
      });
      // Continue - assessment is still returned to user
    }

    logger.info('Building assessment completed', {
      service: 'building-surveyor-api',
      userId: user.id,
      damageType: assessment.damageAssessment.damageType,
      severity: assessment.damageAssessment.severity,
    });

    // 7. Return assessment
    return NextResponse.json(assessment);
  } catch (error: any) {
    logger.error('Error in building surveyor assessment', error, {
      service: 'building-surveyor-api',
    });

    // Return user-friendly error
    const errorMessage =
      error.message || 'Failed to assess building damage. Please try again.';

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

