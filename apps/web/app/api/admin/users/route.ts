import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { isTestUser } from '@/lib/utils/userUtils';
import { InternalServerError } from '@/lib/errors/api-error';
import { sanitizeEmailIlikePattern } from '@/lib/utils/sanitize-postgrest';

export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role');
    const verified = searchParams.get('verified');
    const search = searchParams.get('search');
    const excludeTestUsers = searchParams.get('excludeTestUsers') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = serverSupabase
      .from('profiles')
      .select(
        'id, email, first_name, last_name, role, company_name, admin_verified, created_at, updated_at, deleted_at',
        { count: 'exact' }
      );

    if (role && (role === 'contractor' || role === 'homeowner')) {
      query = query.eq('role', role);
    }

    if (verified === 'true') {
      query = query.eq('admin_verified', true);
    } else if (verified === 'false') {
      query = query.eq('admin_verified', false);
    } else if (verified === 'pending') {
      query = query
        .eq('role', 'contractor')
        .eq('admin_verified', false)
        .not('company_name', 'is', null)
        .not('license_number', 'is', null);
    }

    if (search) {
      const sanitizedSearch = sanitizeEmailIlikePattern(search);

      if (sanitizedSearch.length > 0) {
        query = query.or(
          `email.ilike.%${sanitizedSearch}%,first_name.ilike.%${sanitizedSearch}%,last_name.ilike.%${sanitizedSearch}%,company_name.ilike.%${sanitizedSearch}%`
        );
      }
    }

    query = query.is('deleted_at', null);
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      logger.error('Error fetching users for admin', error);
      throw new InternalServerError('Failed to fetch users');
    }

    // Batch-fetch contractor verification data (avoids N+1 queries)
    const contractorIds = (users || [])
      .filter((u) => u.role === 'contractor')
      .map((u) => u.id);
    const contractorDataMap = new Map<
      string,
      {
        company_name: string | null;
        license_number: string | null;
        business_address: string | null;
      }
    >();

    if (contractorIds.length > 0) {
      const { data: contractorRows } = await serverSupabase
        .from('profiles')
        .select('id, company_name, license_number, business_address')
        .in('id', contractorIds);

      contractorRows?.forEach((row) => {
        contractorDataMap.set(row.id, row);
      });
    }

    let usersWithVerification = (users || []).map((u) => {
      if (u.role === 'contractor') {
        const contractorData = contractorDataMap.get(u.id);
        return {
          ...u,
          hasVerificationData: Boolean(
            contractorData?.company_name &&
            contractorData?.license_number &&
            contractorData?.business_address
          ),
          verificationStatus: u.admin_verified
            ? 'verified'
            : contractorData?.company_name && contractorData?.license_number
              ? 'pending'
              : 'not_submitted',
          isTestUser: isTestUser(u),
        };
      }
      return {
        ...u,
        verificationStatus: 'not_applicable' as const,
        isTestUser: isTestUser(u),
      };
    });

    if (excludeTestUsers) {
      usersWithVerification = usersWithVerification.filter(
        (u) => !isTestUser(u)
      );
    }

    const filteredCount = excludeTestUsers
      ? usersWithVerification.length
      : count || 0;

    return NextResponse.json({
      users: usersWithVerification,
      pagination: {
        page,
        limit,
        total: filteredCount,
        totalPages: Math.ceil(filteredCount / limit),
      },
    });
  }
);
