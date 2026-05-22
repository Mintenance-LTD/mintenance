/**
 * Resolve `/jobs/create` URL query params into a partial JobFormData.
 *
 * Used by both:
 *  - the initial useState() seed (full ReadonlyURLSearchParams),
 *  - the post-mount useEffect that reacts to client-side route
 *    changes (e.g. the Mint AI dock forwarding a draft).
 *
 * Kept out of page.tsx because page.tsx is right at the 500-line MDC
 * limit and these helpers are pure / unit-testable in isolation.
 *
 * 2026-05-22: budget* params are still accepted on inbound URLs (the
 * Mint AI dock may emit them) but they are silently dropped — budget
 * collection no longer happens on this form.
 */
import type { JobFormData } from './validation';

type Params = Pick<URLSearchParams, 'get'> | null | undefined;

const ALLOWED_URGENCY: JobFormData['urgency'][] = [
  'low',
  'medium',
  'high',
  'emergency',
];

function pickUrgency(raw: string | null | undefined): JobFormData['urgency'] {
  if (!raw) return 'medium';
  return (ALLOWED_URGENCY as string[]).includes(raw)
    ? (raw as JobFormData['urgency'])
    : 'medium';
}

/**
 * Returns the initial `JobFormData` seed for the form, taking every
 * value from the URL when present and falling back to safe defaults.
 */
export function initialFormDataFromParams(params: Params): JobFormData {
  return {
    title: params?.get('title') ?? '',
    description: params?.get('description') ?? '',
    location: params?.get('location') ?? '',
    category: params?.get('category') ?? '',
    urgency: pickUrgency(params?.get('urgency')),
    requiredSkills: [],
    property_id: params?.get('property_id') ?? '',
  };
}

/**
 * Build a `JobFormData` patch from the params for the in-page
 * useEffect that reacts to soft-navigations (Mint AI dock or any
 * other link that pushes new params without remounting).
 *
 * Returns null when no relevant param is set so the caller can skip
 * a no-op state update.
 */
export function formDataPatchFromParams(
  params: Params
): Partial<JobFormData> | null {
  const title = params?.get('title') ?? undefined;
  const description = params?.get('description') ?? undefined;
  const category = params?.get('category') ?? undefined;
  const location = params?.get('location') ?? undefined;
  const urgencyRaw = params?.get('urgency') ?? undefined;

  const anySet =
    !!title || !!description || !!category || !!location || !!urgencyRaw;
  if (!anySet) return null;

  const patch: Partial<JobFormData> = {};
  if (title) patch.title = title;
  if (description) patch.description = description;
  if (category) patch.category = category;
  if (location) patch.location = location;
  if (urgencyRaw && (ALLOWED_URGENCY as string[]).includes(urgencyRaw)) {
    patch.urgency = urgencyRaw as JobFormData['urgency'];
  }
  return patch;
}
