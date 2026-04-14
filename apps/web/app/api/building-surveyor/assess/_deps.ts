/**
 * Dynamic import bundle for /api/building-surveyor/assess.
 *
 * Extracted from route.ts in Sprint 6.5 to keep the main route file under
 * the 500-line limit. All of these modules are heavy enough that loading
 * them at module-init time caused 405s on Vercel cold starts; deferring
 * via dynamic import inside a function fixes that.
 */

export async function loadDependencies() {
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

export type AssessDependencies = Awaited<ReturnType<typeof loadDependencies>>;
