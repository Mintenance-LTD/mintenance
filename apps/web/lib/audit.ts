/**
 * Audit logging helper for sensitive operations.
 *
 * Sprint 5.7 (2026-04-13 audit remediation): the audit found that MFA
 * enrollment, role changes, admin actions, escrow manual decisions, and
 * contract signatures had no central audit trail. Each writer now calls
 * `logAuditEvent` so security incidents can be reconstructed from one
 * table (`public.audit_logs`).
 *
 * Schema (already in DB):
 *   id          uuid PRIMARY KEY
 *   user_id     uuid (the actor — the person performing the action)
 *   table_name  text (logical category, e.g. 'mfa', 'admin_action', 'escrow_decision')
 *   record_id   uuid (target entity id; null for non-entity actions like login)
 *   action      text (verb, e.g. 'enroll_totp', 'disable_totp', 'role_change', 'escrow_release')
 *   old_values  jsonb (state before the change)
 *   new_values  jsonb (state after the change, plus any extra context)
 *   ip_address  inet
 *   created_at  timestamptz
 *
 * Failures are logged but do NOT throw — the audit log is observability,
 * not a transaction guard. If a sensitive operation succeeds but the audit
 * write fails, ops sees a logger.error and the operation still completes.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import type { NextRequest } from 'next/server';
import { getClientIp as getTrustedClientIp } from '@/lib/request-ip';

export interface AuditEvent {
  /** The user performing the action (null for system/cron actions) */
  actorId: string | null;
  /** Logical category, e.g. 'mfa', 'admin_action', 'escrow_decision' */
  category: string;
  /** Verb describing the action, e.g. 'enroll_totp', 'role_change' */
  action: string;
  /** Target entity id (e.g. the escrow id, the affected user id). Optional. */
  targetId?: string | null;
  /** State before the change. Optional. */
  before?: Record<string, unknown> | null;
  /** State after the change, plus any extra context (reason, decision metadata). */
  after?: Record<string, unknown> | null;
  /** Client IP, usually extracted from the request headers. */
  ipAddress?: string | null;
}

/**
 * Extract a client IP from a Next.js request, falling back to null.
 * Use this when calling logAuditEvent from inside a route handler.
 */
export function getClientIp(request: NextRequest): string | null {
  const ip = getTrustedClientIp(request);
  return ip === 'unknown' ? null : ip;
}

/**
 * Write a row to public.audit_logs. Best-effort: failures log but never throw.
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const { error } = await serverSupabase.from('audit_logs').insert({
      user_id: event.actorId,
      table_name: event.category,
      record_id: event.targetId ?? null,
      action: event.action,
      old_values: event.before ?? null,
      new_values: event.after ?? null,
      ip_address: event.ipAddress ?? null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      logger.error('Failed to write audit log entry', error, {
        service: 'audit',
        category: event.category,
        action: event.action,
        targetId: event.targetId,
      });
    }
  } catch (error) {
    logger.error('Exception writing audit log entry', error, {
      service: 'audit',
      category: event.category,
      action: event.action,
    });
  }
}
