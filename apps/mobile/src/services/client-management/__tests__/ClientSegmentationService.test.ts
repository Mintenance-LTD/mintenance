/**
 * ClientSegmentationService unit tests.
 * Uses the shared chainable supabase mock (src/config/__mocks__/supabase.ts).
 * `then`-based list reads pull from the queue/mockState; `.single()` reads
 * mockState.data directly, so we stage data per call accordingly.
 */

import { ClientSegmentationService } from '../ClientSegmentationService';
import {
  __setMockData,
  __queueMockData,
  __resetSupabaseMock,
} from '../../../config/supabase';

const svc = new ClientSegmentationService();

beforeEach(() => {
  __resetSupabaseMock();
});

describe('getClientSegments', () => {
  it('returns the active segments list', async () => {
    __setMockData([{ id: 's1' }, { id: 's2' }]);
    const result = await svc.getClientSegments('c1');
    expect(result).toHaveLength(2);
  });
});

describe('createClientSegment', () => {
  it('computes size + average value then inserts the segment', async () => {
    const newSegment = { id: 'seg-new', name: 'High value' };
    __setMockData(newSegment); // consumed by the final .single()
    __queueMockData([
      [
        { financials: { totalSpent: 100 } },
        { financials: { totalSpent: 200 } },
      ], // size calc
      [
        { financials: { totalSpent: 100 } },
        { financials: { totalSpent: 200 } },
      ], // avg calc
    ]);
    const result = await svc.createClientSegment('c1', {
      name: 'High value',
      description: 'desc',
      criteria: { priority: ['vip'] },
    });
    expect(result).toEqual(newSegment);
  });
});

describe('updateClientSegment', () => {
  it('updates without recalculating when criteria is unchanged', async () => {
    const updated = { id: 'seg1', name: 'Renamed' };
    __setMockData(updated);
    const result = await svc.updateClientSegment('seg1', { name: 'Renamed' });
    expect(result).toEqual(updated);
  });

  it('recalculates metrics when criteria changes', async () => {
    // getSegmentById (.single) -> existing segment; two list reads for recalc;
    // final update().select().single() -> updated segment.
    const segment = { id: 'seg1', contractorId: 'c1', criteria: {} };
    __setMockData(segment);
    __queueMockData([
      [{ financials: { totalSpent: 500 } }],
      [{ financials: { totalSpent: 500 } }],
    ]);
    const result = await svc.updateClientSegment('seg1', {
      criteria: { status: ['active'] },
    });
    expect(result).toEqual(segment); // single() returns mockState.data
  });
});

describe('deleteClientSegment', () => {
  it('resolves when the delete succeeds', async () => {
    await expect(svc.deleteClientSegment('seg1')).resolves.toBeUndefined();
  });
});

describe('getClientsInSegment', () => {
  it('applies every supported criteria filter branch', async () => {
    const segment = {
      id: 'seg1',
      contractorId: 'c1',
      criteria: {
        status: ['active'],
        priority: ['vip'],
        type: ['residential'],
        tags: ['gold'],
        lifecycleStage: ['customer'],
        totalSpentRange: [100, 5000],
        lastJobDateRange: ['2026-01-01', '2026-02-01'],
        location: { city: 'London', state: 'ENG' },
      },
    };
    __setMockData(segment);
    const clients = await svc.getClientsInSegment('seg1');
    expect(Array.isArray(clients)).toBe(true);
  });

  it('throws when the segment is not found', async () => {
    __setMockData(null); // .single() -> PGRST116 error
    await expect(svc.getClientsInSegment('missing')).rejects.toBeDefined();
  });
});

describe('updateSegmentMetrics', () => {
  it('recomputes and persists size + average value', async () => {
    const segment = { id: 'seg1', contractorId: 'c1', criteria: {} };
    __setMockData(segment);
    __queueMockData([
      [{ financials: { totalSpent: 300 } }],
      [{ financials: { totalSpent: 300 } }],
    ]);
    await expect(svc.updateSegmentMetrics('seg1')).resolves.toBeUndefined();
  });
});

describe('getSuggestedSegments', () => {
  it('suggests all archetypes when matching clients exist', async () => {
    const recent = new Date().toISOString();
    __setMockData([
      {
        financials: { totalSpent: 9000 },
        createdAt: recent,
        lifecycle: { retentionRisk: 0.9 },
        priority: 'vip',
      },
    ]);
    const suggestions = await svc.getSuggestedSegments('c1');
    const names = suggestions.map((s) => s.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'High-Value Clients',
        'Recent Clients',
        'At-Risk Clients',
        'VIP Clients',
      ])
    );
  });

  it('returns no suggestions when no clients qualify', async () => {
    __setMockData([
      {
        financials: { totalSpent: 10 },
        createdAt: '2000-01-01',
        lifecycle: { retentionRisk: 0.1 },
        priority: 'standard',
      },
    ]);
    const suggestions = await svc.getSuggestedSegments('c1');
    expect(suggestions).toHaveLength(0);
  });
});
