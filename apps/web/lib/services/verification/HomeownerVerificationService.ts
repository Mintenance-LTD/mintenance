import { serverSupabase } from '@/lib/api/supabaseServer';
import { PhoneVerificationService } from './PhoneVerificationService';
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
    canPostJobs: boolean;
  }> {
    try {
      const { data: user, error } = await serverSupabase
        .from('users')
        .select('email_verified, phone_verified, role')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return {
          verified: false,
          emailVerified: false,
          phoneVerified: false,
          canPostJobs: false,
        };
      }

      // Only homeowners need phone verification for job posting
      if (user.role === 'homeowner') {
        const emailVerified = user.email_verified || false;
        const phoneVerified = user.phone_verified || false;
        const canPostJobs = emailVerified && phoneVerified;

        return {
          verified: canPostJobs,
          emailVerified,
          phoneVerified,
          canPostJobs,
        };
      }

      // Contractors don't need phone verification for job posting
      return {
        verified: true,
        emailVerified: user.email_verified || false,
        phoneVerified: false,
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
        .from('users')
        .select('email_verified, phone_verified, phone, role')
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

      const emailVerified = user.email_verified || false;
      const phoneVerified = user.phone_verified || false;
      const missingRequirements: string[] = [];

      if (user.role === 'homeowner') {
        if (!emailVerified) {
          missingRequirements.push('Email verification required');
        }
        if (!phoneVerified) {
          missingRequirements.push('Phone verification required');
        }
        if (!user.phone) {
          missingRequirements.push('Phone number required');
        }
      }

      return {
        emailVerified,
        phoneVerified,
        phoneNumber: user.phone || undefined,
        canPostJobs: user.role === 'homeowner' ? (emailVerified && phoneVerified) : true,
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

