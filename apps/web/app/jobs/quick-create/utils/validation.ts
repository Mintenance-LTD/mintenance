/**
 * Simple validation for Quick Job form.
 *
 * 2026-05-01 audit P1 close-out (per-screen validateJobDraft adoption):
 * the title-length / budget-required / category-required checks are
 * now run through the canonical `validateJobDraft` adapter from
 * `@mintenance/api-contracts`. The shared schema is the SAME one the
 * server enforces, so client-side errors here mirror the wire-level
 * Zod errors exactly. The flow-specific UI requirements (property is
 * required for quick-create even though the canonical schema treats
 * `property_id` as optional) stay layered on top.
 */
import { validateJobDraft, type JobCategory } from '@mintenance/api-contracts';

interface QuickJobFormData {
  title: string;
  description?: string;
  category: string;
  urgency: string;
  property_id: string;
}

interface ValidationErrors {
  [key: string]: string;
}

const VALID_URGENCIES = ['low', 'medium', 'high', 'emergency'] as const;
type ValidUrgency = (typeof VALID_URGENCIES)[number];
const isValidUrgency = (v: string): v is ValidUrgency =>
  (VALID_URGENCIES as readonly string[]).includes(v);

/**
 * Validate quick job form - much simpler than detailed job
 */
export function validateQuickJob(formData: QuickJobFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  // Run through the canonical schema first so the baseline length /
  // range / required errors match the server. We feed reasonable
  // placeholders for the schema-required-but-quick-create-optional
  // fields (description, location) so the adapter doesn't complain
  // about fields we deliberately don't collect at this surface.
  const draft = {
    title: formData.title,
    description: formData.description || 'Quick job — see title for details.',
    location: 'Quick create — server resolves from property_id',
    category: (formData.category || undefined) as JobCategory | undefined,
    urgency: isValidUrgency(formData.urgency) ? formData.urgency : undefined,
    propertyId: formData.property_id || undefined,
  };
  const draftResult = validateJobDraft(draft);
  if (!draftResult.ok) {
    for (const e of draftResult.errors) {
      // Map canonical field names back to form keys, ignoring synthesised
      // placeholders we don't actually surface as UI fields.
      if (e.field === 'description' || e.field === 'location') continue;
      const formField = e.field === 'property_id' ? 'property_id' : e.field;
      // First error wins per field — matches the existing UI behaviour.
      if (!errors[formField]) {
        errors[formField] = e.message;
      }
    }
  }

  // Layered Quick Create-specific UI requirements:
  if (!formData.title || formData.title.trim().length < 5) {
    // Override the canonical "Title must be at least 5 characters" with
    // a friendlier, action-oriented message tuned for the quick flow.
    errors.title = 'Please describe what needs fixing (at least 5 characters)';
  }
  if (!formData.category) {
    errors.category = 'Please select a category';
  }
  if (!formData.property_id) {
    errors.property_id = 'Please select a property';
  }

  return errors;
}

export function isFormValid(errors: ValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}
