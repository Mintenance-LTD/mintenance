import { NextResponse } from 'next/server';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';
import crypto from 'crypto';
import { LRUCache } from 'lru-cache';
import { withApiHandler } from '@/lib/api/with-api-handler';

// Environment configuration for A/B testing
const AB_TEST_ENABLED = process.env.AB_TEST_ENABLED === 'true';
const AB_TEST_SHADOW_MODE = process.env.AB_TEST_SHADOW_MODE === 'true';
const AB_TEST_ROLLOUT_PERCENT = parseFloat(process.env.AB_TEST_ROLLOUT_PERCENT || '0');
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
  const [auth, bs, hybrid, agent, config, dc, ab, shared, sb, schemas, csrf, rl, apiErr] = await Promise.all([
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
  return crypto.createHash('sha256').update(imageUrls.sort().join('|')).digest('hex');
}

/**
 * GET /api/building-surveyor/assess
 * Get cache statistics (admin only)
 */
export const GET = withApiHandler({ auth: false, rateLimit: false }, async (request) => {
  let deps: Awaited<ReturnType<typeof loadDependencies>>;
  try {
    deps = await loadDependencies();
  } catch (importError) {
    return NextResponse.json(
      { error: 'Service temporarily unavailable', details: importError instanceof Error ? importError.message : 'Module load failure' },
      { status: 503 }
    );
  }

  const user = await deps.getCurrentUserFromCookies();
  if (!user || user.role !== 'admin') throw new deps.ForbiddenError('Admin access required');

  return NextResponse.json({
    size: assessmentCache.size,
    maxSize: MAX_CACHE_SIZE,
    utilizationPercent: Math.round((assessmentCache.size / MAX_CACHE_SIZE) * 100),
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
export const POST = withApiHandler({ auth: false, rateLimit: false }, async (request) => {
  let deps: Awaited<ReturnType<typeof loadDependencies>>;
  try {
    deps = await loadDependencies();
  } catch (importError) {
    return NextResponse.json(
      { error: 'Service temporarily unavailable', details: importError instanceof Error ? importError.message : 'Module load failure' },
      { status: 503 }
    );
  }

  // Custom rate limit for expensive AI operations (5/min)
  const identifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') || 'anonymous';

  const rateLimitResult = await deps.rateLimiter.checkRateLimit({
    identifier: `building-surveyor:${identifier}`,
    windowMs: 60000,
    maxRequests: 5,
  });

  if (!rateLimitResult.allowed) {
    deps.logger.warn('Building surveyor rate limit exceeded', { service: 'building-surveyor-api', identifier });
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'X-RateLimit-Limit': '5', 'X-RateLimit-Remaining': String(rateLimitResult.remaining), 'Retry-After': String(rateLimitResult.retryAfter || 60) } }
    );
  }

  await deps.requireCSRF(request);

  const user = await deps.getCurrentUserFromCookies();
  if (!user) throw new deps.UnauthorizedError('Authentication required');

  const body = await request.json();
  const validationResult = deps.buildingAssessRequestSchema.safeParse(body);
  if (!validationResult.success) throw new deps.BadRequestError('Invalid request');

  const { imageUrls, context, jobId: bodyJobId, propertyId: bodyPropertyId, domain: bodyDomain } = validationResult.data;

  for (const url of imageUrls) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) throw new deps.BadRequestError('Invalid image URL format');
  }

  // Check in-memory cache first
  const cacheKey = generateCacheKey(imageUrls);
  const memoryAssessment = assessmentCache.get(cacheKey);
  if (memoryAssessment) {
    deps.logger.info('Building assessment cache hit (in-memory)', { service: 'building-surveyor-api', userId: user.id, cacheSource: 'memory' });
    return NextResponse.json({ ...memoryAssessment, cached: true, cacheSource: 'memory' });
  }

  // Check database cache
  const { data: cachedAssessment } = await deps.serverSupabase
    .from('building_assessments')
    .select('assessment_data, created_at')
    .eq('cache_key', cacheKey)
    .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .single();

  // Validate the cached data is complete (not just an empty placeholder `{}`)
  const cachedData = cachedAssessment?.assessment_data as Record<string, unknown> | undefined;
  if (cachedData?.damageAssessment) {
    deps.logger.info('Building assessment cache hit (database)', { service: 'building-surveyor-api', userId: user.id, cacheSource: 'database' });
    assessmentCache.set(cacheKey, cachedAssessment!.assessment_data);
    return NextResponse.json({ ...cachedAssessment!.assessment_data, cached: true, cacheSource: 'database' });
  }

  // A/B Testing Integration (if enabled)
  if (AB_TEST_ENABLED && AB_TEST_EXPERIMENT_ID) {
    const enrollmentHash = deps.hashString(`${user.id}_${AB_TEST_EXPERIMENT_ID}`);
    const enrollmentBucket = enrollmentHash % 100;

    if (enrollmentBucket < AB_TEST_ROLLOUT_PERCENT) {
      deps.logger.info('A/B test enrollment', { service: 'building-surveyor-api', userId: user.id, experimentId: AB_TEST_EXPERIMENT_ID, bucket: enrollmentBucket });

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
          deps.logger.info('A/B shadow mode - forcing human review', { service: 'building-surveyor-api', assessmentId, decision: abResult.decision, arm: abResult.arm });
        } else {
          if (!abResult.requiresHumanReview && abResult.aiResult) {
            deps.logger.info('A/B automated assessment', { service: 'building-surveyor-api', assessmentId, arm: abResult.arm });

            const abCacheKey = generateCacheKey(imageUrls);
            await deps.serverSupabase.from('building_assessments').insert({
              user_id: user.id,
              job_id: bodyJobId ?? null,
              cache_key: abCacheKey,
              damage_type: abResult.aiResult.predictedDamageType,
              severity: abResult.aiResult.predictedSeverity,
              confidence: Math.round(abResult.aiResult.fusionMean * 100),
              safety_score: abResult.aiResult.predictedSafetyCritical ? 50 : 80,
              compliance_score: 80,
              insurance_risk_score: 50,
              urgency: 'monitor',
              assessment_data: abResult.aiResult as unknown as Record<string, unknown>,
              validation_status: 'validated',
              created_at: new Date().toISOString(),
            });

            return NextResponse.json({ ...abResult.aiResult, abTestMetadata: { arm: abResult.arm, decision: abResult.decision, automated: true, decisionTimeSeconds: abResult.decisionTimeSeconds } });
          }
        }
      } catch (abError) {
        deps.logger.error('A/B test error - falling back to standard flow', abError, { service: 'building-surveyor-api', userId: user.id });
      }
    }
  }

  // Standard flow
  const config = deps.getConfig();
  let assessment: Phase1BuildingAssessment;
  let assessmentIdForImages: string | null = null;

  if (config.useHybridInference) {
    assessment = await deps.HybridInferenceService.assessDamage(imageUrls, context) as unknown as Phase1BuildingAssessment;
    deps.logger.info('Assessment service used', { service: 'building-surveyor-api', inferenceType: 'hybrid', userId: user.id });
  } else {
    const domain = bodyDomain ?? 'building';
    const { data: placeholderRow, error: insertError } = await deps.serverSupabase
      .from('building_assessments')
      .insert({
        user_id: user.id,
        job_id: bodyJobId ?? null,
        property_id: bodyPropertyId ?? null,
        cache_key: cacheKey,
        domain,
        damage_type: 'general_damage',
        severity: 'early',  // DB column stores progression ('early'|'midway'|'full'), not damageAssessment.severity
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

    let assessmentId: string;
    if (insertError?.code === '23505') {
      // Stale placeholder row exists (cache_key unique constraint hit on re-run) — fetch its id and reuse it.
      const { data: existingRow, error: fetchError } = await deps.serverSupabase
        .from('building_assessments')
        .select('id')
        .eq('cache_key', cacheKey)
        .single();

      if (fetchError || !existingRow?.id) {
        deps.logger.error('Failed to locate existing assessment row after duplicate key conflict', { service: 'building-surveyor-api' });
        throw new Error('Failed to create assessment');
      }

      deps.logger.info('Reusing stale placeholder row for re-run', { service: 'building-surveyor-api', assessmentId: existingRow.id });
      assessmentId = existingRow.id;
    } else if (insertError || !placeholderRow?.id) {
      deps.logger.error('Failed to create placeholder assessment row', { service: 'building-surveyor-api', error: insertError });
      throw new Error('Failed to create assessment');
    } else {
      assessmentId = placeholderRow.id;
    }

    assessmentIdForImages = assessmentId;
    const agentResult = await deps.runAgent({
      assessmentId,
      imageUrls,
      userId: user.id,
      context: context ? { propertyType: context.propertyType, ageOfProperty: context.ageOfProperty, location: context.location, propertyDetails: context.propertyDetails } : undefined,
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

    await deps.serverSupabase.from('building_assessments').update({
      damage_type: assessment.damageAssessment.damageType,
      severity: assessment.damageAssessment.severity,
      confidence: assessment.damageAssessment.confidence,
      safety_score: assessment.safetyHazards.overallSafetyScore,
      compliance_score: assessment.compliance.complianceScore,
      insurance_risk_score: assessment.insuranceRisk.riskScore,
      urgency: assessment.urgency.urgency,
      assessment_data: assessment as unknown as Record<string, unknown>,
      validation_status: validationStatus,
    }).eq('id', assessmentId);

    deps.logger.info('Assessment service used', { service: 'building-surveyor-api', inferenceType: 'agent', userId: user.id, assessmentId });
  }

  const shadowModeEnabled = process.env.SHADOW_MODE_ENABLED === 'true';
  const shouldAutomate = assessment.decisionResult?.decision === 'automate' && !shadowModeEnabled;

  if (shouldAutomate && assessment.decisionResult) {
    deps.logger.info('Automated assessment (Safe-LUCB)', { service: 'building-surveyor-api', userId: user.id, decision: assessment.decisionResult.decision });
    assessmentCache.set(cacheKey, assessment);
    return NextResponse.json(assessment);
  }

  try {
    if (config.useHybridInference && !assessmentIdForImages) {
      await deps.serverSupabase.from('building_assessments').insert({
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
        validation_status: shadowModeEnabled && assessment.decisionResult?.decision === 'automate' ? 'pending_shadow' : 'pending',
        created_at: new Date().toISOString(),
      });
    }

    const savedAssessmentId =
      assessmentIdForImages ??
      (await deps.serverSupabase.from('building_assessments').select('id').eq('cache_key', cacheKey).single()).data?.id;

    if (savedAssessmentId) {
      await deps.serverSupabase.from('assessment_images').insert(
        imageUrls.map((url, index) => ({ assessment_id: savedAssessmentId, image_url: url, image_index: index }))
      );

      const autoValidationResult = await deps.DataCollectionService.autoValidateIfHighConfidence(assessment, savedAssessmentId);
      deps.logger.info(autoValidationResult.autoValidated ? 'Assessment auto-validated' : 'Assessment requires human review', {
        service: 'building-surveyor-api',
        assessmentId: savedAssessmentId,
        userId: user.id,
        reason: autoValidationResult.reason,
      });
    }
  } catch (dbError) {
    deps.logger.warn('Database error saving assessment', { service: 'building-surveyor-api', error: dbError });
  }

  deps.logger.info('Building assessment completed', { service: 'building-surveyor-api', userId: user.id, damageType: assessment.damageAssessment.damageType });

  assessmentCache.set(cacheKey, assessment);
  return NextResponse.json(assessment);
});
