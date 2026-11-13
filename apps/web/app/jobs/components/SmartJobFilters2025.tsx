'use client';

export interface JobFilters {
  status?: string[];
  category?: string[];
  budgetRange?: { min: number; max: number };
  urgency?: string[];
  dateRange?: { start: string; end: string };
  searchQuery?: string;
}
