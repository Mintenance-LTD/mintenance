/**
 * Turns the bedroom/bathroom counts captured at property creation into a
 * concrete list of rooms.
 *
 * Why this exists: the add-property form asks how many bedrooms and bathrooms
 * a place has and stores them as plain integers on `properties`. Actual
 * `property_rooms` rows are only ever created by hand on the Rooms tab, so in
 * practice almost no property has any — which blocks every room-scoped
 * feature (room-scoped certificates, per-room walkthroughs) before it starts.
 * The user already told us the layout; this makes use of the answer.
 *
 * Pure and separate from `route.ts` on purpose: App Router route files may
 * only export handlers, and this is the part worth unit-testing.
 */

import { ROOM_TYPES } from './schema';

export interface PlannedRoom {
  name: string;
  room_type: (typeof ROOM_TYPES)[number];
}

/**
 * Rooms nearly every dwelling has, which the property form never asks about.
 * Offered alongside the counted rooms so the first walkthrough has somewhere
 * to start beyond bedrooms and bathrooms.
 */
const ALWAYS_PRESENT: PlannedRoom[] = [
  { name: 'Kitchen', room_type: 'kitchen' },
  { name: 'Living room', room_type: 'living_room' },
  { name: 'Hallway', room_type: 'hallway' },
];

/** Guards against a typo in the property form producing hundreds of rows. */
const MAX_PER_TYPE = 12;

function clampCount(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  // Bathrooms can legitimately be 1.5 ("and a half" = a WC). A half-room is
  // still a room to film, so round up rather than truncating it away.
  return Math.min(Math.ceil(n), MAX_PER_TYPE);
}

/**
 * Build the room list for a property.
 *
 * Numbered only when there is more than one of a type — "Bedroom" reads
 * better than "Bedroom 1" in a one-bed flat.
 */
export function planSeedRooms(counts: {
  bedrooms?: number | null;
  bathrooms?: number | null;
}): PlannedRoom[] {
  const bedrooms = clampCount(counts.bedrooms);
  const bathrooms = clampCount(counts.bathrooms);

  const rooms: PlannedRoom[] = [];

  for (let i = 1; i <= bedrooms; i++) {
    rooms.push({
      name: bedrooms === 1 ? 'Bedroom' : `Bedroom ${i}`,
      room_type: 'bedroom',
    });
  }

  for (let i = 1; i <= bathrooms; i++) {
    rooms.push({
      name: bathrooms === 1 ? 'Bathroom' : `Bathroom ${i}`,
      room_type: 'bathroom',
    });
  }

  rooms.push(...ALWAYS_PRESENT);

  return rooms;
}
