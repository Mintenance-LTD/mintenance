import { CostControlService } from '../../ai/CostControlService';
import { fetchWithOpenAIRetry } from '@/lib/utils/openai-rate-limit';
import { buildOpenAIAssessmentRequest } from '../generator/openai-request';
import {
  parseVisualObservation,
  VISUAL_OBSERVATION_PROMPT,
  type VisualObservation,
} from '../generator/visual-observation';
import {
  PhotoRecaptureError,
  type CaptureWarning,
} from '../recapture-guidance';

export interface VisualEvidence {
  version: 'visible-evidence-v1';
  diagnosisStatus: 'not_established';
  photos: Array<{
    photoIndex: number;
    model: string;
    observation: VisualObservation;
  }>;
}

/** Each photo is checked separately so a readable photo cannot mask an unreadable one. */
export async function observePhotos(
  urls: string[],
  apiKey: string,
  warnings: CaptureWarning[]
): Promise<VisualEvidence | undefined> {
  if (process.env.MINT_OBSERVATION_GATE_ENABLED !== 'true') return undefined;
  if (await CostControlService.isEmergencyStopped())
    throw new Error('AI services are currently disabled');
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o';
  const photos: VisualEvidence['photos'] = [];
  const signal = AbortSignal.timeout(90000);
  for (const [photoIndex, url] of urls.slice(0, 4).entries()) {
    const estimatedCost = CostControlService.estimateCost(model, {
      inputTokens: 1500,
      outputTokens: 1200,
      images: 1,
    });
    const budget = await CostControlService.checkBudget({
      service: 'building-surveyor',
      model,
      estimatedCost,
    });
    if (!budget.allowed)
      throw new Error('Visual evidence check exceeded its budget');
    const hints = warnings
      .filter((w) => w.photoIndex === photoIndex)
      .map((w) => w.reason);
    const response = await fetchWithOpenAIRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          buildOpenAIAssessmentRequest(
            model,
            [
              { role: 'system', content: VISUAL_OBSERVATION_PROMPT },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Inspect this photo. Advisory capture warnings: ${hints.join(', ') || 'none'}. These are not proof of unreadability: smooth surfaces can be readable. Judge whether visible surface detail supports an observation. Request better evidence if it does not.`,
                  },
                  { type: 'image_url', image_url: { url, detail: 'high' } },
                ],
              },
            ],
            1200
          )
        ),
      },
      {
        maxAttempts: 2,
        baseDelayMs: 1000,
        maxDelayMs: 3000,
        backoffMultiplier: 2,
      }
    );
    if (!response.ok) throw new Error('Visual evidence service unavailable');
    const data = await response.json();
    if (data.usage)
      await CostControlService.recordUsage(
        'building-surveyor',
        data.model || model,
        CostControlService.estimateCost(data.model || model, {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
        }),
        { tokens: data.usage.total_tokens, success: true }
      );
    // A malformed or truncated response is a technical failure, not a healthy surface.
    const observation = parseVisualObservation(
      data.choices?.[0]?.message?.content ?? '',
      data.choices?.[0]?.finish_reason,
      1
    );
    if (observation.outcome === 'insufficient_evidence')
      throw new PhotoRecaptureError({
        photoIndex,
        issue: 'insufficient_detail',
      });
    photos.push({ photoIndex, model: data.model || model, observation });
  }
  return {
    version: 'visible-evidence-v1',
    diagnosisStatus: 'not_established',
    photos,
  };
}
