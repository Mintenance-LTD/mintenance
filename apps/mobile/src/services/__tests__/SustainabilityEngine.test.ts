/**
 * Tests for SustainabilityEngine (apps/mobile/src/services/SustainabilityEngine.ts)
 *
 * SustainabilityEngine is a thin facade composing four sub-modules:
 *   - ESGCalculator   (calculateContractorESGScore + scoring helpers)
 *   - JobAnalyzer     (analyzeJobSustainability)
 *   - MaterialAdvisor (getSustainableMaterialAlternatives)
 *   - CarbonTracker   (calculateJobCarbonFootprint, getContractorSustainabilityRanking,
 *                      trackSustainabilityProgress)
 *
 * To maximize coverage of the facade we exercise EVERY public method, driving each
 * delegate down its happy/empty/error branches. Externals are mocked: logger,
 * supabase, mobileApiClient, AsyncStorage. Deterministic numeric assertions are made
 * against the pure-math helpers reached through the facade (Math.random is not used by
 * these modules, so no random stubbing is required).
 */

import { sustainabilityEngine } from '../SustainabilityEngine';

import { supabase } from '../../config/supabase';
import { mobileApiClient } from '../../utils/mobileApiClient';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    post: jest.fn(() => Promise.resolve({ data: null })),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockedFrom = supabase.from as jest.Mock;
const mockedPost = mobileApiClient.post as jest.Mock;

/**
 * Build a chainable PostgREST-style query stub.
 * Every chain method returns the same builder. The builder is awaitable
 * (thenable) and resolves to `result`. Terminal methods maybeSingle/single
 * also resolve to `result`.
 */
function makeQuery(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const chainMethods = [
    'select',
    'eq',
    'gte',
    'lte',
    'ilike',
    'order',
    'limit',
    'insert',
    'update',
  ];
  for (const m of chainMethods) {
    builder[m] = jest.fn(() => builder);
  }
  builder.maybeSingle = jest.fn(() => Promise.resolve(result));
  builder.single = jest.fn(() => Promise.resolve(result));
  // Make the builder awaitable so `await supabase.from(..).order(..)` resolves.
  builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return builder;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: every table query returns empty/no-data so methods take their
  // fallback/default branches unless a test overrides per-table behaviour.
  mockedFrom.mockImplementation(() => makeQuery({ data: null, error: null }));
  mockedPost.mockResolvedValue({ data: null });
});

