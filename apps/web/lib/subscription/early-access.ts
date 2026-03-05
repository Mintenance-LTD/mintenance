import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

type EligibleRole = 'homeowner' | 'contractor';

export interface EarlyAccessResult {
  eligible: boolean;
  role: EligibleRole | null;
  cohortLimit: number | null;
  reason:
    | 'eligible'
    | 'not_in_cohort'
    | 'role_not_supported'
    | 'profile_not_found'
    | 'disabled'
    | 'error';
}

function isEarlyAccessEnabled(): boolean {
  return process.env.EARLY_ACCESS_ENABLED !== 'false';
}

/**
 * Early-access cohort:
 * - First 100 contractors
 * - First 100 homeowners
 *
 * "First" is determined by profiles.created_at ascending.
 */
export async function getEarlyAccessEntitlement(userId: string): Promise<EarlyAccessResult> {
  if (!isEarlyAccessEnabled()) {
    return {
      eligible: false,
      role: null,
      cohortLimit: null,
      reason: 'disabled',
    };
  }

  try {
    const { data: grant, error: grantError } = await serverSupabase
      .from('early_access_grants')
      .select('user_id, role')
      .eq('user_id', userId)
      .eq('grant_type', 'max_subscription_features')
      .maybeSingle();

    if (grantError) {
      logger.error('Failed to read early access grant', {
        service: 'early-access',
        userId,
        error: grantError.message,
      });
      return { eligible: false, role: null, cohortLimit: null, reason: 'error' };
    }

    if (!grant) {
      return { eligible: false, role: null, cohortLimit: null, reason: 'not_in_cohort' };
    }

    if (grant.role !== 'homeowner' && grant.role !== 'contractor') {
      return { eligible: false, role: null, cohortLimit: null, reason: 'role_not_supported' };
    }

    const eligible = true;
    const role = grant.role as EligibleRole;

    return {
      eligible,
      role,
      cohortLimit: null,
      reason: eligible ? 'eligible' : 'not_in_cohort',
    };
  } catch (err) {
    logger.error('Unexpected early access check error', {
      service: 'early-access',
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { eligible: false, role: null, cohortLimit: null, reason: 'error' };
  }
}
