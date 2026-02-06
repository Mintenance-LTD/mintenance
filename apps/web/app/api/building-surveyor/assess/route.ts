import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { BuildingSurveyorService } from '@/lib/services/building-surveyor/BuildingSurveyorService';
import { HybridInferenceService } from '@/lib/services/building-surveyor/HybridInferenceService';
import { runAgent } from '@/lib/services/building-surveyor/agent/AgentRunner';
import { getConfig } from '@/lib/services/building-surveyor/config/BuildingSurveyorConfig';
import { DataCollectionService } from '@/lib/services/building-surveyor/DataCollectionService';
import { ABTestIntegration } from '@/lib/services/building-surveyor/ab_test_harness';
import { logger, hashString } from '@mintenance/shared';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import crypto from 'crypto';
import { requireCSRF } from '@/lib/csrf';
import { rateLimiter } from '@/lib/rate-limiter';
import { LRUCache } from 'lru-cache';
import { handleAPIError, UnauthorizedError, ForbiddenError, BadRequestError, RateLimitError } from '@/lib/errors/api-error';

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

const ASSESSMENT_DOMAINS = ['building', 'rail', 'infrastructure', 'general'] as const;

const assessRequestSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1).max(4),
  jobId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  domain: z.enum(ASSESSMENT_DOMAINS).optional(), // Phase 6: extensibility (default building)
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
 * OWASP Security: Rate limited to prevent API cost abuse
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - OWASP best practice: limit expensive AI operations
    const identifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                       request.headers.get('x-real-ip') ||
                       'anonymous';

    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `building-surveyor:${identifier}`,
      windowMs: 60000, // 1 minute
      maxRequests: 5, // 5 requests per minute (expensive AI analysis)
    });

    if (!rateLimitResult.allowed) {
      logger.warn('Building surveyor rate limit exceeded', {
        service: 'building-surveyor-api',
        identifier,
        remaining: rateLimitResult.remaining,
        retryAfter: rateLimitResult.retryAfter,
      });

      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetTime / 1000)),
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      );
    }
    
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

    const { imageUrls, context, jobId: bodyJobId, propertyId: bodyPropertyId, domain: bodyDomain } = validationResult.data;

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
                job_id: bodyJobId ?? null,
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
    const config = getConfig();
    let assessment: Phase1BuildingAssessment;
    let assessmentIdForImages: string | null = null;

    if (config.useHybridInference) {
      assessment = await HybridInferenceService.assessDamage(imageUrls, context) as unknown as Phase1BuildingAssessment;
      logger.info('Assessment service used', {
        service: 'building-surveyor-api',
        inferenceType: 'hybrid',
        userId: user.id,
      });
    } else {
      // Agent path: create placeholder row -> run agent -> update row
      const domain = bodyDomain ?? 'building';
      const { data: placeholderRow, error: insertError } = await serverSupabase
        .from('building_assessments')
        .insert({
          user_id: user.id,
          job_id: bodyJobId ?? null,
          property_id: bodyPropertyId ?? null,
          cache_key: cacheKey,
          domain,
          damage_type: 'general_damage',
          severity: 0,
          confidence: 0,
          safety_score: 50,
          compliance_score: 50,
          insurance_risk_score: 50,
          urgency: 'monitor',
          assessment_data: {},
          validation_status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError || !placeholderRow?.id) {
        logger.error('Failed to create placeholder assessment row', {
          service: 'building-surveyor-api',
          error: insertError,
        });
        throw new Error('Failed to create assessment');
      }

      const assessmentId = placeholderRow.id;
      assessmentIdForImages = assessmentId;
      const agentResult = await runAgent({
        assessmentId,
        imageUrls,
        userId: user.id,
        context: context
          ? {
              propertyType: context.propertyType,
              ageOfProperty: context.ageOfProperty,
              location: context.location,
              propertyDetails: context.propertyDetails,
            }
          : undefined,
        jobId: bodyJobId,
        propertyId: bodyPropertyId,
        domain,
      });
      assessment = agentResult.assessment;

      const validationStatus =
        agentResult.needsReview === true
          ? 'needs_review'
          : assessment.decisionResult?.decision === 'automate' && process.env.SHADOW_MODE_ENABLED !== 'true'
            ? 'validated'
            : process.env.SHADOW_MODE_ENABLED === 'true' && assessment.decisionResult?.decision === 'automate'
              ? 'pending_shadow'
              : 'pending';

      await serverSupabase
        .from('building_assessments')
        .update({
          damage_type: assessment.damageAssessment.damageType,
          severity: assessment.damageAssessment.severity,
          confidence: assessment.damageAssessment.confidence,
          safety_score: assessment.safetyHazards.overallSafetyScore,
          compliance_score: assessment.compliance.complianceScore,
          insurance_risk_score: assessment.insuranceRisk.riskScore,
          urgency: assessment.urgency.urgency,
          assessment_data: assessment as unknown as Record<string, unknown>,
          validation_status: validationStatus,
        })
        .eq('id', assessmentId);

      logger.info('Assessment service used', {
        service: 'building-surveyor-api',
        inferenceType: 'agent',
        userId: user.id,
        assessmentId,
      });
    }

    // 6a. Check decision result from Safe-LUCB Critic
    const shadowModeEnabled = process.env.SHADOW_MODE_ENABLED === 'true';
    const shouldAutomate =
      assessment.decisionResult?.decision === 'automate' && !shadowModeEnabled;

    if (shouldAutomate && assessment.decisionResult) {
      logger.info('Automated assessment (Safe-LUCB)', {
        service: 'building-surveyor-api',
        userId: user.id,
        decision: assessment.decisionResult.decision,
        safetyUcb: assessment.decisionResult.safetyUcb,
        rewardUcb: assessment.decisionResult.rewardUcb,
      });

      assessmentCache.set(cacheKey, assessment);
      logger.info('Building assessment cached (automated)', {
        service: 'building-surveyor-api',
        cacheKey,
        damageType: assessment.damageAssessment.damageType,
      });

      return NextResponse.json(assessment);
    }

    // 7. Save image associations (assessment row already created in agent path; hybrid path inserts here)
    try {
      if (config.useHybridInference && !assessmentIdForImages) {
        await serverSupabase.from('building_assessments').insert({
          user_id: user.id,
          job_id: bodyJobId ?? null,
          property_id: bodyPropertyId ?? null,
          cache_key: cacheKey,
          domain: bodyDomain ?? 'building',
          damage_type: assessment.damageAssessment.damageType,
          severity: assessment.damageAssessment.severity,
          confidence: assessment.damageAssessment.confidence,
          safety_score: assessment.safetyHazards.overallSafetyScore,
          compliance_score: assessment.compliance.complianceScore,
          insurance_risk_score: assessment.insuranceRisk.riskScore,
          urgency: assessment.urgency.urgency,
          assessment_data: assessment as unknown as Record<string, unknown>,
          validation_status:
            shadowModeEnabled && assessment.decisionResult?.decision === 'automate' ? 'pending_shadow' : 'pending',
          created_at: new Date().toISOString(),
        });
      }

      const savedAssessmentId =
        assessmentIdForImages ??
        (await serverSupabase.from('building_assessments').select('id').eq('cache_key', cacheKey).single()).data?.id;

      if (savedAssessmentId) {
        const imageInserts = imageUrls.map((url, index) => ({
          assessment_id: savedAssessmentId,
          image_url: url,
          image_index: index,
        }));

        await serverSupabase.from('assessment_images').insert(imageInserts);

        const autoValidationResult = await DataCollectionService.autoValidateIfHighConfidence(
          assessment,
          savedAssessmentId
        );

        if (autoValidationResult.autoValidated) {
          logger.info('Assessment auto-validated', {
            service: 'building-surveyor-api',
            assessmentId: savedAssessmentId,
            userId: user.id,
            reason: autoValidationResult.reason,
          });
        } else {
          logger.info('Assessment requires human review', {
            service: 'building-surveyor-api',
            assessmentId: savedAssessmentId,
            userId: user.id,
            reason: autoValidationResult.reason,
          });
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

    return handleAPIError(error);
  }
}

