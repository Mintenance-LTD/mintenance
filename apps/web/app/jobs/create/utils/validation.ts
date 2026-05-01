/**
 * Validation utilities for job creation form.
 *
 * 2026-05-01 audit P1 close-out (per-screen validateJobDraft adoption):
 * the form-wide submit-time check now runs through `validateJobDraft`
 * from `@mintenance/api-contracts` so the baseline length / range /
 * required errors match the server schema exactly. Per-field
 * `validateField` calls are kept for blur-time inline UX (the route
 * doesn't tell the user inline) but the submit gate (`validateJobForm`)
 * now layers schema errors + UX layer errors so the user can never
 * submit a payload the server would reject.
 */

import { VALIDATION } from '../constants';
import { validateJobDraft, type JobCategory } from '@mintenance/api-contracts';

export interface JobFormData {
  title: string;
  description: string;
  location: string;
  category: string;
  urgency?: 'low' | 'medium' | 'high' | 'emergency'; // Optional - not used by API
  budget: string | number; // Can be either string or number
  budget_min?: string | number; // Minimum budget shown to contractors (range)
  budget_max?: string | number; // Maximum budget shown to contractors (range)
  show_budget_to_contractors?: boolean; // Whether to show exact budget (default: false)
  require_itemized_bids?: boolean; // Whether to require cost breakdown (default: true for >£500)
  requiredSkills: string[];
  property_id?: string;
  // R6 #19 landlord / tenancy step
  is_rental_property?: boolean; // Is this a rental? drives tenant-comms UI
  who_pays?: 'me' | 'someone_else'; // UI radio — if "someone_else", need email
  payer_email?: string; // Email of the distinct payer if who_pays==='someone_else'
}

interface ValidationErrors {
  [key: string]: string;
}

/**
 * Validate individual field on blur
 */
export function validateField(
  fieldName: keyof JobFormData,
  value: string | string[],
  formData: JobFormData,
  uploadedImages: string[] = [],
  selectedImages: number = 0
): string | undefined {
  switch (fieldName) {
    case 'title':
      if (!value || typeof value !== 'string') return 'Job title is required';
      if (value.trim().length === 0) return 'Job title is required';
      // Align with server schema in apps/web/app/api/jobs/route.ts (min 5, max 200).
      // Client was previously 10/100 which blocked short valid titles like "Fix tap".
      if (value.trim().length < 5) return 'Title must be at least 5 characters';
      if (value.trim().length > 200)
        return 'Title cannot exceed 200 characters';
      return undefined;

    case 'description':
      if (!value || typeof value !== 'string') return 'Description is required';
      if (value.trim().length === 0) return 'Description is required';
      if (value.trim().length < VALIDATION.MIN_DESCRIPTION_LENGTH) {
        return `Description must be at least ${VALIDATION.MIN_DESCRIPTION_LENGTH} characters (currently ${value.trim().length})`;
      }
      if (value.trim().length > 5000)
        return 'Description cannot exceed 5000 characters';
      return undefined;

    case 'location':
      if (!value || typeof value !== 'string') return 'Location is required';
      if (value.trim().length === 0) return 'Location is required';
      if (value.trim().length < 5)
        return 'Please provide a more specific location';
      return undefined;

    case 'category':
      if (!value || typeof value !== 'string')
        return 'Please select a category';
      if (value.trim().length === 0) return 'Please select a category';
      return undefined;

    case 'budget':
      if (!value || typeof value !== 'string') return 'Budget is required';
      const budgetNum = parseFloat(value);
      if (isNaN(budgetNum) || budgetNum <= 0)
        return 'Please enter a valid budget amount';
      if (budgetNum < 50) return 'Minimum budget is £50';
      if (budgetNum > VALIDATION.MAX_BUDGET)
        return `Budget cannot exceed £${VALIDATION.MAX_BUDGET.toLocaleString()}`;
      // Check both uploaded images and selected images (previews)
      const totalImages = uploadedImages.length + selectedImages;
      if (budgetNum > VALIDATION.BUDGET_PHOTO_THRESHOLD && totalImages === 0) {
        return `Photos required for jobs over £${VALIDATION.BUDGET_PHOTO_THRESHOLD}`;
      }
      return undefined;

    default:
      return undefined;
  }
}

/**
 * Validate job form data
 */
export function validateJobForm(
  formData: JobFormData,
  uploadedImages: string[],
  selectedImages: number = 0
): ValidationErrors {
  const errors: ValidationErrors = {};

  // Validate each field
  const titleError = validateField(
    'title',
    formData.title,
    formData,
    uploadedImages,
    selectedImages
  );
  if (titleError) errors.title = titleError;

  const descriptionError = validateField(
    'description',
    formData.description,
    formData,
    uploadedImages,
    selectedImages
  );
  if (descriptionError) errors.description = descriptionError;

  const locationError = validateField(
    'location',
    formData.location,
    formData,
    uploadedImages,
    selectedImages
  );
  if (locationError) errors.location = locationError;

  const categoryError = validateField(
    'category',
    formData.category,
    formData,
    uploadedImages,
    selectedImages
  );
  if (categoryError) errors.category = categoryError;

  const budgetError = validateField(
    'budget',
    String(formData.budget),
    formData,
    uploadedImages,
    selectedImages
  );
  if (budgetError) errors.budget = budgetError;

  // Skills validation
  if (formData.requiredSkills.length > 10) {
    errors.requiredSkills = 'Maximum 10 skills allowed';
  }

  // 2026-05-01: also run the canonical schema as a final safety net.
  // Per-field validateField above generally already catches everything,
  // but if the server tightens a constraint in @mintenance/api-contracts
  // and the per-field check drifts, this will catch it before submit
  // rather than letting the user hit a 400. Fields already flagged by
  // validateField keep their friendlier messages; the schema only fills
  // gaps.
  const draftResult = validateJobDraft({
    title: formData.title,
    description: formData.description,
    location: formData.location,
    budget:
      typeof formData.budget === 'number'
        ? formData.budget
        : parseFloat(String(formData.budget)) || undefined,
    category: (formData.category || undefined) as JobCategory | undefined,
    urgency: formData.urgency,
    propertyId: formData.property_id,
    isRentalProperty: formData.is_rental_property,
  });
  if (!draftResult.ok) {
    for (const e of draftResult.errors) {
      const formField = e.field;
      if (!errors[formField]) {
        errors[formField] = e.message;
      }
    }
  }

  return errors;
}

/**
 * Check if form is valid
 */
export function isFormValid(errors: ValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}
