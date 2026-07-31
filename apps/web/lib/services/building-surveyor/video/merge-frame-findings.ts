/**
 * Cross-frame findings merge for the VLM-native video walkthrough.
 *
 * A walkthrough is assessed frame-by-frame through the normal surveyor
 * pipeline, so the same physical defect is reported in several consecutive
 * frames. This collapses those per-frame findings into one property-level
 * survey: cluster by defect identity (same as compareFindings — taxonomy
 * class, else element+damageType), keep ONE representative per cluster, then
 * derive the primary + worst condition rating via normalizeFindings.
 *
 * Safety-first: a defect's merged severity/conditionRating is the WORST any
 * frame assigned it (never downgrade a hazard one frame saw clearly), while
 * its confidence is the BEST sighting (the clearest frame).
 */
import type {
  AssessmentFinding,
  DamageSeverity,
  RICSConditionRating,
} from '../types';
import { normalizeFindings } from '../findings-utils';

const SEVERITY_RANK: Record<DamageSeverity, number> = {
  early: 0,
  developing: 1,
  significant: 2,
  dangerous: 3,
};

const norm = (s?: string): string => (s ?? '').trim().toLowerCase();

/**
 * Every identity a finding answers to.
 *
 * Previously this returned ONE key, preferring taxonomy when present — so two
 * findings with the identical element and damageType landed in different
 * clusters whenever their taxonomy ids happened to differ. A real walkthrough
 * showed the effect: "main_walls / no visible damage" appeared twice in the
 * same survey, saying the same thing about the same wall.
 *
 * A finding now answers to both its element+damageType and its taxonomy class,
 * and clusters are unioned when they share either. Element is part of the key
 * because the same damage type on two elements is two defects.
 */
function identityKeys(f: AssessmentFinding): string[] {
  const keys = [`dt:${norm(f.element)}::${norm(f.damageType)}`];
  if (f.taxonomyClassId) keys.push(`tax:${norm(f.taxonomyClassId)}`);
  return keys;
}

/**
 * Frames a walkthrough needs before a lone sighting counts as weak evidence.
 *
 * Below this, "seen in one frame" carries no information — in a 2-frame walk
 * it is unremarkable. At 3+, eleven frames declining to see what one frame
 * reported is a signal worth showing.
 */
const MIN_FRAMES_FOR_CORROBORATION = 3;

/**
 * Severities that a lone sighting is NOT allowed to soften.
 *
 * Demoting a one-frame "exposed live wiring" to "no repair needed" is how
 * somebody gets hurt. Serious tiers keep their severity and are labelled
 * unconfirmed instead — the reader is told the evidence is thin without the
 * hazard being talked down.
 */
const UNDEMOTABLE: ReadonlySet<DamageSeverity> = new Set<DamageSeverity>([
  'significant',
  'dangerous',
]);

export interface FrameAssessmentInput {
  findings?: AssessmentFinding[];
  sceneSummary?: string;
  needsOnsiteInspection?: boolean;
}

export interface MergedWalkthrough {
  findings: AssessmentFinding[];
  primary?: AssessmentFinding;
  worstConditionRating?: RICSConditionRating;
  sceneSummary?: string;
  needsOnsiteInspection: boolean;
  frameCount: number;
  /** How many of the frames yielded any usable finding. */
  framesWithFindings: number;
}

/** Most sentences a merged scene summary may carry. */
const MAX_SUMMARY_SENTENCES = 3;

/**
 * Collapse per-frame scene summaries into something a person can read.
 *
 * Twelve frames of one room produce twelve restatements of the same sentence
 * with small wording differences, so exact-string dedupe removes nothing.
 * Comparison is on a normalised form (lowercased, punctuation and filler
 * stripped) to catch "Room appears to be in good condition with no visible
 * defects." against "The room appears to be in good condition with no visible
 * defects" — while the original wording is what gets kept.
 */
function dedupeSummaries(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw) {
    const key = s
      .toLowerCase()
      .replace(/^(the|a)\s+/, '')
      .replace(/[.,;:!?]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(s.replace(/\s*\.?\s*$/, '.'));
    if (out.length >= MAX_SUMMARY_SENTENCES) break;
  }
  return out;
}

function worstSeverity(group: AssessmentFinding[]): DamageSeverity {
  return group.reduce<DamageSeverity>(
    (worst, f) =>
      SEVERITY_RANK[f.severity] > SEVERITY_RANK[worst] ? f.severity : worst,
    'early'
  );
}

function worstRating(
  group: AssessmentFinding[]
): RICSConditionRating | undefined {
  const ratings = group
    .map((g) => g.conditionRating)
    .filter((r): r is RICSConditionRating => r === 1 || r === 2 || r === 3);
  return ratings.length > 0
    ? (Math.max(...ratings) as RICSConditionRating)
    : undefined;
}

