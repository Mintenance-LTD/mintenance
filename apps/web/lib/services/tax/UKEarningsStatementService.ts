/**
 * UK Earnings Statement Service
 *
 * Replaces the former US tax-form service. Produces a per-contractor annual earnings
 * statement built on the UK tax year (6 April – 5 April), suitable for the
 * contractor's Self Assessment return.
 *
 * Figures are computed from the source of truth — released `escrow_transactions`
 * — rather than a pre-aggregated table (the legacy tax_year_summaries table was
 * never populated). Statement generated/filed state is tracked in
 * tax_year_summaries for the admin workflow.
 *
 * ── CIS (Construction Industry Scheme) determination ──────────────────────
 * Business decision recorded 2026-08-05: Mintenance is NOT in scope as a CIS
 * "contractor". The platform operates as a marketplace/introducer — the
 * homeowner is the customer and Mintenance takes a platform fee — rather than
 * paying subcontractors for construction work on its own account. Therefore
 * NO CIS labour deduction (20% registered / 30% unregistered) is applied to
 * contractor payments, and this statement reports GROSS earnings with no CIS
 * withholding. If the commercial model changes (e.g. Mintenance contracts
 * directly for works and subcontracts them), revisit this: CIS deduction
 * would hook in at escrow release (release-escrow) on the labour element.
 *
 * ── HMRC digital-platform reporting (scoped, not built here) ──────────────
 * The seller identity HMRC's "Reporting rules for digital platforms" requires
 * (legal name, address, DOB or company reg no., NINO or UTR, VAT number) is
 * now CAPTURED (contractor_tax_profiles + profiles.date_of_birth_encrypted).
 * Producing and submitting the annual report (due 31 January) is a separate
 * piece of work that reads this same data.
 */
import { readEarningsPages } from './read-earnings-pages';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  earningsSettlement,
  type EarningsSettlementRow,
} from './earnings-settlement';
import {
  ukTaxYearFromStartYear,
  type UKTaxYear,
} from '@/lib/services/tax/uk-tax';

// Escrow rows in these statuses represent money actually released to the
// contractor. The lifecycle uses 'completed' for the terminal released state;
// 'released' is tolerated for historical rows.
const RELEASED_STATUSES = ['completed', 'released'];

export interface EarningsLine {
  date: string;
  jobId: string | null;
  jobTitle: string | null;
  gross: number;
  platformFee: number;
  stripeFee: number;
  net: number;
}

export interface UKEarningsStatement {
  contractorId: string;
  taxYear: string; // label, e.g. "2025-26"
  startYear: number;
  periodStart: string; // ISO
  periodEnd: string; // ISO
  contractor: {
    legalName: string | null;
    tradingName: string | null;
    vatRegistered: boolean;
    vatNumber: string | null;
    companyNumber: string | null;
    utrOnFile: boolean;
    address: {
      line1: string | null;
      line2: string | null;
      city: string | null;
      county: string | null;
      postcode: string | null;
    };
  } | null;
  totals: {
    grossEarnings: number;
    platformFees: number;
    stripeFees: number;
    netPaid: number;
    jobCount: number;
    paymentCount: number;
  };
  payments: EarningsLine[];
  generatedAt: string;
}

