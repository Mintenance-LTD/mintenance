import {
  DEFAULT_MATCH_RADIUS_KM,
  MAX_DISCOVER_RADIUS_KM,
  radiusKmForRegion,
} from '../constants';

describe('radiusKmForRegion', () => {
  it('floors at the platform default for the initial zoom level', () => {
    // Default region: latitudeDelta 0.15 ≈ 8.4km half-height — the
    // floor keeps the first-load feed identical to the old fixed 25.
    expect(
      radiusKmForRegion({
        latitude: 51.5,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      })
    ).toBe(DEFAULT_MATCH_RADIUS_KM);
  });

  it('expands with a zoomed-out viewport (half of the larger axis)', () => {
    // latitudeDelta 2 → half-height ≈ 111.3km → ceil 112.
    expect(
      radiusKmForRegion({ latitude: 51.5, latitudeDelta: 2, longitudeDelta: 1 })
    ).toBe(112);
  });

  it('uses the wider axis when longitude dominates', () => {
    // At lat 0, lngDelta 3 → half-width ≈ 167km > half-height 55.7km.
    expect(
      radiusKmForRegion({ latitude: 0, latitudeDelta: 1, longitudeDelta: 3 })
    ).toBe(Math.ceil((3 * 111.32) / 2));
  });

  it('caps at the discover schema max', () => {
    expect(
      radiusKmForRegion({
        latitude: 51.5,
        latitudeDelta: 50,
        longitudeDelta: 50,
      })
    ).toBe(MAX_DISCOVER_RADIUS_KM);
  });

  it('falls back to the default when deltas are missing or invalid', () => {
    expect(radiusKmForRegion({ latitude: 51.5 })).toBe(DEFAULT_MATCH_RADIUS_KM);
    expect(
      radiusKmForRegion({
        latitude: 51.5,
        latitudeDelta: Number.NaN,
        longitudeDelta: 0.15,
      })
    ).toBe(DEFAULT_MATCH_RADIUS_KM);
  });
});
