/**
 * Shared constants for the mobile job-posting flow.
 * Extracted from JobPostingScreen to keep that file under the 500-line
 * pre-commit limit after R6 #19 tenancy fields were added.
 */

export interface JobCategoryOption {
  label: string;
  value: string;
}

export const JOB_CATEGORIES: JobCategoryOption[] = [
  { label: 'Handyman', value: 'handyman' },
  { label: 'Plumbing', value: 'plumbing' },
  { label: 'Electrical', value: 'electrical' },
  { label: 'Painting & Decorating', value: 'painting' },
  { label: 'Carpentry', value: 'carpentry' },
  { label: 'Cleaning', value: 'cleaning' },
  { label: 'Gardening', value: 'gardening' },
  { label: 'Roofing', value: 'roofing' },
  { label: 'Heating & Gas', value: 'heating' },
  { label: 'Flooring', value: 'flooring' },
];
