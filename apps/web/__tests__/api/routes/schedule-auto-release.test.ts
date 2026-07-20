/**
 * Tests for scheduleAutoReleaseForCompletion — specifically the 2026-07-20
 * addition that stamps the 7-day auto-approval clock and propagates after-photo
 * verification onto the escrow row so the auto-release safety net can clear its
 * own eligibility gate (evaluate.ts gate 2/3).
 *
 * Route helper: apps/web/app/api/jobs/[id]/photos/after/_schedule-auto-release.ts
 *
 * Focus: the money-critical safe default — geolocation_verified must only be
 * true when an after-photo actually carries within-threshold geo proof; a
 * quality-passed but geo-less completion must stamp geolocation_verified=false
 * so evaluate.ts keeps the row on manual-approval-only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  calculateAutoReleaseDate: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: (...a: unknown[]) => mocks.from(...a) },
}));
vi.mock('@mintenance/shared', () => ({ logger: mocks.logger }));
vi.mock('@/lib/services/agents/EscrowReleaseAgent', () => ({
  EscrowReleaseAgent: {
    calculateAutoReleaseDate: mocks.calculateAutoReleaseDate,
  },
}));

import { scheduleAutoReleaseForCompletion } from '@/app/api/jobs/[id]/photos/after/_schedule-auto-release';

interface EscrowRow {
  id: string;
  auto_release_date: string | null;
  auto_approval_date: string | null;
  homeowner_approval: boolean | null;
}
type AfterPhoto = {
  verified: boolean | null;
  geolocation_verified: boolean | null;
};

// Captured escrow UPDATE payloads, in call order.
let escrowUpdates: Array<Record<string, unknown>>;

/**
 * Wire serverSupabase.from() for one run: the escrow read (.single()), the
 * job_photos_metadata read (awaited after .eq()), and any escrow update.
 */
function wire(escrowRow: EscrowRow | null, afterPhotos: AfterPhoto[]) {
  escrowUpdates = [];
  mocks.from.mockImplementation((table: string) => {
    if (table === 'job_photos_metadata') {
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = () => b;
      // awaited directly after the final .eq()
      b.then = (resolve: (v: unknown) => unknown) =>
        resolve({ data: afterPhotos, error: null });
      return b;
    }
    // escrow_transactions — read (single) or update (thenable after .is())
    const b: Record<string, unknown> = { _update: false };
    b.select = () => b;
    b.eq = () => b;
    b.is = () => b;
    b.limit = () => b;
    b.update = (payload: Record<string, unknown>) => {
      b._update = true;
      escrowUpdates.push(payload);
      return b;
    };
    b.single = () => Promise.resolve({ data: escrowRow, error: null });
    b.then = (resolve: (v: unknown) => unknown) =>
      resolve({ data: null, error: null });
    return b;
  });
}

const HELD_UNAPPROVED: EscrowRow = {
  id: 'esc-1',
  auto_release_date: null,
  auto_approval_date: null,
  homeowner_approval: false,
};

beforeEach(() => {
  mocks.calculateAutoReleaseDate.mockResolvedValue(undefined);
});

describe('scheduleAutoReleaseForCompletion — approval clock + verification stamp', () => {
  it('stamps auto_approval_date and verified photo columns when after-photos carry geo proof', async () => {
    wire(HELD_UNAPPROVED, [{ verified: true, geolocation_verified: true }]);

    await scheduleAutoReleaseForCompletion('job-1', 'contractor-1');

    const stamp = escrowUpdates.find((u) => 'auto_approval_date' in u);
    expect(stamp).toBeDefined();
    expect(stamp!.photo_verification_status).toBe('verified');
    expect(stamp!.photo_quality_passed).toBe(true);
    expect(stamp!.geolocation_verified).toBe(true);
    expect(stamp!.timestamp_verified).toBe(true);
    // 7-day clock in the future
    expect(
      new Date(stamp!.auto_approval_date as string).getTime()
    ).toBeGreaterThan(Date.now());
  });

  it('stamps geolocation_verified=false when no after-photo has geo proof (safe default)', async () => {
    wire(HELD_UNAPPROVED, [{ verified: true, geolocation_verified: null }]);

    await scheduleAutoReleaseForCompletion('job-1', 'contractor-1');

    const stamp = escrowUpdates.find((u) => 'auto_approval_date' in u);
    expect(stamp).toBeDefined();
    // quality passed but no location proof -> must NOT be eligible for
    // unattended release; evaluate.ts gate 3 requires geolocation_verified.
    expect(stamp!.photo_quality_passed).toBe(true);
    expect(stamp!.geolocation_verified).toBe(false);
  });

  it('does NOT stamp the approval clock when the homeowner already approved', async () => {
    wire({ ...HELD_UNAPPROVED, homeowner_approval: true }, [
      { verified: true, geolocation_verified: true },
    ]);

    await scheduleAutoReleaseForCompletion('job-1', 'contractor-1');

    expect(
      escrowUpdates.find((u) => 'auto_approval_date' in u)
    ).toBeUndefined();
  });

  it('does NOT re-stamp when auto_approval_date is already set', async () => {
    wire(
      { ...HELD_UNAPPROVED, auto_approval_date: '2026-07-01T00:00:00.000Z' },
      [{ verified: true, geolocation_verified: true }]
    );

    await scheduleAutoReleaseForCompletion('job-1', 'contractor-1');

    expect(
      escrowUpdates.find((u) => 'auto_approval_date' in u)
    ).toBeUndefined();
  });
});