export function mergeFrameFindings(
  frames: FrameAssessmentInput[]
): MergedWalkthrough {
  // Collect every finding across all frames, stamping each with the frame it
  // came from. The array position IS the frame index — it matches the order
  // frames were uploaded, and therefore assessment_images.image_index.
  const all: AssessmentFinding[] = [];
  let framesWithFindings = 0;
  frames.forEach((frame, frameIndex) => {
    const f = frame.findings ?? [];
    if (f.length > 0) framesWithFindings++;
    for (const finding of f) {
      all.push({ ...finding, sourceFrameIndex: frameIndex });
    }
  });

  // Cluster by defect identity, unioning any findings that share ANY identity.
  // Union-find rather than a plain keyed map because a finding has two possible
  // identities (element+damageType, taxonomy class) and either can be the one
  // that proves two sightings are the same defect.
  const parent = all.map((_, i) => i);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root]!;
    while (parent[i] !== root) {
      const next = parent[i]!;
      parent[i] = root;
      i = next;
    }
    return root;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  const firstSeenAt = new Map<string, number>();
  all.forEach((f, i) => {
    for (const key of identityKeys(f)) {
      const seen = firstSeenAt.get(key);
      if (seen === undefined) firstSeenAt.set(key, i);
      else union(seen, i);
    }
  });

  const clusters = new Map<number, AssessmentFinding[]>();
  all.forEach((f, i) => {
    const root = find(i);
    const existing = clusters.get(root);
    if (existing) existing.push(f);
    else clusters.set(root, [f]);
  });

  // One representative per cluster: richest description from the most severe /
  // most confident sighting, but severity/condition = worst, confidence = best.
  const reps: AssessmentFinding[] = [];
  for (const group of clusters.values()) {
    const base = [...group].sort((a, b) => {
      const s = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      return s !== 0 ? s : (b.confidence ?? 0) - (a.confidence ?? 0);
    })[0];
    // Provenance for the merged defect. `base` is the sighting whose wording
    // is kept, so its frame is the one to show beside the description; the
    // full list says how many frames saw the same thing, which is the
    // difference between a one-frame guess and a repeated observation.
    const sightingFrames = Array.from(
      new Set(
        group
          .map((g) => g.sourceFrameIndex)
          .filter((i): i is number => typeof i === 'number')
      )
    ).sort((a, b) => a - b);

    // What the frames actually said, before any corroboration adjustment.
    const rawSeverity = worstSeverity(group);
    const rawRating = worstRating(group) ?? base.conditionRating;

    // RICS rating 1 means no repair is needed, so an early/1 reading is the
    // absence of a defect. Computed from the raw group, before demotion, or a
    // demoted defect would masquerade as a clean bill of health.
    const isClear = rawSeverity === 'early' && (rawRating ?? 1) === 1;

    // One frame out of many saw this and the rest did not.
    const unconfirmed =
      !isClear &&
      sightingFrames.length === 1 &&
      frames.length >= MIN_FRAMES_FOR_CORROBORATION;

    // Speculative low-tier readings stop carrying the weight of a corroborated
    // defect; serious tiers are labelled, never talked down.
    const demote = unconfirmed && !UNDEMOTABLE.has(rawSeverity);

    reps.push({
      ...base,
      severity: demote ? 'early' : rawSeverity,
      conditionRating: demote ? 1 : rawRating,
      confidence: Math.max(...group.map((g) => g.confidence ?? 0)),
      isPrimary: false,
      sourceFrameIndex: base.sourceFrameIndex,
      ...(sightingFrames.length > 0
        ? { sourceFrameIndexes: sightingFrames }
        : {}),
      ...(isClear ? { isClear: true } : {}),
      ...(unconfirmed ? { unconfirmed: true } : {}),
    });
  }

  // Real defects ahead of clean readings before the primary is picked, so a
  // tie on severity can never mirror "no visible damage" into the survey's
  // headline fields.
  reps.sort((a, b) => {
    const clear = Number(a.isClear ?? false) - Number(b.isClear ?? false);
    if (clear !== 0) return clear;
    return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  });

  // Derive primary + worst rating across the merged set.
  const normalized = normalizeFindings(reps, {});

  // Combine scene summaries.
  //
  // This used to be `join(' ')` over exact-unique strings, which on a 12-frame
  // walk produced a paragraph that contradicted itself sentence by sentence:
  // "Room appears to be in good condition with no visible defects. Room appears
  // to have discoloration on the ceiling..." Near-identical restatements now
  // collapse, and the result is capped so the summary stays a summary.
  const summaries = dedupeSummaries(
    frames
      .map((f) => f.sceneSummary?.trim())
      .filter((s): s is string => Boolean(s))
  );

  return {
    findings: normalized.findings,
    primary: normalized.primary,
    worstConditionRating: normalized.worstConditionRating,
    sceneSummary: summaries.length > 0 ? summaries.join(' ') : undefined,
    // Conservative: if any frame could not be assessed reliably, flag the walk.
    needsOnsiteInspection: frames.some((f) => f.needsOnsiteInspection),
    frameCount: frames.length,
    framesWithFindings,
  };
}
