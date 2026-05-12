/**
 * Keyword-based job draft classifier (V1).
 *
 * Takes a free-text description and returns the structured fields the
 * /jobs/create wizard expects: title, category, urgency, optional
 * budget range.
 *
 * Deliberately deterministic so the API can return without an LLM
 * round-trip (no OPENAI_API_KEY dependency, no rate-limit risk, no
 * prompt-injection surface). When the Mint AI VLM flag flips, the
 * /api/ai/job-draft route can swap this for a model call behind the
 * same contract.
 */

import { JOB_CATEGORIES } from '@/app/jobs/create/constants';

type Category = (typeof JOB_CATEGORIES)[number]['value'];
type Urgency = 'low' | 'medium' | 'high' | 'emergency';

export interface JobDraft {
  title: string;
  category: Category;
  urgency: Urgency;
  description: string;
  budgetMin?: number;
  budgetMax?: number;
}

/**
 * Ordered keyword map. First match wins, so put the more specific
 * categories before the catch-alls. Roofing before flooring (both
 * contain "tile") is the canonical trap.
 */
const CATEGORY_KEYWORDS: Array<[Category, string[]]> = [
  [
    'plumbing',
    [
      'plumb',
      'leak',
      'leaking',
      'burst pipe',
      'pipe',
      'tap',
      'faucet',
      'toilet',
      'drain',
      'drainage',
      'sink',
      'shower',
      'bath',
      'water pressure',
      'damp',
      'flood',
    ],
  ],
  [
    'electrical',
    [
      'electric',
      'electrical',
      'socket',
      'plug',
      'outlet',
      'wiring',
      'circuit',
      'breaker',
      'fuse',
      'light switch',
      'lighting',
      'power cut',
      'no power',
      'spark',
    ],
  ],
  [
    'heating',
    [
      'boiler',
      'radiator',
      'thermostat',
      'gas leak',
      'no hot water',
      'no heating',
      'heating',
      'pilot light',
      'central heating',
      'gas',
    ],
  ],
  [
    'hvac',
    [
      'aircon',
      'air con',
      'air conditioning',
      'a/c unit',
      'ac unit',
      'ventilation',
      'duct',
      'extractor fan',
    ],
  ],
  [
    'roofing',
    [
      'roof',
      'roofing',
      'roof tile',
      'gutter',
      'chimney',
      'slate',
      'flashing',
      'soffit',
      'fascia',
    ],
  ],
  [
    'flooring',
    [
      'floor',
      'flooring',
      'laminate',
      'carpet',
      'vinyl',
      'lino',
      'parquet',
      'floorboard',
    ],
  ],
  [
    'carpentry',
    [
      'door',
      'window frame',
      'wood',
      'timber',
      'rot',
      'rotten',
      'cabinet',
      'shelf',
      'shelves',
      'skirting',
      'architrave',
      'staircase',
      'banister',
    ],
  ],
  [
    'painting',
    [
      'paint',
      'painting',
      'repaint',
      'decorate',
      'decorating',
      'render',
      'rendering',
      'plaster',
      'wallpaper',
    ],
  ],
  [
    'gardening',
    [
      'garden',
      'lawn',
      'hedge',
      'fence',
      'fencing',
      'tree',
      'weed',
      'turf',
      'patio',
      'decking',
      'shed',
      'flower bed',
      'pond',
    ],
  ],
  [
    'cleaning',
    [
      'clean',
      'cleaning',
      'mould',
      'mold',
      'mildew',
      'oven clean',
      'deep clean',
      'end of tenancy',
    ],
  ],
  [
    'handyman',
    [
      'shelf bracket',
      'curtain rail',
      'tv mount',
      'mount',
      'assemble',
      'flat pack',
      'odd job',
      'odd jobs',
      'handyman',
      'general repair',
    ],
  ],
];

const URGENCY_KEYWORDS: Array<[Urgency, string[]]> = [
  [
    'emergency',
    [
      'emergency',
      'asap',
      'immediately',
      'right now',
      'flooding',
      'gas leak',
      'no heating',
      'no hot water',
      'sparking',
      'dangerous',
      'unsafe',
      'live wire',
    ],
  ],
  [
    'high',
    [
      'urgent',
      'today',
      'tomorrow',
      'this evening',
      'tonight',
      'this morning',
      "can't wait",
      'cannot wait',
      'soon as',
    ],
  ],
  [
    'medium',
    ['this week', 'next week', 'few days', 'a couple of days', 'within days'],
  ],
  [
    'low',
    [
      'no rush',
      'no hurry',
      'flexible',
      'when convenient',
      'eventually',
      'someday',
    ],
  ],
];

/**
 * Pull a budget hint out of natural-language money expressions. Returns
 * either a single point (interpreted as midpoint) or a range. Drops
 * everything if the parse is ambiguous so the downstream form just
 * stays empty rather than seeding a wrong number.
 */
function parseBudget(text: string): { min: number; max: number } | undefined {
  const t = text.toLowerCase();
  // £120 - £180  OR  £120-180  OR  £120 to £180
  const rangeRe = /£\s?(\d{2,5})(?:\s*[-–to]+\s*£?\s?(\d{2,5}))/i;
  const range = t.match(rangeRe);
  if (range && range[1] && range[2]) {
    const a = parseInt(range[1], 10);
    const b = parseInt(range[2], 10);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > a) {
      return { min: a, max: b };
    }
  }
  // £150 (single value)
  const singleRe = /£\s?(\d{2,5})\b/;
  const single = t.match(singleRe);
  if (single && single[1]) {
    const v = parseInt(single[1], 10);
    if (Number.isFinite(v) && v > 0) {
      return {
        min: Math.max(50, Math.round(v * 0.8)),
        max: Math.round(v * 1.2),
      };
    }
  }
  return undefined;
}

function inferCategory(text: string): Category {
  const t = text.toLowerCase();
  for (const [cat, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => t.includes(k))) return cat;
  }
  return 'other';
}

function inferUrgency(text: string): Urgency {
  const t = text.toLowerCase();
  for (const [u, keywords] of URGENCY_KEYWORDS) {
    if (keywords.some((k) => t.includes(k))) return u;
  }
  return 'medium';
}

/**
 * Build a short title from the description. Strategy:
 *   1. Take the first sentence (split on . ! ? or newline).
 *   2. Trim, drop trailing punctuation, sentence-case.
 *   3. Cap at 60 characters with an ellipsis if longer.
 * Falls back to "<Category> job" if the description is empty.
 */
function inferTitle(description: string, category: Category): string {
  const cleaned = description.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    const cat =
      JOB_CATEGORIES.find(
        (c: { value: string; label: string }) => c.value === category
      )?.label ?? 'Job';
    return `${cat} job`;
  }
  const firstSentence = cleaned.split(/[.!?\n]/)[0]?.trim() ?? cleaned;
  const sentenceCased =
    firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
  if (sentenceCased.length <= 60) return sentenceCased;
  return sentenceCased.slice(0, 57).trimEnd() + '…';
}

export function classifyJobDraft(rawDescription: string): JobDraft {
  const description = rawDescription.trim();
  const category = inferCategory(description);
  const urgency = inferUrgency(description);
  const budget = parseBudget(description);
  return {
    title: inferTitle(description, category),
    category,
    urgency,
    description,
    ...(budget ? { budgetMin: budget.min, budgetMax: budget.max } : {}),
  };
}
