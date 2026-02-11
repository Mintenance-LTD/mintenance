// Dynamic import tester — identifies which module crashes at load time
// Each import is wrapped in try/catch so one failure won't mask another

export async function GET() {
  const results: Record<string, string> = {};

  // 1. Test @mintenance/shared
  try {
    const mod = await import('@mintenance/shared');
    results['@mintenance/shared'] = `OK (keys: ${Object.keys(mod).slice(0, 5).join(', ')}...)`;
  } catch (e: unknown) {
    results['@mintenance/shared'] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 2. Test @mintenance/auth
  try {
    const mod = await import('@mintenance/auth');
    results['@mintenance/auth'] = `OK (keys: ${Object.keys(mod).slice(0, 5).join(', ')}...)`;
  } catch (e: unknown) {
    results['@mintenance/auth'] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 3. Test @/lib/rate-limiter
  try {
    await import('@/lib/rate-limiter');
    results['@/lib/rate-limiter'] = 'OK';
  } catch (e: unknown) {
    results['@/lib/rate-limiter'] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 4. Test @/lib/rate-limiter-enhanced
  try {
    await import('@/lib/rate-limiter-enhanced');
    results['@/lib/rate-limiter-enhanced'] = 'OK';
  } catch (e: unknown) {
    results['@/lib/rate-limiter-enhanced'] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 5. Test @/lib/csrf
  try {
    await import('@/lib/csrf');
    results['@/lib/csrf'] = 'OK';
  } catch (e: unknown) {
    results['@/lib/csrf'] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 6. Test @/lib/errors/api-error
  try {
    await import('@/lib/errors/api-error');
    results['@/lib/errors/api-error'] = 'OK';
  } catch (e: unknown) {
    results['@/lib/errors/api-error'] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 7. Test @/lib/cors
  try {
    await import('@/lib/cors');
    results['@/lib/cors'] = 'OK';
  } catch (e: unknown) {
    results['@/lib/cors'] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 8. Test @/lib/api/supabaseServer
  try {
    await import('@/lib/api/supabaseServer');
    results['@/lib/api/supabaseServer'] = 'OK';
  } catch (e: unknown) {
    results['@/lib/api/supabaseServer'] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 9. Test @/lib/auth
  try {
    await import('@/lib/auth');
    results['@/lib/auth'] = 'OK';
  } catch (e: unknown) {
    results['@/lib/auth'] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 10. Test @supabase/supabase-js
  try {
    await import('@supabase/supabase-js');
    results['@supabase/supabase-js'] = 'OK';
  } catch (e: unknown) {
    results['@supabase/supabase-js'] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 11. Test @upstash/redis
  try {
    await import('@upstash/redis');
    results['@upstash/redis'] = 'OK';
  } catch (e: unknown) {
    results['@upstash/redis'] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // === LOGIN ROUTE IMPORTS (to diagnose POST /api/auth/login 405/500) ===

  // 12. Test @/lib/auth-manager
  try {
    await import('@/lib/auth-manager');
    results['@/lib/auth-manager'] = 'OK';
  } catch (e: unknown) {
    results['@/lib/auth-manager'] = `FAIL: ${e instanceof Error ? e.stack || e.message : String(e)}`;
  }

  // 13. Test @/lib/validation/validator
  try {
    await import('@/lib/validation/validator');
    results['@/lib/validation/validator'] = 'OK';
  } catch (e: unknown) {
    results['@/lib/validation/validator'] = `FAIL: ${e instanceof Error ? e.stack || e.message : String(e)}`;
  }

  // 14. Test @/lib/validation/schemas
  try {
    await import('@/lib/validation/schemas');
    results['@/lib/validation/schemas'] = 'OK';
  } catch (e: unknown) {
    results['@/lib/validation/schemas'] = `FAIL: ${e instanceof Error ? e.stack || e.message : String(e)}`;
  }

  // 15. Test @/lib/mfa/mfa-service
  try {
    await import('@/lib/mfa/mfa-service');
    results['@/lib/mfa/mfa-service'] = 'OK';
  } catch (e: unknown) {
    results['@/lib/mfa/mfa-service'] = `FAIL: ${e instanceof Error ? e.stack || e.message : String(e)}`;
  }

  // 16. Test @/lib/database
  try {
    await import('@/lib/database');
    results['@/lib/database'] = 'OK';
  } catch (e: unknown) {
    results['@/lib/database'] = `FAIL: ${e instanceof Error ? e.stack || e.message : String(e)}`;
  }

  // Environment info
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    nodeVersion: process.version,
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasSupabaseService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
    hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  return new Response(
    JSON.stringify({ imports: results, env: envInfo, timestamp: new Date().toISOString() }, null, 2),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