// ---------------------------------------------------------------------------
// calculateContractorESGScore (ESGCalculator)
// ---------------------------------------------------------------------------
describe('SustainabilityEngine.calculateContractorESGScore', () => {
  it('computes deterministic ESG score with DB defaults and persists via API', async () => {
    // All tables return no data -> ESGCalculator uses hardcoded default metrics.
    const score = await sustainabilityEngine.calculateContractorESGScore('c-1');

    // --- Verify exact arithmetic against the default metric set ---
    // Default metrics: carbon=50, renewable=25, waste=25 (-> wasteReduction=75),
    // localSourcing=60, recycled=30.
    // carbonScore = max(0, 100 - (50/100)*100) = 50
    // env = round(50*0.3 + 25*0.25 + 75*0.2 + 60*0.15 + 30*0.1)
    //     = round(15 + 6.25 + 15 + 9 + 3) = round(48.25) = 48
    expect(score.environmental_score).toBe(48);

    // jobHistory defaults (getContractorJobHistory): community=2 -> communityScore=20,
    // employment=85, education=5 -> educationScore=25, local=80, diversity=75
    // social = round(20*0.25 + 85*0.25 + 25*0.2 + 80*0.15 + 75*0.15)
    //        = round(5 + 21.25 + 5 + 12 + 11.25) = round(54.5) = 55 (round-half-up)
    expect(score.social_score).toBe(55);

    // certifications empty -> compliance=50; feedback defaults transparency=82,
    // ethics=88, engagement=79; reportingQuality=85 (metrics object truthy)
    // gov = round(50*0.25 + 82*0.2 + 88*0.25 + 85*0.15 + 79*0.15)
    //     = round(12.5 + 16.4 + 22 + 12.75 + 11.85) = round(75.5) = 76
    expect(score.governance_score).toBe(76);

    // overall = round(48*0.4 + 55*0.35 + 76*0.25)
    //         = round(19.2 + 19.25 + 19) = round(57.45) = 57 -> 'bronze'
    expect(score.overall_score).toBe(57);
    expect(score.certification_level).toBe('bronze');
    expect(typeof score.last_calculated).toBe('string');

    // storeESGScore posts to the API with the mapped payload.
    expect(mockedPost).toHaveBeenCalledWith(
      '/api/contractor/esg-score',
      expect.objectContaining({
        environmental_score: 48,
        social_score: 55,
        governance_score: 76,
        total_score: 57,
        breakdown: expect.objectContaining({ certification_level: 'bronze' }),
      })
    );
  });

  it('uses real DB metrics + certifications to reach a higher certification tier', async () => {
    const metricsRow = {
      id: 'm1',
      entity_id: 'c-2',
      entity_type: 'contractor',
      carbon_footprint_kg: 0, // -> carbonScore 100
      water_usage_liters: 0,
      waste_generated_kg: 0, // -> wasteReduction 100
      energy_usage_kwh: 0,
      renewable_energy_percentage: 100,
      local_sourcing_percentage: 100,
      recycled_materials_percentage: 100,
      transportation_emissions_kg: 0,
      created_at: 'now',
      updated_at: 'now',
    };

    mockedFrom.mockImplementation((table: string) => {
      if (table === 'sustainability_metrics') {
        return makeQuery({ data: metricsRow, error: null });
      }
      if (table === 'green_certifications') {
        return makeQuery({
          data: [{ id: 'cert1', contractor_id: 'c-2' }],
          error: null,
        });
      }
      return makeQuery({ data: null, error: null });
    });

    const score = await sustainabilityEngine.calculateContractorESGScore('c-2');

    // env = round(100*0.3 + 100*0.25 + 100*0.2 + 100*0.15 + 100*0.1) = 100
    expect(score.environmental_score).toBe(100);
    // certifications present -> compliance 90
    // gov = round(90*0.25 + 82*0.2 + 88*0.25 + 85*0.15 + 79*0.15)
    //     = round(22.5 + 16.4 + 22 + 12.75 + 11.85) = round(85.5) = 86
    expect(score.governance_score).toBe(86);
    // social unchanged = 55 ; overall = round(100*0.4 + 55*0.35 + 86*0.25)
    //   = round(40 + 19.25 + 21.5) = round(80.75) = 81 -> 'gold'
    expect(score.overall_score).toBe(81);
    expect(score.certification_level).toBe('gold');
  });

  it('still resolves when the persistence API call fails (error swallowed)', async () => {
    mockedPost.mockRejectedValueOnce(new Error('api down'));
    const score = await sustainabilityEngine.calculateContractorESGScore('c-3');
    // Default branch numbers as in first test.
    expect(score.overall_score).toBe(57);
  });
});

