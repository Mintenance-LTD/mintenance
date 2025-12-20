/**
 * Data Validation Schemas
 *
 * This file provides comprehensive validation schemas for all application entities.
 * Uses the standardized types and ensures data consistency across the application.
 */

import {
  User,
  Job,
  Bid,
  Message,
  ContractorProfile,
  ValidationResult,
  FieldValidation
} from '../types/standardized';

// =============================================
// VALIDATION UTILITIES
// =============================================

export class ValidationError extends Error {
  public field: string;
  public value: any;

  constructor(message: string, field: string, value?: any) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Validate required fields are present and not empty
 */
export function validateRequired(obj: any, fields: string[]): ValidationResult {
  const errors: string[] = [];

  for (const field of fields) {
    const value = obj[field];
    if (value === undefined || value === null || value === '') {
      errors.push(`${field} is required`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate string length constraints
 */
export function validateStringLength(
  value: string,
  field: string,
  minLength: number,
  maxLength?: number
): ValidationResult {
  const errors: string[] = [];

  if (value.length < minLength) {
    errors.push(`${field} must be at least ${minLength} characters`);
  }

  if (maxLength && value.length > maxLength) {
    errors.push(`${field} must not exceed ${maxLength} characters`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      errors: ['Invalid email format']
    };
  }

  return { isValid: true, errors: [] };
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string): ValidationResult {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < 10 || cleaned.length > 15) {
    return {
      isValid: false,
      errors: ['Phone number must be 10-15 digits']
    };
  }

  return { isValid: true, errors: [] };
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(value: number, field: string): ValidationResult {
  if (!Number.isFinite(value) || value <= 0) {
    return {
      isValid: false,
      errors: [`${field} must be a positive number`]
    };
  }

  return { isValid: true, errors: [] };
}

/**
 * Validate rating (1-5 scale)
 */
export function validateRating(rating: number): ValidationResult {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return {
      isValid: false,
      errors: ['Rating must be an integer between 1 and 5']
    };
  }

  return { isValid: true, errors: [] };
}

// =============================================
// ENTITY VALIDATION SCHEMAS
// =============================================

/**
 * Validate User entity
 */
export function validateUser(user: Partial<User>): ValidationResult {
  const allErrors: string[] = [];

  // Required fields
  const requiredResult = validateRequired(user, ['id', 'email', 'firstName', 'lastName', 'role']);
  allErrors.push(...requiredResult.errors);

  // Email format
  if (user.email) {
    const emailResult = validateEmail(user.email);
    allErrors.push(...emailResult.errors);
  }

  // Name lengths
  if (user.firstName) {
    const firstNameResult = validateStringLength(user.firstName, 'firstName', 1, 50);
    allErrors.push(...firstNameResult.errors);
  }

  if (user.lastName) {
    const lastNameResult = validateStringLength(user.lastName, 'lastName', 1, 50);
    allErrors.push(...lastNameResult.errors);
  }

  // Phone validation (if provided)
  if (user.phone) {
    const phoneResult = validatePhone(user.phone);
    allErrors.push(...phoneResult.errors);
  }

  // Rating validation (if provided)
  if (user.rating !== undefined) {
    const ratingResult = validateRating(user.rating);
    allErrors.push(...ratingResult.errors);
  }

  // Role validation
  if (user.role && !['homeowner', 'contractor'].includes(user.role)) {
    allErrors.push('Role must be either "homeowner" or "contractor"');
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Validate Job entity
 */
export function validateJob(job: Partial<Job>): ValidationResult {
  const allErrors: string[] = [];

  // Required fields
  const requiredResult = validateRequired(job, ['id', 'title', 'description', 'location', 'homeownerId', 'budget']);
  allErrors.push(...requiredResult.errors);

  // Title length
  if (job.title) {
    const titleResult = validateStringLength(job.title, 'title', 5, 100);
    allErrors.push(...titleResult.errors);
  }

  // Description length
  if (job.description) {
    const descResult = validateStringLength(job.description, 'description', 10, 1000);
    allErrors.push(...descResult.errors);
  }

  // Budget validation
  if (job.budget !== undefined) {
    const budgetResult = validatePositiveNumber(job.budget, 'budget');
    allErrors.push(...budgetResult.errors);
  }

  // Status validation
  if (job.status && !['posted', 'assigned', 'in_progress', 'completed', 'cancelled'].includes(job.status)) {
    allErrors.push('Invalid job status');
  }

  // Priority validation
  if (job.priority && !['low', 'medium', 'high'].includes(job.priority)) {
    allErrors.push('Priority must be "low", "medium", or "high"');
  }

  // Photos validation (max 10)
  if (job.photos && job.photos.length > 10) {
    allErrors.push('Maximum 10 photos allowed per job');
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Validate Bid entity
 */
export function validateBid(bid: Partial<Bid>): ValidationResult {
  const allErrors: string[] = [];

  // Required fields
  const requiredResult = validateRequired(bid, ['id', 'jobId', 'contractorId', 'amount', 'description']);
  allErrors.push(...requiredResult.errors);

  // Amount validation
  if (bid.amount !== undefined) {
    const amountResult = validatePositiveNumber(bid.amount, 'amount');
    allErrors.push(...amountResult.errors);
  }

  // Description length
  if (bid.description) {
    const descResult = validateStringLength(bid.description, 'description', 10, 500);
    allErrors.push(...descResult.errors);
  }

  // Status validation
  if (bid.status && !['pending', 'accepted', 'rejected'].includes(bid.status)) {
    allErrors.push('Invalid bid status');
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Validate Message entity
 */
export function validateMessage(message: Partial<Message>): ValidationResult {
  const allErrors: string[] = [];

  // Required fields
  const requiredResult = validateRequired(message, ['id', 'jobId', 'senderId', 'receiverId', 'messageText']);
  allErrors.push(...requiredResult.errors);

  // Message text length
  if (message.messageText) {
    const textResult = validateStringLength(message.messageText, 'messageText', 1, 1000);
    allErrors.push(...textResult.errors);
  }

  // Message type validation
  const validTypes = ['text', 'image', 'file', 'video_call_invitation', 'video_call_started', 'video_call_ended', 'video_call_missed'];
  if (message.messageType && !validTypes.includes(message.messageType)) {
    allErrors.push('Invalid message type');
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Validate ContractorProfile entity
 */
export function validateContractorProfile(profile: Partial<ContractorProfile>): ValidationResult {
  const allErrors: string[] = [];

  // First validate as User
  const userResult = validateUser(profile);
  allErrors.push(...userResult.errors);

  // Contractor-specific validations
  if (profile.hourlyRate !== undefined) {
    const rateResult = validatePositiveNumber(profile.hourlyRate, 'hourlyRate');
    allErrors.push(...rateResult.errors);
  }

  if (profile.yearsExperience !== undefined) {
    if (!Number.isInteger(profile.yearsExperience) || profile.yearsExperience < 0 || profile.yearsExperience > 50) {
      allErrors.push('Years of experience must be between 0 and 50');
    }
  }

  if (profile.serviceRadius !== undefined) {
    const radiusResult = validatePositiveNumber(profile.serviceRadius, 'serviceRadius');
    allErrors.push(...radiusResult.errors);
  }

  // Availability validation
  const validAvailability = ['immediate', 'this_week', 'this_month', 'busy'];
  if (profile.availability && !validAvailability.includes(profile.availability)) {
    allErrors.push('Invalid availability status');
  }

  // Portfolio images limit
  if (profile.portfolioImages && profile.portfolioImages.length > 20) {
    allErrors.push('Maximum 20 portfolio images allowed');
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

// =============================================
// FORM VALIDATION HELPERS
// =============================================

/**
 * Validate job creation form
 */
export function validateJobForm(formData: any): ValidationResult {
  const allErrors: string[] = [];

  // Required fields
  const requiredResult = validateRequired(formData, ['title', 'description', 'location', 'budget']);
  allErrors.push(...requiredResult.errors);

  // Field-specific validations
  if (formData.title) {
    const titleResult = validateStringLength(formData.title, 'title', 5, 100);
    allErrors.push(...titleResult.errors);
  }

  if (formData.description) {
    const descResult = validateStringLength(formData.description, 'description', 10, 1000);
    allErrors.push(...descResult.errors);
  }

  if (formData.budget) {
    const budgetResult = validatePositiveNumber(formData.budget, 'budget');
    allErrors.push(...budgetResult.errors);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Validate bid submission form
 */
export function validateBidForm(formData: any): ValidationResult {
  const allErrors: string[] = [];

  // Required fields
  const requiredResult = validateRequired(formData, ['amount', 'description']);
  allErrors.push(...requiredResult.errors);

  // Field-specific validations
  if (formData.amount) {
    const amountResult = validatePositiveNumber(formData.amount, 'amount');
    allErrors.push(...amountResult.errors);
  }

  if (formData.description) {
    const descResult = validateStringLength(formData.description, 'description', 10, 500);
    allErrors.push(...descResult.errors);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Validate user registration form
 */
export function validateRegistrationForm(formData: any): ValidationResult {
  const allErrors: string[] = [];

  // Required fields
  const requiredResult = validateRequired(formData, ['email', 'password', 'firstName', 'lastName', 'role']);
  allErrors.push(...requiredResult.errors);

  // Email validation
  if (formData.email) {
    const emailResult = validateEmail(formData.email);
    allErrors.push(...emailResult.errors);
  }

  // Password validation
  if (formData.password) {
    const passwordResult = validateStringLength(formData.password, 'password', 8, 128);
    allErrors.push(...passwordResult.errors);

    // Password complexity
    if (formData.password.length >= 8) {
      const hasUpperCase = /[A-Z]/.test(formData.password);
      const hasLowerCase = /[a-z]/.test(formData.password);
      const hasNumbers = /\d/.test(formData.password);
      const hasSpecialChar = /[!@#$%^&*(),.?\":{}|<>]/.test(formData.password);

      const complexityCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

      if (complexityCount < 3) {
        allErrors.push('Password must contain at least 3 of: uppercase, lowercase, numbers, special characters');
      }
    }
  }

  // Name validations
  if (formData.firstName) {
    const firstNameResult = validateStringLength(formData.firstName, 'firstName', 1, 50);
    allErrors.push(...firstNameResult.errors);
  }

  if (formData.lastName) {
    const lastNameResult = validateStringLength(formData.lastName, 'lastName', 1, 50);
    allErrors.push(...lastNameResult.errors);
  }

  // Role validation
  if (formData.role && !['homeowner', 'contractor'].includes(formData.role)) {
    allErrors.push('Role must be either "homeowner" or "contractor"');
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

// =============================================
// DATA SANITIZATION
// =============================================

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: any): number | null {
  const num = Number(input);
  return isNaN(num) ? null : num;
}

// =============================================
// EXPORT VALIDATION SCHEMAS
// =============================================

export const ValidationSchemas = {
  user: validateUser,
  job: validateJob,
  bid: validateBid,
  message: validateMessage,
  contractorProfile: validateContractorProfile,
  forms: {
    job: validateJobForm,
    bid: validateBidForm,
    registration: validateRegistrationForm
  }
};

export default ValidationSchemas;