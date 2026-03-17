import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase, createRequestScopedClient } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { InternalServerError } from '@/lib/errors/api-error';

// -- Types --------------------------------------------------------------------

interface TaxYearSummaryRow {
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
}

interface PaymentRecordRow {
  id: string;
  tax_year: number;
  job_id: string | null;
  escrow_transaction_id: string | null;
  payment_date: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  description: string | null;
  created_at: string;
  job: {
    id: string;
    title: string;
  } | null;
}

interface SummaryWithPayments {
  year: number;
  earnings: number;
  fees: number;
  net: number;
  jobCount: number;
  requires1099: boolean;
  form1099Generated: boolean;
  form1099GeneratedAt: string | null;
  form1099Filed: boolean;
  form1099FiledAt: string | null;
  payments: Array<{
    id: string;
    paymentDate: string;
    grossAmount: number;
    platformFee: number;
    netAmount: number;
    description: string | null;
    jobId: string | null;
    jobTitle: string | null;
  }>;
}

// -- GET Handler --------------------------------------------------------------

/**
 * GET /api/contractor/tax-info/summaries
 *
 * Fetch tax year summaries for the authenticated contractor.
 * For each year, also includes payment records with job details.
 *
 * Returns: { summaries: [{ year, earnings, fees, net, status, payments: [...] }] }
 *
 * Requires contractor role.
 */
export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (request: NextRequest, { user }) => {
    // Use RLS-enforced client for user-scoped reads; fall back to service role
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    try {
      // 1. Fetch all tax year summaries for this contractor, ordered by year DESC
      const { data: rawSummaries, error: summariesError } = await userDb
        .from('tax_year_summaries')
        .select('*')
        .eq('contractor_id', user.id)
        .order('tax_year', { ascending: false });

      if (summariesError) {
        logger.error('Failed to fetch contractor tax summaries', summariesError, {
          service: 'contractor-tax',
          userId: user.id,
        });
        throw new InternalServerError('Failed to fetch tax summaries');
      }

      const summaries = (rawSummaries ?? []) as TaxYearSummaryRow[];

      // If no summaries exist, return early
      if (summaries.length === 0) {
        return NextResponse.json({ summaries: [] });
      }

      // 2. Fetch payment records for all years belonging to this contractor
      //    joined with jobs table for title
      const taxYears = summaries.map((s) => s.tax_year);

      const { data: rawPayments, error: paymentsError } = await userDb
        .from('tax_payment_records')
        .select(
          `
          id,
          tax_year,
          job_id,
          escrow_transaction_id,
          payment_date,
          gross_amount,
          platform_fee,
          net_amount,
          description,
          created_at,
          job:job_id (
            id,
            title
          )
          `,
        )
        .eq('contractor_id', user.id)
        .in('tax_year', taxYears)
        .order('payment_date', { ascending: false });

      if (paymentsError) {
        logger.error('Failed to fetch contractor tax payment records', paymentsError, {
          service: 'contractor-tax',
          userId: user.id,
        });
        // Non-fatal: return summaries without payments
        const summariesWithoutPayments: SummaryWithPayments[] = summaries.map((s) => ({
          year: s.tax_year,
          earnings: Number(s.total_earnings),
          fees: Number(s.total_platform_fees) + Number(s.total_stripe_fees),
          net: Number(s.net_payments),
          jobCount: s.job_count,
          requires1099: s.requires_1099,
          form1099Generated: s.form_1099_generated,
          form1099GeneratedAt: s.form_1099_generated_at,
          form1099Filed: s.form_1099_filed,
          form1099FiledAt: s.form_1099_filed_at,
          payments: [],
        }));

        return NextResponse.json({ summaries: summariesWithoutPayments });
      }

      const payments = (rawPayments ?? []) as unknown as PaymentRecordRow[];

      // 3. Group payments by tax year
      const paymentsByYear = new Map<number, PaymentRecordRow[]>();
      for (const payment of payments) {
        const existing = paymentsByYear.get(payment.tax_year) ?? [];
        existing.push(payment);
        paymentsByYear.set(payment.tax_year, existing);
      }

      // 4. Assemble response
      const result: SummaryWithPayments[] = summaries.map((s) => {
        const yearPayments = paymentsByYear.get(s.tax_year) ?? [];

        return {
          year: s.tax_year,
          earnings: Number(s.total_earnings),
          fees: Number(s.total_platform_fees) + Number(s.total_stripe_fees),
          net: Number(s.net_payments),
          jobCount: s.job_count,
          requires1099: s.requires_1099,
          form1099Generated: s.form_1099_generated,
          form1099GeneratedAt: s.form_1099_generated_at,
          form1099Filed: s.form_1099_filed,
          form1099FiledAt: s.form_1099_filed_at,
          payments: yearPayments.map((p) => {
            // Handle Supabase join result (may be array or object)
            const jobData = Array.isArray(p.job) ? p.job[0] : p.job;
            return {
              id: p.id,
              paymentDate: p.payment_date,
              grossAmount: Number(p.gross_amount),
              platformFee: Number(p.platform_fee),
              netAmount: Number(p.net_amount),
              description: p.description,
              jobId: p.job_id,
              jobTitle: jobData?.title ?? null,
            };
          }),
        };
      });

      logger.info('Contractor tax summaries fetched', {
        service: 'contractor-tax',
        userId: user.id,
        yearCount: result.length,
        totalPayments: payments.length,
      });

      return NextResponse.json({ summaries: result });
    } catch (err) {
      // Re-throw API errors (they have proper status codes)
      if (err instanceof InternalServerError) {
        throw err;
      }
      logger.error('Unexpected error fetching contractor tax summaries', err, {
        service: 'contractor-tax',
        userId: user.id,
      });
      throw new InternalServerError('An unexpected error occurred');
    }
  },
);
