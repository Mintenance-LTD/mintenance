// Alias route for data annotation interface
// Redirects to building-assessments page for consistency
'use client';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Annotation | Mintenance Admin',
  description: 'AI training data annotation interface for building assessment models and property inspection analysis.',
};

export { default } from '../building-assessments/page';

