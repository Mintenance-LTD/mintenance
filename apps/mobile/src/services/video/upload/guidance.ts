import type { VideoGuidancePhase } from './types';

/**
 * Walkthrough guidance phases shown to homeowners during a property
 * video capture. Extracted from VideoService.ts on 2026-05-09 — pure
 * data, no behaviour, so it lives in its own module.
 *
 * Total target duration: 60s = 15 + 20 + 20 + 5.
 */
export const VIDEO_GUIDANCE_PHASES: readonly VideoGuidancePhase[] = [
  {
    phase: 'exterior',
    title: 'Exterior Overview',
    duration: 15,
    instructions: [
      'Start with a wide shot of the property',
      'Slowly pan across the front facade',
      'Focus on roof, walls, and foundation',
      'Capture any visible exterior damage',
    ],
    tips: [
      'Keep camera steady',
      'Move slowly for better AI analysis',
      'Ensure good lighting',
    ],
  },
  {
    phase: 'interior',
    title: 'Interior Walkthrough',
    duration: 20,
    instructions: [
      'Walk through main living areas',
      'Point camera at ceilings and walls',
      'Focus on high-risk areas (bathrooms, kitchen)',
      'Capture plumbing and electrical fixtures',
    ],
    tips: [
      'Turn on all lights',
      'Open curtains for natural light',
      'Move systematically room by room',
    ],
  },
  {
    phase: 'damage_detail',
    title: 'Damage Details',
    duration: 20,
    instructions: [
      'Zoom in on any visible damage',
      'Hold camera steady for 3-5 seconds per area',
      'Capture different angles of damage',
      'Include context around damage areas',
    ],
    tips: [
      'Use flashlight for dark areas',
      'Get close but maintain focus',
      'Narrate what you see (audio helps AI)',
    ],
  },
  {
    phase: 'overview',
    title: 'Final Overview',
    duration: 5,
    instructions: [
      'Quick recap of main areas',
      'Any missed critical points',
      'Overall property condition shot',
    ],
    tips: ['Summarize key findings', 'End with exterior shot'],
  },
];
