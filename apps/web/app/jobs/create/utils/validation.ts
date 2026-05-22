/**
 * Validation utilities for job creation form.
 *
 * 2026-05-22: budget field removed from homeowner-facing collection.
 * Contractors now bid their own price with a required justification.
 * Photos are required on every job (not just >£500) — `validateJobForm`
 * enforces ≥1 photo across the whole form.
 */

import { validateJobDraft, type JobCategory } from '@mintenance/api-contracts';
import { VALIDATION } from '../constants';

export interface JobFormData {
  title: string;
  description: string;
  location: string;
  category: string;
  urgency?: 'low' | 'medium' | 'high' | 'emergency'; // Optional — forwarded to /api/jobs via submitJob
  requiredSkills: string[];
  property_id?: string;
  // R6 #19 landlord / tenancy step
  is_rental_property?: boolean; // Is this a rental? drives tenant-comms UI
  who_pays?: 'me' | 'someone_else'; // UI radio — if "someone_else", need email
  payer_email?: string; // Email of the distinct payer if who_pays==='someone_else'
  // Property Rooms Slice 1 (2026-05-21): rooms this job targets,
  // snapshotted into job_rooms server-side at post time. Optional —
  // legacy "no specific room scope" behaviour preserved when empty.
  room_ids?: string[];
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

    default:
      return undefined;
  }
}

/**
 * Photos are required on every job (2026-05-22). Pulled out of the
 * per-field switch so the submit-time gate can call it independently
 * of any single text input's blur event.
 */
export function validatePhotos(
  uploadedImages: string[],
  selectedImages: number
): string | undefined {
  if (uploadedImages.length + selectedImages < 1) {
    return 'Please add at least one photo so contractors can quote accurately';
  }
  return undefined;
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

  const photoError = validatePhotos(uploadedImages, selectedImages);
  if (photoError) errors.photos = photoError;

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
