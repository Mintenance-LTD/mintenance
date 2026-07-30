/**
 * Decide which walkthrough frames are worth assessing.
 *
 * A handheld video of one room yields frames of wildly different value: some
 * are a clear view of a wall, others are a motion-blurred smear of a corner or a
 * near-black ceiling. Every frame used to get an equal vote, and an
 * unassessable one is not a neutral vote — asked to report every defect it can
 * see, a model handed a grey blur will find something in it. Noise in, findings
 * out.
 *
 * ImageQualityService has computed exactly the metrics needed for this since it
 * was written (Laplacian variance for sharpness, brightness histogram for
 * exposure) and the walkthrough never called it.
 *
 * Skipping also saves a vision call per excluded frame, which is real money on a
 * 20-frame walk.
 *
 * THRESHOLDS ARE PROVISIONAL. They are set to exclude only frames that are
 * plainly unassessable, because wrongly excluding a frame loses real evidence,
 * which is the worse error. Every frame's metrics are logged so they can be
 * tuned against real walkthroughs rather than guessed at twice.
 */

/** The subset of ImageQualityService's metrics this decision needs. */
export interface FrameQualityMetrics {
  /** 0-1, higher = sharper (Laplacian variance, normalised). */
  imageClarity: number;
  /** 0-1, higher = better exposed. */
  lightingQuality: number;
  /** 0-1 mean luminance. */
  averageBrightness: number;
}

/**
 * Sharpness floor. imageClarity is laplacianVariance/2000 clamped, so 0.10 is a
 * variance of ~200 — the service's own comment puts "blurry" under 100 and
 * "sharp" over 1000, so this sits deliberately close to the blurry end.
 */
export const MIN_IMAGE_CLARITY = 0.1;

/** Below this the frame is essentially black; there is nothing in it to survey. */
export const MIN_AVERAGE_BRIGHTNESS = 0.08;

/** Above this it is blown out — detail is clipped away, not merely bright. */
export const MAX_AVERAGE_BRIGHTNESS = 0.96;

export type FrameExclusionReason = 'too_blurry' | 'too_dark' | 'blown_out';

export interface FrameVerdict {
  assessable: boolean;
  reason?: FrameExclusionReason;
}

/**
 * Whether a single frame carries enough signal to survey.
 *
 * Missing or non-finite metrics count as assessable: an absent measurement is
 * not evidence of a bad frame, and defaulting the other way would silently drop
 * whole walkthroughs if metric extraction regressed.
 */
export function isFrameAssessable(
  metrics: FrameQualityMetrics | undefined | null
): FrameVerdict {
  if (!metrics) return { assessable: true };

  const { imageClarity, averageBrightness } = metrics;

  if (Number.isFinite(averageBrightness)) {
    if (averageBrightness < MIN_AVERAGE_BRIGHTNESS) {
      return { assessable: false, reason: 'too_dark' };
    }
    if (averageBrightness > MAX_AVERAGE_BRIGHTNESS) {
      return { assessable: false, reason: 'blown_out' };
    }
  }

  if (Number.isFinite(imageClarity) && imageClarity < MIN_IMAGE_CLARITY) {
    return { assessable: false, reason: 'too_blurry' };
  }

  return { assessable: true };
}

export interface FrameSelection {
  /** Indices to skip. Positional against the frame list that was measured. */
  skip: ReadonlySet<number>;
  /** What was excluded and why, for logging and for telling the user. */
  excluded: { index: number; reason: FrameExclusionReason }[];
  /**
   * True when too few frames survived to exclude anything, so nothing was
   * skipped and the survey should be treated as made from poor material.
   */
  degraded: boolean;
}

/**
 * Choose which frames to assess.
 *
 * The load-bearing rule is the fallback: if excluding the bad frames would leave
 * fewer than `minFrames`, nothing is excluded and `degraded` is set instead. A
 * survey built from poor frames and flagged as such is more use to somebody than
 * no survey at all after they have walked round a room filming — but it must not
 * pretend the material was good.
 */
export function selectAssessableFrames(
  metrics: (FrameQualityMetrics | undefined | null)[],
  minFrames: number
): FrameSelection {
  const excluded: { index: number; reason: FrameExclusionReason }[] = [];

  metrics.forEach((m, index) => {
    const verdict = isFrameAssessable(m);
    if (!verdict.assessable && verdict.reason) {
      excluded.push({ index, reason: verdict.reason });
    }
  });

  const survivors = metrics.length - excluded.length;

  if (excluded.length === 0) {
    return { skip: new Set(), excluded: [], degraded: false };
  }

  if (survivors < minFrames) {
    // Not enough good material to be choosy. Assess everything and say so.
    return { skip: new Set(), excluded, degraded: true };
  }

  return {
    skip: new Set(excluded.map((e) => e.index)),
    excluded,
    degraded: false,
  };
}

/** Human-readable reason, for onsiteInspectionReason. */
export function describeExclusions(
  excluded: { reason: FrameExclusionReason }[]
): string {
  const counts = new Map<FrameExclusionReason, number>();
  for (const e of excluded) {
    counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1);
  }
  const label: Record<FrameExclusionReason, string> = {
    too_blurry: 'too blurry to assess',
    too_dark: 'too dark to assess',
    blown_out: 'over-exposed',
  };
  return Array.from(counts.entries())
    .map(([reason, n]) => `${n} ${label[reason]}`)
    .join(', ');
}
