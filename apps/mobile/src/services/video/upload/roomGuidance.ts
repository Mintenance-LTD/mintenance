import type { VideoGuidancePhase } from './types';

/**
 * Guidance for a walkthrough scoped to a single room.
 *
 * The whole-property script (VIDEO_GUIDANCE_PHASES) is a fixed 60-second
 * sequence — exterior, interior, damage, recap — advanced purely by a timer.
 * It assumes everyone starts outside and walks a prescribed route, so someone
 * filming their kitchen is told to "pan across the front facade". It cannot be
 * accurate, because it has no idea where the person is standing.
 *
 * A room-scoped walkthrough does know, so the instructions can name real
 * things to point the camera at. Shorter clips also analyse better: ~20s of a
 * single room yields a handful of tightly-framed keyframes instead of a dozen
 * smeared across a house, and a shaky room only costs that room.
 */

/** One room is a short clip, not a survey. */
const ROOM_DURATION_SECONDS = 20;

const GENERIC_INSTRUCTIONS = [
  'Start in the doorway with a wide shot',
  'Pan slowly along each wall',
  'Tilt up to the ceiling and into the corners',
  'Hold on anything that looks damaged',
];

/**
 * Where damage actually shows up, room by room. Written as things to point at
 * rather than survey vocabulary — "open the cupboard under the sink" beats
 * "inspect concealed pipework".
 */
const BY_ROOM_TYPE: Record<string, string[]> = {
  kitchen: [
    'Pan across the worktops and units',
    'Open the cupboard under the sink and film inside',
    'Show the extractor, and the wall behind the hob',
    'Follow the floor where it meets the units',
  ],
  bathroom: [
    'Wide shot from the doorway',
    'Pan around the bath, shower and basin',
    'Close in on sealant, grout and the ceiling',
    'Look for staining, mould or peeling paint',
  ],
  bedroom: [
    'Wide shot from the doorway',
    'Pan along each wall, especially external ones',
    'Film around the window frame and sill',
    'Tilt down to the skirting and into the corners',
  ],
  living_room: [
    'Wide shot from the doorway',
    'Pan along each wall and across the ceiling',
    'Film around windows, radiators and any fireplace',
    'Tilt down to the skirting and into the corners',
  ],
  dining_room: [
    'Wide shot from the doorway',
    'Pan along each wall and across the ceiling',
    'Film around windows and radiators',
    'Tilt down to the skirting and into the corners',
  ],
  hallway: [
    'Start at the front door and film inwards',
    'Pan up the stair walls if there are stairs',
    'Show the ceiling and any hatch',
    'Film around the door frame and threshold',
  ],
  utility: [
    'Wide shot from the doorway',
    'Film the boiler, meters and any pipework',
    'Show behind and under the appliances',
    'Follow the floor for any signs of a leak',
  ],
  garage: [
    'Wide shot from the doorway',
    'Pan across the walls and up to the roof',
    'Film the door mechanism and its frame',
    'Show the floor and where it meets the walls',
  ],
  office: GENERIC_INSTRUCTIONS,
  garden: [
    'Wide shot of the whole garden',
    'Pan along fences and boundary walls',
    'Film drains, gullies and any standing water',
    'Show outbuildings and where they meet the ground',
  ],
  exterior: [
    'Wide shot of the whole elevation',
    'Pan slowly across the facade',
    'Follow the roofline, gutters and downpipes',
    'Film where the wall meets the ground',
  ],
  roof: [
    'Wide shot of the roof from ground level',
    'Pan along the ridge and both slopes',
    'Film the gutters, flashing and any chimney',
    'Hold on slipped or missing tiles',
  ],
  other: GENERIC_INSTRUCTIONS,
};

const TIPS = [
  'Move slowly — blur is what loses detail',
  'Turn the lights on, even in daytime',
  'Hold 3–5 seconds on anything damaged',
];

/**
 * Build the single guidance phase for a room.
 *
 * Falls back to generic room instructions for any type without a specific
 * list, so a new room type in the database never leaves the recorder blank.
 */
export function roomGuidancePhase(
  roomType: string | undefined,
  roomName: string | undefined
): VideoGuidancePhase {
  const instructions =
    (roomType && BY_ROOM_TYPE[roomType]) || GENERIC_INSTRUCTIONS;

  return {
    phase: 'room',
    title: roomName?.trim() || 'This room',
    duration: ROOM_DURATION_SECONDS,
    instructions,
    tips: TIPS,
  };
}

export const ROOM_WALKTHROUGH_SECONDS = ROOM_DURATION_SECONDS;
