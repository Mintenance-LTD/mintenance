import { saveUser, getUser, getAllUsers } from '../UserStore';
import type { DatabaseUserRow } from '../types';

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

function fullRow(overrides: Partial<DatabaseUserRow> = {}): DatabaseUserRow {
  return {
    id: 'user-1',
    email: 'a@b.com',
    first_name: 'Jane',
    last_name: 'Doe',
    role: 'homeowner',
    phone: '0700',
    profile_image_url: 'http://img',
    bio: 'hi',
    rating: 4.5,
    total_jobs_completed: 12,
    is_available: 1,
    latitude: 51,
    longitude: 0,
    address: 'London',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
    synced_at: '2026-01-02T00:00:00.000Z',
    is_dirty: 0,
    ...overrides,
  };
}

describe('UserStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mapRowToUser (via getUser)', () => {
    it('maps a fully-populated row', async () => {
      const db = makeDb();
      db.getFirstAsync.mockResolvedValue(fullRow());

      const user = await getUser(asDb(db), 'user-1');

      expect(db.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?',
        ['user-1']
      );
      expect(user).toEqual({
        id: 'user-1',
        email: 'a@b.com',
        first_name: 'Jane',
        last_name: 'Doe',
        role: 'homeowner',
        phone: '0700',
        profile_image_url: 'http://img',
        bio: 'hi',
        rating: 4.5,
        jobs_count: 12,
        location: 'London',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
        firstName: 'Jane',
        lastName: 'Doe',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
    });

    it('maps a row with all nullable fields null (every ?? fallback arm)', async () => {
      const db = makeDb();
      db.getFirstAsync.mockResolvedValue(
        fullRow({
          first_name: null,
          last_name: null,
          phone: null,
          profile_image_url: null,
          bio: null,
          rating: null,
          total_jobs_completed: null,
          address: null,
        })
      );

      const user = await getUser(asDb(db), 'user-1');

      expect(user).not.toBeNull();
      expect(user!.first_name).toBe(''); // ?? ''
      expect(user!.last_name).toBe(''); // ?? ''
      expect(user!.phone).toBeUndefined();
      expect(user!.profile_image_url).toBeUndefined();
      expect(user!.bio).toBeUndefined();
      expect(user!.rating).toBeUndefined();
      expect(user!.jobs_count).toBeUndefined();
      expect(user!.location).toBeUndefined();
      expect(user!.firstName).toBeUndefined(); // ?? undefined arm
      expect(user!.lastName).toBeUndefined();
    });

    it('returns null when no row found', async () => {
      const db = makeDb();
      db.getFirstAsync.mockResolvedValue(null);
      const user = await getUser(asDb(db), 'missing');
      expect(user).toBeNull();
    });
  });

  describe('saveUser', () => {
    beforeEach(() => {
      jest
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue('2026-03-03T03:03:03.000Z');
    });

    afterEach(() => {
      (Date.prototype.toISOString as unknown as jest.Mock).mockRestore?.();
    });

    function baseUser(): Record<string, unknown> {
      return {
        id: 'user-1',
        email: 'a@b.com',
        first_name: 'Jane',
        last_name: 'Doe',
        role: 'contractor',
        phone: '0700',
        profile_image_url: 'http://img',
        bio: 'hi',
        rating: 4.5,
        jobs_count: 12,
        location: 'London',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
      };
    }

    it('saves with all fields present, markDirty=false', async () => {
      const db = makeDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveUser(asDb(db), baseUser() as any, false);

      const [, params] = db.runAsync.mock.calls[0];
      expect(params).toEqual([
        'user-1',
        'a@b.com',
        'Jane',
        'Doe',
        'contractor',
        '0700', // phone || null
        'http://img', // profile_image_url || null
        'hi', // bio || null
        4.5, // rating || 0
        12, // jobs_count || 0
        1, // is_available hardcoded
        null, // latitude
        null, // longitude
        'London', // location || null
        '2026-01-01T00:00:00.000Z',
        '2026-01-02T00:00:00.000Z',
        '2026-03-03T03:03:03.000Z', // synced_at
        0, // is_dirty
      ]);
      expect(logger.debug).toHaveBeenCalledWith(
        'User saved to local database',
        { userId: 'user-1', markDirty: false }
      );
    });

    it('defaults markDirty to false when omitted', async () => {
      const db = makeDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveUser(asDb(db), baseUser() as any);
      const [, params] = db.runAsync.mock.calls[0];
      expect(params[16]).toBe('2026-03-03T03:03:03.000Z');
      expect(params[17]).toBe(0);
    });

    it('saves with markDirty=true (synced_at null, is_dirty=1)', async () => {
      const db = makeDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveUser(asDb(db), baseUser() as any, true);
      const [, params] = db.runAsync.mock.calls[0];
      expect(params[16]).toBeNull();
      expect(params[17]).toBe(1);
      expect(logger.debug).toHaveBeenCalledWith(
        'User saved to local database',
        { userId: 'user-1', markDirty: true }
      );
    });

    it('applies || null / || 0 fallbacks for missing optional fields', async () => {
      const db = makeDb();
      const user: Record<string, unknown> = {
        id: 'user-2',
        email: 'x@y.com',
        first_name: 'A',
        last_name: 'B',
        role: 'admin',
        phone: undefined,
        profile_image_url: undefined,
        bio: undefined,
        rating: undefined,
        jobs_count: undefined,
        location: undefined,
        created_at: 'c',
        updated_at: 'u',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveUser(asDb(db), user as any, false);
      const [, params] = db.runAsync.mock.calls[0];
      expect(params[5]).toBeNull(); // phone
      expect(params[6]).toBeNull(); // profile_image_url
      expect(params[7]).toBeNull(); // bio
      expect(params[8]).toBe(0); // rating || 0
      expect(params[9]).toBe(0); // jobs_count || 0
      expect(params[13]).toBeNull(); // location
    });

    it('coalesces falsy rating=0 and jobs_count=0 to 0 (|| arm)', async () => {
      const db = makeDb();
      const user = baseUser();
      user.rating = 0;
      user.jobs_count = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveUser(asDb(db), user as any, false);
      const [, params] = db.runAsync.mock.calls[0];
      expect(params[8]).toBe(0);
      expect(params[9]).toBe(0);
    });
  });

  describe('getAllUsers', () => {
    it('maps all rows', async () => {
      const db = makeDb();
      db.getAllAsync.mockResolvedValue([
        fullRow({ id: 'u1' }),
        fullRow({ id: 'u2', first_name: null }),
      ]);

      const users = await getAllUsers(asDb(db));

      expect(db.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM users ORDER BY created_at DESC'
      );
      expect(users).toHaveLength(2);
      expect(users[0].id).toBe('u1');
      expect(users[1].first_name).toBe('');
    });

    it('returns empty array when no rows', async () => {
      const db = makeDb();
      db.getAllAsync.mockResolvedValue([]);
      const users = await getAllUsers(asDb(db));
      expect(users).toEqual([]);
    });
  });
});
