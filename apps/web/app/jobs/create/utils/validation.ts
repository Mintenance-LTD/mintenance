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
 * Validate job form data
 */
export function validateJobForm(
  formData: JobFormData,
  uploadedImages: string[]
): ValidationErrors {
  const errors: ValidationErrors = {};

  // Title validation
  if (!formData.title.trim()) {
    errors.title = 'Job title is required';
  } else if (formData.title.trim().length < 10) {
    errors.title = 'Title must be at least 10 characters';
  } else if (formData.title.trim().length > 100) {
    errors.title = 'Title cannot exceed 100 characters';
  }

  // Description validation
  if (!formData.description.trim()) {
    errors.description = 'Description is required';
  } else if (formData.description.trim().length < 50) {
    errors.description = 'Description must be at least 50 characters';
  } else if (formData.description.trim().length > 5000) {
    errors.description = 'Description cannot exceed 5000 characters';
  }

  // Location validation
  if (!formData.location.trim()) {
    errors.location = 'Location is required';
  } else if (formData.location.trim().length < 5) {
    errors.location = 'Please provide a more specific location';
  }

  // Category validation
  if (!formData.category) {
    errors.category = 'Please select a category';
  }

  // Skills validation
  if (formData.requiredSkills.length > 10) {
    errors.requiredSkills = 'Maximum 10 skills allowed';
  }

  // Budget validation
  if (!formData.budget) {
    errors.budget = 'Budget is required';
  } else {
    const budgetNum = parseFloat(formData.budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      errors.budget = 'Please enter a valid budget amount';
    } else if (budgetNum > 50000) {
      errors.budget = 'Budget cannot exceed £50,000';
    } else if (budgetNum > 500 && uploadedImages.length === 0) {
      errors.photoUrls = 'At least one photo is required for jobs over £500';
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

