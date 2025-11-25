/**
 * Help Categories Index
 * 
 * Exports all help categories in a single array.
 * Categories are split into separate files for maintainability.
 */

import type { Category } from './types';
import { gettingstartedCategory } from './getting-started';
import { postingjobsCategory } from './posting-jobs';
import { findingcontractorsCategory } from './finding-contractors';
import { biddingquotesCategory } from './bidding-quotes';
import { paymentsCategory } from './payments';
import { messagingCategory } from './messaging';
import { tradespeopleCategory } from './tradespeople';
import { safetyCategory } from './safety';
import { accountCategory } from './account';

// All categories are now extracted into separate files
export const helpCategories: Category[] = [
  gettingstartedCategory,
  postingjobsCategory,
  findingcontractorsCategory,
  biddingquotesCategory,
  paymentsCategory,
  messagingCategory,
  tradespeopleCategory,
  safetyCategory,
  accountCategory,
];

// Re-export types for convenience
export type { Article, Category } from './types';

// Note: The original categories.ts file can now be removed or kept for reference
// All categories have been successfully extracted into individual files
