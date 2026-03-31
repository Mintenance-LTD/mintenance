import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * GET /api/admin/verifications
 * Fetch contractor profiles with verification data for admin review.
 * Filters by verification status (pending, verified, rejected, all).
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request) => {
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status') || 'pending';
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 100);
    const search = url.searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Build query for contractor profiles
    let query = serverSupabase
      .from('profiles')
      .select(
        'id, email, first_name, last_name, phone, role, company_name, license_number, insurance_expiry_date, business_address, admin_verified, skills, rating, total_jobs_completed, city, created_at, updated_at, background_check_status',
        { count: 'exact' }
      )
      .eq('role', 'contractor')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (statusFilter === 'pending') {
      query = query.or('admin_verified.is.null,admin_verified.eq.false');
    } else if (statusFilter === 'verified') {
      query = query.eq('admin_verified', true);
    } else if (statusFilter === 'rejected') {
      // Rejected contractors have admin_verified = false and a rejection reason
      // in the verification_history table. For simplicity we use a flag-based approach:
      // admin_verified is explicitly false (not null) AND background_check_status = 'rejected'
      query = query
        .eq('admin_verified', false)
        .eq('background_check_status', 'rejected');
    }
    // 'all' applies no additional filter

    // Apply search filter
    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(
        `email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term},company_name.ilike.${term}`
      );
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: contractors, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch contractor verifications', {
        service: 'admin-verifications',
        error: error.message,
      });
      return NextResponse.json(
        { error: 'Failed to fetch contractor verifications' },
        { status: 500 }
      );
    }

    // Fetch skills from contractor_skills table for all contractors
    const contractorIds = (contractors ?? []).map((c) => c.id);
    let skillsMap: Record<
      string,
      Array<{
        skill_name: string;
        years_experience: number | null;
        verified: boolean;
      }>
    > = {};

    if (contractorIds.length > 0) {
      const { data: skills } = await serverSupabase
        .from('contractor_skills')
        .select('contractor_id, skill_name, years_experience, verified')
        .in('contractor_id', contractorIds);

      if (skills) {
        skillsMap = skills.reduce<typeof skillsMap>((acc, s) => {
          if (!acc[s.contractor_id]) acc[s.contractor_id] = [];
          acc[s.contractor_id].push({
            skill_name: s.skill_name,
            years_experience: s.years_experience,
            verified: s.verified ?? false,
          });
          return acc;
        }, {});
      }
    }

    // Fetch certifications count for each contractor
    let certsMap: Record<string, number> = {};

    if (contractorIds.length > 0) {
      const { data: certs } = await serverSupabase
        .from('contractor_certifications')
        .select('contractor_id')
        .in('contractor_id', contractorIds);

      if (certs) {
        certsMap = certs.reduce<Record<string, number>>((acc, c) => {
          acc[c.contractor_id] = (acc[c.contractor_id] || 0) + 1;
          return acc;
        }, {});
      }
    }

    const mappedContractors = (contractors ?? []).map((c) => ({
      id: c.id,
      email: c.email ?? '',
      first_name: c.first_name ?? null,
      last_name: c.last_name ?? null,
      phone: c.phone ?? null,
      company_name: c.company_name ?? null,
      license_number: c.license_number ?? null,
      insurance_expiry_date: c.insurance_expiry_date ?? null,
      business_address: c.business_address ?? null,
      admin_verified: c.admin_verified ?? false,
      background_check_status: c.background_check_status ?? null,
      trade_categories: c.skills ?? [],
      skills: skillsMap[c.id] ?? [],
      certifications_count: certsMap[c.id] ?? 0,
      rating: c.rating ?? 0,
      total_jobs_completed: c.total_jobs_completed ?? 0,
      city: c.city ?? null,
      created_at: c.created_at,
      updated_at: c.updated_at,
      verification_status: c.admin_verified
        ? 'verified'
        : c.background_check_status === 'rejected'
          ? 'rejected'
          : 'pending',
    }));

    // Compute totals for stats
    const total = count ?? 0;

    return NextResponse.json({
      success: true,
      data: mappedContractors,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);
