import { describe, it, expect, vi } from 'vitest';
import {
  groupRoomPhotoAlbums,
  uploadedPhotoLabel,
  parsePropertyView,
  propertyNavigationVisible,
  showPropertyTool,
} from '../../../../packages/shared/src/property-presentation';
import { createPropertyViewStore } from '../../../../packages/shared/src/property-view-store';

const photo = (
  id: string,
  created_at: string | null,
  room_type = 'kitchen'
) => ({
  id,
  created_at,
  room_type,
  photo_url: '/photo.png',
  file_name: 'room.png',
});
describe('room upload albums', () => {
  it('uses the same UTC day across offset timestamps, sorts newest first and isolates rooms', () => {
    const input = [
      photo('older', '2026-10-29T12:00:00Z'),
      photo('offset', '2026-10-31T00:30:00+01:00'),
      photo('newer', '2026-10-30T23:45:00Z'),
      photo('other', '2026-10-30T12:00:00Z', 'bathroom'),
    ];
    const groups = groupRoomPhotoAlbums(input, 'kitchen');
    expect(groups.map((group) => group.date)).toEqual([
      '2026-10-30',
      '2026-10-29',
    ]);
    expect(groups[0].photos.map((row) => row.id)).toEqual(['newer', 'offset']);
    expect(input[0].id).toBe('older');
    expect(uploadedPhotoLabel(input[1].created_at)).toContain('23:30 UTC');
  });
  it('does not invent capture or upload dates for missing, invalid or timezone-less records', () => {
    const groups = groupRoomPhotoAlbums(
      [
        photo('missing', null),
        photo('invalid', 'invalid'),
        photo('no-zone', '2026-10-30T12:00:00'),
        photo('valid', '2026-10-30T12:00:00Z'),
      ],
      'kitchen'
    );
    expect(groups.map((group) => group.date)).toEqual([
      '2026-10-30',
      'unknown',
    ]);
    expect(groups[1].photos).toHaveLength(3);
    expect(uploadedPhotoLabel(null)).toBe('Upload date unknown');
    expect(groupRoomPhotoAlbums([], 'kitchen')).toEqual([]);
  });
});
describe('presentation-only views', () => {
  it('validates persisted choices and leaves ordinary tasks visible', () => {
    expect(parsePropertyView('admin')).toBe('home');
    for (const view of ['home', 'rentals', 'agency'] as const) {
      for (const route of [
        '/jobs',
        '/properties',
        '/documents',
        '/payments',
        '/homeowner/subscription',
      ])
        expect(propertyNavigationVisible(view, route)).toBe(true);
    }
    expect(propertyNavigationVisible('home', '/landlord/reports')).toBe(false);
    expect(propertyNavigationVisible('rentals', '/landlord/reports')).toBe(
      true
    );
    expect(
      propertyNavigationVisible('rentals', '/landlord/analytics/year-over-year')
    ).toBe(false);
    expect(
      propertyNavigationVisible('agency', '/landlord/analytics/year-over-year')
    ).toBe(true);
    expect(showPropertyTool('home', 'rental')).toBe(false);
    expect(showPropertyTool('rentals', 'team')).toBe(false);
    expect(showPropertyTool('agency', 'team')).toBe(true);
  });
  it('isolates accounts and ignores a delayed storage read after a selection', async () => {
    let resolve!: (value: string | null) => void;
    const set = vi.fn().mockResolvedValue(undefined);
    const store = createPropertyViewStore({
      get: () =>
        new Promise((done) => {
          resolve = done;
        }),
      set,
    });
    const loading = store.load('one');
    await store.set('one', 'agency');
    resolve('rentals');
    await loading;
    expect(store.snapshot('one').view).toBe('agency');
    expect(store.snapshot('two').view).toBe('home');
    expect(store.snapshot().ready).toBe(false);
    expect(set).toHaveBeenCalledWith(
      'mintenance:property-view:v1:one',
      'agency'
    );
  });
  it('serializes rapid selections and retains the view when persistence fails', async () => {
    let release!: () => void;
    const order: string[] = [];
    const store = createPropertyViewStore({
      get: async () => null,
      set: async (_, value) => {
        order.push(value);
        if (value === 'rentals')
          await new Promise<void>((done) => {
            release = done;
          });
        else throw Error('storage denied');
      },
    });
    const first = store.set('one', 'rentals');
    const second = store.set('one', 'agency');
    await Promise.resolve();
    expect(order).toEqual(['rentals']);
    release();
    await first;
    await second;
    expect(order).toEqual(['rentals', 'agency']);
    expect(store.snapshot('one')).toEqual({
      view: 'agency',
      ready: true,
      saved: false,
    });
  });
  it('survives invalid persisted values, unavailable storage and unsubscription', async () => {
    const store = createPropertyViewStore({
      get: async (key) => {
        if (key.endsWith('bad')) throw Error('storage');
        return 'admin';
      },
      set: async () => {},
    });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    await store.load('good');
    expect(store.snapshot('good').view).toBe('home');
    unsubscribe();
    await store.load('bad');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.snapshot('bad').saved).toBe(false);
  });
});
