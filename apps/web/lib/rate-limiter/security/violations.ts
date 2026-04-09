import { logger } from '@mintenance/shared';
import type { RateLimitTier } from '../../constants/rate-limits';

/**
 * Log rate limit violation to structured logger + persist to security_events.
 */
export async function logViolation(
  path: string,
  identifier: string,
  tier: RateLimitTier,
  attempts: number,
  limit: number
): Promise<void> {
  const severity: 'medium' | 'high' = attempts > limit * 2 ? 'high' : 'medium';
  logger.warn('Rate limit exceeded', {
    service: 'rate-limiter',
    path,
    identifier,
    tier,
    attempts,
    limit,
    severity,
  });
  void persistSecurityEvent({
    event_type: 'suspicious_activity',
    severity,
    identifier,
    details: {
      kind: 'rate_limit_exceeded',
      path,
      tier,
      attempts,
      limit,
      overage_factor: +(attempts / limit).toFixed(2),
    },
  });
}

/**
 * Handle potential DDoS attack — log at CRITICAL, persist security event.
 */
export async function handlePotentialDDoS(
  identifier: string,
  path: string,
  attempts: number
): Promise<void> {
  logger.error('[SECURITY] Potential DDoS detected', {
    service: 'rate-limiter',
    identifier,
    path,
    attempts,
    severity: 'CRITICAL',
  });
  void persistSecurityEvent({
    event_type: 'suspicious_activity',
    severity: 'critical',
    identifier,
    details: { kind: 'ddos_suspected', path, attempts },
  });
}

/**
 * Persist a security event to Supabase. Fire-and-forget — never throws.
 */
async function persistSecurityEvent(event: {
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  identifier: string;
  details: Record<string, unknown>;
}): Promise<void> {
  try {
    const { serverSupabase } = await import('../../api/supabaseServer');
    const [kind, value] = event.identifier.split(':');
    const ip_address = kind === 'ip' ? value : null;
    const user_id = kind === 'user' ? value : null;
    await serverSupabase.from('security_events').insert({
      event_type: event.event_type,
      severity: event.severity,
      ip_address,
      user_id,
      details: event.details,
    });
  } catch (err) {
    logger.error('Failed to persist security event', err, {
      service: 'rate-limiter',
    });
  }
}
