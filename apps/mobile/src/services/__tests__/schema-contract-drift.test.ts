/**
 * Schema/contract drift guard (audit 2026-07-27).
 *
 * Mobile escrow/payment services used to cast Supabase rows to
 * Record<string, unknown> and hand-cast per field, so a renamed column read
 * as silent `undefined` in production (blocking_reasons vs
 * release_blocked_reason; the phantom job_completed_at), and a request body
 * missing a newly-required field 400'd only at the API boundary
 * (contractorId in create-intent).
 *
 * This file makes both drift classes fail BEFORE production:
 *
 *  1. TYPE LEVEL (enforced by `tsc --noEmit`, which CI runs): the column
 *     names the services depend on are asserted against the generated
 *     EscrowTransactionRow, and known-bad names carry @ts-expect-error —
 *     if the generated type ever loosens to accept them, typecheck FAILS.
 *  2. RUNTIME: the actual request-body builder the services use is parsed
 *     with the SHARED @mintenance/api-contracts schema — the same shape the
 *     web validator enforces.
 *
 * When a migration renames a column: regenerate db-rows.generated.ts (see
 * its header), and every stale read becomes a compile error.
 */

import type { EscrowTransactionRow } from '@mintenance/types';
import {
  MAX_JOB_PAYMENT_GBP,
  paymentIntentRequestSchema,
} from '@mintenance/api-contracts';
import { buildCreateIntentBody } from '../payment/PaymentIntentService';

// ---------------------------------------------------------------------------
// 1. Type-level column assertions (verified by tsc, executed as a no-op)
// ---------------------------------------------------------------------------

/**
 * Every escrow column EscrowService reads. If a migration drops/renames one
 * and db-rows.generated.ts is regenerated, this list stops compiling — the
 * drift is caught at typecheck, not by a runtime audit.
 */
const ESCROW_COLUMNS_READ_BY_MOBILE: ReadonlyArray<keyof EscrowTransactionRow> =
  [
    'id',
    'status',
    'amount',
    'job_id',
    'release_blocked_reason',
    'auto_release_date',
    'homeowner_approval',
    'homeowner_approval_at',
    'auto_approval_date',
    'admin_hold_status',
    'photo_verification_status',
    'cooling_off_ends_at',
    'trust_score',
    'created_at',
    'released_at',
  ];

// Negative controls: the two column names whose non-existence caused the
// original production bugs. If these ever compile, the generated type has
// regressed to something permissive and the guard is dead.
// @ts-expect-error -- 'blocking_reasons' does not exist in the live schema
const _neverBlockingReasons: keyof EscrowTransactionRow = 'blocking_reasons';
// @ts-expect-error -- 'job_completed_at' does not exist on escrow_transactions
const _neverJobCompletedAt: keyof EscrowTransactionRow = 'job_completed_at';
// @ts-expect-error -- 'estimated_release_date' does not exist in the live schema
const _neverEstimatedRelease: keyof EscrowTransactionRow =
  'estimated_release_date';

describe('generated escrow row type', () => {
  it('contains every column the mobile services read', () => {
    // The real assertion is the type annotation above; this keeps the list
    // referenced so it cannot be tree-shaken/linted away.
    expect(ESCROW_COLUMNS_READ_BY_MOBILE.length).toBeGreaterThan(0);
    expect(new Set(ESCROW_COLUMNS_READ_BY_MOBILE).size).toBe(
      ESCROW_COLUMNS_READ_BY_MOBILE.length
    );
  });
});

// ---------------------------------------------------------------------------
// 2. Runtime contract: create-intent body vs the SHARED api-contract schema
// ---------------------------------------------------------------------------

describe('create-intent body vs shared api-contract', () => {
  const VALID = {
    jobId: '11111111-1111-4111-8111-111111111111',
    contractorId: '22222222-2222-4222-8222-222222222222',
    amount: 350,
  };

  it('the body the service actually builds satisfies the shared schema', () => {
    const body = buildCreateIntentBody({
      ...VALID,
      paymentMethodId: 'pm_123abc',
    });

    const parsed = paymentIntentRequestSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    // Compat key survives for shipped-build parity (see B2 strict rollout).
    expect(body.paymentMethodId).toBe('pm_123abc');
    // Server-side default is materialised client-side too.
    expect(body.currency).toBe('gbp');
  });

  it('a contractorId-less body FAILS the shared schema (the audit-19 P1 bug class)', () => {
    const { contractorId: _omitted, ...withoutContractor } = VALID;
    const parsed = paymentIntentRequestSchema.safeParse(withoutContractor);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.some((i) => i.path.includes('contractorId'))
      ).toBe(true);
    }
  });

  it('rejects amounts over the server validator cap with a readable error', () => {
    expect(() =>
      buildCreateIntentBody({
        ...VALID,
        amount: MAX_JOB_PAYMENT_GBP + 0.01,
      })
    ).toThrow(/amount/i);
  });

  it('rejects a malformed job UUID before any network call', () => {
    expect(() =>
      buildCreateIntentBody({ ...VALID, jobId: 'not-a-uuid' })
    ).toThrow(/jobId/);
  });

  it('rounds amounts the same way the server does', () => {
    const body = buildCreateIntentBody({ ...VALID, amount: 99.999 });
    expect(body.amount).toBe(100);
  });
});
