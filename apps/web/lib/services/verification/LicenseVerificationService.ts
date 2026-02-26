import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Supported UK trade body license types
 */
export type LicenseType = 'gas_safe' | 'niceic' | 'napit' | 'oftec' | 'other';

export interface LicenseVerificationRequest {
  contractorId: string;
  licenseType: LicenseType;
  licenseNumber: string;
  tradeBody?: string;
  holderName?: string;
  documentUrl?: string;
}

export interface LicenseVerificationResult {
  id: string;
  status: 'pending' | 'verified' | 'failed' | 'expired';
  verificationMethod: 'manual' | 'api_lookup' | 'document_upload';
  externalData?: Record<string, unknown>;
  message: string;
}

interface GasSafeLookupResult {
  found: boolean;
  engineerName?: string;
  businessName?: string;
  registrationNumber?: string;
  expiryDate?: string;
  appliances?: string[];
}

/**
 * Service for verifying contractor trade licenses against UK trade body registers.
 *
 * Supports:
 * - Gas Safe Register (public lookup)
 * - NICEIC (document upload + admin review)
 * - NAPIT (document upload + admin review)
 * - OFTEC (document upload + admin review)
 */
export class LicenseVerificationService {
  // License number format patterns per trade body
  private static readonly LICENSE_FORMATS: Record<LicenseType, RegExp> = {
    gas_safe: /^\d{5,7}$/, // Gas Safe: 5-7 digit number
    niceic: /^[A-Z0-9]{4,10}$/i, // NICEIC: alphanumeric
    napit: /^[A-Z0-9]{4,10}$/i, // NAPIT: alphanumeric
    oftec: /^[A-Z]?\d{4,8}$/i, // OFTEC: optional letter + digits
    other: /^[A-Z0-9\-/]{3,50}$/i, // Generic: alphanumeric with hyphens/slashes
  };

  private static readonly TRADE_BODY_NAMES: Record<LicenseType, string> = {
    gas_safe: 'Gas Safe Register',
    niceic: 'NICEIC',
    napit: 'NAPIT',
    oftec: 'OFTEC',
    other: 'Other',
  };

  /**
   * Submit a license for verification.
   * For Gas Safe, attempts automatic API lookup first.
   * For others, creates a pending verification for admin review.
   */
  static async submitVerification(
    request: LicenseVerificationRequest
  ): Promise<LicenseVerificationResult> {
    const { contractorId, licenseType, licenseNumber, holderName, documentUrl } = request;

    // Validate license number format
    const formatPattern = this.LICENSE_FORMATS[licenseType];
    if (!formatPattern.test(licenseNumber.trim())) {
      return {
        id: '',
        status: 'failed',
        verificationMethod: 'manual',
        message: `Invalid ${this.TRADE_BODY_NAMES[licenseType]} license number format. Expected: ${this.getFormatHint(licenseType)}`,
      };
    }

    // Check for duplicate submission
    const { data: existing } = await serverSupabase
      .from('license_verifications')
      .select('id, status')
      .eq('contractor_id', contractorId)
      .eq('license_type', licenseType)
      .eq('license_number', licenseNumber.trim())
      .in('status', ['pending', 'verified'])
      .maybeSingle();

    if (existing) {
      return {
        id: existing.id,
        status: existing.status,
        verificationMethod: 'manual',
        message: existing.status === 'verified'
          ? 'This license is already verified.'
          : 'This license is already pending verification.',
      };
    }

    // For Gas Safe, attempt automatic lookup
    if (licenseType === 'gas_safe') {
      return this.verifyGasSafe(contractorId, licenseNumber.trim(), holderName);
    }

    // For other trade bodies, require document upload and create pending verification
    if (!documentUrl) {
      return {
        id: '',
        status: 'failed',
        verificationMethod: 'document_upload',
        message: `${this.TRADE_BODY_NAMES[licenseType]} verification requires a document upload of your certificate.`,
      };
    }

    return this.createPendingVerification(request);
  }

