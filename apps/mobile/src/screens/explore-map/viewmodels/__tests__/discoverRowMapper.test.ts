import {
  mapDiscoverRows,
  toNum,
  calculateDistance,
  type DiscoverRow,
} from '../discoverRowMapper';

// Cheltenham-ish reference point, matching the live test data.
const REF_LAT = 51.9;
const REF_LNG = -2.07;

function row(overrides: Partial<DiscoverRow> = {}): DiscoverRow {
  return {
    id: 'job-1',
    title: 'Leaky tap',
    category: 'plumbing',
    urgency: 'medium',
    budget: 100,
    budget_min: null,
    budget_max: null,
    latitude: 51.9,
    longitude: -2.07,
    created_at: '2026-07-01T12:00:00Z',
    homeowner_first_name: 'Djodjo',
    ...overrides,
  };
}

describe('toNum()', () => {
  it('passes finite numbers through and coerces numeric strings', () => {
    expect(toNum(12)).toBe(12);
    expect(toNum('51.90112160')).toBeCloseTo(51.9011216);
  });

  it('returns null for null/undefined/unparseable — never 0', () => {
    // Number(null) === 0, which would put a pin in the Atlantic.
    expect(toNum(null)).toBeNull();
    expect(toNum(undefined)).toBeNull();
    expect(toNum('nan')).toBeNull();
  });
});

describe('mapDiscoverRows()', () => {
  it('coerces string NUMERIC columns to real numbers', () => {
    const [job] = mapDiscoverRows(
      [row({ latitude: '51.91', longitude: '-2.08', budget: '250' })],
      REF_LAT,
      REF_LNG
    );
    expect(typeof job.latitude).toBe('number');
    expect(typeof job.longitude).toBe('number');
    expect(job.budget).toBe(250);
  });

  it('drops rows without usable coordinates (would crash native Marker)', () => {
    const mapped = mapDiscoverRows(
      [row({ id: 'a', latitude: null }), row({ id: 'b', longitude: 'nan' })],
      REF_LAT,
      REF_LNG
    );
    expect(mapped).toHaveLength(0);
  });

  it('sorts by proximity to the reference point', () => {
    const mapped = mapDiscoverRows(
      [
        row({ id: 'far', latitude: 52.5, longitude: -2.07 }),
        row({ id: 'near', latitude: 51.905, longitude: -2.07 }),
      ],
      REF_LAT,
      REF_LNG
    );
    expect(mapped.map((j) => j.id)).toEqual(['near', 'far']);
  });

  it('surfaces the server match score and AI flag', () => {
    const [job] = mapDiscoverRows(
      [row({ match_score: 92, has_ai_assessment: true })],
      REF_LAT,
      REF_LNG
    );
    expect(job.matchScore).toBe(92);
    expect(job.hasAiAssessment).toBe(true);
  });

  it('leaves matchScore null when an older API omits it (no misleading 0%)', () => {
    const [job] = mapDiscoverRows([row()], REF_LAT, REF_LNG);
    expect(job.matchScore).toBeNull();
    expect(job.hasAiAssessment).toBe(false);
  });

  it('falls back for absent category/urgency/homeowner', () => {
    const [job] = mapDiscoverRows(
      [row({ category: '', urgency: '', homeowner_first_name: null })],
      REF_LAT,
      REF_LNG
    );
    expect(job.category).toBe('general');
    expect(job.urgency).toBe('medium');
    expect(job.homeowner_name).toBe('Homeowner');
  });

  it('normalises a null created_at to an empty string', () => {
    // The card's timeAgo() renders '' as "Recently posted" rather than NaN.
    const [job] = mapDiscoverRows(
      [row({ created_at: null })],
      REF_LAT,
      REF_LNG
    );
    expect(job.created_at).toBe('');
  });
});

describe('calculateDistance()', () => {
  it('is ~0 for the same point and rounds to 1dp', () => {
    expect(calculateDistance(REF_LAT, REF_LNG, REF_LAT, REF_LNG)).toBe(0);
    const d = calculateDistance(51.9, -2.07, 51.99, -2.07);
    expect(d).toBeGreaterThan(9);
    expect(d).toBeLessThan(11);
    expect(Number.isInteger(d * 10)).toBe(true);
  });
});
