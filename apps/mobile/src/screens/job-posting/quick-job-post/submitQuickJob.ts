import { sanitize } from '@mintenance/security';
import { validateJobDraft, type JobCategory } from '@mintenance/api-contracts';
import { JobService } from '../../../services/JobService';
import { normalizeJobCategory, urgencyToCanonical } from './theme/templates';

/**
 * Submission pipeline extracted from QuickJobPostScreen 2026-05-09
 * (AUDIT_PUNCH_LIST P2 #44b). Pads the description to ≥50 chars, runs
 * the canonical `validateJobDraft` schema, then calls
 * `JobService.createJob` — same behaviour as the inline handler, just
 * testable in isolation.
 *
 * Returns:
 *   - `{ ok: true }` on success
 *   - `{ ok: false, code: 'VALIDATION', message }` if `validateJobDraft` rejects
 *   - `{ ok: false, code: 'API_ERROR', message }` on network / server failure
 */

export type SubmitQuickJobResult =
  | { ok: true }
  | { ok: false; code: 'VALIDATION' | 'API_ERROR'; message: string };

export interface SubmitQuickJobInput {
  title: string;
  description: string;
  budget: string;
  urgency: string;
  category: string;
  propertyId?: string;
  propertyAddress?: string;
  homeownerId: string;
}

export async function submitQuickJob(
  input: SubmitQuickJobInput
): Promise<SubmitQuickJobResult> {
  const {
    title,
    description,
    budget,
    urgency,
    category,
    propertyId,
    propertyAddress,
    homeownerId,
  } = input;

  let fullDescription = description || title;
  if (urgency === 'today')
    fullDescription = `URGENT - Needed today! ${fullDescription}`;
  else if (urgency === 'tomorrow')
    fullDescription = `Needed tomorrow. ${fullDescription}`;
  else if (urgency === 'this_week')
    fullDescription = `Needed this week. ${fullDescription}`;

  while (fullDescription.length < 50) {
    fullDescription += ' - Please see title for details.';
  }

  // 2026-05-01 audit P1 close-out (per-screen validateJobDraft adoption):
  // run the canonical schema before submitting so the user sees the same
  // error message the route would have rejected with.
  const draftValidation = validateJobDraft({
    title,
    description: fullDescription,
    location: propertyAddress || undefined,
    budget: parseFloat(budget) || 150,
    category: normalizeJobCategory(category) as JobCategory | undefined,
    urgency: urgencyToCanonical(urgency),
    propertyId,
  });
  if (!draftValidation.ok) {
    const first = draftValidation.errors[0];
    return {
      ok: false,
      code: 'VALIDATION',
      message: first?.message ?? 'Please review the form and try again.',
    };
  }

  try {
    await JobService.createJob({
      title: sanitize.text(title, 200),
      description: sanitize.jobDescription(fullDescription),
      location: propertyAddress || '',
      budget: parseFloat(budget) || 150,
      homeownerId,
      category: normalizeJobCategory(category),
      urgency: urgencyToCanonical(urgency),
      property_id: propertyId,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      code: 'API_ERROR',
      message: error instanceof Error ? error.message : 'Failed to post job',
    };
  }
}
