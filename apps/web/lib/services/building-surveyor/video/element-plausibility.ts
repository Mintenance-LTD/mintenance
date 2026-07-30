/**
 * Drop findings about elements that cannot be in the picture.
 *
 * A ceiling with a tonal patch is a standing invitation to diagnose the roof:
 * the model reports `roof_covering` failure from inside a first-floor bedroom,
 * having never seen a tile. The claim then carries a roofing cost and a
 * structural referral, all from a shadow on some plasterboard.
 *
 * DELIBERATELY NARROW. The obvious version of this filter — "exterior elements
 * are implausible indoors" — deletes real findings, because most of the
 * vocabulary IS visible from inside a room:
 *
 *   - `main_walls`      the inner face is right there
 *   - `windows`         obviously
 *   - `external_joinery` includes external door and window FRAMES, which you
 *                       look at from indoors. Two live findings used this and
 *                       they are most likely legitimate.
 *   - `chimney`         a chimney breast is an interior feature; only the stack
 *                       is outside, and the model does not distinguish them.
 *
 * So only the roof qualifies: from a finished interior room you cannot see
 * covering, timbers or rainwater goods at all. Everything else stays, because
 * losing a real defect is worse than carrying a doubtful one — and the
 * corroboration and abstention rules already handle doubtful.
 */

import type { AssessmentFinding, AssessmentContext } from '../types';

/**
 * Elements with no line of sight from inside a finished habitable room.
 *
 * A loft would see timbers and the covering's underside, but a loft is not one
 * of the room types the picker offers, so it cannot be the source here.
 */
const NOT_VISIBLE_FROM_INSIDE = new Set([
  'roof_covering',
  'roof_timbers',
  'rainwater_goods',
  'gutters',
  'roof',
]);

/**
 * Room types that put the camera unambiguously indoors.
 *
 * An allowlist, not a denylist: the filter only runs when we KNOW we are inside.
 * A whole-property walk (no room) or anything unrecognised filters nothing,
 * because guessing wrong here deletes evidence.
 */
const INTERIOR_ROOM_TYPES = new Set([
  'kitchen',
  'bathroom',
  'bedroom',
  'living_room',
  'hallway',
  'dining_room',
  'office',
  'utility',
  'toilet',
  'landing',
]);

/** Whether the frames were definitely shot inside a room. */
export function isInteriorWalkthrough(
  context: AssessmentContext | undefined
): boolean {
  const type = context?.room?.type?.trim().toLowerCase();
  if (!type) return false;
  return INTERIOR_ROOM_TYPES.has(type);
}

const norm = (s?: string): string =>
  (s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

/** Whether this element could appear in an interior frame. */
export function isElementVisibleIndoors(element: string): boolean {
  return !NOT_VISIBLE_FROM_INSIDE.has(norm(element));
}

export interface PlausibilityResult {
  findings: AssessmentFinding[];
  /** Findings removed, for logging — never silently discarded. */
  dropped: AssessmentFinding[];
}

/**
 * Remove findings naming an element the camera could not have seen.
 *
 * A `dangerous` finding is kept even when implausible, on the same principle as
 * everywhere else in this pipeline: a spurious hazard wastes somebody's time,
 * while a deleted one can hurt them. It stays, marked `unconfirmed` so the UI
 * shows it as uncorroborated rather than as an established fact.
 */
export function filterImplausibleElements(
  findings: AssessmentFinding[] | undefined,
  context: AssessmentContext | undefined
): PlausibilityResult {
  if (!findings?.length) return { findings: findings ?? [], dropped: [] };
  if (!isInteriorWalkthrough(context)) {
    return { findings, dropped: [] };
  }

  const kept: AssessmentFinding[] = [];
  const dropped: AssessmentFinding[] = [];

  for (const f of findings) {
    if (isElementVisibleIndoors(f.element)) {
      kept.push(f);
      continue;
    }
    if (f.severity === 'dangerous') {
      kept.push({ ...f, unconfirmed: true });
      continue;
    }
    dropped.push(f);
  }

  return { findings: kept, dropped };
}