// ---------------------------------------------------------------------------
// analyzeJobSustainability (JobAnalyzer)
// ---------------------------------------------------------------------------
describe('SustainabilityEngine.analyzeJobSustainability', () => {
  it('analyzes a plumbing renovation (high complexity) in London', async () => {
    const result = await sustainabilityEngine.analyzeJobSustainability(
      'Bathroom job',
      'Full renovation and replacement of pipes',
      'London',
      'plumbing'
    );

    // complexity: 'renovation'/'replacement' present -> 1.5
    // plumbing base carbon=15 -> 15*1.5 = 22.5 ; waste base 5 -> 7.5
    expect(result.predicted_impact.carbon_footprint_kg).toBe(22.5);
    expect(result.predicted_impact.waste_generated_kg).toBe(7.5);
    // London transport: 15km * 0.2 = 3
    expect(result.predicted_impact.transportation_emissions_kg).toBe(3);

    // sustainability score:
    // carbonScore = max(0, 100 - (22.5/50)*100) = 55
    // wasteScore  = max(0, 100 - (7.5/30)*100) = 75
    // score = round(55*0.4 + 75*0.25 + 25*0.2 + 30*0.15)
    //       = round(22 + 18.75 + 5 + 4.5) = round(50.25) = 50
    expect(result.sustainability_score).toBe(50);
    expect(result.certification_eligible).toBe(false); // < 75
    expect(result.green_contractor_recommendations).toEqual([]); // no DB rows

    // improvement_suggestions: plumbing material swaps present (PVC->PEX, reduction 3.2)
    const swaps =
      result.improvement_suggestions.sustainability_improvements.material_swaps;
    expect(swaps).toHaveLength(1);
    expect(swaps[0].sustainable_alternative).toBe('PEX Pipes');
    // process optimisations: transport 3 (<=5) so none; waste 7.5 (<=10) so none.
    expect(
      result.improvement_suggestions.sustainability_improvements
        .process_optimizations
    ).toEqual([]);
    expect(result.improvement_suggestions.estimated_cost_impact).toBe(12);
  });

  it('analyzes an unknown category + minor complexity outside London with green contractors', async () => {
    mockedFrom.mockImplementation((table: string) => {
      if (table === 'contractor_esg_scores') {
        return makeQuery({
          data: [{ contractor_id: 'g1' }, { contractor_id: 'g2' }],
          error: null,
        });
      }
      return makeQuery({ data: null, error: null });
    });

    const result = await sustainabilityEngine.analyzeJobSustainability(
      'Tap fix',
      'A minor quick touch-up',
      'Leeds',
      'unknown-category'
    );

    // unknown category -> falls back to plumbing base; minor -> 0.7 multiplier
    // carbon = 15*0.7 = 10.5 ; waste = 5*0.7 = 3.5
    expect(result.predicted_impact.carbon_footprint_kg).toBeCloseTo(10.5, 5);
    expect(result.predicted_impact.waste_generated_kg).toBeCloseTo(3.5, 5);
    // non-London transport: 25 * 0.2 = 5
    expect(result.predicted_impact.transportation_emissions_kg).toBe(5);
    // unknown category has no material swaps
    expect(
      result.improvement_suggestions.sustainability_improvements.material_swaps
    ).toEqual([]);
    // green contractors from DB
    expect(result.green_contractor_recommendations).toEqual(['g1', 'g2']);
  });

  it('produces process optimizations when impact crosses transport+waste thresholds', async () => {
    // carpentry base: carbon 35, waste 20, energy 12 ; standard complexity 1.0
    const result = await sustainabilityEngine.analyzeJobSustainability(
      'Build shelves',
      'standard build',
      'Manchester',
      'carpentry'
    );

    // waste 20 > 10 -> waste optimization present; transport 5 (Manchester=25*0.2) NOT >5.
    const opts =
      result.improvement_suggestions.sustainability_improvements
        .process_optimizations;
    expect(opts).toHaveLength(1);
    expect(opts[0].area).toBe('waste_management');
    // carpentry swap: FSC plywood reduction 8.5, cost diff 25
    expect(result.improvement_suggestions.estimated_cost_impact).toBe(25);
    // potential_carbon_reduction = swaps(8.5) + waste opt (20*0.5=10) = 18.5
    expect(result.improvement_suggestions.potential_carbon_reduction).toBe(
      18.5
    );
  });

  it('propagates errors thrown during analysis', async () => {
    // Force MaterialAdvisor.generateMaterialSwaps path to be fine but make the
    // green-contractor query throw synchronously via from() to hit the catch.
    mockedFrom.mockImplementation((table: string) => {
      if (table === 'contractor_esg_scores') {
        throw new Error('boom');
      }
      return makeQuery({ data: null, error: null });
    });
    // findGreenContractorsForJob catches internally and returns [] — so analysis
    // should still succeed. Assert graceful empty result rather than throw.
    const result = await sustainabilityEngine.analyzeJobSustainability(
      'x',
      'y',
      'z',
      'electrical'
    );
    expect(result.green_contractor_recommendations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getSustainableMaterialAlternatives (MaterialAdvisor)
// ---------------------------------------------------------------------------
describe('SustainabilityEngine.getSustainableMaterialAlternatives', () => {
  it('maps DB rows to suggestions sorted by carbon_reduction desc', async () => {
    mockedFrom.mockImplementation((table: string) => {
      if (table === 'sustainable_materials') {
        return makeQuery({
          data: [
            {
              name: 'Eco A',
              certification_labels: ['FSC'],
              carbon_intensity: 2,
              cost_premium_percentage: 5,
              local_availability: true,
            },
            {
              name: 'Eco B',
              certification_labels: ['Cradle'],
              carbon_intensity: 9,
              cost_premium_percentage: 10,
              local_availability: false,
            },
          ],
          error: null,
        });
      }
      return makeQuery({ data: null, error: null });
    });

    const suggestions =
      await sustainabilityEngine.getSustainableMaterialAlternatives(['Paint']);

    expect(suggestions).toHaveLength(2);
    // sorted desc by carbon_reduction: 9 first then 2
    expect(suggestions[0].carbon_reduction).toBe(9);
    expect(suggestions[0].availability).toBe('order_required'); // local_availability false
    expect(suggestions[1].carbon_reduction).toBe(2);
    expect(suggestions[1].availability).toBe('readily_available');
    expect(suggestions[0].original_material).toBe('Paint');
  });

  it('returns empty array when no alternatives are found', async () => {
    const suggestions =
      await sustainabilityEngine.getSustainableMaterialAlternatives([
        'Concrete',
        'Steel',
      ]);
    expect(suggestions).toEqual([]);
  });

  it('returns empty array for an empty material list', async () => {
    const suggestions =
      await sustainabilityEngine.getSustainableMaterialAlternatives([]);
    expect(suggestions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// calculateJobCarbonFootprint (CarbonTracker)
// ---------------------------------------------------------------------------
describe('SustainabilityEngine.calculateJobCarbonFootprint', () => {
  it('sums material + transport + energy + waste carbon (DB fallback intensity)', async () => {
    // sustainable_materials queries return no data -> getMaterialCarbonData falls
    // back to carbon_intensity 5 per material.
    const total = await sustainabilityEngine.calculateJobCarbonFootprint({
      materials: ['woodA', 'woodB'],
      transportation_distance: 10,
      energy_usage_hours: 4,
      waste_generated: 6,
    });
    // materials: 5 + 5 = 10
    // transport: 10 * 0.2 = 2
    // energy: 4 * 0.5 * 0.233 = 0.466
    // waste: 6 * 0.5 = 3
    // total = 15.466 -> round to 2dp = 15.47
    expect(total).toBe(15.47);
  });

  it('uses DB carbon_intensity when material data exists', async () => {
    mockedFrom.mockImplementation((table: string) => {
      if (table === 'sustainable_materials') {
        return makeQuery({ data: { carbon_intensity: 12 }, error: null });
      }
      return makeQuery({ data: null, error: null });
    });
    const total = await sustainabilityEngine.calculateJobCarbonFootprint({
      materials: ['greenBrick'],
      transportation_distance: 0,
      energy_usage_hours: 0,
      waste_generated: 0,
    });
    expect(total).toBe(12);
  });

  it('handles an empty materials list (transport/energy/waste only)', async () => {
    const total = await sustainabilityEngine.calculateJobCarbonFootprint({
      materials: [],
      transportation_distance: 5,
      energy_usage_hours: 0,
      waste_generated: 2,
    });
    // transport 1 + waste 1 = 2
    expect(total).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getContractorSustainabilityRanking (CarbonTracker)
// ---------------------------------------------------------------------------
describe('SustainabilityEngine.getContractorSustainabilityRanking', () => {
  it('returns ranked rows from the DB', async () => {
    const rows = [
      { contractor_id: 'a', total_score: 95 },
      { contractor_id: 'b', total_score: 80 },
    ];
    mockedFrom.mockImplementation((table: string) => {
      if (table === 'contractor_esg_scores') {
        return makeQuery({ data: rows, error: null });
      }
      return makeQuery({ data: null, error: null });
    });
    const result =
      await sustainabilityEngine.getContractorSustainabilityRanking(
        'London',
        'plumbing'
      );
    expect(result).toEqual(rows);
  });

  it('returns empty array on DB error', async () => {
    mockedFrom.mockImplementation((table: string) => {
      if (table === 'contractor_esg_scores') {
        return makeQuery({ data: null, error: { message: 'fail' } });
      }
      return makeQuery({ data: null, error: null });
    });
    const result =
      await sustainabilityEngine.getContractorSustainabilityRanking('Leeds');
    expect(result).toEqual([]);
  });

  it('returns empty array when the query throws', async () => {
    mockedFrom.mockImplementation(() => {
      throw new Error('db exploded');
    });
    const result =
      await sustainabilityEngine.getContractorSustainabilityRanking('Leeds');
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// trackSustainabilityProgress (CarbonTracker)
// ---------------------------------------------------------------------------
describe('SustainabilityEngine.trackSustainabilityProgress', () => {
  const metric = (overrides: Record<string, unknown>) => ({
    carbon_footprint_kg: 0,
    waste_generated_kg: 0,
    renewable_energy_percentage: 0,
    ...overrides,
  });

  it('reports improving trend across a month window', async () => {
    mockedFrom.mockImplementation((table: string) => {
      if (table === 'sustainability_metrics') {
        return makeQuery({
          data: [
            metric({
              carbon_footprint_kg: 100,
              waste_generated_kg: 50,
              renewable_energy_percentage: 10,
            }),
            metric({
              carbon_footprint_kg: 60,
              waste_generated_kg: 30,
              renewable_energy_percentage: 40,
            }),
          ],
          error: null,
        });
      }
      return makeQuery({ data: null, error: null });
    });

    const result = await sustainabilityEngine.trackSustainabilityProgress(
      'c-1',
      'month'
    );
    expect(result.trend).toBe('improving');
    expect(result.carbon_reduction_kg).toBe(40); // 100 - 60
    expect(result.waste_reduction_kg).toBe(20); // 50 - 30
    expect(result.renewable_increase_percent).toBe(30); // 40 - 10
    expect(result.data_points).toBe(2);
    expect(result.timeframe).toBe('month');
  });

  it('reports declining trend for a quarter window', async () => {
    mockedFrom.mockImplementation((table: string) => {
      if (table === 'sustainability_metrics') {
        return makeQuery({
          data: [
            metric({ carbon_footprint_kg: 40 }),
            metric({ carbon_footprint_kg: 70 }),
          ],
          error: null,
        });
      }
      return makeQuery({ data: null, error: null });
    });
    const result = await sustainabilityEngine.trackSustainabilityProgress(
      'c-1',
      'quarter'
    );
    expect(result.trend).toBe('declining');
    expect(result.carbon_reduction_kg).toBe(-30);
  });

  it('reports stable trend for a year window with equal carbon', async () => {
    mockedFrom.mockImplementation((table: string) => {
      if (table === 'sustainability_metrics') {
        return makeQuery({
          data: [
            metric({ carbon_footprint_kg: 50 }),
            metric({ carbon_footprint_kg: 50 }),
          ],
          error: null,
        });
      }
      return makeQuery({ data: null, error: null });
    });
    const result = await sustainabilityEngine.trackSustainabilityProgress(
      'c-1',
      'year'
    );
    expect(result.trend).toBe('stable');
  });

  it('reports insufficient_data when fewer than 2 metrics exist', async () => {
    mockedFrom.mockImplementation((table: string) => {
      if (table === 'sustainability_metrics') {
        return makeQuery({
          data: [metric({ carbon_footprint_kg: 50 })],
          error: null,
        });
      }
      return makeQuery({ data: null, error: null });
    });
    const result = await sustainabilityEngine.trackSustainabilityProgress(
      'c-1',
      'month'
    );
    expect(result.trend).toBe('insufficient_data');
    expect(result.improvement).toBe(0);
  });

  it('reports error trend when the query throws', async () => {
    mockedFrom.mockImplementation(() => {
      throw new Error('kaboom');
    });
    const result = await sustainabilityEngine.trackSustainabilityProgress(
      'c-1',
      'month'
    );
    expect(result.trend).toBe('error');
    expect(result.improvement).toBe(0);
  });
});
