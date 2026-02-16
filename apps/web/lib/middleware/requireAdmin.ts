import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@/lib/logger';
import type { User } from '@mintenance/types';

/**
 * Secure admin authorization middleware with database verification
 *
 * This middleware implements multi-layer security:
 * 1. JWT validation (fast check)
 * 2. Database role verification (security check)
 * 3. Audit logging for failed attempts
 *
 * CRITICAL: Never trust JWT claims alone for admin operations
 * Always verify against the database to prevent token forgery attacks
 */
export async function requireAdmin(request: NextRequest): Promise<{
  user: Pick<User, 'id' | 'email' | 'role'> & { verified?: boolean; dbVerified?: boolean };
  error?: never;
} | {
  error: NextResponse;
  user?: never;
}> {
  try {
    // Step 1: Get user from JWT cookies (fast check)
    const user = await getCurrentUserFromCookies();

    // Step 2: Check if user exists and has admin role in JWT
    if (!user) {
      logger.warn('[SECURITY] Unauthenticated admin access attempt', {
        service: 'requireAdmin',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        path: request.nextUrl.pathname,
      });

      return {
        error: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      };
    }

    if (user.role !== 'admin') {
      logger.warn('[SECURITY] Non-admin user attempted admin access', {
        service: 'requireAdmin',
        userId: user.id,
        email: user.email,
        jwtRole: user.role,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        path: request.nextUrl.pathname,
      });

      return {
        error: NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        )
      };
    }

    // Step 3: CRITICAL - Verify admin role against database
    // This prevents forged JWT attacks
    const supabase = serverSupabase;

    const { data: dbUser, error: dbError } = await supabase
      .from('profiles')
      .select('id, email, role, verified')
      .eq('id', user.id)
      .single();

    if (dbError || !dbUser) {
      logger.error('[SECURITY] Failed to verify admin user in database', {
        service: 'requireAdmin',
        userId: user.id,
        email: user.email,
        error: dbError?.message,
        severity: 'CRITICAL',
      });

      // Log to audit_logs table for security monitoring
      await logSecurityEvent(user.id, 'ADMIN_VERIFICATION_FAILED', {
        jwtRole: user.role,
        dbError: dbError?.message,
        path: request.nextUrl.pathname,
      });

      return {
        error: NextResponse.json(
          { error: 'Authorization verification failed' },
          { status: 403 }
        )
      };
    }

    // Step 4: Verify database role matches admin
    if (dbUser.role !== 'admin') {
      logger.error('[SECURITY] JWT-DB role mismatch - potential token forgery', {
        service: 'requireAdmin',
        userId: user.id,
        email: user.email,
        jwtRole: user.role,
        dbRole: dbUser.role,
        severity: 'CRITICAL',
      });

      // This is a critical security event - log it
      await logSecurityEvent(user.id, 'ADMIN_TOKEN_FORGERY_ATTEMPT', {
        jwtRole: user.role,
        dbRole: dbUser.role,
        path: request.nextUrl.pathname,
      });

      return {
        error: NextResponse.json(
          { error: 'Invalid authorization token - security event logged' },
          { status: 403 }
        )
      };
    }

    // Step 5: Optional - Check if admin account is verified
    if (!dbUser.verified) {
      logger.warn('[SECURITY] Unverified admin account attempted access', {
        service: 'requireAdmin',
        userId: user.id,
        email: user.email,
      });

      return {
        error: NextResponse.json(
          { error: 'Admin account requires verification' },
          { status: 403 }
        )
      };
    }

    // Step 6: Log successful admin access for audit trail
    await logAdminAccess(user.id, request.nextUrl.pathname, request.method);

    // Return the verified admin user
    return {
      user: {
        ...user,
        // Include database-verified fields
        verified: dbUser.verified,
        dbVerified: true, // Flag indicating database verification passed
      }
    };

  } catch (error) {
    logger.error('[SECURITY] Unexpected error in admin authorization', {
      service: 'requireAdmin',
      error: error instanceof Error ? error.message : 'Unknown error',
      severity: 'HIGH',
    });

    // Fail closed - deny access on any error
    return {
      error: NextResponse.json(
        { error: 'Authorization error - access denied' },
        { status: 500 }
      )
    };
  }
}

/**
 * Log security events to the audit_logs table
 */
async function logSecurityEvent(
  userId: string,
  eventType: string,
  details: Record<string, unknown>
) {
  try {
    const supabase = serverSupabase;

    await supabase.from('security_events').insert({
      user_id: userId,
      event_type: eventType,
      severity: 'CRITICAL',
      details,
      ip_address: details.ip || null,
      user_agent: details.userAgent || null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Log locally if database logging fails
    logger.error('[AUDIT] Failed to log security event to database', {
      userId,
      eventType,
      details,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Log successful admin access for audit trail
 */
async function logAdminAccess(
  userId: string,
  path: string,
  method: string
) {
  try {
    const supabase = serverSupabase;

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: `ADMIN_${method}`,
      resource_type: 'admin_endpoint',
      resource_id: path,
      details: {
        path,
        method,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Non-critical - log locally if database logging fails
    logger.info('[AUDIT] Admin access', {
      userId,
      path,
      method,
      dbLogFailed: true,
    });
  }
}

/**
 * Rate limiting for admin endpoints to prevent brute force
 */
const adminRateLimits = new Map<string, { count: number; resetAt: number }>();

export async function checkAdminRateLimit(
  userId: string
): Promise<boolean> {
  const now = Date.now();
  const key = `admin:${userId}`;
  const limit = adminRateLimits.get(key);

  // Clean up old entries
  if (limit && limit.resetAt < now) {
    adminRateLimits.delete(key);
  }

  // Check current limit
  const current = adminRateLimits.get(key) || { count: 0, resetAt: now + 60000 }; // 1 minute window

  if (current.count >= 100) { // 100 requests per minute for admin
    logger.warn('[SECURITY] Admin rate limit exceeded', {
      userId,
      count: current.count,
    });
    return false;
  }

  // Update count
  adminRateLimits.set(key, {
    count: current.count + 1,
    resetAt: current.resetAt,
  });

  return true;
}

/**
 * Helper function for consistent admin response format
 */
export function adminErrorResponse(
  message: string,
  status: number = 403
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Type guard to check if response is an error
 */
export function isAdminError(
  result: Awaited<ReturnType<typeof requireAdmin>>
): result is { error: NextResponse; user?: never } {
  return 'error' in result;
}