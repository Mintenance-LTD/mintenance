import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

interface VerificationRules {
  requireProfileComplete: boolean;
  requireProfilePhoto: boolean;
  minCompletedJobs: number;
  minRating: number;
  requireEmailVerified: boolean;
}

const DEFAULT_RULES: VerificationRules = {
  requireProfileComplete: true,
  requireProfilePhoto: false,
  minCompletedJobs: 0,
  minRating: 0,
  requireEmailVerified: true,
};

interface EvaluationResult {
  eligible: boolean;
  passedRules: string[];
  failedRules: string[];
}

interface BatchResult {
  verified: number;
  skipped: number;
  errors: number;
  details: Array<{
    contractorId: string;
    status: 'verified' | 'skipped' | 'error';
    reason?: string;
  }>;
}

/**
 * Service for automatic contractor verification based on configurable rules.
 *
 * Evaluates unverified contractors against a set of criteria (profile
 * completeness, photo, completed jobs, rating, email verification) and
 * promotes eligible contractors to verified status without manual admin
 * intervention.
 */
export class AutoVerificationService {
  /**
   * Evaluate whether a single contractor meets auto-verification criteria.
   */
  static async evaluateContractor(
    contractorId: string,
    rules?: Partial<VerificationRules>,
  ): Promise<EvaluationResult> {
    const mergedRules: VerificationRules = { ...DEFAULT_RULES, ...rules };
    const passedRules: string[] = [];
    const failedRules: string[] = [];

    try {
      // Fetch contractor profile
      const { data: profile, error: profileError } = await serverSupabase
        .from('profiles')
        .select('first_name, last_name, company_name, phone, avatar_url, email')
        .eq('id', contractorId)
        .single();

      if (profileError || !profile) {
        logger.error('Failed to fetch contractor profile for auto-verification', {
          service: 'AutoVerificationService',
          contractorId,
          error: profileError?.message,
        });
        return { eligible: false, passedRules, failedRules: ['profile_fetch_failed'] };
      }

      // Rule: Profile Complete
      if (mergedRules.requireProfileComplete) {
        const hasFirstName = Boolean(profile.first_name && profile.first_name.trim());
        const hasLastName = Boolean(profile.last_name && profile.last_name.trim());
        const hasCompanyName = Boolean(profile.company_name && profile.company_name.trim());

        if (hasFirstName && hasLastName && hasCompanyName) {
          passedRules.push('profileComplete');
        } else {
          const missing: string[] = [];
          if (!hasFirstName) missing.push('first_name');
          if (!hasLastName) missing.push('last_name');
          if (!hasCompanyName) missing.push('company_name');
          failedRules.push(`profileComplete (missing: ${missing.join(', ')})`);
        }
      }

      // Rule: Profile Photo
      if (mergedRules.requireProfilePhoto) {
        if (profile.avatar_url && profile.avatar_url.trim()) {
          passedRules.push('profilePhoto');
        } else {
          failedRules.push('profilePhoto (avatar_url not set)');
        }
      }

      // Rule: Minimum Completed Jobs
      if (mergedRules.minCompletedJobs > 0) {
        const { count, error: jobsError } = await serverSupabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('contractor_id', contractorId)
          .eq('status', 'completed');

        if (jobsError) {
          logger.error('Failed to count completed jobs for auto-verification', {
            service: 'AutoVerificationService',
            contractorId,
            error: jobsError.message,
          });
          failedRules.push(`completedJobs (query error: ${jobsError.message})`);
        } else {
          const completedCount = count || 0;
          if (completedCount >= mergedRules.minCompletedJobs) {
            passedRules.push(`completedJobs (${completedCount}/${mergedRules.minCompletedJobs})`);
          } else {
            failedRules.push(`completedJobs (${completedCount}/${mergedRules.minCompletedJobs})`);
          }
        }
      }

      // Rule: Minimum Rating
      if (mergedRules.minRating > 0) {
        const { data: ratingData, error: ratingError } = await serverSupabase
          .from('reviews')
          .select('rating')
          .eq('contractor_id', contractorId);

        if (ratingError) {
          logger.error('Failed to fetch reviews for auto-verification', {
            service: 'AutoVerificationService',
            contractorId,
            error: ratingError.message,
          });
          failedRules.push(`rating (query error: ${ratingError.message})`);
        } else {
          const reviews = ratingData || [];
          if (reviews.length === 0) {
            failedRules.push(`rating (no reviews yet, need ${mergedRules.minRating})`);
          } else {
            const avgRating =
              reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
            if (avgRating >= mergedRules.minRating) {
              passedRules.push(`rating (${avgRating.toFixed(1)}/${mergedRules.minRating})`);
            } else {
              failedRules.push(`rating (${avgRating.toFixed(1)}/${mergedRules.minRating})`);
            }
          }
        }
      }

      // Rule: Email Verified
      if (mergedRules.requireEmailVerified) {
        // Check via auth.users through the admin API
        const { data: authUser, error: authError } = await serverSupabase
          .auth.admin.getUserById(contractorId);

        if (authError || !authUser?.user) {
          logger.error('Failed to fetch auth user for auto-verification', {
            service: 'AutoVerificationService',
            contractorId,
            error: authError?.message,
          });
          failedRules.push('emailVerified (auth lookup failed)');
        } else {
          if (authUser.user.email_confirmed_at) {
            passedRules.push('emailVerified');
          } else {
            failedRules.push('emailVerified (email not confirmed)');
          }
        }
      }

      const eligible = failedRules.length === 0;

      return { eligible, passedRules, failedRules };
    } catch (error) {
      logger.error('Unexpected error evaluating contractor for auto-verification', {
        service: 'AutoVerificationService',
        contractorId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { eligible: false, passedRules, failedRules: ['unexpected_error'] };
    }
  }

  /**
   * Process all unverified contractors and auto-verify eligible ones.
   */
  static async processAutoVerifications(
    rules?: Partial<VerificationRules>,
  ): Promise<BatchResult> {
    const result: BatchResult = {
      verified: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    try {
      // Fetch all unverified contractors
      const { data: contractors, error: fetchError } = await serverSupabase
        .from('profiles')
        .select('id')
        .eq('role', 'contractor')
        .or('admin_verified.is.null,admin_verified.eq.false');

      if (fetchError) {
        logger.error('Failed to fetch unverified contractors', {
          service: 'AutoVerificationService',
          error: fetchError.message,
        });
        return result;
      }

      if (!contractors || contractors.length === 0) {
        logger.info('No unverified contractors to process', {
          service: 'AutoVerificationService',
        });
        return result;
      }

      logger.info('Starting auto-verification batch', {
        service: 'AutoVerificationService',
        totalContractors: contractors.length,
      });

      for (const contractor of contractors) {
        try {
          const evaluation = await this.evaluateContractor(contractor.id, rules);

          if (!evaluation.eligible) {
            result.skipped++;
            result.details.push({
              contractorId: contractor.id,
              status: 'skipped',
              reason: `Failed rules: ${evaluation.failedRules.join('; ')}`,
            });
            continue;
          }

          // Update profile to verified
          const { error: updateError } = await serverSupabase
            .from('profiles')
            .update({
              admin_verified: true,
              verified_at: new Date().toISOString(),
            })
            .eq('id', contractor.id);

          if (updateError) {
            logger.error('Failed to update contractor verification status', {
              service: 'AutoVerificationService',
              contractorId: contractor.id,
              error: updateError.message,
            });
            result.errors++;
            result.details.push({
              contractorId: contractor.id,
              status: 'error',
              reason: `Profile update failed: ${updateError.message}`,
            });
            continue;
          }

          // Log to audit_logs table
          const { error: auditError } = await serverSupabase
            .from('audit_logs')
            .insert({
              action: 'auto_verify_contractor',
              resource_type: 'profile',
              resource_id: contractor.id,
              details: {
                rules: { ...DEFAULT_RULES, ...rules },
                results: {
                  passedRules: evaluation.passedRules,
                  failedRules: evaluation.failedRules,
                },
              },
              status: 'success',
            });

          if (auditError) {
            logger.error('Failed to write audit log for auto-verification', {
              service: 'AutoVerificationService',
              contractorId: contractor.id,
              error: auditError.message,
            });
            // Non-fatal: continue even if audit log fails
          }

          // Create in-app notification for the contractor
          const { error: notifError } = await serverSupabase
            .from('notifications')
            .insert({
              user_id: contractor.id,
              type: 'verification_approved',
              title: 'Account Verified',
              message:
                'Your contractor account has been automatically verified. You now have full access to the platform.',
              action_url: '/contractor/dashboard-enhanced',
            });

          if (notifError) {
            logger.error('Failed to create notification for auto-verified contractor', {
              service: 'AutoVerificationService',
              contractorId: contractor.id,
              error: notifError.message,
            });
            // Non-fatal: verification still succeeded
          }

          result.verified++;
          result.details.push({
            contractorId: contractor.id,
            status: 'verified',
          });

          logger.info('Contractor auto-verified', {
            service: 'AutoVerificationService',
            contractorId: contractor.id,
            passedRules: evaluation.passedRules,
          });
        } catch (contractorError) {
          logger.error('Unexpected error processing contractor in auto-verification batch', {
            service: 'AutoVerificationService',
            contractorId: contractor.id,
            error:
              contractorError instanceof Error
                ? contractorError.message
                : String(contractorError),
          });
          result.errors++;
          result.details.push({
            contractorId: contractor.id,
            status: 'error',
            reason:
              contractorError instanceof Error
                ? contractorError.message
                : String(contractorError),
          });
        }
      }

      logger.info('Auto-verification batch complete', {
        service: 'AutoVerificationService',
        verified: result.verified,
        skipped: result.skipped,
        errors: result.errors,
        total: contractors.length,
      });

      return result;
    } catch (error) {
      logger.error('Fatal error in auto-verification batch', {
        service: 'AutoVerificationService',
        error: error instanceof Error ? error.message : String(error),
      });
      return result;
    }
  }
}
