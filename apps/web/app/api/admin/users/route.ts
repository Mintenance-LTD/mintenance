import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { isTestUser } from '@/lib/utils/userUtils';
import { handleAPIError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 10
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // Use secure admin middleware with database verification
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role'); // 'contractor', 'homeowner', or null for all
    const verified = searchParams.get('verified'); // 'true', 'false', 'pending', or null
    const search = searchParams.get('search'); // Search query for name/email
    const excludeTestUsers = searchParams.get('excludeTestUsers') === 'true'; // Filter out test users
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Build query
    let query = serverSupabase
      .from('users')
      .select('id, email, first_name, last_name, role, company_name, admin_verified, created_at, updated_at, deleted_at', { count: 'exact' });

    // Filter by role
    if (role && (role === 'contractor' || role === 'homeowner')) {
      query = query.eq('role', role);
    }

    // Filter by verification status
    if (verified === 'true') {
      query = query.eq('admin_verified', true);
    } else if (verified === 'false') {
      query = query.eq('admin_verified', false);
    } else if (verified === 'pending') {
      // Pending = contractors with verification data but not verified
      query = query.eq('role', 'contractor').eq('admin_verified', false).not('company_name', 'is', null).not('license_number', 'is', null);
    }

    // Search filter (name or email)
    // SECURITY: Sanitize search input to prevent SQL injection
    if (search) {
      // Escape SQL wildcards and limit input length
      // SECURITY: Sanitize search input to prevent PostgREST filter injection
      // Strip all characters except alphanumeric, spaces, hyphens, apostrophes, @, and periods for emails
      const sanitizedSearch = search
        .replace(/[^a-zA-Z0-9\s\-'@.]/g, '') // Whitelist safe characters only
        .substring(0, 100)
        .trim();

      if (sanitizedSearch.length > 0) {
        query = query.or(`email.ilike.%${sanitizedSearch}%,first_name.ilike.%${sanitizedSearch}%,last_name.ilike.%${sanitizedSearch}%,company_name.ilike.%${sanitizedSearch}%`);
      }
    }

    // Exclude deleted users
    query = query.is('deleted_at', null);

    // Apply pagination
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      logger.error('Error fetching users for admin', error);
      throw new InternalServerError('Failed to fetch users');
    }

    // For contractors, fetch verification data
    let usersWithVerification = await Promise.all(
      (users || []).map(async (user) => {
        if (user.role === 'contractor') {
          const { data: contractorData } = await serverSupabase
            .from('users')
            .select('company_name, license_number, business_address, latitude, longitude')
            .eq('id', user.id)
            .single();

          return {
            ...user,
            hasVerificationData: Boolean(
              contractorData?.company_name && contractorData?.license_number && contractorData?.business_address
            ),
            verificationStatus: user.admin_verified
              ? 'verified'
              : contractorData?.company_name && contractorData?.license_number
                ? 'pending'
                : 'not_submitted',
            isTestUser: isTestUser(user),
          };
        }
        return {
          ...user,
          verificationStatus: 'not_applicable' as const,
          isTestUser: isTestUser(user),
        };
      })
    );

    // Filter out test users if requested
    if (excludeTestUsers) {
      usersWithVerification = usersWithVerification.filter(user => !isTestUser(user));
    }

    // Update total count if test users were filtered out
    const filteredCount = excludeTestUsers ? usersWithVerification.length : (count || 0);
    
    return NextResponse.json({
      users: usersWithVerification,
      pagination: {
        page,
        limit,
        total: filteredCount,
        totalPages: Math.ceil(filteredCount / limit),
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

