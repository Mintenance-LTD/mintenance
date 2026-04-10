import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

// ── Types ───────────────────────────────────────────────────────────

interface ContractorTaxProfile {
  id: string;
  contractor_id: string;
  tax_name: string;
  business_name: string | null;
  tax_classification: string;
  tin_type: 'ssn' | 'ein';
  tin_last_four: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
}

interface TaxYearSummary {
  id: string;
  contractor_id: string;
  tax_year: number;
  total_earnings: number;
  total_jobs_completed: number;
  requires_1099: boolean;
  form_1099_generated: boolean;
  form_1099_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CompanyInfo {
  name: string;
  tin: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
  phone: string | null;
}

interface Form1099NECData {
  tax_year: number;
  payer: CompanyInfo;
  recipient: {
    name: string;
    business_name: string | null;
    tin_last_four: string;
    tin_type: 'ssn' | 'ein';
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    zip_code: string;
  };
  nonemployee_compensation: number;
  total_jobs_completed: number;
  contractor_id: string;
  generated_at: string;
}

interface Generate1099Result {
  contractor_id: string;
  success: boolean;
  data?: Form1099NECData;
  error?: string;
}

// ── Service ─────────────────────────────────────────────────────────

/**
 * Service for generating IRS 1099-NEC form data for contractors.
 *
 * The IRS requires platforms to issue a 1099-NEC to any contractor
 * paid $600 or more during a calendar year. This service gathers
 * the data needed to produce those forms.
 */
export class Form1099Service {
  /**
   * Get all contractors who require a 1099 for the given tax year
   * but have not yet had one generated.
   */
  static async getContractorsRequiring1099(
    taxYear: number
  ): Promise<TaxYearSummary[]> {
    const { data, error } = await serverSupabase
      .from('tax_year_summaries')
      .select('*')
      .eq('tax_year', taxYear)
      .eq('requires_1099', true)
      .eq('form_1099_generated', false)
      .order('total_earnings', { ascending: false });

    if (error) {
      logger.error('Failed to fetch contractors requiring 1099', error, {
        service: 'Form1099Service',
        taxYear,
      });
      throw new Error(
        `Failed to fetch contractors requiring 1099: ${error.message}`
      );
    }

    return (data ?? []) as TaxYearSummary[];
  }

