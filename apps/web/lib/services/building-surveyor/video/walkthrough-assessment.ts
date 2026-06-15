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
}

/**
 * Assess a walkthrough's keyframes and merge into one property survey.
 * Frame failures are logged and skipped (one bad frame must not sink the walk).
 */
export async function assessWalkthrough(
  frameUrls: string[],
  context?: AssessmentContext,
  opts?: { concurrency?: number; assessFrame?: FrameAssessor }
): Promise<WalkthroughResult> {
  const assessFrame = opts?.assessFrame ?? defaultAssessFrame;
  const concurrency = Math.max(1, opts?.concurrency ?? 3);

  const perFrame = await mapWithConcurrency(
    frameUrls,
    concurrency,
    async (url) => {
      try {
        return await assessFrame([url], context);
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
    assessment: buildWalkthroughAssessment(pairs.map((p) => p.assessment)),
    perFrameAssessments: pairs,
    frameCount: frameUrls.length,
    framesAssessed: pairs.length,
  };
}
