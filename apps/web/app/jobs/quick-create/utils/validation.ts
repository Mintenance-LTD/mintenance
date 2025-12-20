/**
 * Simple validation for Quick Job form
 */

export interface QuickJobFormData {
  title: string;
  description?: string;
  category: string;
  budget: string | number;  // Accept both string (from form) and number (for API)
  urgency: string;
  property_id: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

/**
 * Validate quick job form - much simpler than detailed job
 */
export function validateQuickJob(formData: QuickJobFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  // Title is required (minimum 5 characters for quick jobs)
  if (!formData.title || formData.title.trim().length < 5) {
    errors.title = 'Please describe what needs fixing (at least 5 characters)';
  }

  // Category is required
  if (!formData.category) {
    errors.category = 'Please select a category';
  }

  // Budget is required - check both string and number types
  if (!formData.budget || formData.budget === '' || formData.budget === '0') {
    errors.budget = 'Please select a budget range';
  }

  // Property is required
  if (!formData.property_id) {
    errors.property_id = 'Please select a property';
  }

  return errors;
}

export function isFormValid(errors: ValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}