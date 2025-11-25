#!/usr/bin/env node

/**
 * Extract Help Categories Script
 * 
 * This script extracts categories from the monolithic categories.ts file
 * into separate files for better maintainability.
 * 
 * Usage: node scripts/extract-help-categories.js
 */

const fs = require('fs');
const path = require('path');

const CATEGORIES_FILE = path.join(__dirname, '../apps/web/app/help/lib/categories.ts');
const CATEGORIES_DIR = path.join(__dirname, '../apps/web/app/help/lib/categories');

// Category boundaries (line numbers where each category starts)
const CATEGORY_BOUNDARIES = [
  { id: 'getting-started', start: 21, end: 165 },
  { id: 'posting-jobs', start: 166, end: 324 },
  { id: 'finding-contractors', start: 325, end: 499 },
  { id: 'bidding-quotes', start: 500, end: 703 },
  { id: 'payments', start: 704, end: 1143 },
  { id: 'messaging', start: 1144, end: 1322 },
  { id: 'tradespeople', start: 1323, end: 1598 },
  { id: 'safety', start: 1599, end: 1818 },
  { id: 'account', start: 1819, end: 2042 },
];

function extractCategory(lines, start, end, categoryId) {
  // Extract the category object (from { to },)
  const categoryLines = lines.slice(start - 1, end);
  
  // Find the category object start
  let categoryStart = 0;
  for (let i = 0; i < categoryLines.length; i++) {
    if (categoryLines[i].includes('id:') && categoryLines[i].includes(categoryId)) {
      categoryStart = i;
      break;
    }
  }
  
  // Find the matching closing brace
  let braceCount = 0;
  let categoryEnd = categoryLines.length;
  for (let i = categoryStart; i < categoryLines.length; i++) {
    const line = categoryLines[i];
    braceCount += (line.match(/\{/g) || []).length;
    braceCount -= (line.match(/\}/g) || []).length;
    if (braceCount === 0 && i > categoryStart) {
      categoryEnd = i + 1;
      break;
    }
  }
  
  return categoryLines.slice(categoryStart, categoryEnd).join('\n');
}

function generateCategoryFile(categoryId, categoryContent) {
  const categoryName = categoryId.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');
  
  const fileName = `${categoryId}.ts`;
  const filePath = path.join(CATEGORIES_DIR, fileName);
  
  const fileContent = `/**
 * ${categoryName} Category
 * 
 * Help articles for ${categoryId.replace(/-/g, ' ')}.
 */

import type { Category } from './types';

export const ${categoryId.replace(/-/g, '')}Category: Category = ${categoryContent};
`;

  fs.writeFileSync(filePath, fileContent, 'utf-8');
  console.log(`✅ Created ${fileName}`);
}

function generateIndexFile() {
  const indexContent = `/**
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
`;

  const indexPath = path.join(CATEGORIES_DIR, 'index.ts');
  fs.writeFileSync(indexPath, indexContent, 'utf-8');
  console.log('✅ Created index.ts');
}

// Main execution
try {
  console.log('📦 Extracting help categories...\n');
  
  // Ensure categories directory exists
  if (!fs.existsSync(CATEGORIES_DIR)) {
    fs.mkdirSync(CATEGORIES_DIR, { recursive: true });
  }
  
  // Read the original file
  const fileContent = fs.readFileSync(CATEGORIES_FILE, 'utf-8');
  const lines = fileContent.split('\n');
  
  // Extract each category
  for (const boundary of CATEGORY_BOUNDARIES) {
    const categoryContent = extractCategory(lines, boundary.start, boundary.end, boundary.id);
    generateCategoryFile(boundary.id, categoryContent);
  }
  
  // Generate index file
  generateIndexFile();
  
  console.log('\n✅ Category extraction complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Update imports in apps/web/app/help/page.tsx');
  console.log('2. Update imports in apps/web/app/help/[category]/[slug]/page.tsx');
  console.log('3. Delete or archive the original categories.ts file');
  
} catch (error) {
  console.error('❌ Error extracting categories:', error);
  process.exit(1);
}