  /**
   * Verify a Gas Safe registration number against the Gas Safe Register.
   * Uses their public search endpoint to confirm the engineer is registered.
   */
  private static async verifyGasSafe(
    contractorId: string,
    registrationNumber: string,
    holderName?: string
  ): Promise<LicenseVerificationResult> {
    try {
      const lookupResult = await this.gasSafeLookup(registrationNumber);

      if (!lookupResult.found) {
        // Save as failed lookup, allow retry
        const { data: record } = await serverSupabase
          .from('license_verifications')
          .insert({
            contractor_id: contractorId,
            license_type: 'gas_safe',
            license_number: registrationNumber,
            trade_body: 'Gas Safe Register',
            holder_name: holderName || null,
            status: 'failed',
            verification_method: 'api_lookup',
            external_lookup_data: { lookupResult },
          })
          .select('id')
          .single();

        return {
          id: record?.id || '',
          status: 'failed',
          verificationMethod: 'api_lookup',
          externalData: lookupResult as unknown as Record<string, unknown>,
          message: `Gas Safe registration number ${registrationNumber} not found. Please check the number and try again.`,
        };
      }

      // If holder name provided, cross-check against lookup
      let nameMatch = true;
      if (holderName && lookupResult.engineerName) {
        nameMatch = this.fuzzyNameMatch(holderName, lookupResult.engineerName);
      }

      // Check expiry
      let isExpired = false;
      if (lookupResult.expiryDate) {
        isExpired = new Date(lookupResult.expiryDate) < new Date();
      }

      const status = isExpired ? 'expired' : (nameMatch ? 'verified' : 'pending');

      const { data: record } = await serverSupabase
        .from('license_verifications')
        .insert({
          contractor_id: contractorId,
          license_type: 'gas_safe',
          license_number: registrationNumber,
          trade_body: 'Gas Safe Register',
          holder_name: holderName || lookupResult.engineerName || null,
          status,
          verification_method: 'api_lookup',
          verified_at: status === 'verified' ? new Date().toISOString() : null,
          expires_at: lookupResult.expiryDate || null,
          external_lookup_data: { lookupResult, nameMatch },
        })
        .select('id')
        .single();

      if (status === 'verified') {
        // Update profile license_number if not set
        await serverSupabase
          .from('profiles')
          .update({ license_number: registrationNumber })
          .eq('id', contractorId)
          .is('license_number', null);
      }

      const messages: Record<string, string> = {
        verified: `Gas Safe registration ${registrationNumber} verified successfully.`,
        expired: `Gas Safe registration ${registrationNumber} found but has expired. Please renew your registration.`,
        pending: `Gas Safe registration ${registrationNumber} found but the name does not match. Pending admin review.`,
      };

      return {
        id: record?.id || '',
        status,
        verificationMethod: 'api_lookup',
        externalData: lookupResult as unknown as Record<string, unknown>,
        message: messages[status],
      };
    } catch (error) {
      logger.error('Gas Safe verification failed', error, {
        service: 'LicenseVerificationService',
        registrationNumber,
      });

      // Fall back to pending manual review
      return this.createPendingVerification({
        contractorId,
        licenseType: 'gas_safe',
        licenseNumber: registrationNumber,
        holderName,
      });
    }
  }

  /**
   * Look up a Gas Safe registration number.
   * Uses the Gas Safe Register public search page.
   */
  private static async gasSafeLookup(registrationNumber: string): Promise<GasSafeLookupResult> {
    try {
      // Gas Safe Register provides a public search at:
      // https://www.gassaferegister.co.uk/find-an-engineer/
      // Their search returns results via a POST form submission.
      // We use their API endpoint that the search page calls internally.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://www.gassaferegister.co.uk/api/search/engineer/${encodeURIComponent(registrationNumber)}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mintenance/1.0 (License Verification)',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        // If the API endpoint doesn't work (may have changed), fall back
        logger.warn('Gas Safe API returned non-OK status', {
          service: 'LicenseVerificationService',
          status: response.status,
          registrationNumber,
        });
        return { found: false };
      }

      const data = await response.json();

      // The response structure may vary; adapt as needed
      if (data && (data.engineer || data.results?.length > 0)) {
        const engineer = data.engineer || data.results[0];
        return {
          found: true,
          engineerName: engineer.name || engineer.engineerName,
          businessName: engineer.businessName || engineer.business_name,
          registrationNumber: engineer.registrationNumber || registrationNumber,
          expiryDate: engineer.expiryDate || engineer.cardExpiryDate,
          appliances: engineer.appliances || [],
        };
      }

      return { found: false };
    } catch (error) {
      logger.warn('Gas Safe lookup request failed', {
        service: 'LicenseVerificationService',
        registrationNumber,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return { found: false };
    }
  }

  /**
   * Create a pending verification record for admin review.
   */
  private static async createPendingVerification(
    request: LicenseVerificationRequest
  ): Promise<LicenseVerificationResult> {
    const { contractorId, licenseType, licenseNumber, holderName, documentUrl } = request;

    const { data: record, error } = await serverSupabase
      .from('license_verifications')
      .insert({
        contractor_id: contractorId,
        license_type: licenseType,
        license_number: licenseNumber.trim(),
        trade_body: this.TRADE_BODY_NAMES[licenseType],
        holder_name: holderName || null,
        status: 'pending',
        verification_method: documentUrl ? 'document_upload' : 'manual',
        document_url: documentUrl || null,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to create license verification record', {
        service: 'LicenseVerificationService',
        contractorId,
        error: error.message,
      });
      return {
        id: '',
        status: 'failed',
        verificationMethod: 'manual',
        message: 'Failed to submit verification. Please try again.',
      };
    }

    return {
      id: record.id,
      status: 'pending',
      verificationMethod: documentUrl ? 'document_upload' : 'manual',
      message: `Your ${this.TRADE_BODY_NAMES[licenseType]} license has been submitted for verification. This typically takes 1-2 business days.`,
    };
  }

