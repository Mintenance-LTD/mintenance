if (typeof window !== 'undefined') {
  throw new Error(
    '[ServerOnly] mfa-trusted-devices.ts must not run in the browser'
  );
}

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { TRUSTED_DEVICE_DURATION } from './constants';
import { generateSecureToken } from './tokens';
import type { TrustedDeviceData } from './types';

/**
 * Create trusted device token
 * Allows user to skip MFA on this device for 30 days
 */
export async function createTrustedDevice(
  userId: string,
  deviceName?: string,
  deviceFingerprint?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<TrustedDeviceData> {
  try {
    const deviceToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_DURATION);

    const { error } = await serverSupabase.from('trusted_devices').insert({
      user_id: userId,
      device_token: deviceToken,
      device_name: deviceName,
      device_fingerprint: deviceFingerprint,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      logger.error('Failed to create trusted device', error, {
        service: 'mfa',
        userId,
      });
      throw new Error('Failed to create trusted device');
    }

    logger.info('Trusted device created', {
      service: 'mfa',
      userId,
    });

    return { deviceToken, deviceName, expiresAt };
  } catch (error) {
    logger.error('Trusted device creation failed', error, {
      service: 'mfa',
      userId,
    });
    throw error;
  }
}

/**
 * Validate trusted device token
 * Returns user ID if valid, null otherwise.
 * Security: Validates IP address and user agent hash to prevent token theft.
 */
export async function validateTrustedDevice(
  deviceToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string | null> {
  try {
    const { data, error } = await serverSupabase
      .from('trusted_devices')
      .select('user_id, expires_at, ip_address, user_agent')
      .eq('device_token', deviceToken)
      .single();

    if (error || !data) {
      return null;
    }

    // Check expiration
    if (new Date(data.expires_at) < new Date()) {
      // Clean up expired device
      await serverSupabase
        .from('trusted_devices')
        .delete()
        .eq('device_token', deviceToken);
      return null;
    }

    // Security: Validate IP address binding (if stored)
    if (data.ip_address && ipAddress && data.ip_address !== ipAddress) {
      logger.warn('Trusted device IP mismatch — rejecting token', {
        service: 'mfa',
        userId: data.user_id,
        storedIp: data.ip_address,
        requestIp: ipAddress,
      });
      return null;
    }

    // Security: Validate user agent binding (if stored)
    if (data.user_agent && userAgent && data.user_agent !== userAgent) {
      logger.warn('Trusted device user agent mismatch — rejecting token', {
        service: 'mfa',
        userId: data.user_id,
      });
      return null;
    }

    // Update last used timestamp
    await serverSupabase
      .from('trusted_devices')
      .update({ last_used_at: new Date().toISOString() })
      .eq('device_token', deviceToken);

    return data.user_id;
  } catch (error) {
    logger.error('Trusted device validation failed', error, {
      service: 'mfa',
    });
    return null;
  }
}
