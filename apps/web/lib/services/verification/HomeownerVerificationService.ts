import { serverSupabase } from '@/lib/api/supabaseServer';
import { PhoneVerificationService } from './PhoneVerificationService';
import { isPhoneVerificationWaivedFor } from './EarlyAccessCohort';
import { logger } from '@mintenance/shared';

/**
 * Service for orchestrating homeowner verification
 */
export class HomeownerVerificationService {
  /**
   * Check if homeowner is fully verified (email + phone)
   */
  static async isFullyVerified(userId: string): Promise<{
    verified: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    /**
     * True when the phone requirement was lifted for this user by the
     * early-access cohort rule rather than satisfied. Callers use it to
     * avoid asking for a verification that isn't being enforced.
     */
    phoneVerificationWaived: boolean;
    canPostJobs: boolean;
  }> {
    try {
      const { data: user, error } = await serverSupabase
        .from('profiles')
        .select('verified, phone_verified, phone, role, created_at')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return {
          verified: false,
          emailVerified: false,
          phoneVerified: false,
          phoneVerificationWaived: false,
          canPostJobs: false,
        };
      }

      // Only homeowners need phone verification for job posting
      if (user.role === 'homeowner') {
        const emailVerified = user.verified || false;
        const phoneVerified = user.phone_verified || false;
        // The helper short-circuits before the cohort query whenever
        // the answer can't change the outcome (already verified, or no
        // number on file), keeping the extra round-trip off the
        // common paths.
        const phoneVerificationWaived =
          await isPhoneVerificationWaivedFor(user);
        const canPostJobs =
          emailVerified && (phoneVerified || phoneVerificationWaived);

        return {
          verified: canPostJobs,
          emailVerified,
          phoneVerified,
          phoneVerificationWaived,
          canPostJobs,
        };
      }

      // Contractors don't need phone verification for job posting
      return {
        verified: true,
        emailVerified: user.verified || false,
        phoneVerified: false,
        phoneVerificationWaived: false,
        canPostJobs: true,
      };
    } catch (error) {
      logger.error('Error checking homeowner verification', error, {
        service: 'HomeownerVerificationService',
        userId,
      });
      return {
        verified: false,
        emailVerified: false,
        phoneVerified: false,
        phoneVerificationWaived: false,
        canPostJobs: false,
      };
    }
  }

  /**
   * Get verification status with details
   */
  static async getVerificationStatus(userId: string): Promise<{
    emailVerified: boolean;
    phoneVerified: boolean;
    phoneNumber?: string;
    canPostJobs: boolean;
    missingRequirements: string[];
  }> {
    try {
      const { data: user, error } = await serverSupabase
        .from('profiles')
        .select('verified, phone_verified, phone, role, created_at')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return {
          emailVerified: false,
          phoneVerified: false,
          canPostJobs: false,
          missingRequirements: ['User not found'],
        };
      }

      const emailVerified = user.verified || false;
      const phoneVerified = user.phone_verified || false;
      const missingRequirements: string[] = [];
      const isHomeowner = user.role === 'homeowner';
      // Same helper as isFullyVerified so the two never disagree about
      // who still owes a phone verification.
      const phoneWaived = await isPhoneVerificationWaivedFor(user);

      if (isHomeowner) {
        if (!emailVerified) {
          missingRequirements.push('Email verification required');
        }
        if (!phoneVerified && !phoneWaived) {
          missingRequirements.push('Phone verification required');
        }
        // Never waived — a waived homeowner has a number by definition,
        // so this only ever fires for someone we still need one from.
        if (!user.phone) {
          missingRequirements.push('Phone number required');
        }
      }

      return {
        emailVerified,
        phoneVerified,
        phoneNumber: user.phone || undefined,
        canPostJobs: isHomeowner
          ? emailVerified && (phoneVerified || phoneWaived)
          : true,
        missingRequirements,
      };
    } catch (error) {
      logger.error('Error getting verification status', error, {
        service: 'HomeownerVerificationService',
        userId,
      });
      return {
        emailVerified: false,
        phoneVerified: false,
        canPostJobs: false,
        missingRequirements: ['Unable to check verification status'],
      };
    }
  }
}
