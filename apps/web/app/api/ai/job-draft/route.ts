/**
 * POST /api/ai/job-draft
 *
 * Takes a homeowner's natural-language description ("boiler keeps
 * cutting out, no hot water since last night") and returns a
 * structured draft the /jobs/create wizard can pre-fill: title,
 * category, urgency, optional budget range. The classifier is
 * deterministic keyword-matching (see lib/ai/job-draft-classifier.ts)
 * so this route does not need an LLM key today; when Mint AI flips
 * on, swap the classifier behind the same contract.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { classifyJobDraft } from '@/lib/ai/job-draft-classifier';

const bodySchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(3, 'Describe the problem in at least a few words.')
      .max(2000, 'Description is too long.'),
  })
  .strict();

export const POST = withApiHandler(
  {
    roles: ['homeowner', 'admin'],
    rateLimit: { maxRequests: 20, windowMs: 60_000 },
  },
  async (request: NextRequest) => {
    const validation = await validateRequest(request, bodySchema);
    if (validation instanceof NextResponse) return validation;
    const { description } = validation.data;

    const draft = classifyJobDraft(description);
    return NextResponse.json({ draft });
  }
);
