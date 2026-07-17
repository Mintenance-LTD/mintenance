// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { calculateDiscoverMatchScore } from '../discover-match';

const NOW = Date.parse('2026-07-17T12:00:00Z');
const daysAgo = (d: number) =>
  new Date(NOW - d * 24 * 60 * 60 * 1000).toISOString();

describe('calculateDiscoverMatchScore', () => {
  it('scores 100 for a full match (skill + city + budget + priority + fresh)', () => {
    const score = calculateDiscoverMatchScore(
      {
        category: 'Plumbing',
        property: { address: '1 High St, Cheltenham' },
        budget: 6000,
        priority: 'high',
        created_at: daysAgo(0),
      },
      ['plumbing'],
      'Cheltenham',
      NOW
    );
    expect(score).toBe(100); // 50+40+20+15+10+5 clamped to 100
  });

  it('gives the base 50 for a bare job with no signals', () => {
    const score = calculateDiscoverMatchScore(
      { category: null, property: null, created_at: daysAgo(30) },
      [],
      null,
      NOW
    );
    expect(score).toBe(50);
  });

  it('gives partial skill credit when skills exist but none match', () => {
    const score = calculateDiscoverMatchScore(
      { category: 'Roofing', property: null, created_at: daysAgo(30) },
      ['plumbing'],
      null,
      NOW
    );
    expect(score).toBe(60); // 50 + 10 partial
  });

  it('gives partial location credit for a non-matching city', () => {
    const score = calculateDiscoverMatchScore(
      {
        category: null,
        property: { address: '1 High St, Gloucester' },
        created_at: daysAgo(30),
      },
      [],
      'Cheltenham',
      NOW
    );
    expect(score).toBe(55); // 50 + 5 partial
  });

  it('grades budget bands and recency bonuses', () => {
    const base = {
      category: null,
      property: null,
    };
    expect(
      calculateDiscoverMatchScore(
        { ...base, budget: 500, created_at: daysAgo(30) },
        [],
        null,
        NOW
      )
    ).toBe(55); // low-value +5
    expect(
      calculateDiscoverMatchScore(
        { ...base, budget: 2000, created_at: daysAgo(2) },
        [],
        null,
        NOW
      )
    ).toBe(63); // medium +10, 2-days-old +3
  });
});
