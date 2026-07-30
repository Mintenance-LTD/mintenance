/**
 * Ask the model to justify its own findings against the frames.
 *
 * Everything else in this pipeline constrains the surveyor BEFORE it answers —
 * age context, lighting rules, quality gating, corroboration. This is the one
 * check that happens after: show it the merged survey and the frames those
 * claims came from, and ask which ones it can actually point at.
 *
 * It is deliberately a SECOND, NARROWER question. The first pass is asked to
 * survey a room, which rewards thoroughness; this pass is asked only "can you
 * see the specific evidence you named", which rewards honesty. A model is much
 * better at rejecting a claim put in front of it than at not making it.
 *
 * OFF BY DEFAULT — see shouldRunVerifyPass. It costs an extra vision call per
 * walkthrough and it deletes findings on the strength of a model response I have
 * no way to verify from here. Both of those are the owner's call, not mine, so it
 * ships behind a flag with the deterministic half fully tested.
 */

import { logger } from '@mintenance/shared';
import type { AssessmentFinding, Phase1BuildingAssessment } from '../types';

const SERVICE = 'assessment-walkthrough';

/** One verdict from the verifier, keyed to a finding by index. */
export interface FindingVerdict {
  index: number;
  /** True when the model can point at the evidence it originally named. */
  supported: boolean;
  /** What it can actually see, or why it cannot support the claim. */
  evidence?: string;
}

export interface VerifyOutcome {
  findings: AssessmentFinding[];
  /** Findings removed outright. */
  dropped: AssessmentFinding[];
  /** Findings kept but marked unconfirmed rather than dropped. */
  softened: AssessmentFinding[];
}

/**
 * Whether the verify pass should run at all.
 *
 * Opt-in via WALKTHROUGH_VERIFY_PASS=true. Default off because this stage spends
 * money on every walkthrough and removes findings based on model output that has
 * not been validated against real surveys — enabling that by default, on a
 * branch already in review, is not a decision to make on somebody's behalf.
 */
export function shouldRunVerifyPass(
  env: Record<string, string | undefined> = process.env
): boolean {
  return env.WALKTHROUGH_VERIFY_PASS === 'true';
}

/**
 * Apply verdicts to findings.
 *
 * Pure, and the whole reason this module is testable. The rules mirror the rest
 * of the pipeline:
 *
 *  - unsupported and dangerous  -> KEPT, marked unconfirmed. A verifier talking
 *    down a hazard is the failure mode that hurts somebody; it does not get to
 *    delete one on its own say-so.
 *  - unsupported and clean      -> KEPT. "No defect here" needs no evidence, so
 *    a verifier cannot fail to support it.
 *  - unsupported otherwise      -> dropped.
 *  - no verdict for a finding   -> KEPT unchanged. A missing verdict is silence,
 *    not a rejection; a truncated or partial response must never quietly empty
 *    the survey.
 *  - supported                  -> kept, and the evidence recorded on the
 *    description is NOT rewritten, because the verifier's job is to judge the
 *    claim, not to reword it.
 */
export function applyFindingVerdicts(
  findings: AssessmentFinding[] | undefined,
  verdicts: FindingVerdict[] | undefined
): VerifyOutcome {
  const list = findings ?? [];
  if (!verdicts?.length) {
    return { findings: list, dropped: [], softened: [] };
  }

  const byIndex = new Map<number, FindingVerdict>();
  for (const v of verdicts) {
    if (Number.isInteger(v?.index)) byIndex.set(v.index, v);
  }

  const kept: AssessmentFinding[] = [];
  const dropped: AssessmentFinding[] = [];
  const softened: AssessmentFinding[] = [];

  list.forEach((f, i) => {
    const verdict = byIndex.get(i);

    // Silence is not rejection.
    if (!verdict) {
      kept.push(f);
      return;
    }
    if (verdict.supported) {
      kept.push(f);
      return;
    }
    // A clean reading asserts nothing, so there is nothing to fail to support.
    if (f.isClear) {
      kept.push(f);
      return;
    }
    if (f.severity === 'dangerous') {
      const marked = { ...f, unconfirmed: true };
      kept.push(marked);
      softened.push(marked);
      return;
    }
    dropped.push(f);
  });

  return { findings: kept, dropped, softened };
}

