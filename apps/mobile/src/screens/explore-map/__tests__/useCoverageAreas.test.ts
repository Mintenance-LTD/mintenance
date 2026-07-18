import { mapCoverageAreas } from '../useCoverageAreas';

describe('mapCoverageAreas', () => {
  it('keeps active rows with usable center + radius, primary first', () => {
    const areas = mapCoverageAreas([
      {
        id: 'secondary',
        center_latitude: '51.9',
        center_longitude: '-2.07',
        radius_km: '10',
        is_active: true,
        is_primary_area: false,
      },
      {
        id: 'primary',
        center_latitude: 52.2,
        center_longitude: -2.1,
        radius_km: 15,
        is_active: true,
        is_primary_area: true,
      },
    ]);
    expect(areas.map((a) => a.id)).toEqual(['primary', 'secondary']);
    expect(areas[1]).toEqual({
      id: 'secondary',
      centerLatitude: 51.9,
      centerLongitude: -2.07,
      radiusKm: 10,
      isPrimary: false,
    });
  });

  it('prefers max_distance_km over radius_km (matches the notify RPC)', () => {
    const areas = mapCoverageAreas([
      {
        id: 'a',
        center_latitude: 51.9,
        center_longitude: -2.07,
        radius_km: 10,
        max_distance_km: 30,
        is_active: true,
      },
    ]);
    expect(areas[0].radiusKm).toBe(30);
  });

  it('drops inactive rows and rows without usable geometry', () => {
    const areas = mapCoverageAreas([
      {
        id: 'inactive',
        center_latitude: 51.9,
        center_longitude: -2.07,
        radius_km: 10,
        is_active: false,
      },
      { id: 'no-center', radius_km: 10, is_active: true },
      {
        id: 'zero-radius',
        center_latitude: 51.9,
        center_longitude: -2.07,
        radius_km: 0,
        is_active: true,
      },
    ]);
    expect(areas).toEqual([]);
  });
});