interface EscrowRow extends EarningsSettlementRow {
  job_id: string | null;
  released_at: string | null;
  status: string;
  jobs: { title: string | null } | { title: string | null }[] | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export class UKEarningsStatementService {
  /**
   * Build the earnings statement for one contractor and one UK tax year.
   * `startYear` is the calendar year the tax year starts in (2025 → 2025-26).
   */
  static async getStatement(
    contractorId: string,
    startYear: number
  ): Promise<UKEarningsStatement> {
    const taxYear: UKTaxYear = ukTaxYearFromStartYear(startYear);

    const { data: rawEscrows, error } = await readEarningsPages(
      async (after) => {
        let query = serverSupabase
          .from('escrow_transactions')
          .select(
            `id, job_id, amount, platform_fee, stripe_processing_fee, contractor_payout,
         released_at, status, jobs:job_id ( title ),
         refund_balance:escrow_refund_balances(gross_minor,remaining_minor,needs_review)`
          )
          .eq('payee_id', contractorId)
          .in('status', RELEASED_STATUSES)
          .not('released_at', 'is', null)
          .gte('released_at', taxYear.start.toISOString())
          .lte('released_at', taxYear.end.toISOString())
          .order('id', { ascending: true })
          .limit(500);
        if (after) query = query.gt('id', after);
        return query;
      }
    );

    if (error) {
      logger.error('Failed to load escrow rows for earnings statement', error, {
        service: 'uk-earnings',
        contractorId,
        startYear,
      });
      throw new Error('Failed to build earnings statement');
    }

    const escrows = ((rawEscrows ?? []) as unknown as EscrowRow[]).sort(
      (a, b) => (a.released_at ?? '').localeCompare(b.released_at ?? '')
    );

    const payments: EarningsLine[] = escrows.map((e) => {
      const { gross, platformFee, stripeFee, net } = earningsSettlement(e);
      const job = Array.isArray(e.jobs) ? e.jobs[0] : e.jobs;
      return {
        date: e.released_at as string,
        jobId: e.job_id,
        jobTitle: job?.title ?? null,
        gross,
        platformFee,
        stripeFee,
        net,
      };
    });

    const totals = payments.reduce(
      (acc, p) => {
        acc.grossEarnings = round2(acc.grossEarnings + p.gross);
        acc.platformFees = round2(acc.platformFees + p.platformFee);
        acc.stripeFees = round2(acc.stripeFees + p.stripeFee);
        acc.netPaid = round2(acc.netPaid + p.net);
        return acc;
      },
      { grossEarnings: 0, platformFees: 0, stripeFees: 0, netPaid: 0 }
    );

    const jobCount = new Set(payments.map((p) => p.jobId).filter(Boolean)).size;

    const { data: profile, error: profileError } = await serverSupabase
      .from('contractor_tax_profiles')
      .select(
        `tax_name, business_name, vat_registered, vat_number, company_number,
         address_line1, address_line2, city, county, postcode, utr_encrypted`
      )
      .eq('contractor_id', contractorId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error('Failed to load earnings tax profile');
    }

    return {
      contractorId,
      taxYear: taxYear.label,
      startYear,
      periodStart: taxYear.start.toISOString(),
      periodEnd: taxYear.end.toISOString(),
      contractor: profile
        ? {
            legalName: profile.tax_name ?? null,
            tradingName: profile.business_name ?? null,
            vatRegistered: profile.vat_registered ?? false,
            vatNumber: profile.vat_number ?? null,
            companyNumber: profile.company_number ?? null,
            utrOnFile: Boolean(profile.utr_encrypted),
            address: {
              line1: profile.address_line1 ?? null,
              line2: profile.address_line2 ?? null,
              city: profile.city ?? null,
              county: profile.county ?? null,
              postcode: profile.postcode ?? null,
            },
          }
        : null,
      totals: { ...totals, jobCount, paymentCount: payments.length },
      payments,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Record that a statement has been generated for a contractor + tax year
   * (admin bookkeeping in tax_year_summaries).
   */
  static async markGenerated(
    contractorId: string,
    startYear: number,
    totals: UKEarningsStatement['totals']
  ): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await serverSupabase.from('tax_year_summaries').upsert(
      {
        contractor_id: contractorId,
        tax_year: startYear,
        total_earnings: totals.grossEarnings,
        total_platform_fees: totals.platformFees,
        total_stripe_fees: totals.stripeFees,
        net_payments: totals.netPaid,
        job_count: totals.jobCount,
        statement_generated: true,
        statement_generated_at: now,
        updated_at: now,
      },
      { onConflict: 'contractor_id,tax_year' }
    );
    if (error) {
      logger.error('Failed to mark statement generated', error, {
        service: 'uk-earnings',
        contractorId,
        startYear,
      });
      throw new Error('Failed to record statement generation');
    }
  }

  /**
   * Admin view: every contractor with released earnings in the given UK tax
   * year, with per-contractor totals, statement generated/filed state, and
   * whether their tax details are complete enough for HMRC reporting.
   */
  static async listEarners(startYear: number): Promise<
    Array<{
      contractorId: string;
      contractorName: string;
      email: string;
      taxYear: string;
      startYear: number;
      grossEarnings: number;
      platformFees: number;
      stripeFees: number;
      netPaid: number;
      jobCount: number;
      statementGenerated: boolean;
      statementGeneratedAt: string | null;
      statementFiled: boolean;
      statementFiledAt: string | null;
      taxDetailsComplete: boolean;
    }>
  > {
    const taxYear = ukTaxYearFromStartYear(startYear);

    const { data: rawEscrows, error } = await readEarningsPages(
      async (after) => {
        let query = serverSupabase
          .from('escrow_transactions')
          .select(
            `id, payee_id, job_id, amount, platform_fee, stripe_processing_fee,
         contractor_payout, status, released_at,
         refund_balance:escrow_refund_balances(gross_minor,remaining_minor,needs_review)`
          )
          .in('status', RELEASED_STATUSES)
          .not('released_at', 'is', null)
          .gte('released_at', taxYear.start.toISOString())
          .lte('released_at', taxYear.end.toISOString())
          .order('id', { ascending: true })
          .limit(500);
        if (after) query = query.gt('id', after);
        return query;
      }
    );

    if (error) {
      logger.error('Failed to list earners for tax year', error, {
        service: 'uk-earnings',
        startYear,
      });
      throw new Error('Failed to list earners');
    }

    const rows = (rawEscrows ?? []) as Array<
      Omit<EscrowRow, 'jobs'> & { payee_id: string | null }
    >;

    const byContractor = new Map<
      string,
      {
        gross: number;
        platform: number;
        stripe: number;
        net: number;
        jobs: Set<string>;
      }
    >();
    for (const r of rows) {
      if (!r.payee_id) continue;
      const agg = byContractor.get(r.payee_id) ?? {
        gross: 0,
        platform: 0,
        stripe: 0,
        net: 0,
        jobs: new Set<string>(),
      };
      const settled = earningsSettlement(r);
      agg.gross = round2(agg.gross + settled.gross);
      agg.platform = round2(agg.platform + settled.platformFee);
      agg.stripe = round2(agg.stripe + settled.stripeFee);
      agg.net = round2(agg.net + settled.net);
      if (r.job_id) agg.jobs.add(r.job_id);
      byContractor.set(r.payee_id, agg);
    }

    const contractorIds = [...byContractor.keys()];
    if (contractorIds.length === 0) return [];

    const metadata = [];
    for (let offset = 0; offset < contractorIds.length; offset += 100) {
      const batch = contractorIds.slice(offset, offset + 100);
      const results = await Promise.all([
        serverSupabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', batch),
        serverSupabase
          .from('tax_year_summaries')
          .select(
            'contractor_id, statement_generated, statement_generated_at, statement_filed, statement_filed_at'
          )
          .eq('tax_year', startYear)
          .in('contractor_id', batch),
        serverSupabase
          .from('contractor_tax_profiles')
          .select('contractor_id, tax_name, utr_encrypted, nino_encrypted')
          .in('contractor_id', batch),
      ]);
      if (results.some((result) => result.error)) {
        throw new Error('Failed to load complete earnings metadata');
      }
      metadata.push(results);
    }
    const profiles = metadata.flatMap((result) => result[0].data ?? []);
    const summaries = metadata.flatMap((result) => result[1].data ?? []);
    const taxProfiles = metadata.flatMap((result) => result[2].data ?? []);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id as string, p])
    );
    const summaryMap = new Map(
      (summaries ?? []).map((s) => [s.contractor_id as string, s])
    );
    const taxProfileMap = new Map(
      (taxProfiles ?? []).map((t) => [t.contractor_id as string, t])
    );