/**
 * Guard against a verifier that rejects everything.
 *
 * A confused or truncated response can come back rejecting the lot, which would
 * turn a survey with real defects into a clean bill of health — the most
 * dangerous possible outcome of a safety check. If more than this share of
 * findings would be dropped, the whole pass is discarded and the original survey
 * stands.
 */
export const MAX_DROP_SHARE = 0.6;

/**
 * Whether an outcome is safe to accept.
 *
 * Refusing a wholesale rejection means the verify pass can only ever prune the
 * edges of a survey, never replace the surveyor's judgement with its own.
 */
export function isVerifyOutcomeAcceptable(
  original: AssessmentFinding[] | undefined,
  outcome: VerifyOutcome
): boolean {
  const total = original?.length ?? 0;
  if (total === 0) return true;
  return outcome.dropped.length / total <= MAX_DROP_SHARE;
}

/** The prompt asking the model to justify, not to survey. */
export function buildVerifyPrompt(findings: AssessmentFinding[]): string {
  const numbered = findings
    .map(
      (f, i) =>
        `${i}. element=${f.element} damageType=${f.damageType} severity=${f.severity} — "${f.description}"`
    )
    .join('\n');

  return `You previously surveyed the attached frames and produced the findings below. You are now checking your own work, and the only question is whether the visible evidence is actually there.

For EACH numbered finding, decide whether you can point at the specific visible evidence in these frames:
${numbered}

Rules for this check:
- "supported" means you can describe what you see and where: a defined edge, a colour shift, a texture, a straight reference that visibly deviates.
- A soft tonal gradient, a shadow, a reflection, a dark recess or a lighting falloff is NOT evidence of a defect. If that is all you can see, the finding is not supported.
- Normal building features and finishes are not defects. If the finding describes something the building is meant to look like, it is not supported.
- Do not soften your verdict to be agreeable, and do not invent evidence to justify a previous answer. Rejecting your own finding is the correct outcome when the evidence is not visible.
- Judge only what these frames show. Do not reason about what is probably true of the property.

Respond with JSON only:
{"verdicts":[{"index":0,"supported":true,"evidence":"what you can actually see"}]}`;
}

/**
 * Run the verify pass against the frames a survey's claims came from.
 *
 * Only the frames the findings actually cite are sent, deduped — verifying two
 * findings usually means two or three images, not the whole walk. Deliberately
 * NOT routed through getGeneratorContent: that injects RAG pathology context,
 * which is exactly the wrong thumb on the scale for a check whose job is to
 * reject unsupported claims.
 *
 * Returns null on any failure. A verifier that cannot answer leaves the survey
 * exactly as the surveyor left it.
 */
export async function runVerifyPass(
  findings: AssessmentFinding[],
  frameUrls: string[],
  openaiApiKey: string
): Promise<FindingVerdict[] | null> {
  if (findings.length === 0 || frameUrls.length === 0) return null;

  // The frames these claims were read from. Falls back to the whole set only
  // when no finding carries provenance.
  const cited = Array.from(
    new Set(
      findings
        .map((f) => f.sourceFrameIndex)
        .filter((i): i is number => typeof i === 'number')
    )
  ).sort((a, b) => a - b);
  const urls = (cited.length > 0 ? cited : frameUrls.map((_, i) => i))
    .map((i) => frameUrls[i])
    .filter((u): u is string => Boolean(u))
    .slice(0, MAX_VERIFY_IMAGES);

  if (urls.length === 0) return null;

  try {
    const { fetchWithOpenAIRetry } =
      await import('@/lib/utils/openai-rate-limit');

    const response = await fetchWithOpenAIRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: buildVerifyPrompt(findings) },
                ...urls.map((url) => ({
                  type: 'image_url' as const,
                  image_url: { url, detail: 'auto' as const },
                })),
              ],
            },
          ],
          max_tokens: 1200,
          // Near-zero: this is a judgement against fixed evidence, not a
          // creative task, and run-to-run variance would make it unauditable.
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
      },
      {
        maxAttempts: 3,
        baseDelayMs: 2000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
      }
    );

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    return content ? parseVerifyResponse(content) : null;
  } catch {
    // Swallowed on purpose: an optional check must not sink a walkthrough. The
    // caller logs the null.
    return null;
  }
}

