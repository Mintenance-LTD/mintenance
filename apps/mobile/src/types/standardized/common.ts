/**
 * Common types: notifications, API responses, forms, validation,
 * search filters, type guards, and utility types.
 */

import type { User } from './user';
import type { Job, Bid } from './jobs';
import type { Message } from './messaging';
import type { ContractorProfile } from './contractor';
import type { LocationData } from './location';

// =============================================
// NOTIFICATIONS
// =============================================





// =============================================
// API RESPONSES
// =============================================





// =============================================
// FORM TYPES
// =============================================







// =============================================
// TYPE GUARDS
// =============================================

export function isUser(obj: unknown): obj is User {
  return (
    !!obj &&
    typeof obj === 'object' &&
    'id' in obj &&
    typeof (obj as User).id === 'string' &&
    'email' in obj &&
    typeof (obj as User).email === 'string'
  );
}







// =============================================
// VALIDATION TYPES
// =============================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FieldValidation {
  field: string;
  rules: string[];
  message?: string;
}

// =============================================
// SEARCH & FILTER TYPES
// =============================================





// =============================================
// UTILITY TYPES
// =============================================
