import {
  saveJob,
  getJob,
  getJobsByHomeowner,
  getJobsByStatus,
} from '../JobStore';
import type { DatabaseJobRow } from '../types';

jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { logger } from '../../../utils/logger';

type FakeDb = {
  runAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
};

function makeDb(): FakeDb {
  return {
    runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asDb = (db: FakeDb): any => db;

/** A fully-populated DB row (no null/optional fields). */
function fullRow(overrides: Partial<DatabaseJobRow> = {}): DatabaseJobRow {
  return {
    id: 'job-1',
    title: 'Fix sink',
    description: 'Leaky',
    location: 'London',
    homeowner_id: 'ho-1',
    contractor_id: 'co-1',
    status: 'assigned',
    budget: 250,
    category: 'plumbing',
    subcategory: 'leak',
    priority: 'high',
    photos: JSON.stringify(['a.jpg', 'b.jpg']),
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
    synced_at: '2026-01-02T00:00:00.000Z',
    is_dirty: 0,
    ...overrides,
  };
}

describe('JobStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mapRowToJob (via getJob)', () => {
    it('maps a fully-populated row with all fields present', async () => {
      const db = makeDb();
      db.getFirstAsync.mockResolvedValue(fullRow());

      const job = await getJob(asDb(db), 'job-1');

      expect(db.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM jobs WHERE id = ?',
        ['job-1']
      );
      expect(job).toEqual({
        id: 'job-1',
        title: 'Fix sink',
        description: 'Leaky',
        location: 'London',
        homeowner_id: 'ho-1',
        contractor_id: 'co-1',
        status: 'assigned',
        budget: 250,
        category: 'plumbing',
        subcategory: 'leak',
        priority: 'high',
        photos: ['a.jpg', 'b.jpg'],
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
        homeownerId: 'ho-1',
        contractorId: 'co-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      });
    });

    it('maps a row with all nullable fields null (?? undefined arms + no photos)', async () => {
      const db = makeDb();
      db.getFirstAsync.mockResolvedValue(
        fullRow({
          contractor_id: null,
          category: null,
          subcategory: null,
          priority: null,
          photos: null,
        })
      );

      const job = await getJob(asDb(db), 'job-1');

      expect(job).not.toBeNull();
      expect(job!.contractor_id).toBeUndefined();
      expect(job!.contractorId).toBeUndefined();
      expect(job!.category).toBeUndefined();
      expect(job!.subcategory).toBeUndefined();
      // priority is a direct cast (no ?? fallback), so null passes through as null
      expect(job!.priority).toBeNull();
      expect(job!.photos).toBeUndefined();
    });

    it('returns null when no row found (false arm of result ? ... : null)', async () => {
      const db = makeDb();
      db.getFirstAsync.mockResolvedValue(null);

      const job = await getJob(asDb(db), 'missing');

      expect(job).toBeNull();
    });
  });

  describe('saveJob', () => {
    beforeEach(() => {
      jest
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue('2026-03-03T03:03:03.000Z');
    });

    afterEach(() => {
      (Date.prototype.toISOString as unknown as jest.Mock).mockRestore?.();
    });

    function baseJob(): Record<string, unknown> {
      return {
        id: 'job-1',
        title: 'Fix sink',
        description: 'Leaky',
        location: 'London',
        homeowner_id: 'ho-1',
        contractor_id: 'co-1',
        status: 'assigned',
        budget: 250,
        category: 'plumbing',
        subcategory: 'leak',
        priority: 'high',
        photos: ['a.jpg'],
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
      };
    }

    it('saves with all fields present, markDirty=false (synced_at stamped, is_dirty=0)', async () => {
      const db = makeDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveJob(asDb(db), baseJob() as any, false);

      const [, params] = db.runAsync.mock.calls[0];
      expect(params).toEqual([
        'job-1',
        'Fix sink',
        'Leaky',
        'London',
        'ho-1',
        'co-1',
        'assigned',
        250,
        'plumbing',
        'leak',
        'high',
        JSON.stringify(['a.jpg']),
        '2026-01-01T00:00:00.000Z',
        '2026-01-02T00:00:00.000Z',
        '2026-03-03T03:03:03.000Z', // synced_at = now
        0, // is_dirty
      ]);
      expect(logger.debug).toHaveBeenCalledWith('Job saved to local database', {
        jobId: 'job-1',
        markDirty: false,
      });
    });

    it('defaults markDirty to false when omitted', async () => {
      const db = makeDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveJob(asDb(db), baseJob() as any);
      const [, params] = db.runAsync.mock.calls[0];
      expect(params[14]).toBe('2026-03-03T03:03:03.000Z');
      expect(params[15]).toBe(0);
    });

    it('saves with markDirty=true (synced_at null, is_dirty=1)', async () => {
      const db = makeDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveJob(asDb(db), baseJob() as any, true);
      const [, params] = db.runAsync.mock.calls[0];
      expect(params[14]).toBeNull(); // synced_at
      expect(params[15]).toBe(1); // is_dirty
      expect(logger.debug).toHaveBeenCalledWith('Job saved to local database', {
        jobId: 'job-1',
        markDirty: true,
      });
    });

    it('serializes object location via JSON.stringify (non-string truthy arm)', async () => {
      const db = makeDb();
      const job = baseJob();
      job.location = { lat: 1, lng: 2 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveJob(asDb(db), job as any, false);
      const [, params] = db.runAsync.mock.calls[0];
      expect(params[3]).toBe(JSON.stringify({ lat: 1, lng: 2 }));
    });

    it('uses empty string for missing/falsy location (final arm)', async () => {
      const db = makeDb();
      const job = baseJob();
      job.location = undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveJob(asDb(db), job as any, false);
      const [, params] = db.runAsync.mock.calls[0];
      expect(params[3]).toBe('');
    });

    it('falls back to camelCase homeownerId and contractorId when snake_case absent', async () => {
      const db = makeDb();
      const job = baseJob();
      delete job.homeowner_id;
      delete job.contractor_id;
      job.homeownerId = 'ho-camel';
      job.contractorId = 'co-camel';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveJob(asDb(db), job as any, false);
      const [, params] = db.runAsync.mock.calls[0];
      expect(params[4]).toBe('ho-camel'); // homeownerId
      expect(params[5]).toBe('co-camel'); // contractorId
    });

    it('uses null homeownerId/contractorId when neither casing present', async () => {
      const db = makeDb();
      const job = baseJob();
      delete job.homeowner_id;
      delete job.contractor_id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveJob(asDb(db), job as any, false);
      const [, params] = db.runAsync.mock.calls[0];
      expect(params[4]).toBeNull();
      expect(params[5]).toBeNull();
    });

    it('contractor_id null with no camel fallback resolves to null (?? chain)', async () => {
      const db = makeDb();
      const job = baseJob();
      job.contractor_id = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveJob(asDb(db), job as any, false);
      const [, params] = db.runAsync.mock.calls[0];
      expect(params[5]).toBeNull();
    });

    it('applies fallbacks for empty title/description, default priority, null budget/category/subcategory/photos', async () => {
      const db = makeDb();
      const job: Record<string, unknown> = {
        id: 'job-2',
        title: '',
        description: '',
        location: 'X',
        homeowner_id: 'ho',
        contractor_id: null,
        status: 'posted',
        budget: undefined,
        category: undefined,
        subcategory: undefined,
        priority: undefined,
        photos: undefined,
        created_at: 'c',
        updated_at: 'u',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveJob(asDb(db), job as any, false);
      const [, params] = db.runAsync.mock.calls[0];
      expect(params[1]).toBe(''); // title || ''
      expect(params[2]).toBe(''); // description || ''
      expect(params[7]).toBeNull(); // budget ?? null
      expect(params[8]).toBeNull(); // category ?? null
      expect(params[9]).toBeNull(); // subcategory ?? null
      expect(params[10]).toBe('medium'); // priority ?? 'medium'
      expect(params[11]).toBeNull(); // photos ? ... : null
    });

    it('keeps budget=0 (only ?? coalesces null/undefined, not 0)', async () => {
      const db = makeDb();
      const job = baseJob();
      job.budget = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveJob(asDb(db), job as any, false);
      const [, params] = db.runAsync.mock.calls[0];
      expect(params[7]).toBe(0);
    });
  });

  describe('getJobsByHomeowner', () => {
    it('maps all rows returned', async () => {
      const db = makeDb();
      db.getAllAsync.mockResolvedValue([
        fullRow({ id: 'j1' }),
        fullRow({ id: 'j2', contractor_id: null }),
      ]);

      const jobs = await getJobsByHomeowner(asDb(db), 'ho-1');

      expect(db.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM jobs WHERE homeowner_id = ? ORDER BY created_at DESC',
        ['ho-1']
      );
      expect(jobs).toHaveLength(2);
      expect(jobs[0].id).toBe('j1');
      expect(jobs[1].id).toBe('j2');
      expect(jobs[1].contractorId).toBeUndefined();
    });

    it('returns empty array when no rows', async () => {
      const db = makeDb();
      db.getAllAsync.mockResolvedValue([]);
      const jobs = await getJobsByHomeowner(asDb(db), 'ho-x');
      expect(jobs).toEqual([]);
    });
  });

  describe('getJobsByStatus', () => {
    it('queries by status only when userId omitted', async () => {
      const db = makeDb();
      db.getAllAsync.mockResolvedValue([fullRow()]);

      const jobs = await getJobsByStatus(asDb(db), 'posted');

      expect(db.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC',
        ['posted']
      );
      expect(jobs).toHaveLength(1);
    });

    it('adds userId filter when userId provided', async () => {
      const db = makeDb();
      db.getAllAsync.mockResolvedValue([]);

      await getJobsByStatus(asDb(db), 'assigned', 'user-9');

      expect(db.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM jobs WHERE status = ? AND (homeowner_id = ? OR contractor_id = ?) ORDER BY created_at DESC',
        ['assigned', 'user-9', 'user-9']
      );
    });

    it('treats empty-string userId as falsy (no filter appended)', async () => {
      const db = makeDb();
      db.getAllAsync.mockResolvedValue([]);

      await getJobsByStatus(asDb(db), 'completed', '');

      expect(db.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC',
        ['completed']
      );
    });
  });
});
