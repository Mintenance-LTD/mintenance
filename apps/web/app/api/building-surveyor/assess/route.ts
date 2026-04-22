import { NextResponse } from 'next/server';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';
import crypto from 'crypto';
import { LRUCache } from 'lru-cache';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getClientIp } from '@/lib/request-ip';
import { canonicalizeDamageType } from '@/lib/services/building-surveyor/normalization-utils';
import { checkAICostBudget } from '@/lib/ai/cost-budget';
import { loadDependencies } from './_deps';
import { validateImageUrls } from './_image-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // AI assessment (GPT-4 Vision + Roboflow) can take up to 5 min

// Environment configuration for A/B testing
const AB_TEST_ENABLED = process.env.AB_TEST_ENABLED === 'true';
const AB_TEST_SHADOW_MODE = process.env.AB_TEST_SHADOW_MODE === 'true';
const AB_TEST_ROLLOUT_PERCENT = parseFloat(
  process.env.AB_TEST_ROLLOUT_PERCENT || '0'
);
const AB_TEST_EXPERIMENT_ID = process.env.AB_TEST_EXPERIMENT_ID;

// LRU cache for building assessments (in-memory, fast duplicate detection)
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE = 200;

const assessmentCache = new LRUCache<string, Phase1BuildingAssessment>({
  max: MAX_CACHE_SIZE,
  ttl: CACHE_TTL,
  updateAgeOnGet: true,
  allowStale: false,
});

function generateCacheKey(imageUrls: string[]): string {
  // SHA-256 hex is exactly 64 chars, which fits the VARCHAR(64) cache_key column.
  // The table name (building_assessments) provides the namespace implicitly.
  return crypto
    .createHash('sha256')
    .update(imageUrls.sort().join('|'))
    .digest('hex');
}

/**
 * GET /api/building-surveyor/assess
 * Get cache statistics (admin only)
 */
