/**
 * Back-pay report for the #6 contractor underpayment (2026-08-03 audit).
 *
 * Before the fix, FeeCalculationService paid contractors
 *   amount - platformFee - stripeFee
 * but the platform is meant to absorb the Stripe fee ("a percentage platform
 * fee only"), so the correct payout is
 *   amount - platformFee.
 * Every released/completed escrow therefore underpaid the contractor by exactly
 * its `stripe_processing_fee`. This script quantifies what each contractor is
 * owed so finance can review and action it.
 *
 * READ-ONLY. It moves no money and writes nothing — issuing back-pay is a
 * deliberate human/finance step (and Stripe transfers are out of scope here).
 *
 * Usage:
 *   npx tsx scripts/report-contractor-stripe-fee-backpay.ts
 *   # only escrows released before the fix deploy (recommended once deployed):
 *   BACKPAY_BEFORE=2026-08-10T00:00:00Z npx tsx scripts/report-contractor-stripe-fee-backpay.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '❌ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.'
  );
  process.exit(1);
}

// Only escrows paid out under the OLD formula are underpaid. Once the fix is
// deployed, pass BACKPAY_BEFORE=<deploy ISO timestamp> so newly-correct
// releases are excluded. Unset = include all released/completed escrows.
const BEFORE = process.env.BACKPAY_BEFORE;

const RELEASED_STATUSES = ['released', 'completed'];
const PAGE = 1000;

interface EscrowRow {
  payee_id: string | null;
  stripe_processing_fee: number | null;
  released_at: string | null;
}

interface Owed {
  contractorId: string;
  escrowCount: number;
  totalOwed: number;
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fetchEscrows(): Promise<EscrowRow[]> {
  const rows: EscrowRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from('escrow_transactions')
      .select('payee_id, stripe_processing_fee, released_at')
      .in('status', RELEASED_STATUSES)
      .not('stripe_processing_fee', 'is', null)
      .range(from, from + PAGE - 1);
    if (BEFORE) query = query.lte('released_at', BEFORE);

    const { data, error } = await query;
    if (error) throw new Error(`escrow query failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as EscrowRow[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function main(): Promise<void> {
  console.log(
    `📊 Contractor Stripe-fee back-pay report${BEFORE ? ` (released ≤ ${BEFORE})` : ' (all released/completed)'}\n`
  );

  const escrows = await fetchEscrows();
  const byContractor = new Map<string, Owed>();
  let grandTotal = 0;

  for (const e of escrows) {
    if (!e.payee_id) continue;
    const fee = Number(e.stripe_processing_fee) || 0;
    if (fee <= 0) continue;
    const acc = byContractor.get(e.payee_id) ?? {
      contractorId: e.payee_id,
      escrowCount: 0,
      totalOwed: 0,
    };
    acc.escrowCount += 1;
    acc.totalOwed = round2(acc.totalOwed + fee);
    byContractor.set(e.payee_id, acc);
    grandTotal = round2(grandTotal + fee);
  }

  const owed = [...byContractor.values()].sort(
    (a, b) => b.totalOwed - a.totalOwed
  );

  // Resolve contractor emails for the report (best-effort).
  const emailById = new Map<string, string>();
  const ids = owed.map((o) => o.contractorId);
  for (let i = 0; i < ids.length; i += 500) {
    const slice = ids.slice(i, i + 500);
    const { data } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', slice);
    for (const p of data ?? []) emailById.set(p.id, p.email ?? '');
  }

  console.log('contractor_id,email,escrows,total_owed_gbp');
  for (const o of owed) {
    console.log(
      `${o.contractorId},${emailById.get(o.contractorId) ?? ''},${o.escrowCount},${o.totalOwed.toFixed(2)}`
    );
  }

  console.log(
    `\n${owed.length} contractors underpaid across ${escrows.length} escrows.` +
      `\nTOTAL back-pay owed: £${grandTotal.toFixed(2)}`
  );
  console.log(
    '\nℹ️  Report only. Issue back-pay via your finance/Stripe process after review.'
  );
}

main().catch((err) => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
