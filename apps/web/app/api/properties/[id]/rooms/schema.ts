/**
 * Shared constants + validation schemas for the property-rooms routes.
 *
 * NOTE: these live here, NOT in `route.ts`. Next.js App Router route files
 * may only export route handlers (`GET`/`POST`/…) and recognised segment
 * config — any other named export fails the route-type validation that runs
 * during `next build` (even though `tsc --noEmit` stays green, because that
 * check only exists in Next's generated `.next/types`). Keeping `ROOM_TYPES`
 * and the Zod schemas in a plain module lets both `rooms/route.ts` and
 * `rooms/[roomId]/route.ts` import them without breaking the production build.
 */

import { z } from 'zod';

export const ROOM_TYPES = [
  'kitchen',
  'bathroom',
  'bedroom',
  'living_room',
  'dining_room',
  'garage',
  'garden',
  'exterior',
  'roof',
  'hallway',
  'office',
  'utility',
  'other',
] as const;

export const createRoomSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Room name is required')
      .max(80, 'Room name must be 80 characters or fewer'),
    room_type: z.enum(ROOM_TYPES),
    size_sqm: z
      .number()
      .min(0, 'Size cannot be negative')
      .max(10000, 'Size looks unrealistically large')
      .optional()
      .nullable(),
    notes: z
      .string()
      .trim()
      .max(500, 'Notes must be 500 characters or fewer')
      .optional()
      .nullable(),
  })
  .strict();
