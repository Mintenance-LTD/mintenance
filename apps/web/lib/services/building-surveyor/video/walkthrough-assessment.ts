/**
 * Video walkthrough orchestration (Phase B2).
 *
 * A walkthrough is a set of keyframes. Each frame runs through the normal
 * surveyor pipeline (skipCapture — no per-frame shadow), the per-frame results
 * are assembled into one property survey (buildWalkthroughAssessment), and the
 * CALLER fires ONE shadow on the merged result + persists the row.
 *
 * No SAM2: the surveyor VLM already turns frames into findings[].
 */
import { logger } from '@mintenance/shared';
import type { AssessmentContext, Phase1BuildingAssessment } from '../types';
import { buildWalkthroughAssessment } from './build-walkthrough-assessment';
import { filterImplausibleElements } from './element-plausibility';

export type FrameAssessor = (
  imageUrls: string[],
  context?: AssessmentContext
) => Promise<Phase1BuildingAssessment>;

/** Default: the full surveyor pipeline per frame, with per-frame capture skipped. */
async function defaultAssessFrame(
  imageUrls: string[],
  context?: AssessmentContext
): Promise<Phase1BuildingAssessment> {
  const { BuildingSurveyorService } = await import('..');
  return BuildingSurveyorService.assessDamage(imageUrls, context, {
    skipCapture: true,
  });
}

/** Bounded-concurrency map that preserves order and never drops items. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workerCount = Math.min(Math.max(1, limit), items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    for (let i = next++; i < items.length; i = next++) {
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/** One usable frame: the URL that was assessed and its per-frame survey. */
export interface FrameAssessmentResult {
  url: string;
  assessment: Phase1BuildingAssessment;
}

export interface WalkthroughResult {
  /** Merged property survey, or null if no frame could be assessed. */
  assessment: Phase1BuildingAssessment | null;
  /**
   * Per-frame results for the frames that assessed cleanly (order-preserved,
   * failed frames dropped). The caller persists ONE merged row but records the
   * teacher corpus PER FRAME — pairing each frame's findings with that frame's
   * own pixels, never the merged set (which would teach the student to
   * hallucinate defects seen only in other frames).
   */
  perFrameAssessments: FrameAssessmentResult[];
  frameCount: number;
  framesAssessed: number;
  /** Frames deliberately skipped for quality, as opposed to ones that failed. */
  framesSkippedForQuality: number;
}

/**
 * Assess a walkthrough's keyframes and merge into one property survey.
 * Frame failures are logged and skipped (one bad frame must not sink the walk).
 */
export async function assessWalkthrough(
  frameUrls: string[],
  context?: AssessmentContext,
  opts?: {
    concurrency?: number;
    assessFrame?: FrameAssessor;
    /**
     * Frames to leave unassessed, by index — too blurry or too dark to carry
     * signal (see frame-quality.ts). They become holes rather than being
     * removed, so every surviving finding keeps its real frame index, and each
     * skip saves a vision call.
     */
    skipFrames?: ReadonlySet<number>;
  }
): Promise<WalkthroughResult> {
  const assessFrame = opts?.assessFrame ?? defaultAssessFrame;
  const concurrency = Math.max(1, opts?.concurrency ?? 3);
  const skipFrames = opts?.skipFrames;

  const perFrame = await mapWithConcurrency(
    frameUrls,
    concurrency,
    async (url, index) => {
      if (skipFrames?.has(index)) {
        logger.info('Walkthrough frame not assessed — unassessable quality', {
          service: 'WalkthroughAssessment',
          index,
        });
        return null;
      }
      try {
        // Tell the model this is one frame of many. Without it the surveyor
        // prompt's "report EVERY defect visible" runs once per frame, which on
        // a 12-frame room walk is a dozen independent invitations to find
        // something — and the merge keeps the worst answer of the dozen.
        const assessed = await assessFrame([url], {
          ...context,
          walkthroughFrame: { index, total: frameUrls.length },
        });

        // Drop claims about elements this frame cannot contain — a roof
        // diagnosed from inside a bedroom. Applied per frame so the dropped
        // finding never reaches the merge OR the teacher corpus: training the
        // student on "ceiling patch means roof failure" would bake the mistake
        // in permanently.
        const plausible = filterImplausibleElements(
          assessed?.findings,
          context
        );
        if (plausible.dropped.length > 0) {
          logger.info('Walkthrough findings dropped — element not in view', {
            service: 'WalkthroughAssessment',
            index,
            roomType: context?.room?.type,
            dropped: plausible.dropped.map((f) => ({
              element: f.element,
              damageType: f.damageType,
              severity: f.severity,
            })),
          });
          return { ...assessed, findings: plausible.findings };
        }
        return assessed;
      } catch (err) {
        logger.warn('Walkthrough frame assessment failed (skipped)', {
          service: 'WalkthroughAssessment',
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      }
    }
  );

  // Pair each result with the frame URL that produced it (order-preserved by
  // mapWithConcurrency), then drop the frames that failed.
  const pairs: FrameAssessmentResult[] = perFrame
    .map((assessment, i) => ({ url: frameUrls[i], assessment }))
    .filter((p): p is FrameAssessmentResult => p.assessment != null);

  return {
    // POSITIONAL, holes included — not `pairs`. A finding's sourceFrameIndex is
    // its position here, and that index is used to look the frame up in
    // assessment_images. Passing the compacted list shifted every index after a
    // failed frame, pointing findings at the wrong photograph.
    assessment: buildWalkthroughAssessment(perFrame),
    perFrameAssessments: pairs,
    frameCount: frameUrls.length,
    framesAssessed: pairs.length,
    framesSkippedForQuality: skipFrames?.size ?? 0,
  };
}