  /**
   * Gather all data needed to produce a 1099-NEC for a single contractor.
   *
   * Returns a structured object with payer (platform) and recipient
   * (contractor) information plus the nonemployee compensation amount.
   */
  static async generate1099Data(
    contractorId: string,
    taxYear: number
  ): Promise<Form1099NECData> {
    // 1. Fetch contractor tax profile
    const { data: taxProfile, error: profileError } = await serverSupabase
      .from('contractor_tax_profiles')
      .select(
        `
        id,
        contractor_id,
        tax_name,
        business_name,
        tax_classification,
        tin_type,
        tin_last_four,
        address_line1,
        address_line2,
        city,
        state,
        zip_code
        `
      )
      .eq('contractor_id', contractorId)
      .single();

    if (profileError || !taxProfile) {
      const msg = profileError?.message ?? 'Tax profile not found';
      logger.error('Missing tax profile for 1099 generation', profileError, {
        service: 'Form1099Service',
        contractorId,
        taxYear,
      });
      throw new Error(`Contractor ${contractorId} missing tax profile: ${msg}`);
    }

    // 2. Fetch tax year summary (earnings data)
    const { data: summary, error: summaryError } = await serverSupabase
      .from('tax_year_summaries')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('tax_year', taxYear)
      .single();

    if (summaryError || !summary) {
      const msg = summaryError?.message ?? 'Tax year summary not found';
      logger.error(
        'Missing tax year summary for 1099 generation',
        summaryError,
        {
          service: 'Form1099Service',
          contractorId,
          taxYear,
        }
      );
      throw new Error(
        `Contractor ${contractorId} missing tax year summary for ${taxYear}: ${msg}`
      );
    }

    // 3. Build payer (platform company) info from env vars
    const payer = this.getCompanyInfo();

    // 4. Assemble the 1099-NEC data
    const profile = taxProfile as ContractorTaxProfile;
    const yearSummary = summary as TaxYearSummary;

    return {
      tax_year: taxYear,
      payer,
      recipient: {
        name: profile.tax_name,
        business_name: profile.business_name,
        tin_last_four: profile.tin_last_four,
        tin_type: profile.tin_type as 'ssn' | 'ein',
        address_line1: profile.address_line1,
        address_line2: profile.address_line2,
        city: profile.city,
        state: profile.state,
        zip_code: profile.zip_code,
      },
      nonemployee_compensation: yearSummary.total_earnings,
      total_jobs_completed: yearSummary.total_jobs_completed,
      contractor_id: contractorId,
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Mark a contractor's 1099 as generated for the given tax year.
   */
  static async markAsGenerated(
    contractorId: string,
    taxYear: number
  ): Promise<void> {
    const now = new Date().toISOString();

    const { error } = await serverSupabase
      .from('tax_year_summaries')
      .update({
        form_1099_generated: true,
        form_1099_generated_at: now,
        updated_at: now,
      })
      .eq('contractor_id', contractorId)
      .eq('tax_year', taxYear);

    if (error) {
      logger.error('Failed to mark 1099 as generated', error, {
        service: 'Form1099Service',
        contractorId,
        taxYear,
      });
      throw new Error(`Failed to mark 1099 as generated: ${error.message}`);
    }

    logger.info('1099-NEC marked as generated', {
      service: 'Form1099Service',
      contractorId,
      taxYear,
    });
  }

  /**
   * Get the full 1099 history for a contractor, ordered by year descending.
   */
  static async getContractor1099History(
    contractorId: string
  ): Promise<TaxYearSummary[]> {
    const { data, error } = await serverSupabase
      .from('tax_year_summaries')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('tax_year', { ascending: false });

    if (error) {
      logger.error('Failed to fetch contractor 1099 history', error, {
        service: 'Form1099Service',
        contractorId,
      });
      throw new Error(`Failed to fetch 1099 history: ${error.message}`);
    }

    return (data ?? []) as TaxYearSummary[];
  }

  /**
   * Generate 1099 data for multiple contractors in a batch.
   * Returns individual results so partial failures do not block the batch.
   */
  static async generateBatch(
    contractorIds: string[],
    taxYear: number
  ): Promise<Generate1099Result[]> {
    const results: Generate1099Result[] = [];

    for (const contractorId of contractorIds) {
      try {
        const data = await this.generate1099Data(contractorId, taxYear);
        await this.markAsGenerated(contractorId, taxYear);
        results.push({ contractor_id: contractorId, success: true, data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('1099 generation failed for contractor', err, {
          service: 'Form1099Service',
          contractorId,
          taxYear,
        });
        results.push({
          contractor_id: contractorId,
          success: false,
          error: message,
        });
      }
    }

    return results;
  }

  // ── Private Helpers ─────────────────────────────────────────────

  /**
   * Build platform company info from environment variables.
   */
  private static getCompanyInfo(): CompanyInfo {
    const name = process.env.COMPANY_NAME;
    const tin = process.env.COMPANY_TIN;
    const addressLine1 = process.env.COMPANY_ADDRESS_LINE1;
    const city = process.env.COMPANY_CITY;
    const state = process.env.COMPANY_STATE;
    const zip = process.env.COMPANY_ZIP_CODE;

    if (!name || !tin || !addressLine1 || !city || !state || !zip) {
      throw new Error(
        'Missing required COMPANY_* environment variables for 1099 generation. ' +
          'Required: COMPANY_NAME, COMPANY_TIN, COMPANY_ADDRESS_LINE1, COMPANY_CITY, COMPANY_STATE, COMPANY_ZIP_CODE'
      );
    }

    return {
      name,
      tin,
      address_line1: addressLine1,
      address_line2: process.env.COMPANY_ADDRESS_LINE2 ?? null,
      city,
      state,
      zip_code: zip,
      phone: process.env.COMPANY_PHONE ?? null,
    };
  }
}