    return contractorIds.map((id) => {
      const agg = byContractor.get(id)!;
      const p = profileMap.get(id);
      const s = summaryMap.get(id);
      const t = taxProfileMap.get(id);
      const name =
        [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim() ||
        'Unknown';
      // HMRC seller reporting needs a name plus a UTR or NINO on file.
      const taxDetailsComplete = Boolean(
        t?.tax_name && (t?.utr_encrypted || t?.nino_encrypted)
      );
      return {
        contractorId: id,
        contractorName: name,
        email: (p?.email as string) ?? '',
        taxYear: taxYear.label,
        startYear,
        grossEarnings: agg.gross,
        platformFees: agg.platform,
        stripeFees: agg.stripe,
        netPaid: agg.net,
        jobCount: agg.jobs.size,
        statementGenerated: Boolean(s?.statement_generated),
        statementGeneratedAt: (s?.statement_generated_at as string) ?? null,
        statementFiled: Boolean(s?.statement_filed),
        statementFiledAt: (s?.statement_filed_at as string) ?? null,
        taxDetailsComplete,
      };
    });
  }

  /** Mark a generated statement as filed/submitted (admin bookkeeping). */
  static async markFiled(
    contractorId: string,
    startYear: number
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const { data, error } = await serverSupabase
      .from('tax_year_summaries')
      .update({
        statement_filed: true,
        statement_filed_at: now,
        updated_at: now,
      })
      .eq('contractor_id', contractorId)
      .eq('tax_year', startYear)
      .eq('statement_generated', true)
      .select('contractor_id')
      .maybeSingle();
    if (error) {
      logger.error('Failed to mark statement filed', error, {
        service: 'uk-earnings',
        contractorId,
        startYear,
      });
      throw new Error('Failed to record statement filing');
    }
    return data?.contractor_id === contractorId;
  }
}