  /**
   * Admin: approve or reject a license verification.
   */
  static async adminReview(
    verificationId: string,
    adminId: string,
    approved: boolean,
    notes?: string
  ): Promise<boolean> {
    const { error } = await serverSupabase
      .from('license_verifications')
      .update({
        status: approved ? 'verified' : 'failed',
        admin_reviewer_id: adminId,
        admin_notes: notes || null,
        verified_at: approved ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', verificationId);

    if (error) {
      logger.error('Failed to update license verification', {
        service: 'LicenseVerificationService',
        verificationId,
        error: error.message,
      });
      return false;
    }

    // If approved, update contractor profile
    if (approved) {
      const { data: verification } = await serverSupabase
        .from('license_verifications')
        .select('contractor_id, license_number')
        .eq('id', verificationId)
        .single();

      if (verification) {
        await serverSupabase
          .from('profiles')
          .update({ license_number: verification.license_number })
          .eq('id', verification.contractor_id);
      }
    }

    return true;
  }

  /**
   * Get all verifications for a contractor.
   */
  static async getContractorVerifications(contractorId: string) {
    const { data, error } = await serverSupabase
      .from('license_verifications')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch license verifications', {
        service: 'LicenseVerificationService',
        contractorId,
        error: error.message,
      });
      return [];
    }

    return data || [];
  }

  /**
   * Get pending verifications for admin review.
   */
  static async getPendingVerifications(limit = 50) {
    const { data, error } = await serverSupabase
      .from('license_verifications')
      .select('*, profiles!license_verifications_contractor_id_fkey(full_name, company_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('Failed to fetch pending license verifications', {
        service: 'LicenseVerificationService',
        error: error.message,
      });
      return [];
    }

    return data || [];
  }

  /**
   * Check if a contractor has any verified license.
   */
  static async hasVerifiedLicense(contractorId: string): Promise<boolean> {
    const { count, error } = await serverSupabase
      .from('license_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('contractor_id', contractorId)
      .eq('status', 'verified');

    if (error) return false;
    return (count ?? 0) > 0;
  }

  // ---- Helpers ----

  private static getFormatHint(licenseType: LicenseType): string {
    const hints: Record<LicenseType, string> = {
      gas_safe: '5-7 digit number (e.g., 123456)',
      niceic: '4-10 character alphanumeric code',
      napit: '4-10 character alphanumeric code',
      oftec: 'Optional letter followed by 4-8 digits (e.g., C12345)',
      other: '3-50 character alphanumeric code',
    };
    return hints[licenseType];
  }

  private static fuzzyNameMatch(name1: string, name2: string): boolean {
    const normalize = (n: string) => n.toLowerCase().replace(/[^a-z]/g, '');
    const n1 = normalize(name1);
    const n2 = normalize(name2);

    // Exact match after normalisation
    if (n1 === n2) return true;

    // One contains the other (handles "John Smith" vs "J Smith & Sons")
    if (n1.includes(n2) || n2.includes(n1)) return true;

    // Check if surname matches (last word)
    const surname1 = name1.trim().split(/\s+/).pop()?.toLowerCase() || '';
    const surname2 = name2.trim().split(/\s+/).pop()?.toLowerCase() || '';
    if (surname1.length > 2 && surname1 === surname2) return true;

    return false;
  }
}
