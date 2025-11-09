import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

interface VerificationCheck {
  name: string;
  passed: boolean;
  message?: string;
}

interface AutomatedVerificationResult {
  passed: boolean;
  checks: VerificationCheck[];
  requiresManualReview: boolean;
  verificationScore: number;
}

interface VerificationHistoryEntry {
  id: string;
  admin_id: string | null;
  action: 'approved' | 'rejected' | 'auto_flagged' | 'auto_approved';
  reason: string | null;
  verification_score: number | null;
  created_at: string;
  checks_passed: any;
  previous_status: boolean | null;
  new_status: boolean | null;
}

/**
 * Service for handling contractor verification automation and manual review
 */
export class VerificationService {
  /**
   * Validates license number format
   */
  private static validateLicenseFormat(licenseNumber: string | null | undefined): { valid: boolean; message?: string } {
    if (!licenseNumber || licenseNumber.trim().length < 5) {
      return { valid: false, message: 'License number must be at least 5 characters' };
    }

    const cleanLicense = licenseNumber.trim().toUpperCase();
    if (!/^[A-Z0-9\-\/]+$/.test(cleanLicense)) {
      return { valid: false, message: 'License number contains invalid characters' };
    }

    if (cleanLicense.length > 50) {
      return { valid: false, message: 'License number is too long' };
    }

    return { valid: true };
  }

  /**
   * Validates company name format
   */
  private static validateCompanyName(companyName: string | null | undefined): { valid: boolean; message?: string } {
    if (!companyName || companyName.trim().length < 2) {
      return { valid: false, message: 'Company name is required and must be at least 2 characters' };
    }

    if (companyName.trim().length > 100) {
      return { valid: false, message: 'Company name is too long' };
    }

    // Check for suspicious patterns
    const suspiciousPatterns = ['test', 'example', 'fake', 'dummy'];
    const lowerName = companyName.toLowerCase();
    if (suspiciousPatterns.some(pattern => lowerName.includes(pattern))) {
      return { valid: false, message: 'Company name appears to be a test or placeholder' };
    }

    return { valid: true };
  }

  /**
   * Checks if insurance is valid (not expired)
   */
  private static validateInsurance(expiryDate: string | null | undefined): { valid: boolean; message?: string } {
    if (!expiryDate) {
      return { valid: true }; // Insurance is optional, so no expiry is OK
    }

    try {
      const expiry = new Date(expiryDate);
      const now = new Date();
      
      if (expiry < now) {
        return { valid: false, message: 'Insurance has expired' };
      }

      // Warn if expiring within 30 days
      const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 30) {
        return { valid: true, message: `Insurance expires in ${daysUntilExpiry} days` };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, message: 'Invalid insurance expiry date format' };
    }
  }

  /**
   * Runs automated verification checks on a contractor
   */
  static async automatedVerificationCheck(userId: string): Promise<AutomatedVerificationResult> {
    try {
      const { data: user, error } = await serverSupabase
        .from('users')
        .select('company_name, business_address, license_number, latitude, longitude, insurance_expiry_date, admin_verified, background_check_status')
        .eq('id', userId)
        .single();

      if (error || !user) {
        logger.error('Error fetching user for verification check', { userId, error: error?.message });
        return {
          passed: false,
          checks: [{ name: 'User Data Fetch', passed: false, message: 'Failed to fetch user data' }],
          requiresManualReview: true,
          verificationScore: 0,
        };
      }

      const checks: VerificationCheck[] = [];
      let score = 0;
      const maxScore = 100;
      const weights = {
        companyName: 15,
        businessAddress: 15,
        licenseNumber: 20,
        geolocation: 10,
        insurance: 15,
        backgroundCheck: 25,
      };

      // Check 1: Company Name
      const companyCheck = this.validateCompanyName(user.company_name);
      checks.push({
        name: 'Company Name',
        passed: companyCheck.valid,
        message: companyCheck.message,
      });
      if (companyCheck.valid) score += weights.companyName;

      // Check 2: Business Address
      const hasAddress = Boolean(user.business_address && user.business_address.trim().length > 5);
      checks.push({
        name: 'Business Address',
        passed: hasAddress,
        message: hasAddress ? undefined : 'Business address is required',
      });
      if (hasAddress) score += weights.businessAddress;

      // Check 3: License Number
      const licenseCheck = this.validateLicenseFormat(user.license_number);
      checks.push({
        name: 'License Number',
        passed: licenseCheck.valid,
        message: licenseCheck.message,
      });
      if (licenseCheck.valid) score += weights.licenseNumber;

      // Check 4: Geolocation
      const hasGeolocation = Boolean(user.latitude && user.longitude);
      checks.push({
        name: 'Geolocation',
        passed: hasGeolocation,
        message: hasGeolocation ? undefined : 'Valid geolocation is required',
      });
      if (hasGeolocation) score += weights.geolocation;

      // Check 5: Insurance (optional but adds to score)
      const insuranceCheck = this.validateInsurance(user.insurance_expiry_date);
      checks.push({
        name: 'Insurance',
        passed: insuranceCheck.valid,
        message: insuranceCheck.message,
      });
      if (insuranceCheck.valid && user.insurance_expiry_date) {
        score += weights.insurance;
      }

      // Check 6: Background Check
      const backgroundCheckPassed = user.background_check_status === 'passed';
      checks.push({
        name: 'Background Check',
        passed: backgroundCheckPassed,
        message: backgroundCheckPassed ? undefined : 'Background check required',
      });
      if (backgroundCheckPassed) {
        score += weights.backgroundCheck;
      }

      const allCriticalChecksPassed = companyCheck.valid && hasAddress && licenseCheck.valid && hasGeolocation && backgroundCheckPassed;
      const requiresManualReview = !allCriticalChecksPassed || score < 80;

      return {
        passed: allCriticalChecksPassed && score >= 90,
        checks,
        requiresManualReview,
        verificationScore: score,
      };
    } catch (error) {
      logger.error('Error in automated verification check', { userId, error: error instanceof Error ? error.message : String(error) });
      return {
        passed: false,
        checks: [{ name: 'System Error', passed: false, message: 'An error occurred during verification' }],
        requiresManualReview: true,
        verificationScore: 0,
      };
    }
  }

  /**
   * Calculates verification score for a contractor
   */
  static async getVerificationScore(userId: string): Promise<number> {
    const result = await this.automatedVerificationCheck(userId);
    return result.verificationScore;
  }

  /**
   * Fetches verification history for a user
   */
  static async getVerificationHistory(userId: string): Promise<VerificationHistoryEntry[]> {
    try {
      const { data, error } = await serverSupabase
        .from('verification_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        logger.error('Error fetching verification history', { userId, error: error.message });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getVerificationHistory', { userId, error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Logs a verification action to history
   */
  static async logVerificationAction(
    userId: string,
    adminId: string | null,
    action: 'approved' | 'rejected' | 'auto_flagged' | 'auto_approved',
    reason: string | null,
    verificationScore: number | null,
    checksPassed: any,
    previousStatus: boolean | null,
    newStatus: boolean | null
  ): Promise<void> {
    try {
      const { error } = await serverSupabase
        .from('verification_history')
        .insert({
          user_id: userId,
          admin_id: adminId,
          action,
          reason,
          verification_score: verificationScore,
          checks_passed: checksPassed,
          previous_status: previousStatus,
          new_status: newStatus,
        });

      if (error) {
        logger.error('Error logging verification action', { userId, adminId, action, error: error.message });
      }
    } catch (error) {
      logger.error('Error in logVerificationAction', { userId, adminId, action, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

