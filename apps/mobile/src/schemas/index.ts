/**
 * Validation Schemas Index
 *
 * This file exports all validation schemas used throughout the application.
 * It provides a centralized location for data validation and type checking.
 */

// Export validation utilities
export {
  ValidationError,
  validateRequired,
  validateStringLength,
  validateEmail,
  validatePhone,
  validatePositiveNumber,
  validateRating,
  sanitizeString,
  sanitizeHtml,
  sanitizeNumber
} from '../utils/validation';

// Export entity validation schemas
export {
  validateUser,
  validateJob,
  validateBid,
  validateMessage,
  validateContractorProfile
} from '../utils/validation';

// Export form validation schemas
export {
  validateJobForm,
  validateBidForm,
  validateRegistrationForm
} from '../utils/validation';

// Export default validation schemas object
export { ValidationSchemas as default } from '../utils/validation';

// =============================================
// VALIDATION CONSTANTS
// =============================================

export const VALIDATION_LIMITS = {
  // User fields
  firstName: { min: 1, max: 50 },
  lastName: { min: 1, max: 50 },
  bio: { min: 0, max: 500 },
  phone: { min: 10, max: 15 },

  // Job fields
  title: { min: 5, max: 100 },
  description: { min: 10, max: 1000 },
  budget: { min: 1, max: 100000 },
  photos: { max: 10 },

  // Bid fields
  bidDescription: { min: 10, max: 500 },
  bidAmount: { min: 1, max: 100000 },

  // Message fields
  messageText: { min: 1, max: 1000 },

  // Contractor fields
  yearsExperience: { min: 0, max: 50 },
  hourlyRate: { min: 1, max: 1000 },
  serviceRadius: { min: 1, max: 100 },
  portfolioImages: { max: 20 },

  // Password requirements
  password: { min: 8, max: 128 }
} as const;

export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[1-9]\d{1,14}$/,
  password: {
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    numbers: /\d/,
    special: /[!@#$%^&*(),.?\":{}|<>]/
  }
} as const;

export const VALIDATION_MESSAGES = {
  required: (field: string) => `${field} is required`,
  minLength: (field: string, min: number) => `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) => `${field} must not exceed ${max} characters`,
  email: 'Invalid email format',
  phone: 'Invalid phone number format',
  positiveNumber: (field: string) => `${field} must be a positive number`,
  rating: 'Rating must be between 1 and 5',
  password: 'Password must contain at least 3 of: uppercase, lowercase, numbers, special characters'
} as const;