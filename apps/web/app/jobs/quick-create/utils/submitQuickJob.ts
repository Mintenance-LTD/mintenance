import { logger } from '@mintenance/shared';
import { submitJob } from '@/app/jobs/create/utils/submitJob';
import { validateQuickJob, isFormValid } from './validation';
import type { QuickJobFormData } from '../components/QuickJobForm';
import type { PrimaryProperty } from '../components/PropertyInfo';

/**
 * Quick-job submit pipeline extracted from `quick-create/page.tsx` on
 * 2026-05-09 (AUDIT_PUNCH_LIST P2 #41). Validates the form, maps the
 * UI urgency token to the canonical enum, builds a full location
 * string from the primary property, and calls `submitJob`.
 *
 * Returns either `{ ok: true, jobId }` on success or
 * `{ ok: false, code, message }` on failure so the caller can render
 * the right toast / redirect without parsing strings.
 */

const URGENCY_BY_TOKEN: Record<
  string,
  'low' | 'medium' | 'high' | 'emergency'
> = {
  today: 'emergency',
  tomorrow: 'high',
  this_week: 'medium',
};

export type SubmitQuickJobResult =
  | { ok: true; jobId: string }
  | {
      ok: false;
      code:
        | 'VALIDATION'
        | 'NO_PROPERTY'
        | 'NO_CSRF'
        | 'INVALID_BUDGET'
        | 'NO_JOB_ID'
        | 'PHONE_VERIFICATION_REQUIRED'
        | 'API_ERROR';
      message: string;
    };

export async function submitQuickJob(args: {
  formData: QuickJobFormData;
  primaryProperty: PrimaryProperty | null;
  csrfToken: string | null;
}): Promise<SubmitQuickJobResult> {
  const { formData, primaryProperty, csrfToken } = args;

  // 1. Validate
  const errors = validateQuickJob(formData);
  if (!isFormValid(errors)) {
    const firstError = Object.values(errors)[0];
    logger.warn('Quick job validation failed', { service: 'app', errors });
    return {
      ok: false,
      code: 'VALIDATION',
      message: firstError ?? 'Invalid form',
    };
  }

  // 2. Need a property
  if (!primaryProperty) {
    logger.error('No primary property found', { service: 'app' });
    return {
      ok: false,
      code: 'NO_PROPERTY',
      message: 'Please add a property first',
    };
  }

  // 3. Need a CSRF token
  if (!csrfToken) {
    logger.error('No CSRF token available', { service: 'app' });
    return {
      ok: false,
      code: 'NO_CSRF',
      message: 'Security token not available. Please refresh the page.',
    };
  }

  // 2026-04-30 audit P1 (job creation consolidation):
  // - Removed the legacy description-padding hack. The canonical
  //   `createJobRequestSchema` (packages/api-contracts/jobs.ts) sets
  //   the minimum at 20 chars and treats description as optional.
  // - Started passing `urgency` as its own field rather than smuggling
  //   it through the description.
  const baseDescription =
    formData.description?.trim() ||
    `Quick repair needed: ${formData.title.trim()}.`;

  const canonicalUrgency = URGENCY_BY_TOKEN[formData.urgency] ?? 'medium';

  const budgetValue = parseFloat(formData.budget);
  if (isNaN(budgetValue) || budgetValue <= 0) {
    return {
      ok: false,
      code: 'INVALID_BUDGET',
      message: 'Please select a valid budget',
    };
  }

  // Full location string for accurate geocoding.
  const locationParts = [
    primaryProperty.address || primaryProperty.street_address,
    primaryProperty.city,
    primaryProperty.postcode,
  ].filter(Boolean);
  const locationString =
    locationParts.length > 0 ? locationParts.join(', ') : 'Property location';

  const jobData = {
    title: formData.title.trim(),
    description: baseDescription,
    location: locationString,
    category: formData.category,
    budget: budgetValue,
    urgency: canonicalUrgency,
    requiredSkills: [],
    property_id: formData.property_id || primaryProperty.id || undefined,
  };

  try {
    const result = await submitJob({
      formData: jobData,
      photoUrls: [],
      csrfToken: csrfToken || '',
    });

    if (!result.success) {
      logger.error(
        'Job submission failed in quick-create',
        { error: result.error, result },
        { service: 'app' }
      );
      const message = result.error || 'Failed to post job';
      const isPhoneError =
        message.toLowerCase().includes('phone verification required') ||
        message.toLowerCase().includes('verify your phone');
      return {
        ok: false,
        code: isPhoneError ? 'PHONE_VERIFICATION_REQUIRED' : 'API_ERROR',
        message,
      };
    }

    if (!result.jobId) {
      return {
        ok: false,
        code: 'NO_JOB_ID',
        message: 'Job created but no ID returned',
      };
    }

    return { ok: true, jobId: result.jobId };
  } catch (error) {
    logger.error('Error posting quick job', error, { service: 'app' });
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to post job. Please try again.';
    const isPhoneError =
      message.toLowerCase().includes('phone verification required') ||
      message.toLowerCase().includes('verify your phone');
    return {
      ok: false,
      code: isPhoneError ? 'PHONE_VERIFICATION_REQUIRED' : 'API_ERROR',
      message,
    };
  }
}
