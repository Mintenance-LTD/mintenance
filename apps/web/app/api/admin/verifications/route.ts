import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { VERIFICATION_QUEUE_STATES, readVerificationQueueCounts } from '@/lib/admin/verification-queue';
import { logger } from '@mintenance/shared';
import { sanitizeEmailIlikePattern } from '@/lib/utils/sanitize-postgrest';

/**
 * GET /api/admin/verifications
 * Fetch contractor profiles with verification data for admin review.
 * Filters by verification status (pending, verified, rejected, all).
 */
export const GET = withApiHandler(
  { roles: ['admin'], requireDbAdmin: true, rateLimit: { maxRequests: 10 } },
  async (request) => {
    const url = new URL(request.url);
    if (url.searchParams.get('counts') === '1') {
      return NextResponse.json(await readVerificationQueueCounts());
    }
    const statusFilter = url.searchParams.get('status') || 'ready';
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 100);
    const search = url.searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Build query for contractor profiles
    let query = serverSupabase
      .from('admin_verification_queue')
      .select(
        'id, email, first_name, last_name, phone, role, company_name, license_number, insurance_expiry_date, business_address, admin_verified, skills, rating, total_jobs_completed, city, created_at, updated_at, background_check_status, queue_status, identity_submitted, business_submitted',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .order('id');

    const state = statusFilter === 'pending' ? 'ready' : statusFilter;
    if (state !== 'all') {
      if (!VERIFICATION_QUEUE_STATES.some((valid) => valid === state))
        return NextResponse.json({ error: 'Invalid verification filter' }, { status: 400 });
      query = query.eq('queue_status', state);
    }

    // Apply search filter. The raw value is interpolated into a PostgREST
    // `.or()` filter DSL, so it MUST be sanitized — otherwise a `,` in the
    // input injects extra filter clauses (PostgREST filter injection). Email
    // search needs `@` and `.`, hence the email-aware variant.
    const safeSearch = sanitizeEmailIlikePattern(search);
    if (safeSearch) {
      const term = `%${safeSearch}%`;
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
      const { data: skills, error: skillsError } = await serverSupabase
        .from('contractor_skills')
        .select('contractor_id, skill_name, years_experience, verified:is_verified')
        .in('contractor_id', contractorIds);

      if (skillsError) {
        logger.error('Failed to fetch contractor verification skills', {
          service: 'admin-verifications',
          error: skillsError.message,
        });
        return NextResponse.json(
          { error: 'Failed to fetch contractor verification skills' },
          { status: 500 }
        );
      }

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

    // 2026-05-25 audit-44 P1: surface pending document counts on the
    // list so admins can spot contractors with evidence waiting in
    // /api/admin/verifications/documents. Previously the list had no
    // signal that uploads were pending, so the doc-review queue went
    // unnoticed forever.
    let pendingDocsMap: Record<string, number> = {};
    if (contractorIds.length > 0) {
      const { data: pendingDocs } = await serverSupabase
        .from('contractor_documents')
        .select('contractor_id')
        .in('contractor_id', contractorIds)
        .eq('review_status', 'pending')
        .not('verification_type', 'is', null);

      if (pendingDocs) {
        pendingDocsMap = pendingDocs.reduce<Record<string, number>>(
          (acc, d) => {
            acc[d.contractor_id] = (acc[d.contractor_id] || 0) + 1;
            return acc;
          },
          {}
        );
      }
    }

    const assignmentLabels = new Map<string, string>();
    if (contractors?.length) {
      const { data: tasks } = await serverSupabase.from('admin_verification_tasks')
        .select('contractor_id,admin_id').eq('status','open').in('contractor_id',contractors.map(c => c.id));
      if (tasks?.length) {
        const { data: admins } = await serverSupabase.from('profiles').select('id,email')
          .eq('role','admin').in('id',tasks.map(t => t.admin_id));
        for (const task of tasks) {
          const admin = admins?.find(a => a.id === task.admin_id);
          if (admin) assignmentLabels.set(task.contractor_id, admin.email);
        }
      }
    }
    const mappedContractors = (contractors ?? []).map((c) => ({
      id: c.id,
      assigned_admin_email: assignmentLabels.get(c.id) ?? null,
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
      pending_documents_count: pendingDocsMap[c.id] ?? 0,
      rating: c.rating ?? 0,
      total_jobs_completed: c.total_jobs_completed ?? 0,
      city: c.city ?? null,
      created_at: c.created_at,
      updated_at: c.updated_at,
      verification_status: c.queue_status,
      identity_submitted: c.identity_submitted,
      business_submitted: c.business_submitted,
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
