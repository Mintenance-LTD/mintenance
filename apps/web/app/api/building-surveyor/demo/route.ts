import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';
import { z } from 'zod';
import * as crypto from 'crypto';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const demoRequestSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1).max(3),
  context: z.object({
    propertyType: z.enum(['residential', 'commercial', 'industrial']).optional(),
    ageOfProperty: z.number().optional(),
    location: z.string().optional(),
  }).optional(),
});

/**
 * PUBLIC API endpoint for Building Surveyor damage assessment demo
 * Dynamic imports prevent module-level crashes that cause 405
 */
export const POST = withApiHandler({ auth: false, rateLimit: false }, async (request) => {
  // Dynamic imports to prevent module-level crashes that cause 405
  let logger: Awaited<typeof import('@mintenance/shared')>['logger'];
  let rateLimiter: Awaited<typeof import('@/lib/rate-limiter')>['rateLimiter'];
  let serverSupabase: Awaited<typeof import('@/lib/api/supabaseServer')>['serverSupabase'];
  let BuildingSurveyorService: Awaited<typeof import('@/lib/services/building-surveyor')>['BuildingSurveyorService'];

  try {
    logger = (await import('@mintenance/shared')).logger;
    rateLimiter = (await import('@/lib/rate-limiter')).rateLimiter;
    serverSupabase = (await import('@/lib/api/supabaseServer')).serverSupabase;
    BuildingSurveyorService = (await import('@/lib/services/building-surveyor')).BuildingSurveyorService;
  } catch (importError) {
    console.error('Demo route: failed to load dependencies', importError);
    return NextResponse.json({ error: 'Service temporarily unavailable', details: importError instanceof Error ? importError.message : 'Module load failure' }, { status: 503 });
  }

  logger.debug('Demo route called');
  logger.info('Building Surveyor Demo: Request received', { service: 'mint-ai-demo' });

  const identifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anonymous';
  const rateLimitResult = await rateLimiter.checkRateLimit({ identifier: `mint-ai-demo:${identifier}`, windowMs: 60000, maxRequests: 3 });

  if (!rateLimitResult.allowed) {
    logger.warn('Mint AI demo rate limit exceeded', { service: 'mint-ai-demo', identifier });
    return NextResponse.json({ error: 'Too many requests. Please wait a moment and try again.' }, {
      status: 429,
      headers: { 'Retry-After': String(rateLimitResult.retryAfter || 60), 'X-RateLimit-Limit': '3', 'X-RateLimit-Remaining': String(rateLimitResult.remaining), 'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString() }
    });
  }

  const body = await request.json();
  const validationResult = demoRequestSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
  }

  const { imageUrls, context } = validationResult.data;
  logger.info('Demo assessment starting', { service: 'mint-ai-demo', imageCount: imageUrls.length, identifier });

  const cacheKey = crypto.createHash('sha256').update(imageUrls.sort().join('|')).digest('hex');

  logger.info('About to create demo assessment record', { service: 'mint-ai-demo', cacheKey });

  const { data: placeholderRow, error: insertError } = await serverSupabase
    .from('building_assessments')
    .insert({ user_id: null, shadow_mode: true, cache_key: cacheKey, damage_type: 'pending', severity: 'midway', confidence: 0, safety_score: 50, compliance_score: 50, insurance_risk_score: 50, urgency: 'monitor', assessment_data: {}, validation_status: 'pending' })
    .select('id')
    .single();

  logger.info('Database insert completed', { service: 'mint-ai-demo', hasError: !!insertError, hasPlaceholder: !!placeholderRow, placeholderId: placeholderRow?.id });

  const assessmentId = placeholderRow?.id;

  if (insertError || !assessmentId) {
    logger.error('Failed to create demo assessment record', { service: 'mint-ai-demo', error: insertError, errorMessage: insertError?.message, errorCode: insertError?.code, placeholderRowExists: !!placeholderRow });
  } else {
    logger.info('Demo assessment record created successfully', { service: 'mint-ai-demo', assessmentId, shadowMode: true });
  }

  const assessment: Phase1BuildingAssessment = await BuildingSurveyorService.assessDamage(imageUrls, { propertyType: context?.propertyType || 'residential', ageOfProperty: context?.ageOfProperty, location: context?.location, assessmentId });

  if (assessmentId) {
    await serverSupabase.from('building_assessments').update({ damage_type: assessment.damageAssessment?.damageType || 'unknown', severity: assessment.damageAssessment?.severity || 'midway', confidence: assessment.damageAssessment?.confidence || 0, safety_score: assessment.safetyHazards?.overallSafetyScore || 50, compliance_score: assessment.compliance?.complianceScore || 50, insurance_risk_score: assessment.insuranceRisk?.riskScore || 50, urgency: assessment.urgency?.urgency || 'monitor', assessment_data: assessment as unknown as Record<string, unknown> }).eq('id', assessmentId);
  }

  logger.info('Demo assessment completed', { service: 'mint-ai-demo', identifier, assessmentId, damageType: assessment.damageAssessment?.damageType });

  const responsePayload = {
    damageAssessment: assessment.damageAssessment,
    costEstimate: assessment.contractorAdvice?.estimatedCost,
    urgency: assessment.urgency,
    safetyHazards: assessment.safetyHazards,
    compliance: assessment.compliance,
    insuranceRisk: assessment.insuranceRisk,
    recommendations: [assessment.homeownerExplanation?.whatToDo, ...(assessment.contractorAdvice?.repairNeeded || [])].filter(Boolean),
    decisionResult: assessment.decisionResult,
    materials: assessment.contractorAdvice?.materials || [],
    assessmentId: assessmentId || null,
  };

  logger.info('Demo API response payload', { service: 'mint-ai-demo', hasAssessmentId: !!responsePayload.assessmentId, assessmentId: responsePayload.assessmentId, materialsCount: responsePayload.materials?.length || 0 });

  return NextResponse.json(responsePayload);
});
