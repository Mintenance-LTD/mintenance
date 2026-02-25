import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { isTestUser } from '@/lib/utils/userUtils';
import { InternalServerError } from '@/lib/errors/api-error';

export const GET = withApiHandler({ roles: ['admin'], rateLimit: { maxRequests: 10 } }, async (request, { user }) => {
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
    .select('id, email, first_name, last_name, role, company_name, admin_verified, created_at, updated_at, deleted_at', { count: 'exact' });

  if (role && (role === 'contractor' || role === 'homeowner')) {
    query = query.eq('role', role);
  }

  if (verified === 'true') {
    query = query.eq('admin_verified', true);
  } else if (verified === 'false') {
    query = query.eq('admin_verified', false);
  } else if (verified === 'pending') {
    query = query.eq('role', 'contractor').eq('admin_verified', false).not('company_name', 'is', null).not('license_number', 'is', null);
  }

  if (search) {
    const sanitizedSearch = search
      .replace(/[^a-zA-Z0-9\s\-'@.]/g, '')
      .substring(0, 100)
      .trim();

    if (sanitizedSearch.length > 0) {
      query = query.or(`email.ilike.%${sanitizedSearch}%,first_name.ilike.%${sanitizedSearch}%,last_name.ilike.%${sanitizedSearch}%,company_name.ilike.%${sanitizedSearch}%`);
    }
  }

  query = query.is('deleted_at', null);
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data: users, error, count } = await query;

  if (error) {
    logger.error('Error fetching users for admin', error);
    throw new InternalServerError('Failed to fetch users');
  }

  let usersWithVerification = await Promise.all(
    (users || []).map(async (u) => {
      if (u.role === 'contractor') {
        const { data: contractorData } = await serverSupabase
          .from('profiles')
          .select('company_name, license_number, business_address, latitude, longitude')
          .eq('id', u.id)
          .single();

        return {
          ...u,
          hasVerificationData: Boolean(
            contractorData?.company_name && contractorData?.license_number && contractorData?.business_address
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
    })
  );

  if (excludeTestUsers) {
    usersWithVerification = usersWithVerification.filter(u => !isTestUser(u));
  }

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
});
