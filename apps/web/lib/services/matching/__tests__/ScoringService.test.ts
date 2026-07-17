// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import type { ContractorProfile } from '@mintenance/types';
import type { ContractorEngagementStats, MatchingCriteria } from '../types';
import { ScoringService } from '../ScoringService';

function makeContractor(
  overrides?: Partial<ContractorProfile>
): ContractorProfile {
  return {
    id: 'c-1',
    email: 'jane@x.com',
    first_name: 'Jane',
    last_name: 'Doe',
    role: 'contractor',
    skills: [
      { id: 's1', contractorId: 'c-1', skillName: 'plumbing', createdAt: '' },
    ],
    reviews: [],
    serviceRadius: 25,
    distance: 5,
    hourlyRate: 75,
    availability: 'this_week',
    yearsExperience: 10,
    ...overrides,
  } as unknown as ContractorProfile;
}

function makeCriteria(overrides?: Partial<MatchingCriteria>): MatchingCriteria {
  return {
    jobId: 'job-1',
    location: { latitude: 51.9, longitude: -2.07, maxDistance: 50 },
    budget: { min: 50, max: 100 },
    urgency: 'normal',
    requiredSkills: ['plumbing'],
    projectComplexity: 'simple',
    timeframe: 'this_week',
    ...overrides,
  };
}

function stats(
  overrides?: Partial<ContractorEngagementStats>
): ContractorEngagementStats {
  return {
    recentWins: 0,
    daysSinceLastWin: null,
    avgBidResponseHours: null,
    ...overrides,
  };
}

describe('ScoringService.calculateMatchScore — fairness term', () => {
  it('is neutral (50) when no engagement stats are provided', async () => {
    const score = await ScoringService.calculateMatchScore(
      makeContractor(),
      makeCriteria()
    );
    expect(score.fairness).toBe(50);
  });

  it('maxes out (100) for a contractor with no recent wins and no win history', async () => {
    const score = await ScoringService.calculateMatchScore(
      makeContractor(),
      makeCriteria(),
      undefined,
      stats()
    );
    expect(score.fairness).toBe(100);
  });

  it('bottoms out (0) for a contractor with 4+ wins this window who just won', async () => {
    const score = await ScoringService.calculateMatchScore(
      makeContractor(),
      makeCriteria(),
      undefined,
      stats({ recentWins: 4, daysSinceLastWin: 0 })
    );
    expect(score.fairness).toBe(0);
  });

  it('ranks an idle contractor above an equally-matched busy one', async () => {
    const idle = await ScoringService.calculateMatchScore(
      makeContractor(),
      makeCriteria(),
      undefined,
      stats({ recentWins: 0, daysSinceLastWin: 45 })
    );
    const busy = await ScoringService.calculateMatchScore(
      makeContractor(),
      makeCriteria(),
      undefined,
      stats({ recentWins: 3, daysSinceLastWin: 1 })
    );
    expect(idle.overallScore).toBeGreaterThan(busy.overallScore);
  });
});

describe('ScoringService.calculateMatchScore — responsiveness', () => {
  const cases: Array<[number | null, number]> = [
    [null, 65], // no bid history → neutral
    [0.5, 100],
    [3, 90],
    [10, 80],
    [20, 65],
    [30, 45],
    [72, 30],
  ];

  it.each(cases)('avg %s hours → %s', async (avgHours, expected) => {
    const score = await ScoringService.calculateMatchScore(
      makeContractor(),
      makeCriteria(),
      undefined,
      stats({ avgBidResponseHours: avgHours })
    );
    expect(score.responsiveness).toBe(expected);
  });
});

describe('ScoringService.calculateMatchScore — paid tier boosts preserved', () => {
  it('adds +5 for professional and +10 for enterprise over basic', async () => {
    // distance 40 keeps the base score low enough that even the +10
    // enterprise boost stays under the 100 clamp (deltas observable).
    const contractor = makeContractor({ distance: 40 });
    const criteria = makeCriteria();
    const s = stats();

    const basic = await ScoringService.calculateMatchScore(
      contractor,
      criteria,
      'basic',
      s
    );
    const pro = await ScoringService.calculateMatchScore(
      contractor,
      criteria,
      'professional',
      s
    );
    const enterprise = await ScoringService.calculateMatchScore(
      contractor,
      criteria,
      'enterprise',
      s
    );

    expect(pro.overallScore).toBe(basic.overallScore + 5);
    expect(enterprise.overallScore).toBe(basic.overallScore + 10);
  });
});
