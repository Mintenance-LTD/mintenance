/**
 * Validation utilities for job creation form
 */

export interface JobFormData {
  title: string;
  description: string;
  location: string;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  budget: string;
  requiredSkills: string[];
  property_id?: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

/**
 * Validate individual field on blur
 */
export function validateField(
  fieldName: keyof JobFormData,
  value: string | string[],
  formData: JobFormData,
  uploadedImages: string[] = []
): string | undefined {
  switch (fieldName) {
    case 'title':
      if (!value || typeof value !== 'string') return 'Job title is required';
      if (value.trim().length === 0) return 'Job title is required';
      if (value.trim().length < 10) return 'Title must be at least 10 characters';
      if (value.trim().length > 100) return 'Title cannot exceed 100 characters';
      return undefined;

    case 'description':
      if (!value || typeof value !== 'string') return 'Description is required';
      if (value.trim().length === 0) return 'Description is required';
      if (value.trim().length < 50) return 'Description must be at least 50 characters (currently ' + value.trim().length + ')';
      if (value.trim().length > 5000) return 'Description cannot exceed 5000 characters';
      return undefined;

    case 'location':
      if (!value || typeof value !== 'string') return 'Location is required';
      if (value.trim().length === 0) return 'Location is required';
      if (value.trim().length < 5) return 'Please provide a more specific location';
      return undefined;

    case 'category':
      if (!value || typeof value !== 'string') return 'Please select a category';
      if (value.trim().length === 0) return 'Please select a category';
      return undefined;

    case 'budget':
      if (!value || typeof value !== 'string') return 'Budget is required';
      const budgetNum = parseFloat(value);
      if (isNaN(budgetNum) || budgetNum <= 0) return 'Please enter a valid budget amount';
      if (budgetNum < 50) return 'Minimum budget is £50';
      if (budgetNum > 50000) return 'Budget cannot exceed £50,000';
      if (budgetNum > 500 && uploadedImages.length === 0) return 'Photos required for jobs over £500';
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
  uploadedImages: string[]
): ValidationErrors {
  const errors: ValidationErrors = {};

  // Validate each field
  const titleError = validateField('title', formData.title, formData, uploadedImages);
  if (titleError) errors.title = titleError;

  const descriptionError = validateField('description', formData.description, formData, uploadedImages);
  if (descriptionError) errors.description = descriptionError;

  const locationError = validateField('location', formData.location, formData, uploadedImages);
  if (locationError) errors.location = locationError;

  const categoryError = validateField('category', formData.category, formData, uploadedImages);
  if (categoryError) errors.category = categoryError;

  const budgetError = validateField('budget', formData.budget, formData, uploadedImages);
  if (budgetError) errors.budget = budgetError;

  // Skills validation
  if (formData.requiredSkills.length > 10) {
    errors.requiredSkills = 'Maximum 10 skills allowed';
  }

  return errors;
}

/**
 * Check if form is valid
 */
export function isFormValid(errors: ValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}

