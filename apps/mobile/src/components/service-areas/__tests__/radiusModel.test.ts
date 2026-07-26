import {
  clampRadiusMiles,
  defaultExtendedMiles,
  kmToWholeMiles,
  milesToKmForApi,
  ringRadiiPx,
  MIN_RADIUS_MILES,
  MAX_RADIUS_MILES,
} from '../radiusModel';

/**
 * Guards the 2026-07-22 fix. Before it, RadiusRingsCard drew both rings
 * at fixed pixel radii (38 / 70) and the Standard / Extended pills were
 * local state with no writer — so the radius neither saved nor changed
 * the picture. These tests pin both halves.
 */

describe('ringRadiiPx', () => {
  it('grows the standard ring as the standard radius grows', () => {
    const small = ringRadiiPx(3, 20);
    const large = ringRadiiPx(15, 20);
    expect(large.standardPx).toBeGreaterThan(small.standardPx);
  });

  it('no longer returns the old hardcoded pair for every input', () => {
    // The exact bug: these two very different areas used to render
    // identically at 38 / 70.
    expect(ringRadiiPx(2, 4)).not.toEqual(ringRadiiPx(40, 90));
  });

  it('keeps the standard ring inside the extended ring even when equal', () => {
    const { standardPx, extendedPx } = ringRadiiPx(10, 10);
    expect(standardPx).toBeLessThan(extendedPx);
  });

  it('never lets the standard ring collapse into the centre pin', () => {
    const { standardPx } = ringRadiiPx(1, 100);
    expect(standardPx).toBeGreaterThanOrEqual(14);
  });

  it('survives an unset extended reach without dividing by zero', () => {
    const { standardPx, extendedPx } = ringRadiiPx(5, 0);
    expect(Number.isFinite(standardPx)).toBe(true);
    expect(Number.isFinite(extendedPx)).toBe(true);
    expect(standardPx).toBeLessThan(extendedPx);
  });
});

describe('clampRadiusMiles', () => {
  it('stops standard from overtaking extended', () => {
    expect(clampRadiusMiles('standard', 12, 10)).toBe(10);
  });

  it('stops extended from dropping below standard', () => {
    expect(clampRadiusMiles('extended', 4, 8)).toBe(8);
  });

  it('honours the absolute bounds', () => {
    expect(clampRadiusMiles('standard', 0, 50)).toBe(MIN_RADIUS_MILES);
    expect(clampRadiusMiles('extended', 999, 5)).toBe(MAX_RADIUS_MILES);
  });

  it('stays in range even if the counterpart is itself out of range', () => {
    const result = clampRadiusMiles('standard', 50, 500);
    expect(result).toBeGreaterThanOrEqual(MIN_RADIUS_MILES);
    expect(result).toBeLessThanOrEqual(MAX_RADIUS_MILES);
  });
});

describe('milesToKmForApi', () => {
  it('round-trips back to the same whole mile the user picked', () => {
    // The screen renders kmToWholeMiles(radius_km); if conversion drifted
    // the saved value would redisplay as a different number.
    for (let miles = MIN_RADIUS_MILES; miles <= MAX_RADIUS_MILES; miles++) {
      expect(kmToWholeMiles(milesToKmForApi(miles))).toBe(miles);
    }
  });

  it('stays inside the API schema window of 1..200 km', () => {
    expect(milesToKmForApi(MIN_RADIUS_MILES)).toBeGreaterThanOrEqual(1);
    expect(milesToKmForApi(MAX_RADIUS_MILES)).toBeLessThanOrEqual(200);
  });
});

describe('defaultExtendedMiles', () => {
  it('reproduces the 6 mi -> 10 mi pairing seen on the live row', () => {
    // Live data: radius_km = 10.00, max_distance_km = NULL.
    expect(kmToWholeMiles(10)).toBe(6);
    expect(defaultExtendedMiles(6)).toBe(10);
  });

  it('always exceeds the standard radius', () => {
    for (const standard of [1, 5, 25, 60, 99, 100]) {
      expect(defaultExtendedMiles(standard)).toBeGreaterThanOrEqual(standard);
    }
  });
});
