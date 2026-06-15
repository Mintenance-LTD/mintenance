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
 * Defect identity for clustering. Same taxonomy class = same defect; else
 * element+damageType. Element IS part of the key here (unlike the pairwise
 * comparison) because the same damage type on two different elements is two
 * distinct defects to merge separately.
 */
function identityKey(f: AssessmentFinding): string {
  if (f.taxonomyClassId) return `tax:${f.taxonomyClassId}`;
  return `dt:${norm(f.element)}::${norm(f.damageType)}`;
}

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
  // Collect every finding across all frames.
  const all: AssessmentFinding[] = [];
  let framesWithFindings = 0;
  for (const frame of frames) {
    const f = frame.findings ?? [];
    if (f.length > 0) framesWithFindings++;
    all.push(...f);
  }

  // Cluster by defect identity.
  const clusters = new Map<string, AssessmentFinding[]>();
  for (const f of all) {
    const key = identityKey(f);
    const existing = clusters.get(key);
    if (existing) existing.push(f);
    else clusters.set(key, [f]);
  }

  // One representative per cluster: richest description from the most severe /
  // most confident sighting, but severity/condition = worst, confidence = best.
  const reps: AssessmentFinding[] = [];
  for (const group of clusters.values()) {
    const base = [...group].sort((a, b) => {
      const s = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      return s !== 0 ? s : (b.confidence ?? 0) - (a.confidence ?? 0);
    })[0];
    reps.push({
      ...base,
      severity: worstSeverity(group),
      conditionRating: worstRating(group) ?? base.conditionRating,
      confidence: Math.max(...group.map((g) => g.confidence ?? 0)),
      isPrimary: false,
    });
  }

  // Derive primary + worst rating across the merged set.
  const normalized = normalizeFindings(reps, {});

  // Combine distinct scene summaries.
  const summaries = Array.from(
    new Set(
      frames
        .map((f) => f.sceneSummary?.trim())
        .filter((s): s is string => Boolean(s))
    )
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
