// Dynamic import tester — identifies which module crashes at load time
// Each import is wrapped in try/catch so one failure won't mask another

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler({ roles: ['admin'] }, async (_request) => {
  const results: Record<string, string> = {};

  const modules = [
    ['@mintenance/shared', () => import('@mintenance/shared')],
    ['@mintenance/auth', () => import('@mintenance/auth')],
    ['@/lib/rate-limiter', () => import('@/lib/rate-limiter')],
    ['@/lib/rate-limiter-enhanced', () => import('@/lib/rate-limiter-enhanced')],
    ['@/lib/csrf', () => import('@/lib/csrf')],
    ['@/lib/errors/api-error', () => import('@/lib/errors/api-error')],
    ['@/lib/cors', () => import('@/lib/cors')],
    ['@/lib/api/supabaseServer', () => import('@/lib/api/supabaseServer')],
    ['@/lib/auth', () => import('@/lib/auth')],
    ['@supabase/supabase-js', () => import('@supabase/supabase-js')],
    ['@upstash/redis', () => import('@upstash/redis')],
    ['@/lib/auth-manager', () => import('@/lib/auth-manager')],
    ['@/lib/validation/validator', () => import('@/lib/validation/validator')],
    ['@/lib/validation/schemas', () => import('@/lib/validation/schemas')],
    ['@/lib/mfa/mfa-service', () => import('@/lib/mfa/mfa-service')],
    ['@/lib/database', () => import('@/lib/database')],
  ] as const;

  for (const [name, importer] of modules) {
    try {
      const mod = await (importer as () => Promise<Record<string, unknown>>)();
      results[name] = `OK (keys: ${Object.keys(mod).slice(0, 5).join(', ')}...)`;
    } catch (e: unknown) {
      // SECURITY: Only expose error type and message — never stack traces
      results[name] = `FAIL: ${e instanceof Error ? e.message : 'Unknown error'}`;
    }
  }

  // SECURITY: Environment presence indicators removed to prevent information leakage.
  // Use server-side logging or infrastructure dashboards to verify env configuration.

  return NextResponse.json({ imports: results, timestamp: new Date().toISOString() });
});
