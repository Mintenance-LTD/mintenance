if (typeof window !== 'undefined') {
  throw new Error('[ServerOnly] mfa-recovery.ts must not run in the browser');
}

import bcrypt from 'bcryptjs';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { createBackupCodeArray } from './backup-codes';

export async function storeBackupCodes(
  userId: string,
  codes: string[]
): Promise<void> {
  const hashedCodes = await Promise.all(
    codes.map(async (code) => ({
      user_id: userId,
      code_hash: await bcrypt.hash(code, 10),
    }))
  );

  const { error } = await serverSupabase
    .from('mfa_backup_codes')
    .insert(hashedCodes);

  if (error) {
    throw new Error('Failed to store backup codes');
  }
}

export async function verifyBackupCode(
  userId: string,
  code: string
): Promise<{ verified: boolean; requiresNewCodes: boolean }> {
  const { data: backupCodes } = await serverSupabase
    .from('mfa_backup_codes')
    .select('id, code_hash')
    .eq('user_id', userId)
    .is('used_at', null);

  if (!backupCodes || backupCodes.length === 0) {
    return { verified: false, requiresNewCodes: false };
  }

  // Try to match code
  for (const record of backupCodes) {
    const match = await bcrypt.compare(code, record.code_hash);
    if (match) {
      // Mark as used
      await serverSupabase
        .from('mfa_backup_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', record.id);

      // Check if running low on backup codes
      const requiresNewCodes = backupCodes.length <= 2;

      return { verified: true, requiresNewCodes };
    }
  }

  return { verified: false, requiresNewCodes: false };
}

/**
 * Generate new backup codes
 * Should be called when user runs low or after using one
 */
export async function generateBackupCodes(userId: string): Promise<string[]> {
  try {
    // Delete old unused backup codes
    await serverSupabase
      .from('mfa_backup_codes')
      .delete()
      .eq('user_id', userId)
      .is('used_at', null);

    // Generate new codes
    const backupCodes = createBackupCodeArray();
    await storeBackupCodes(userId, backupCodes);

    logger.info('Backup codes regenerated', {
      service: 'mfa',
      userId,
    });

    return backupCodes;
  } catch (error) {
    logger.error('Failed to generate backup codes', error, {
      service: 'mfa',
      userId,
    });
    throw error;
  }
}
