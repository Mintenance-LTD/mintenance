'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { fadeIn, slideInFromLeft } from '@/lib/animations/variants';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

interface SmartJobFilters2025Props {
  onFilterChange: (filters: JobFilters) => void;
  initialFilters?: JobFilters;
}

export interface JobFilters {
  status?: string[];
  category?: string[];
  budgetRange?: { min: number; max: number };
  urgency?: string[];
  dateRange?: { start: string; end: string };
  searchQuery?: string;
}

const statusOptions: FilterOption[] = [
  { label: 'All Jobs', value: 'all', count: 0 },
  { label: 'Posted', value: 'posted', count: 0 },
  { label: 'In Progress', value: 'in_progress', count: 0 },
  { label: 'Review', value: 'review', count: 0 },
  { label: 'Completed', value: 'completed', count: 0 },
];

const categoryOptions: FilterOption[] = [
  { label: 'Plumbing', value: 'plumbing' },
  { label: 'Electrical', value: 'electrical' },
  { label: 'Carpentry', value: 'carpentry' },
  { label: 'Painting', value: 'painting' },
  { label: 'Roofing', value: 'roofing' },
  { label: 'HVAC', value: 'heating' },
  { label: 'Flooring', value: 'flooring' },
  { label: 'Gardening', value: 'gardening' },
];

const urgencyOptions: FilterOption[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Emergency', value: 'emergency' },
];
