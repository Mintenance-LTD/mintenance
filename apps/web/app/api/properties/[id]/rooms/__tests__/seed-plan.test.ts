// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { planSeedRooms } from '../seed-plan';
import { ROOM_TYPES } from '../schema';

/**
 * The add-property form collects bedroom and bathroom counts and then nothing
 * uses them — `property_rooms` rows are only ever created by hand, so almost
 * no property has any and every room-scoped feature has nothing to attach to.
 * This planner turns the counts into rooms.
 */
describe('planSeedRooms', () => {
  it('produces one room per counted bedroom and bathroom', () => {
    const rooms = planSeedRooms({ bedrooms: 3, bathrooms: 2 });
    expect(rooms.filter((r) => r.room_type === 'bedroom')).toHaveLength(3);
    expect(rooms.filter((r) => r.room_type === 'bathroom')).toHaveLength(2);
  });

  it('numbers rooms only when there is more than one of a type', () => {
    const oneBed = planSeedRooms({ bedrooms: 1, bathrooms: 1 });
    expect(oneBed.map((r) => r.name)).toContain('Bedroom');
    expect(oneBed.map((r) => r.name)).toContain('Bathroom');
    expect(oneBed.map((r) => r.name)).not.toContain('Bedroom 1');

    const twoBed = planSeedRooms({ bedrooms: 2, bathrooms: 0 });
    expect(twoBed.map((r) => r.name)).toEqual(
      expect.arrayContaining(['Bedroom 1', 'Bedroom 2'])
    );
  });

  it('always includes the rooms the form never asks about', () => {
    const names = planSeedRooms({ bedrooms: 0, bathrooms: 0 }).map(
      (r) => r.name
    );
    expect(names).toEqual(['Kitchen', 'Living room', 'Hallway']);
  });

  it('rounds a half-bathroom up — a WC is still a room to film', () => {
    const rooms = planSeedRooms({ bedrooms: 0, bathrooms: 1.5 });
    expect(rooms.filter((r) => r.room_type === 'bathroom')).toHaveLength(2);
  });

  it('survives missing, null and nonsense counts', () => {
    for (const counts of [
      {},
      { bedrooms: null, bathrooms: null },
      { bedrooms: -4, bathrooms: 0 },
      { bedrooms: NaN, bathrooms: undefined },
    ]) {
      const rooms = planSeedRooms(counts as { bedrooms?: number | null });
      // Never throws, never produces a bedroom from a bad count.
      expect(rooms.filter((r) => r.room_type === 'bedroom')).toHaveLength(0);
      expect(rooms).toHaveLength(3);
    }
  });

  it('caps a mistyped count rather than creating hundreds of rows', () => {
    const rooms = planSeedRooms({ bedrooms: 900, bathrooms: 0 });
    expect(rooms.filter((r) => r.room_type === 'bedroom')).toHaveLength(12);
  });

  it('only emits room types the database CHECK accepts', () => {
    const rooms = planSeedRooms({ bedrooms: 2, bathrooms: 2 });
    rooms.forEach((r) => {
      expect(ROOM_TYPES).toContain(r.room_type);
    });
  });

  it('keeps every name within the 80-character column limit', () => {
    planSeedRooms({ bedrooms: 12, bathrooms: 12 }).forEach((r) => {
      expect(r.name.length).toBeLessThanOrEqual(80);
      expect(r.name.trim()).toBe(r.name);
    });
  });
});
