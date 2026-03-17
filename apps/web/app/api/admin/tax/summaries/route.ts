import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';

// -- Validation ---------------------------------------------------------------

const summariesQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2024, 'Year must be 2024 or later')
    .max(new Date().getFullYear() + 1, 'Year cannot be more than 1 year in the future'),
  status: z
    .enum(['pending', 'generated', 'filed'], {
      errorMap: () => ({ message: 'Status must be "pending", "generated", or "filed"' }),
    })
    .optional(),
  search: z
    .string()
    .max(200, 'Search query too long')
    .optional(),
});

// -- Types --------------------------------------------------------------------

interface SummaryRow {
  id: string;
  contractor_id: string;
  tax_year: number;
  total_earnings: number;
  total_platform_fees: number;
  total_stripe_fees: number;
  net_payments: number;
  job_count: number;
  requires_1099: boolean;
  form_1099_generated: boolean;
  form_1099_generated_at: string | null;
  form_1099_filed: boolean;
  form_1099_filed_at: string | null;
  created_at: string;
  updated_at: string;
  contractor: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  tax_profile: {
    w9_submitted_at: string | null;
    w9_verified: boolean;
  } | null;
}

// -- GET Handler --------------------------------------------------------------

/**
 * GET /api/admin/tax/summaries?year=2026&status=pending&search=name
 *
 * Fetch tax year summaries for the admin dashboard.
 * Joined with profiles (name/email) and contractor_tax_profiles (W-9 status).
 *
 * Query params:
 *   - year (required): Tax year to filter on
 *   - status (optional): "pending" | "generated" | "filed"
 *   - search (optional): Partial match on contractor name
 *
 * Requires admin role.
 */
export const GET = withApiHandler(
  { roles: ['admin'], csrf: false },
  async (request: NextRequest, { user }) => {
    const url = new URL(request.url);
    const parsed = summariesQuerySchema.safeParse({
      year: url.searchParams.get('year'),
      status: url.searchParams.get('status') || undefined,
      search: url.searchParams.get('search') || undefined,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      throw new BadRequestError(firstIssue?.message ?? 'Invalid query parameters');
    }

    const { year, status, search } = parsed.data;

    try {
      // Build query: tax_year_summaries joined with profiles and contractor_tax_profiles
      let query = serverSupabase
        .from('tax_year_summaries')
        .select(
          `
          id,
          contractor_id,
          tax_year,
          total_earnings,
          total_platform_fees,
          total_stripe_fees,
          net_payments,
          job_count,
          requires_1099,
          form_1099_generated,
          form_1099_generated_at,
          form_1099_filed,
          form_1099_filed_at,
          created_at,
          updated_at,
          contractor:contractor_id (
            id,
            first_name,
            last_name,
            email
          ),
          tax_profile:contractor_tax_profiles!contractor_tax_profiles_contractor_id_fkey (
            w9_submitted_at,
            w9_verified
          )
          `,
        )
        .eq('tax_year', year)
        .order('total_earnings', { ascending: false });

      // Apply status filter
      if (status === 'pending') {
        // Requires 1099 but not yet generated
        query = query
          .eq('requires_1099', true)
          .eq('form_1099_generated', false);
      } else if (status === 'generated') {
        // 1099 generated but not yet filed
        query = query
          .eq('form_1099_generated', true)
          .eq('form_1099_filed', false);
      } else if (status === 'filed') {
        // 1099 filed
        query = query.eq('form_1099_filed', true);
      }

      const { data: rawSummaries, error } = await query;

      if (error) {
        logger.error('Failed to fetch tax summaries', error, {
          service: 'admin-tax',
          adminUserId: user.id,
          year,
        });
        throw new InternalServerError('Failed to fetch tax summaries');
      }

      const summaries = (rawSummaries ?? []) as unknown as SummaryRow[];

      // Apply search filter in-app (name search across joined profiles)
      let filtered = summaries;
      if (search) {
        const needle = search.toLowerCase();
        filtered = summaries.filter((s) => {
          const contractor = Array.isArray(s.contractor)
            ? s.contractor[0]
            : s.contractor;
          if (!contractor) return false;
          const fullName =
            `${contractor.first_name ?? ''} ${contractor.last_name ?? ''}`.toLowerCase();
          const email = (contractor.email ?? '').toLowerCase();
          return fullName.includes(needle) || email.includes(needle);
        });
      }

      // Compute aggregate stats
      const stats = {
        totalRequiring1099: filtered.filter((s) => s.requires_1099).length,
        totalGenerated: filtered.filter((s) => s.form_1099_generated).length,
        totalFiled: filtered.filter((s) => s.form_1099_filed).length,
        totalEarnings: filtered.reduce(
          (acc, s) => acc + Number(s.total_earnings),
          0,
        ),
      };

      logger.info('Admin tax summaries fetched', {
        service: 'admin-tax',
        adminUserId: user.id,
        year,
        status: status ?? 'all',
        search: search ?? null,
        resultCount: filtered.length,
      });

      return NextResponse.json({
        summaries: filtered,
        stats,
      });
    } catch (err) {
      // Re-throw API errors (they have proper status codes)
      if (err instanceof BadRequestError || err instanceof InternalServerError) {
        throw err;
      }
      logger.error('Unexpected error fetching tax summaries', err, {
        service: 'admin-tax',
        adminUserId: user.id,
        year,
      });
      throw new InternalServerError('An unexpected error occurred');
    }
  },
);
