// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { radiusPairError } from '../[id]/radius-pair';

/**
 * `max_distance_km` became writable on 2026-07-22 so the mobile Service
 * Areas screen could persist its Extended threshold (it previously
 * displayed a derived number that no column backed).
 *
 * The ordering rule is checked against the merged row, which is the part
 * worth pinning: a PATCH carrying only one of the two fields must still
 * be judged against the value already stored.
 */

describe('radiusPairError', () => {
  it('accepts a consistent pair', () => {
    expect(
      radiusPairError(
        { radius_km: 10, max_distance_km: 16 },
        { radius_km: 10, max_distance_km: null }
      )
    ).toBeNull();
  });

  it('rejects an extended reach inside the standard radius', () => {
    expect(
      radiusPairError(
        { radius_km: 20, max_distance_km: 16 },
        { radius_km: 10, max_distance_km: 16 }
      )
    ).toMatch(/greater than or equal/);
  });

  it('catches a lone max_distance_km that undercuts the stored radius', () => {
    // Body-only validation would have waved this through.
    expect(
      radiusPairError(
        { max_distance_km: 5 },
        { radius_km: 10, max_distance_km: 16 }
      )
    ).toMatch(/greater than or equal/);
  });

  it('catches a lone radius_km that overtakes the stored max', () => {
    expect(
      radiusPairError({ radius_km: 30 }, { radius_km: 10, max_distance_km: 16 })
    ).toMatch(/greater than or equal/);
  });

  it('allows equal thresholds', () => {
    expect(
      radiusPairError({ radius_km: 16 }, { radius_km: 10, max_distance_km: 16 })
    ).toBeNull();
  });

  it('stays quiet when the row has no extended reach yet', () => {
    // Every live row had max_distance_km NULL before this shipped, so a
    // radius-only PATCH must not start failing.
    expect(
      radiusPairError(
        { radius_km: 25 },
        { radius_km: 10, max_distance_km: null }
      )
    ).toBeNull();
  });

  it('leaves an unrelated patch alone even if the stored pair is inconsistent', () => {
    // Renaming an area must not fail because of thresholds the caller
    // never touched — that would leave the row uneditable from the app.
    expect(
      radiusPairError({}, { radius_km: 10, max_distance_km: 5 })
    ).toBeNull();
  });
});
