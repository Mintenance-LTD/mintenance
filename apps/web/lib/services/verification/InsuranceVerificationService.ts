import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * UK trade insurance types relevant to property maintenance
 */
export type InsuranceType =
  | 'public_liability'
  | 'professional_indemnity'
  | 'employers_liability'
  | 'all_risks';

export interface InsuranceSubmission {
  contractorId: string;
  insuranceType: InsuranceType;
  providerName: string;
  policyNumber?: string;
  coverageAmountPence: number;
  excessAmountPence?: number;
  policyStartDate?: string; // ISO date
  policyExpiryDate: string; // ISO date
  documentUrl: string; // uploaded certificate image/PDF
}

export interface InsuranceVerificationResult {
  id: string;
  status: 'pending' | 'verified' | 'failed' | 'expired';
  message: string;
  warnings: string[];
}

/**
 * Minimum coverage thresholds for UK trade insurance (in pence).
 * Based on typical UK requirements for domestic property work.
 */
const MIN_COVERAGE: Record<InsuranceType, number> = {
  public_liability: 100_000_00, // £1,000,000 (standard for domestic work)
  professional_indemnity: 50_000_00, // £500,000
  employers_liability: 500_000_00, // £5,000,000 (legal requirement if employer)
  all_risks: 10_000_00, // £100,000
};

const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  public_liability: 'Public Liability',
  professional_indemnity: 'Professional Indemnity',
  employers_liability: "Employers' Liability",
  all_risks: 'All Risks / Tools',
};

/**
 * Service for verifying contractor insurance certificates.
 *
 * Workflow:
 * 1. Contractor uploads insurance certificate (image or PDF)
 * 2. System validates basic fields (expiry date, coverage amount, provider)
 * 3. Record created as 'pending' for admin review
 * 4. Admin reviews document, verifies details, approves/rejects
 * 5. On approval, profile insurance_expiry_date is updated
 */
export class InsuranceVerificationService {
  /**
   * Submit an insurance certificate for verification.
   */
  static async submitVerification(
    submission: InsuranceSubmission
  ): Promise<InsuranceVerificationResult> {
    const warnings: string[] = [];

    // Validate expiry date
    const expiryDate = new Date(submission.policyExpiryDate);
    const now = new Date();

    if (isNaN(expiryDate.getTime())) {
      return {
        id: '',
        status: 'failed',
        message: 'Invalid policy expiry date.',
        warnings: [],
      };
    }

    if (expiryDate < now) {
      return {
        id: '',
        status: 'expired',
        message: 'This insurance policy has already expired. Please upload a current certificate.',
        warnings: [],
      };
    }

    // Warn if expiring within 30 days
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 30) {
      warnings.push(`Policy expires in ${daysUntilExpiry} days. Consider renewing soon.`);
    }

    // Validate coverage amount
    const minCoverage = MIN_COVERAGE[submission.insuranceType];
    if (submission.coverageAmountPence < minCoverage) {
      const required = (minCoverage / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
      const provided = (submission.coverageAmountPence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
      warnings.push(
        `Coverage amount (${provided}) is below the recommended minimum of ${required} for ${INSURANCE_TYPE_LABELS[submission.insuranceType]}.`
      );
    }

    // Validate provider name
    if (!submission.providerName || submission.providerName.trim().length < 2) {
      return {
        id: '',
        status: 'failed',
        message: 'Insurance provider name is required.',
        warnings: [],
      };
    }

    // Validate document URL
    if (!submission.documentUrl) {
      return {
        id: '',
        status: 'failed',
        message: 'A scanned copy or photo of your insurance certificate is required.',
        warnings: [],
      };
    }

    // Check for existing active verification of same type
    const { data: existing } = await serverSupabase
      .from('insurance_verifications')
      .select('id, status, policy_expiry_date')
      .eq('contractor_id', submission.contractorId)
      .eq('insurance_type', submission.insuranceType)
      .in('status', ['pending', 'verified'])
      .maybeSingle();

    if (existing) {
      if (existing.status === 'verified') {
        // Allow re-submission if current policy is expiring within 60 days (renewal)
        const existingExpiry = new Date(existing.policy_expiry_date);
        const sixtyDaysFromNow = new Date();
        sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

        if (existingExpiry > sixtyDaysFromNow) {
          return {
            id: existing.id,
            status: 'verified',
            message: `Your ${INSURANCE_TYPE_LABELS[submission.insuranceType]} insurance is already verified and not due for renewal.`,
            warnings: [],
          };
        }
        // Otherwise allow renewal submission
      } else {
        return {
          id: existing.id,
          status: 'pending',
          message: `Your ${INSURANCE_TYPE_LABELS[submission.insuranceType]} insurance is already pending verification.`,
          warnings: [],
        };
      }
    }

    // Create verification record
    const { data: record, error } = await serverSupabase
      .from('insurance_verifications')
      .insert({
        contractor_id: submission.contractorId,
        insurance_type: submission.insuranceType,
        provider_name: submission.providerName.trim(),
        policy_number: submission.policyNumber?.trim() || null,
        coverage_amount: submission.coverageAmountPence,
        excess_amount: submission.excessAmountPence || null,
        status: 'pending',
        verification_method: 'document_upload',
        policy_start_date: submission.policyStartDate || null,
        policy_expiry_date: submission.policyExpiryDate,
        document_url: submission.documentUrl,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to create insurance verification', {
        service: 'InsuranceVerificationService',
        contractorId: submission.contractorId,
        error: error.message,
      });
      return {
        id: '',
        status: 'failed',
        message: 'Failed to submit insurance verification. Please try again.',
        warnings: [],
      };
    }

    return {
      id: record.id,
      status: 'pending',
      message: `Your ${INSURANCE_TYPE_LABELS[submission.insuranceType]} certificate has been submitted for verification. This typically takes 1-2 business days.`,
      warnings,
    };
  }

