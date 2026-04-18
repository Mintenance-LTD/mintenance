/**
 * Learning card catalogue — the 60-second how-to videos the mobile app
 * surfaces during contractor onboarding, and the /learn web page lists.
 *
 * R3 #20 of docs/RETENTION_ROADMAP_2026.md. Videos for R3 are placeholders
 * (videoUrl = null). Content production lands external to the codebase
 * and updates videoUrl inline here.
 */

export interface LearningCard {
  id: string;
  audience: 'contractor' | 'homeowner' | 'all';
  title: string;
  description: string;
  durationSeconds: number;
  videoUrl: string | null;
  thumbnail: string | null;
}

export const LEARNING_CARDS: LearningCard[] = [
  {
    id: 'contractor-before-photo',
    audience: 'contractor',
    title: 'How to take a before-photo',
    description:
      'A 60-second walk-through of composition, lighting, and the 100m GPS check. Skip this only if you have shipped work on Mintenance before.',
    durationSeconds: 60,
    videoUrl: null,
    thumbnail: null,
  },
  {
    id: 'contractor-stripe-connect',
    audience: 'contractor',
    title: 'What Stripe Connect asks for',
    description:
      'Exactly which documents Stripe needs before your first payout — ID, proof of address, bank details — and how long each step takes.',
    durationSeconds: 60,
    videoUrl: null,
    thumbnail: null,
  },
];
