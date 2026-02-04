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
  { value: 'plumbing', label: 'Plumbing', emoji: '🚰' },
  { value: 'electrical', label: 'Electrical', emoji: '⚡' },
  { value: 'heating', label: 'Heating & Gas', emoji: '🔥' },
  { value: 'carpentry', label: 'Carpentry', emoji: '🔨' },
  { value: 'painting', label: 'Painting', emoji: '🎨' },
  { value: 'roofing', label: 'Roofing', emoji: '🏠' },
  { value: 'flooring', label: 'Flooring', emoji: '📐' },
  { value: 'gardening', label: 'Gardening', emoji: '🌱' },
  { value: 'cleaning', label: 'Cleaning', emoji: '🧹' },
  { value: 'handyman', label: 'Handyman', emoji: '🔧' },
  { value: 'hvac', label: 'HVAC', emoji: '❄️' },
  { value: 'other', label: 'Other', emoji: '⚙️' },
] as const;

// Urgency Levels
export const URGENCY_OPTIONS = [
  {
    value: 'low',
    label: 'Flexible',
    description: 'No rush, can wait a few weeks',
    emoji: '📅',
  },
  {
    value: 'medium',
    label: 'Soon',
    description: 'Within the next week',
    emoji: '⏰',
  },
  {
    value: 'high',
    label: 'Urgent',
    description: 'Within 1-2 days',
    emoji: '🚨',
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
