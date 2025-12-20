/**
 * Admin Verification Utilities
 * 
 * Provides database-backed verification of admin role for sensitive operations.
 * This prevents privilege escalation if JWT tokens are compromised.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Verify admin role from database (not just JWT)
 * Use this for sensitive admin operations like:
 * - Escrow releases
 * - User verification
 * - Platform settings changes
 * - Financial operations
 */
export async function verifyAdminRoleFromDatabase(userId: string): Promise<boolean> {
  try {
    const { data, error } = await serverSupabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .eq('role', 'admin')
      .single();

    if (error || !data) {
      logger.warn('Admin role verification failed', {
        service: 'admin-verification',
        userId,
        error: error?.message,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error verifying admin role from database', error, {
      service: 'admin-verification',
      userId,
    });
    return false;
  }
}

/**
 * Verify admin role and throw if not admin
 * Use this in admin endpoints that require database verification
 */
export async function requireAdminFromDatabase(userId: string): Promise<void> {
  const isAdmin = await verifyAdminRoleFromDatabase(userId);
  if (!isAdmin) {
    throw new Error('Unauthorized - admin access required');
  }
}

