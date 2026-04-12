import { NextResponse } from 'next/server';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';
import crypto from 'crypto';
import { LRUCache } from 'lru-cache';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { canonicalizeDamageType } from '@/lib/services/building-surveyor/normalization-utils';

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

/**
 * Dynamic imports helper - loads all heavy dependencies at runtime
 * to prevent module-level crashes that cause 405 on Vercel
 */
async function loadDependencies() {
  const [
    auth,
    bs,
    hybrid,
    agent,
    config,
    dc,
    ab,
    shared,
    sb,
    schemas,
    csrf,
    rl,
    apiErr,
  ] = await Promise.all([
    import('@/lib/auth'),
    import('@/lib/services/building-surveyor/BuildingSurveyorService'),
    import('@/lib/services/building-surveyor/HybridInferenceService'),
    import('@/lib/services/building-surveyor/agent/AgentRunner'),
    import('@/lib/services/building-surveyor/config/BuildingSurveyorConfig'),
    import('@/lib/services/building-surveyor/DataCollectionService'),
    import('@/lib/services/building-surveyor/ab_test_harness'),
    import('@mintenance/shared'),
    import('@/lib/api/supabaseServer'),
    import('@/lib/validation/schemas'),
    import('@/lib/csrf'),
    import('@/lib/rate-limiter'),
    import('@/lib/errors/api-error'),
  ]);

  return {
    getCurrentUserFromCookies: auth.getCurrentUserFromCookies,
    BuildingSurveyorService: bs.BuildingSurveyorService,
    HybridInferenceService: hybrid.HybridInferenceService,
    runAgent: agent.runAgent,
    getConfig: config.getConfig,
    DataCollectionService: dc.DataCollectionService,
    ABTestIntegration: ab.ABTestIntegration,
    logger: shared.logger,
    hashString: shared.hashString,
    serverSupabase: sb.serverSupabase,
    buildingAssessRequestSchema: schemas.buildingAssessRequestSchema,
    requireCSRF: csrf.requireCSRF,
    rateLimiter: rl.rateLimiter,
    handleAPIError: apiErr.handleAPIError,
    UnauthorizedError: apiErr.UnauthorizedError,
    ForbiddenError: apiErr.ForbiddenError,
    BadRequestError: apiErr.BadRequestError,
    RateLimitError: apiErr.RateLimitError,
  };
}

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
    const identifier =
      user.id ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'anonymous';

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

    // SECURITY: Validate image URLs — whitelist domains, block SSRF
    const ALLOWED_IMAGE_HOSTS = [
      process.env.NEXT_PUBLIC_SUPABASE_URL
        ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
        : '',
      'storage.googleapis.com',
      'images.unsplash.com',
    ].filter(Boolean);

    for (const url of imageUrls) {
      if (!url.startsWith('https://'))
        throw new deps.BadRequestError('Image URLs must use HTTPS');

      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new deps.BadRequestError('Invalid image URL format');
      }

      // Block internal/private IPs (SSRF protection)
      const host = parsed.hostname;
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1' ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
        host === '169.254.169.254' || // AWS metadata
        host.endsWith('.internal') ||
        host.endsWith('.local')
      ) {
        throw new deps.BadRequestError(
          'Image URL points to a restricted address'
        );
      }

      // Whitelist check (if configured)
      if (
        ALLOWED_IMAGE_HOSTS.length > 0 &&
        !ALLOWED_IMAGE_HOSTS.some((allowed) => host.endsWith(allowed))
      ) {
        deps.logger.warn('Image URL from non-whitelisted host', {
          service: 'building-surveyor-api',
          host,
          userId: user.id,
        });
        // Allow but log — don't hard-block to avoid breaking legitimate URLs
      }
    }

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