  /**
   * Admin: approve or reject an insurance verification.
   */
  static async adminReview(
    verificationId: string,
    adminId: string,
    approved: boolean,
    notes?: string
  ): Promise<boolean> {
    const { data: verification, error: fetchError } = await serverSupabase
      .from('insurance_verifications')
      .select('contractor_id, policy_expiry_date')
      .eq('id', verificationId)
      .single();

    if (fetchError || !verification) {
      logger.error('Failed to fetch insurance verification for review', {
        service: 'InsuranceVerificationService',
        verificationId,
        error: fetchError?.message,
      });
      return false;
    }

    const { error } = await serverSupabase
      .from('insurance_verifications')
      .update({
        status: approved ? 'verified' : 'failed',
        admin_reviewer_id: adminId,
        admin_notes: notes || null,
        verified_at: approved ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', verificationId);

    if (error) {
      logger.error('Failed to update insurance verification', {
        service: 'InsuranceVerificationService',
        verificationId,
        error: error.message,
      });
      return false;
    }

    // If approved, update contractor profile insurance_expiry_date
    if (approved) {
      await serverSupabase
        .from('profiles')
        .update({ insurance_expiry_date: verification.policy_expiry_date })
        .eq('id', verification.contractor_id);
    }

    return true;
  }

  /**
   * Get all insurance verifications for a contractor.
   */
  static async getContractorVerifications(contractorId: string) {
    const { data, error } = await serverSupabase
      .from('insurance_verifications')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch insurance verifications', {
        service: 'InsuranceVerificationService',
        contractorId,
        error: error.message,
      });
      return [];
    }

    return data || [];
  }

  /**
   * Get pending verifications for admin dashboard.
   */
  static async getPendingVerifications(limit = 50) {
    const { data, error } = await serverSupabase
      .from('insurance_verifications')
      .select('*, profiles!insurance_verifications_contractor_id_fkey(full_name, company_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('Failed to fetch pending insurance verifications', {
        service: 'InsuranceVerificationService',
        error: error.message,
      });
      return [];
    }

    return data || [];
  }

  /**
   * Check if a contractor has verified insurance of a specific type.
   */
  static async hasVerifiedInsurance(
    contractorId: string,
    insuranceType?: InsuranceType
  ): Promise<boolean> {
    let query = serverSupabase
      .from('insurance_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('contractor_id', contractorId)
      .eq('status', 'verified')
      .gte('policy_expiry_date', new Date().toISOString().split('T')[0]);

    if (insuranceType) {
      query = query.eq('insurance_type', insuranceType);
    }

    const { count, error } = await query;
    if (error) return false;
    return (count ?? 0) > 0;
  }

  /**
   * Cron: mark expired insurance verifications.
   * Should be called daily.
   */
  static async markExpiredPolicies(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await serverSupabase
      .from('insurance_verifications')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('status', 'verified')
      .lt('policy_expiry_date', today)
      .select('id, contractor_id');

    if (error) {
      logger.error('Failed to mark expired insurance policies', {
        service: 'InsuranceVerificationService',
        error: error.message,
      });
      return 0;
    }

    if (data && data.length > 0) {
      logger.info(`Marked ${data.length} insurance policies as expired`, {
        service: 'InsuranceVerificationService',
        ids: data.map(d => d.id),
      });

      // Notify contractors
      const notifications = data.map(d => ({
        user_id: d.contractor_id,
        title: 'Insurance Expired',
        message: 'Your insurance policy has expired. Please upload a renewed certificate to maintain your verified status.',
        type: 'verification_expired',
        read: false,
        action_url: '/contractor/verification?tab=insurance',
      }));

      await serverSupabase.from('notifications').insert(notifications);
    }

    return data?.length || 0;
  }
}
