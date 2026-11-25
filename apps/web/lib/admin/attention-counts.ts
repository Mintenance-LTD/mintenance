import { countVerificationQueue } from './verification-queue';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  ACTIVE_DISPUTE_REVIEW_STATUSES,
  OPEN_DISPUTE_CASE_STATUSES,
} from './dispute-display';

export async function readAdminAttentionCounts() {
  const [overdue, exceptions, readyVerifications] = await Promise.all([
    serverSupabase
      .from('escrow_transactions')
      .select(
        'id,active_case:dispute_escrow_links!inner(disputes!inner(status))',
        { count: 'exact', head: true }
      )
      .in('active_case.disputes.status', OPEN_DISPUTE_CASE_STATUSES)
      .in('admin_hold_status', ACTIVE_DISPUTE_REVIEW_STATUSES)
      .lt('sla_deadline', new Date().toISOString()),
    serverSupabase
      .from('escrow_transactions')
      .select('id', { count: 'exact', head: true })
      .not('metadata->reconciliation_flag', 'is', null)
      .neq('metadata->>reconciliation_flag', 'false'),
    countVerificationQueue('ready'),
  ]);
  return {
    readyVerifications,
    overdueDisputes: overdue.error ? null : overdue.count,
    paymentExceptions: exceptions.error ? null : exceptions.count,
  };
}
