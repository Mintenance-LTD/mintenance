import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { BuildingSurveyorService } from '@/lib/services/building-surveyor/BuildingSurveyorService';
import { DataCollectionService } from '@/lib/services/building-surveyor/DataCollectionService';
import { ABTestIntegration } from '@/lib/services/building-surveyor/ab_test_harness';
import { logger, hashString } from '@mintenance/shared';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import crypto from 'crypto';
import { requireCSRF } from '@/lib/csrf';

// Environment configuration for A/B testing
const AB_TEST_ENABLED = process.env.AB_TEST_ENABLED === 'true';
const AB_TEST_SHADOW_MODE = process.env.AB_TEST_SHADOW_MODE === 'true';
const AB_TEST_ROLLOUT_PERCENT = parseFloat(process.env.AB_TEST_ROLLOUT_PERCENT || '0');
const AB_TEST_EXPERIMENT_ID = process.env.AB_TEST_EXPERIMENT_ID;

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
          details: validationResult.error.issues,
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

    // 5. A/B Testing Integration (if enabled)
    if (AB_TEST_ENABLED && AB_TEST_EXPERIMENT_ID) {
      // Rollout gating (gradual ramp)
      const enrollmentHash = hashString(`${user.id}_${AB_TEST_EXPERIMENT_ID}`);
      const enrollmentBucket = enrollmentHash % 100;

      if (enrollmentBucket < AB_TEST_ROLLOUT_PERCENT) {
        // User is enrolled in A/B test
        logger.info('A/B test enrollment', {
          service: 'building-surveyor-api',
          userId: user.id,
          experimentId: AB_TEST_EXPERIMENT_ID,
          bucket: enrollmentBucket,
        });

        try {
          const abTest = new ABTestIntegration(AB_TEST_EXPERIMENT_ID);
          
          // Generate assessment ID
          const assessmentId = crypto.randomUUID();

          const abResult = await abTest.assessDamageWithABTest({
            assessmentId,
            userId: user.id,
            imageUrls,
            propertyType: context?.propertyType || 'residential',
            propertyAge: context?.ageOfProperty || 50,
            region: context?.location || 'unknown',
          });

          // Shadow mode: log but force human review
          if (AB_TEST_SHADOW_MODE) {
            logger.info('A/B shadow mode - forcing human review', {
              service: 'building-surveyor-api',
              assessmentId,
              decision: abResult.decision,
              arm: abResult.arm,
            });

            // Continue with standard flow but log A/B decision
            // The assessment will be saved normally below
          } else {
            // Live mode: honor A/B decision
            if (!abResult.requiresHumanReview && abResult.aiResult) {
              // Automated - return AI result directly
              logger.info('A/B automated assessment', {
                service: 'building-surveyor-api',
                assessmentId,
                arm: abResult.arm,
              });

              // Still save to database for tracking
              const cacheKey = generateCacheKey(imageUrls);
              await serverSupabase.from('building_assessments').insert({
                user_id: user.id,
                cache_key: cacheKey,
                damage_type: abResult.aiResult.predictedDamageType,
                severity: abResult.aiResult.predictedSeverity,
                confidence: Math.round(abResult.aiResult.fusionMean * 100),
                safety_score: abResult.aiResult.predictedSafetyCritical ? 50 : 80,
                compliance_score: 80,
                insurance_risk_score: 50,
                urgency: 'monitor',
                assessment_data: abResult.aiResult as any,
                validation_status: 'validated', // Auto-validated by Safe-LUCB
                created_at: new Date().toISOString(),
              });

              return NextResponse.json({
                ...abResult.aiResult,
                abTestMetadata: {
                  arm: abResult.arm,
                  decision: abResult.decision,
                  automated: true,
                  decisionTimeSeconds: abResult.decisionTimeSeconds,
                },
              });
            }
            // If requires human review, fall through to standard flow
          }
        } catch (abError) {
          logger.error('A/B test error - falling back to standard flow', abError, {
            service: 'building-surveyor-api',
            userId: user.id,
          });
          // Fall through to standard flow on error
        }
      }
    }

    // 6. Standard flow (no A/B test or not enrolled)
    const assessment = await BuildingSurveyorService.assessDamage(imageUrls, context);

    // 7. Save assessment to database (for training data collection)
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

    // 8. Return assessment
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

