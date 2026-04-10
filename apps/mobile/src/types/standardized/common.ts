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

interface NotificationSettings {
  jobUpdates: boolean;
  messages: boolean;
  payments: boolean;
  reminders: boolean;
  system: boolean;
}

interface PushNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'job' | 'message' | 'payment' | 'reminder' | 'system';
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}

// =============================================
// API RESPONSES
// =============================================

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  success: boolean;
  message?: string;
}

// =============================================
// FORM TYPES
// =============================================

interface CreateJobForm {
  title: string;
  description: string;
  location: string;
  budget: number;
  category?: string;
  subcategory?: string;
  priority?: 'low' | 'medium' | 'high';
  photos?: string[];
}

interface CreateBidForm {
  jobId: string;
  amount: number;
  description: string;
}

interface UpdateUserProfileForm {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  address?: string;
  profileImageUrl?: string;
}

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

function isJob(obj: unknown): obj is Job {
  return (
    !!obj &&
    typeof obj === 'object' &&
    'id' in obj &&
    typeof (obj as Job).id === 'string' &&
    'title' in obj &&
    typeof (obj as Job).title === 'string'
  );
}

function isBid(obj: unknown): obj is Bid {
  return (
    !!obj &&
    typeof obj === 'object' &&
    'id' in obj &&
    typeof (obj as Bid).id === 'string' &&
    'jobId' in obj &&
    typeof (obj as Bid).jobId === 'string'
  );
}

function isMessage(obj: unknown): obj is Message {
  return (
    !!obj &&
    typeof obj === 'object' &&
    'id' in obj &&
    typeof (obj as Message).id === 'string' &&
    'messageText' in obj &&
    typeof (obj as Message).messageText === 'string'
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

interface JobSearchFilters {
  category?: string;
  minBudget?: number;
  maxBudget?: number;
  status?: Job['status'];
  location?: LocationData;
  radius?: number;
}

interface ContractorSearchFilters {
  skills?: string[];
  minRating?: number;
  availability?: ContractorProfile['availability'];
  location?: LocationData;
  radius?: number;
  priceRange?: {
    min: number;
    max: number;
  };
}

// =============================================
// UTILITY TYPES
// =============================================

type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