export const GET = withApiHandler({ roles: ['admin'] }, async (_request) => {
  try {
    await loadDependencies();
  } catch (importError) {
    return NextResponse.json(
      {
        error: 'Service temporarily unavailable',
        details:
          importError instanceof Error
            ? importError.message
            : 'Module load failure',
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    size: assessmentCache.size,
    maxSize: MAX_CACHE_SIZE,
    utilizationPercent: Math.round(
      (assessmentCache.size / MAX_CACHE_SIZE) * 100
    ),
    ttlDays: 7,
    estimatedMonthlySavings: {
      gpt4VisionCallsSaved: Math.round(assessmentCache.size * 0.35),
      costSavedUSD: (Math.round(assessmentCache.size * 0.35) * 0.01).toFixed(2),
    },
  });
});

/**
 * POST /api/building-surveyor/assess
 * Assess building damage from photos using GPT-4 Vision
 * OWASP Security: Rate limited to prevent API cost abuse
 */
export const POST = withApiHandler(
  { auth: true, rateLimit: false },
  async (request, { user }) => {
    let deps: Awaited<ReturnType<typeof loadDependencies>>;
    try {
      deps = await loadDependencies();
    } catch (importError) {
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          details:
            importError instanceof Error
              ? importError.message
              : 'Module load failure',
        },
        { status: 503 }
      );
    }

    // Custom rate limit for expensive AI operations (5/min)
    // SECURITY: Use authenticated user ID as primary identifier (not spoofable x-forwarded-for)
    const identifier = user.id || getClientIp(request);

    const rateLimitResult = await deps.rateLimiter.checkRateLimit({
      identifier: `building-surveyor:${identifier}`,
      windowMs: 60000,
      maxRequests: 5,
    });

    if (!rateLimitResult.allowed) {
      deps.logger.warn('Building surveyor rate limit exceeded', {
        service: 'building-surveyor-api',
        identifier,
      });
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      );
    }

    // Sprint 5.3: per-user AI cost cap. Rate limit is the sprint cadence;
    // this is the rolling-window budget guard. Checking ai_service_costs
    // for the last 24h / 30d sum and rejecting if over cap.
    const budget = await checkAICostBudget(user.id);
    if (!budget.allowed) {
      deps.logger.warn('Building surveyor cost cap reached', {
        service: 'building-surveyor-api',
        userId: user.id,
        reason: budget.reason,
        spent: budget.spent,
        limits: budget.limits,
      });
      return NextResponse.json(
        {
          error:
            budget.reason === 'monthly_cap_exceeded'
              ? 'Monthly AI usage limit reached. Please contact support to increase your quota.'
              : 'Daily AI usage limit reached. Please try again tomorrow or contact support.',
          code: budget.reason,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validationResult = deps.buildingAssessRequestSchema.safeParse(body);
    if (!validationResult.success)
      throw new deps.BadRequestError('Invalid request');

    const {
      imageUrls,
      context,
      jobId: bodyJobId,
      propertyId: bodyPropertyId,
      domain: bodyDomain,
      gps: bodyGps,
      roomMetadata: bodyRoomMetadata,
    } = validationResult.data;

    // SECURITY: HTTPS + SSRF validation extracted to _image-validation.ts
    validateImageUrls(imageUrls, {
      BadRequestError: deps.BadRequestError,
      logger: deps.logger,
      userId: user.id,
    });

    // Check in-memory cache first
    const cacheKey = generateCacheKey(imageUrls);
    const memoryAssessment = assessmentCache.get(cacheKey);
    if (memoryAssessment) {
      deps.logger.info('Building assessment cache hit (in-memory)', {
        service: 'building-surveyor-api',
        userId: user.id,
        cacheSource: 'memory',
      });
      return NextResponse.json({
        ...memoryAssessment,
        cached: true,
        cacheSource: 'memory',
      });
    }

    // Check database cache
    const { data: cachedAssessment } = await deps.serverSupabase
      .from('building_assessments')
      .select('assessment_data, created_at')
      .eq('cache_key', cacheKey)
      .gt(
        'created_at',
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      )
      .single();

    // Validate the cached data is complete (not just an empty placeholder `{}`)
    const cachedData = cachedAssessment?.assessment_data as
      | Record<string, unknown>
      | undefined;
    if (cachedData?.damageAssessment) {
      deps.logger.info('Building assessment cache hit (database)', {
        service: 'building-surveyor-api',
        userId: user.id,
        cacheSource: 'database',
      });
      assessmentCache.set(cacheKey, cachedAssessment!.assessment_data);
      return NextResponse.json({
        ...cachedAssessment!.assessment_data,
        cached: true,
        cacheSource: 'database',
      });
    }

    // A/B Testing Integration (if enabled)
    if (AB_TEST_ENABLED && AB_TEST_EXPERIMENT_ID) {
      const enrollmentHash = deps.hashString(
        `${user.id}_${AB_TEST_EXPERIMENT_ID}`
      );
      const enrollmentBucket = enrollmentHash % 100;

      if (enrollmentBucket < AB_TEST_ROLLOUT_PERCENT) {
        deps.logger.info('A/B test enrollment', {
          service: 'building-surveyor-api',
          userId: user.id,
          experimentId: AB_TEST_EXPERIMENT_ID,
          bucket: enrollmentBucket,
        });

        try {
          const abTest = new deps.ABTestIntegration(AB_TEST_EXPERIMENT_ID);
          const assessmentId = crypto.randomUUID();

          const abResult = await abTest.assessDamageWithABTest({
            assessmentId,
            userId: user.id,
            imageUrls,
            propertyType: context?.propertyType || 'residential',
            propertyAge: context?.ageOfProperty || 50,
            region: context?.location || 'unknown',
          });

          if (AB_TEST_SHADOW_MODE) {
            deps.logger.info('A/B shadow mode - forcing human review', {
              service: 'building-surveyor-api',
              assessmentId,
              decision: abResult.decision,
              arm: abResult.arm,
            });
          } else {
            if (!abResult.requiresHumanReview && abResult.aiResult) {
              deps.logger.info('A/B automated assessment', {
                service: 'building-surveyor-api',
                assessmentId,
                arm: abResult.arm,
              });

              const abCacheKey = generateCacheKey(imageUrls);
              await deps.serverSupabase.from('building_assessments').insert({
                user_id: user.id,
                job_id: bodyJobId ?? null,
                cache_key: abCacheKey,
                damage_type: abResult.aiResult.predictedDamageType,
                severity: abResult.aiResult.predictedSeverity,
                confidence: Math.round(abResult.aiResult.fusionMean * 100),
                safety_score: abResult.aiResult.predictedSafetyCritical
                  ? 50
                  : 80,
                compliance_score: 80,
                insurance_risk_score: 50,
                urgency: 'monitor',
                assessment_data: abResult.aiResult as unknown as Record<
                  string,
                  unknown
                >,
                validation_status: 'validated',
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
          }
        } catch (abError) {
          deps.logger.error(
            'A/B test error - falling back to standard flow',
            abError,
            { service: 'building-surveyor-api', userId: user.id }
          );
        }
      }
    }

    // Standard flow
    const config = deps.getConfig();
    let assessment: Phase1BuildingAssessment;
    let assessmentIdForImages: string | null = null;

    if (config.useHybridInference) {
      assessment = (await deps.HybridInferenceService.assessDamage(
        imageUrls,
        context
      )) as unknown as Phase1BuildingAssessment;
      deps.logger.info('Assessment service used', {
        service: 'building-surveyor-api',
        inferenceType: 'hybrid',
        userId: user.id,
      });
    } else {
      const domain = bodyDomain ?? 'building';
      const { data: placeholderRow, error: insertError } =
        await deps.serverSupabase
          .from('building_assessments')
          .insert({
            user_id: user.id,
            job_id: bodyJobId ?? null,
            property_id: bodyPropertyId ?? null,
            cache_key: cacheKey,
            domain,
            damage_type: 'general_damage',
            severity: 'early', // DB column stores progression ('early'|'midway'|'full'), not damageAssessment.severity
            confidence: 0,
            safety_score: 50,
            compliance_score: 50,
            insurance_risk_score: 50,
            urgency: 'monitor',
            assessment_data: {},
            validation_status: 'pending',
            ...(bodyGps
              ? {
                  latitude: bodyGps.latitude,
                  longitude: bodyGps.longitude,
                }
              : {}),
            ...(bodyRoomMetadata ? { room_metadata: bodyRoomMetadata } : {}),
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

      let assessmentId: string;
      if (insertError?.code === '23505') {
        // Stale placeholder row exists (cache_key unique constraint hit on re-run) — fetch its id and reuse it.
        const { data: existingRow, error: fetchError } =
          await deps.serverSupabase
            .from('building_assessments')
            .select('id')
            .eq('cache_key', cacheKey)
            .single();

        if (fetchError || !existingRow?.id) {
          deps.logger.error(
            'Failed to locate existing assessment row after duplicate key conflict',
            { service: 'building-surveyor-api' }
          );
          throw new Error('Failed to create assessment');
        }

        deps.logger.info('Reusing stale placeholder row for re-run', {
          service: 'building-surveyor-api',
          assessmentId: existingRow.id,
        });
        assessmentId = existingRow.id;
      } else if (insertError || !placeholderRow?.id) {
        deps.logger.error('Failed to create placeholder assessment row', {
          service: 'building-surveyor-api',
          error: insertError,
        });
        throw new Error('Failed to create assessment');
      } else {
        assessmentId = placeholderRow.id;
      }

      assessmentIdForImages = assessmentId;

      // Auto-fetch before photos from job_photos_metadata for before/after comparison.
      // Up to 2 before images are retrieved so the total stays within the 4-image limit.
      let beforeImageUrls: string[] | undefined;
      if (bodyJobId) {
        const { data: beforePhotos } = await deps.serverSupabase
          .from('job_photos_metadata')
          .select('photo_url')
          .eq('job_id', bodyJobId)
          .eq('photo_type', 'before')
          .limit(2);
        if (beforePhotos && beforePhotos.length > 0) {
          beforeImageUrls = (beforePhotos as Array<{ photo_url: string }>)
            .map((p) => p.photo_url)
            .filter(Boolean);
        }
      }

      const agentResult = await deps.runAgent({
        assessmentId,
        imageUrls,
        userId: user.id,
        context:
          context || beforeImageUrls?.length
            ? {
                ...(context
                  ? {
                      propertyType: context.propertyType,
                      ageOfProperty: context.ageOfProperty,
                      location: context.location,
                      propertyDetails: context.propertyDetails,
                    }
                  : {}),
                ...(beforeImageUrls?.length ? { beforeImageUrls } : {}),
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
          : assessment.decisionResult?.decision === 'automate' &&
              process.env.SHADOW_MODE_ENABLED !== 'true'
            ? 'validated'
            : process.env.SHADOW_MODE_ENABLED === 'true' &&
                assessment.decisionResult?.decision === 'automate'
              ? 'pending_shadow'
              : 'pending';

      const canonicalType = canonicalizeDamageType(
        assessment.damageAssessment.damageType
      );

      await deps.serverSupabase
        .from('building_assessments')
        .update({
          damage_type: assessment.damageAssessment.damageType,
          damage_type_canonical: canonicalType,
          severity: assessment.damageAssessment.severity,
          confidence: assessment.damageAssessment.confidence,
          safety_score: assessment.safetyHazards.overallSafetyScore,
          compliance_score: assessment.compliance.complianceScore,
          insurance_risk_score: assessment.insuranceRisk.riskScore,
          urgency: assessment.urgency.urgency,
          assessment_data: assessment as unknown as Record<string, unknown>,
          validation_status: validationStatus,
          recommended_trades:
            assessment.contractorAdvice.recommendedTrades || [],
        })
        .eq('id', assessmentId);

      deps.logger.info('Assessment service used', {
        service: 'building-surveyor-api',
        inferenceType: 'agent',
        userId: user.id,
        assessmentId,
      });
    }

    // Save assessment_images immediately (before any early return)
    // This fixes the gap where automated assessments skipped image persistence
    if (assessmentIdForImages) {
      try {
        await deps.serverSupabase.from('assessment_images').insert(
          imageUrls.map((url, index) => ({
            assessment_id: assessmentIdForImages,
            image_url: url,
            image_index: index,
          }))
        );
      } catch (imgErr) {
        deps.logger.warn('Failed to save assessment images', {
          service: 'building-surveyor-api',
          error: imgErr,
          assessmentId: assessmentIdForImages,
        });
      }
    }

    const shadowModeEnabled = process.env.SHADOW_MODE_ENABLED === 'true';
    const shouldAutomate =
      assessment.decisionResult?.decision === 'automate' && !shadowModeEnabled;

    if (shouldAutomate && assessment.decisionResult) {
      deps.logger.info('Automated assessment (Safe-LUCB)', {
        service: 'building-surveyor-api',
        userId: user.id,
        decision: assessment.decisionResult.decision,
      });
      assessmentCache.set(cacheKey, assessment);
      return NextResponse.json(assessment);
    }

    try {
      if (config.useHybridInference && !assessmentIdForImages) {
        const hybridCanonicalType = canonicalizeDamageType(
          assessment.damageAssessment.damageType
        );
        await deps.serverSupabase.from('building_assessments').insert({
          user_id: user.id,
          job_id: bodyJobId ?? null,
          property_id: bodyPropertyId ?? null,
          cache_key: cacheKey,
          domain: bodyDomain ?? 'building',
          damage_type: assessment.damageAssessment.damageType,
          damage_type_canonical: hybridCanonicalType,
          severity: assessment.damageAssessment.severity,
          confidence: assessment.damageAssessment.confidence,
          safety_score: assessment.safetyHazards.overallSafetyScore,
          compliance_score: assessment.compliance.complianceScore,
          insurance_risk_score: assessment.insuranceRisk.riskScore,
          urgency: assessment.urgency.urgency,
          assessment_data: assessment as unknown as Record<string, unknown>,
          recommended_trades:
            assessment.contractorAdvice.recommendedTrades || [],
          validation_status:
            shadowModeEnabled &&
            assessment.decisionResult?.decision === 'automate'
              ? 'pending_shadow'
              : 'pending',
          created_at: new Date().toISOString(),
        });
      }

      const savedAssessmentId =
        assessmentIdForImages ??
        (
          await deps.serverSupabase
            .from('building_assessments')
            .select('id')
            .eq('cache_key', cacheKey)
            .single()
        ).data?.id;

      if (savedAssessmentId) {
        // Images already saved above (before early-return check).
        // Only save here for hybrid inference path where assessmentIdForImages was null.
        if (!assessmentIdForImages) {
          await deps.serverSupabase.from('assessment_images').insert(
            imageUrls.map((url, index) => ({
              assessment_id: savedAssessmentId,
              image_url: url,
              image_index: index,
            }))
          );
        }

        // Shadow-mode data collection: record GPT-4o teacher output to
        // gpt4_training_labels so the student VLM has a training corpus to
        // fine-tune on once MINT_AI_VLM_ENDPOINT is deployed. Fire-and-forget
        // because capture must never block or fail a live assessment.
        //
        // Historical context: before this call, the hybrid inference path
        // (HybridInferenceService.assessDamage, which is the default prod
        // path) never populated gpt4_training_labels — only the non-hybrid
        // AssessmentOrchestrator branch called recordGPT4Output via
        // captureTrainingDataAsync. That gap meant prod had 1 row in
        // gpt4_training_labels after 473 real assessments. This hook closes
        // the gap on both branches.
        deps.KnowledgeDistillationService.recordGPT4Output(
          savedAssessmentId,
          assessment,
          imageUrls,
          context
            ? {
                location: context.location,
                propertyType: context.propertyType,
                ageOfProperty: context.ageOfProperty,
                propertyDetails: context.propertyDetails,
              }
            : undefined
        ).catch((err) => {
          deps.logger.warn('Training data capture failed (non-critical)', {
            service: 'building-surveyor-api',
            assessmentId: savedAssessmentId,
            error: err instanceof Error ? err.message : String(err),
          });
        });

        const autoValidationResult =
          await deps.DataCollectionService.autoValidateIfHighConfidence(
            assessment,
            savedAssessmentId
          );
        deps.logger.info(
          autoValidationResult.autoValidated
            ? 'Assessment auto-validated'
            : 'Assessment requires human review',
          {
            service: 'building-surveyor-api',
            assessmentId: savedAssessmentId,
            userId: user.id,
            reason: autoValidationResult.reason,
          }
        );
      }
    } catch (dbError) {
      deps.logger.warn('Database error saving assessment', {
        service: 'building-surveyor-api',
        error: dbError,
      });
    }

    deps.logger.info('Building assessment completed', {
      service: 'building-surveyor-api',
      userId: user.id,
      damageType: assessment.damageAssessment.damageType,
    });

    // Cross-property pattern correlation: connect defects from previous assessments on the same property
    if (bodyPropertyId && assessment.damageAssessment.damageType) {
      try {
        const { correlatePropertyPatterns } =
          await import('@/lib/services/building-surveyor/PropertyPatternCorrelation');
        const patternInsights = await correlatePropertyPatterns(
          bodyPropertyId,
          assessment.damageAssessment.damageType
        );
        if (patternInsights) {
          assessment.patternInsights = patternInsights;
          deps.logger.info('Property pattern correlation attached', {
            service: 'building-surveyor-api',
            propertyId: bodyPropertyId,
            connectedDefects: patternInsights.connectedDefects,
          });
        }
      } catch (patternError) {
        // Non-fatal — pattern correlation failure should never block an assessment
        deps.logger.warn('Property pattern correlation failed', {
          service: 'building-surveyor-api',
          error: patternError,
        });
      }
    }

    assessmentCache.set(cacheKey, assessment);
    return NextResponse.json(assessment);
  }
);
