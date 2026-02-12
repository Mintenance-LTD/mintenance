/**
 * Job Creation Constants
 *
 * Centralized configuration for job creation form validation,
 * limits, and business rules verified by E2E tests.
 */

// Form Validation
export const VALIDATION = {
  /** Minimum description length (characters) */
  MIN_DESCRIPTION_LENGTH: 50,

  /** Budget threshold requiring photos (£) */
  BUDGET_PHOTO_THRESHOLD: 500,

  /** Maximum budget allowed (£) */
  MAX_BUDGET: 50000,

  /** Maximum number of photos per job */
  MAX_PHOTOS: 10,
} as const;

// Job Categories
export const JOB_CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing', icon: 'droplets' },
  { value: 'electrical', label: 'Electrical', icon: 'zap' },
  { value: 'heating', label: 'Heating & Gas', icon: 'flame' },
  { value: 'carpentry', label: 'Carpentry', icon: 'hammer' },
  { value: 'painting', label: 'Painting', icon: 'paintbrush' },
  { value: 'roofing', label: 'Roofing', icon: 'home' },
  { value: 'flooring', label: 'Flooring', icon: 'ruler' },
  { value: 'gardening', label: 'Gardening', icon: 'sprout' },
  { value: 'cleaning', label: 'Cleaning', icon: 'sparkles' },
  { value: 'handyman', label: 'Handyman', icon: 'wrench' },
  { value: 'hvac', label: 'HVAC', icon: 'snowflake' },
  { value: 'other', label: 'Other', icon: 'settings' },
] as const;

// Urgency Levels
export const URGENCY_OPTIONS = [
  {
    value: 'low',
    label: 'Flexible',
    description: 'No rush, can wait a few weeks',
    icon: 'calendar',
  },
  {
    value: 'medium',
    label: 'Soon',
    description: 'Within the next week',
    icon: 'clock',
  },
  {
    value: 'high',
    label: 'Urgent',
    description: 'Within 1-2 days',
    icon: 'alert-triangle',
  },
] as const;

// Multi-Step Form Configuration
export const FORM_STEPS = [
  { id: 1, label: 'Details', shortLabel: 'Details' },
  { id: 2, label: 'Photos', shortLabel: 'Photos' },
  { id: 3, label: 'Budget', shortLabel: 'Budget' },
  { id: 4, label: 'Review', shortLabel: 'Review' },
] as const;

// Error Messages
export const ERROR_MESSAGES = {
  PROPERTY_REQUIRED: 'Please select a property',
  CATEGORY_REQUIRED: 'Please select a service category',
  TITLE_REQUIRED: 'Please enter a job title',
  DESCRIPTION_REQUIRED: 'Please provide a job description',
  DESCRIPTION_TOO_SHORT: `Description must be at least ${VALIDATION.MIN_DESCRIPTION_LENGTH} characters`,
  BUDGET_REQUIRED: 'Please set a budget',
  BUDGET_TOO_HIGH: `Budget cannot exceed £${VALIDATION.MAX_BUDGET.toLocaleString()}`,
  URGENCY_REQUIRED: 'Please select urgency level',
  PHOTOS_REQUIRED_HIGH_BUDGET: `Photos are required for jobs over £${VALIDATION.BUDGET_PHOTO_THRESHOLD}`,
  CSRF_TOKEN_MISSING: 'Security token not available. Please refresh the page.',
  PHONE_VERIFICATION_REQUIRED: 'Please verify your phone number before posting jobs',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  JOBS: '/api/jobs',
  PROPERTIES: '/api/properties',
  UPLOAD_PHOTOS: '/api/jobs/upload-photos',
  BUILDING_ASSESSMENT: '/api/building-surveyor/assess',
  JOB_ANALYSIS: '/api/jobs/analyze',
  CSRF: '/api/csrf',
} as const;

// Type Exports
export type JobCategory = typeof JOB_CATEGORIES[number]['value'];
export type UrgencyLevel = typeof URGENCY_OPTIONS[number]['value'];
export type FormStep = typeof FORM_STEPS[number]['id'];
