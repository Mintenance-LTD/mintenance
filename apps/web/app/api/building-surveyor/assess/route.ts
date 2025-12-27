import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { BuildingSurveyorService } from '@/lib/services/building-surveyor/BuildingSurveyorService';
import { HybridInferenceService } from '@/lib/services/building-surveyor/HybridInferenceService';
import { getConfig } from '@/lib/services/building-surveyor/config/BuildingSurveyorConfig';
import { DataCollectionService } from '@/lib/services/building-surveyor/DataCollectionService';
import { ABTestIntegration } from '@/lib/services/building-surveyor/ab_test_harness';
import { logger, hashString } from '@mintenance/shared';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import crypto from 'crypto';
import { requireCSRF } from '@/lib/csrf';
import fs from 'fs';
import path from 'path';
import { LRUCache } from 'lru-cache';
import { handleAPIError, UnauthorizedError, ForbiddenError, BadRequestError } from '@/lib/errors/api-error';

// Environment configuration for A/B testing
const AB_TEST_ENABLED = process.env.AB_TEST_ENABLED === 'true';
const AB_TEST_SHADOW_MODE = process.env.AB_TEST_SHADOW_MODE === 'true';
const AB_TEST_ROLLOUT_PERCENT = parseFloat(process.env.AB_TEST_ROLLOUT_PERCENT || '0');
const AB_TEST_EXPERIMENT_ID = process.env.AB_TEST_EXPERIMENT_ID;

// LRU cache for building assessments (in-memory, fast duplicate detection)
// Complements database cache with O(1) get/set operations
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days (matches DB cache TTL)
const MAX_CACHE_SIZE = 200; // More entries than ImageAnalysis (handles more assessment variations)

type Phase1BuildingAssessment = any; // Import from BuildingSurveyorService types

const assessmentCache = new LRUCache<string, Phase1BuildingAssessment>({
  max: MAX_CACHE_SIZE,
  ttl: CACHE_TTL,
  updateAgeOnGet: true,  // LRU behavior - frequently accessed items stay in cache
  allowStale: false,      // Don't return expired entries
});

const assessRequestSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1).max(4),
  jobId: z.string().uuid().optional(), // Add job_id support
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
 * GET /api/building-surveyor/assess
 *
 * Get cache statistics (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const stats = {
      size: assessmentCache.size,
      maxSize: MAX_CACHE_SIZE,
      utilizationPercent: Math.round((assessmentCache.size / MAX_CACHE_SIZE) * 100),
      ttlDays: 7,
      estimatedMonthlySavings: {
        // Assuming $0.01 per GPT-4 Vision call
        // 30-40% cache hit rate on ~230 calls/month
        gpt4VisionCallsSaved: Math.round(assessmentCache.size * 0.35), // 35% hit rate
        costSavedUSD: (Math.round(assessmentCache.size * 0.35) * 0.01).toFixed(2),
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    return handleAPIError(error);
  }
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
      throw new UnauthorizedError('Authentication required');
    }

    // 2. Parse and validate request
    const body = await request.json();
    const validationResult = assessRequestSchema.safeParse(body);

    if (!validationResult.success) {
      throw new BadRequestError('Invalid request');
    }

    const { imageUrls, context } = validationResult.data;

    // 3. Validate image URLs are accessible
    // (Basic check - in production, you might want to verify they're from your storage)
    for (const url of imageUrls) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new BadRequestError('Invalid image URL format');
      }
    }

    // 4. Check in-memory cache first (O(1) lookup, <1ms response)
    const cacheKey = generateCacheKey(imageUrls);
    const memoryAssessment = assessmentCache.get(cacheKey);

    if (memoryAssessment) {
      logger.info('Building assessment cache hit (in-memory)', {
        service: 'building-surveyor-api',
        userId: user.id,
        cacheKey,
        source: 'memory',
      });
      return NextResponse.json({
        ...memoryAssessment,
        cached: true,
        cacheSource: 'memory',
      });
    }

    // 5. Check database cache (fallback for cache misses)
    const { data: cachedAssessment } = await serverSupabase
      .from('building_assessments')
      .select('assessment_data, created_at')
      .eq('cache_key', cacheKey)
      .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 7 days
      .single();

    if (cachedAssessment?.assessment_data) {
      logger.info('Building assessment cache hit (database)', {
        service: 'building-surveyor-api',
        userId: user.id,
        cacheKey,
        source: 'database',
      });

      // Populate in-memory cache for next time
      assessmentCache.set(cacheKey, cachedAssessment.assessment_data);

      return NextResponse.json({
        ...cachedAssessment.assessment_data,
        cached: true,
        cacheSource: 'database',
      });
    }

    // 6. A/B Testing Integration (if enabled)
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
                job_id: validationResult.data.jobId, // Add job_id if provided
                cache_key: cacheKey,
                damage_type: abResult.aiResult.predictedDamageType,
                severity: abResult.aiResult.predictedSeverity,
                confidence: Math.round(abResult.aiResult.fusionMean * 100),
                safety_score: abResult.aiResult.predictedSafetyCritical ? 50 : 80,
                compliance_score: 80,
                insurance_risk_score: 50,
                urgency: 'monitor',
                assessment_data: abResult.aiResult as unknown as Record<string, unknown>,
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
    // Check if hybrid inference is enabled
    const config = getConfig();
    const assessment = config.useHybridInference
      ? await HybridInferenceService.assessWithHybridRouting(imageUrls, context)
      : await BuildingSurveyorService.assessDamage(imageUrls, context);

    // Log which service was used
    logger.info('Assessment service used', {
      service: 'building-surveyor-api',
      inferenceType: config.useHybridInference ? 'hybrid' : 'gpt4-first',
      userId: user.id,
    });

    // 6a. Check decision result from Safe-LUCB Critic
    const shadowModeEnabled = process.env.SHADOW_MODE_ENABLED === 'true';
    const shouldAutomate = 
      assessment.decisionResult?.decision === 'automate' && 
      !shadowModeEnabled;

    if (shouldAutomate && assessment.decisionResult) {
      // Automated decision - return immediately
      logger.info('Automated assessment (Safe-LUCB)', {
        service: 'building-surveyor-api',
        userId: user.id,
        decision: assessment.decisionResult.decision,
        safetyUcb: assessment.decisionResult.safetyUcb,
        rewardUcb: assessment.decisionResult.rewardUcb,
      });

      // Still save to database for tracking (marked as validated)
      try {
        await serverSupabase.from('building_assessments').insert({
          user_id: user.id,
          job_id: validationResult.data.jobId, // Add job_id if provided
          cache_key: cacheKey,
          damage_type: assessment.damageAssessment.damageType,
          severity: assessment.damageAssessment.severity,
          confidence: assessment.damageAssessment.confidence,
          safety_score: assessment.safetyHazards.overallSafetyScore,
          compliance_score: assessment.compliance.complianceScore,
          insurance_risk_score: assessment.insuranceRisk.riskScore,
          urgency: assessment.urgency.urgency,
          assessment_data: assessment,
          validation_status: 'validated', // Auto-validated by Safe-LUCB
          created_at: new Date().toISOString(),
        });
      } catch (saveError) {
        logger.warn('Failed to save automated assessment', {
          service: 'building-surveyor-api',
          error: saveError,
        });
      }

      // Store in in-memory cache for fast subsequent lookups
      assessmentCache.set(cacheKey, assessment);
      logger.info('Building assessment cached (automated)', {
        service: 'building-surveyor-api',
        cacheKey,
        damageType: assessment.damageAssessment.damageType,
      });

      return NextResponse.json(assessment);
    }

    // 7. Save assessment to database (for training data collection)
    // Decision is 'escalate' or shadow mode - requires human review
    try {
      const { error: saveError } = await serverSupabase.from('building_assessments').insert({
        user_id: user.id,
        job_id: validationResult.data.jobId, // Add job_id if provided
        cache_key: cacheKey,
        damage_type: assessment.damageAssessment.damageType,
        severity: assessment.damageAssessment.severity,
        confidence: assessment.damageAssessment.confidence,
        safety_score: assessment.safetyHazards.overallSafetyScore,
        compliance_score: assessment.compliance.complianceScore,
        insurance_risk_score: assessment.insuranceRisk.riskScore,
        urgency: assessment.urgency.urgency,
        assessment_data: assessment,
        validation_status: shadowModeEnabled && assessment.decisionResult?.decision === 'automate'
          ? 'pending_shadow' // Shadow mode: decision was automate but forced escalation
          : 'pending', // Needs human review
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

    // 8. Store in in-memory cache for fast subsequent lookups
    assessmentCache.set(cacheKey, assessment);
    logger.info('Building assessment cached', {
      service: 'building-surveyor-api',
      cacheKey,
      damageTypes: assessment.damageAssessment.damageType,
      severity: assessment.damageAssessment.severity,
    });

    // 9. Return assessment
    return NextResponse.json(assessment);
  } catch (error: unknown) {
    logger.error('Error in building surveyor assessment', error, {
      service: 'building-surveyor-api',
    });

    // #region agent log
    const logData = {location:'api/building-surveyor/assess/route.ts:323',message:'Error caught in API route',data:{errorType:error instanceof Error ? error.name : typeof error,errorMessage:error instanceof Error ? error.message : String(error),hasOpenaiErrorCode:!!(error as any)?.openaiErrorCode,openaiErrorCode:(error as any)?.openaiErrorCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'};
    console.log('[DEBUG] API route error:', logData);
    try {
      const logPath = path.join(process.cwd(), '.cursor', 'debug.log');
      fs.appendFileSync(logPath, JSON.stringify(logData) + '\n');
    } catch (e) {
      // File write failed, that's ok - console.log is the fallback
    }
    // #endregion

    return handleAPIError(error);
  }
}

