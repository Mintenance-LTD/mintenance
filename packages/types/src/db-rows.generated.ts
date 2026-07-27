/**
 * GENERATED database row types — DO NOT hand-edit column lists.
 *
 * Source of truth for snake_case column names and nullability of the tables
 * that mobile services read via direct Supabase queries. Generated from the
 * LIVE Supabase schema (project ukrjudtlvapiajkjbcrd) on 2026-07-27 via the
 * Supabase MCP:
 *
 *   SELECT table_name, column_name, data_type, is_nullable
 *   FROM information_schema.columns
 *   WHERE table_schema='public' AND table_name IN (…)
 *   ORDER BY table_name, ordinal_position;
 *
 * Type mapping: uuid/text/varchar → string · numeric/integer → number ·
 * boolean → boolean · timestamptz → string (ISO) · jsonb → Record<string,
 * unknown>. `is_nullable=YES` → `| null`.
 *
 * Purpose (audit 2026-07-27): mobile services previously cast Supabase rows
 * to Record<string, unknown> and re-cast field-by-field, so a renamed or
 * imagined column (blocking_reasons vs release_blocked_reason,
 * job_completed_at) read as silent `undefined` in production. Typing rows
 * with these interfaces makes an unknown column a COMPILE-TIME error.
 * Regenerate by re-running the query above whenever a migration touches
 * these tables.
 */

/** public.escrow_transactions — live schema 2026-07-27 (63 columns) */
export interface EscrowTransactionRow {
  id: string;
  job_id: string | null;
  payer_id: string;
  payee_id: string;
  amount: number;
  status: string;
  payment_intent_id: string | null;
  released_at: string | null;
  refunded_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  dispute_priority: string | null;
  escalation_level: number | null;
  sla_deadline: string | null;
  mediation_requested: boolean | null;
  mediation_requested_by: string | null;
  mediation_requested_at: string | null;
  mediation_scheduled_at: string | null;
  mediation_status: string | null;
  mediation_mediator_id: string | null;
  mediation_outcome: string | null;
  mediation_completed_at: string | null;
  auto_release_enabled: boolean | null;
  auto_release_date: string | null;
  photo_verification_status: string | null;
  photo_verification_score: number | null;
  risk_hold_extended: boolean | null;
  risk_hold_reason: string | null;
  transfer_id: string | null;
  release_reason: string | null;
  metadata: Record<string, unknown> | null;
  fee_transfer_status: string | null;
  fee_transfer_id: string | null;
  fee_transferred_at: string | null;
  fee_hold_reason: string | null;
  payment_type: string | null;
  platform_fee: number | null;
  contractor_payout: number | null;
  stripe_processing_fee: number | null;
  admin_hold_status: string | null;
  admin_hold_reason: string | null;
  admin_hold_at: string | null;
  admin_hold_by: string | null;
  admin_approved_at: string | null;
  homeowner_approval: boolean | null;
  homeowner_approval_at: string | null;
  homeowner_inspection_completed: boolean | null;
  homeowner_inspection_at: string | null;
  auto_approval_date: string | null;
  cooling_off_ends_at: string | null;
  dispute_window_ends_at: string | null;
  release_blocked_reason: string | null;
  trust_score: number | null;
  photo_quality_passed: boolean | null;
  geolocation_verified: boolean | null;
  timestamp_verified: boolean | null;
  before_after_comparison_score: number | null;
  stripe_charge_id: string | null;
  stripe_checkout_session_id: string | null;
  reconciliation_id: string | null;
  transfer_attempted_at: string | null;
  description: string | null;
  currency: string;
}

/** public.contracts — live schema 2026-07-27 (21 columns) */
export interface ContractRow {
  id: string;
  job_id: string;
  contractor_id: string;
  homeowner_id: string;
  status: string | null;
  terms: Record<string, unknown> | null;
  title: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  amount: number;
  contractor_signed_at: string | null;
  homeowner_signed_at: string | null;
  contract_version: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  contractor_company_name: string | null;
  contractor_license_registration: string | null;
  contractor_license_type: string | null;
  quote_id: string | null;
}