/** Cap on images sent to the verifier, so a 20-frame walk cannot balloon. */
export const MAX_VERIFY_IMAGES = 8;

/**
 * Run the verify pass and apply it, or return the survey untouched.
 *
 * The whole decision lives here rather than in the route so the rules and their
 * safety rails sit in one file. Every path that is not "the verifier answered
 * and its answer was acceptable" returns the original assessment unchanged:
 * flag off, no API key, no findings, no response, unparseable response, or a
 * response that would gut the survey.
 */
export async function verifyWalkthroughFindings(input: {
  assessment: Phase1BuildingAssessment;
  frameUrls: string[];
  openaiApiKey: string | undefined;
}): Promise<Phase1BuildingAssessment> {
  const { assessment, frameUrls, openaiApiKey } = input;
  const findings = assessment.findings ?? [];

  if (!shouldRunVerifyPass() || !openaiApiKey || findings.length === 0) {
    return assessment;
  }

  const verdicts = await runVerifyPass(findings, frameUrls, openaiApiKey);
  if (!verdicts) {
    logger.info('Walkthrough verify pass returned nothing usable', {
      service: SERVICE,
    });
    return assessment;
  }

  const outcome = applyFindingVerdicts(findings, verdicts);

  if (!isVerifyOutcomeAcceptable(findings, outcome)) {
    logger.warn('Walkthrough verify pass rejected — too much dropped', {
      service: SERVICE,
      wouldDrop: outcome.dropped.length,
      of: findings.length,
    });
    return assessment;
  }

  logger.info('Walkthrough verify pass applied', {
    service: SERVICE,
    // Every dropped finding is logged: this is the only record of what the
    // pass removed, and the only way to judge whether it is any good.
    dropped: outcome.dropped.map((f) => ({
      element: f.element,
      damageType: f.damageType,
      severity: f.severity,
    })),
    softened: outcome.softened.length,
    kept: outcome.findings.length,
  });

  return { ...assessment, findings: outcome.findings };
}

/**
 * Parse the verifier's reply.
 *
 * Returns null rather than throwing on anything unexpected, so a malformed
 * response leaves the survey untouched instead of failing the walkthrough.
 */
export function parseVerifyResponse(raw: string): FindingVerdict[] | null {
  if (!raw) return null;
  try {
    // Tolerate a fenced block, which models add unprompted.
    const cleaned = raw
      .replace(/^\s*```(?:json)?/i, '')
      .replace(/```\s*$/, '')
      .trim();
    const parsed = JSON.parse(cleaned) as { verdicts?: unknown };
    if (!Array.isArray(parsed?.verdicts)) return null;

    const verdicts: FindingVerdict[] = [];
    for (const v of parsed.verdicts) {
      const row = v as Record<string, unknown>;
      if (!Number.isInteger(row?.index)) continue;
      if (typeof row?.supported !== 'boolean') continue;
      verdicts.push({
        index: row.index as number,
        supported: row.supported as boolean,
        evidence: typeof row.evidence === 'string' ? row.evidence : undefined,
      });
    }
    return verdicts.length > 0 ? verdicts : null;
  } catch {
    return null;
  }
}
