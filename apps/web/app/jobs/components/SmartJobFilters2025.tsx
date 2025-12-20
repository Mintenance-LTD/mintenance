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

export function SmartJobFilters2025({ onFilterChange, initialFilters }: SmartJobFilters2025Props) {
  const [filters, setFilters] = useState<JobFilters>(initialFilters || {});
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'category' | 'budget' | 'urgency'>('status');
  const prefersReducedMotion = useReducedMotion();

  const updateFilters = (newFilters: Partial<JobFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  };

  const toggleArrayFilter = (key: 'status' | 'category' | 'urgency', value: string) => {
    const currentValues = filters[key] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    updateFilters({ [key]: newValues.length > 0 ? newValues : undefined });
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const activeFilterCount =
    (filters.status?.length || 0) +
    (filters.category?.length || 0) +
    (filters.urgency?.length || 0) +
    (filters.budgetRange ? 1 : 0);

  return (
    <MotionDiv
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Smart Filters</h2>
              <p className="text-sm text-gray-500">
                {activeFilterCount > 0 ? `${activeFilterCount} active` : 'No filters applied'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <MotionButton
                onClick={clearFilters}
                className="text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Clear all
              </MotionButton>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {prefersReducedMotion ? (
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <motion.svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              )}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <input
            type="text"
            placeholder="Search jobs by title or description..."
            value={filters.searchQuery || ''}
            onChange={(e) => updateFilters({ searchQuery: e.target.value || undefined })}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {isExpanded && (
          <MotionDiv
            variants={slideInFromLeft}
            initial="initial"
            animate="animate"
            exit="exit"
            className="border-t border-gray-200"
          >
            {/* Tabs */}
            <div className="flex items-center gap-2 p-4 bg-gray-50 border-b border-gray-200 overflow-x-auto">
              {(['status', 'category', 'budget', 'urgency'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                    activeTab === tab
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Filter Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                <MotionDiv
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Status Filter */}
                  {activeTab === 'status' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {statusOptions.map((option) => {
                        const isSelected = filters.status?.includes(option.value) || false;
                        return (
                          <MotionButton
                            key={option.value}
                            onClick={() => toggleArrayFilter('status', option.value)}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              isSelected
                                ? 'border-teal-600 bg-teal-50'
                                : 'border-gray-200 bg-white hover:border-teal-300'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{option.label}</span>
                              {isSelected && (
                                <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </MotionButton>
                        );
                      })}
                    </div>
                  )}

                  {/* Category Filter */}
                  {activeTab === 'category' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {categoryOptions.map((option) => {
                        const isSelected = filters.category?.includes(option.value) || false;
                        return (
                          <MotionButton
                            key={option.value}
                            onClick={() => toggleArrayFilter('category', option.value)}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${
                              isSelected
                                ? 'border-teal-600 bg-teal-50'
                                : 'border-gray-200 bg-white hover:border-teal-300'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <span className="font-medium text-sm text-gray-900">{option.label}</span>
                          </MotionButton>
                        );
                      })}
                    </div>
                  )}

                  {/* Budget Filter */}
                  {activeTab === 'budget' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Min Budget
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              placeholder="0"
                              value={filters.budgetRange?.min || ''}
                              onChange={(e) => {
                                const min = parseInt(e.target.value) || 0;
                                updateFilters({
                                  budgetRange: { min, max: filters.budgetRange?.max || 10000 },
                                });
                              }}
                              className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Budget
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              placeholder="10000"
                              value={filters.budgetRange?.max || ''}
                              onChange={(e) => {
                                const max = parseInt(e.target.value) || 10000;
                                updateFilters({
                                  budgetRange: { min: filters.budgetRange?.min || 0, max },
                                });
                              }}
                              className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Set your preferred budget range
                      </div>
                    </div>
                  )}

                  {/* Urgency Filter */}
                  {activeTab === 'urgency' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {urgencyOptions.map((option) => {
                        const isSelected = filters.urgency?.includes(option.value) || false;
                        const urgencyColors = {
                          low: 'border-blue-600 bg-blue-50 text-blue-700',
                          medium: 'border-amber-600 bg-amber-50 text-amber-700',
                          high: 'border-emerald-600 bg-emerald-50 text-emerald-700',
                          emergency: 'border-rose-600 bg-rose-50 text-rose-700',
                        };
                        return (
                          <MotionButton
                            key={option.value}
                            onClick={() => toggleArrayFilter('urgency', option.value)}
                            className={`p-4 rounded-xl border-2 text-center transition-all ${
                              isSelected
                                ? urgencyColors[option.value as keyof typeof urgencyColors]
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <span className="font-semibold">{option.label}</span>
                          </MotionButton>
                        );
                      })}
                    </div>
                  )}
                </MotionDiv>
              </AnimatePresence>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && !isExpanded && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Active:</span>
            {filters.status?.map((status) => (
              <span key={status} className="px-2 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs font-medium">
                {status.replace('_', ' ')}
              </span>
            ))}
            {filters.category?.map((cat) => (
              <span key={cat} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                {cat}
              </span>
            ))}
            {filters.urgency?.map((urg) => (
              <span key={urg} className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
                {urg}
              </span>
            ))}
          </div>
        </div>
      )}
    </MotionDiv>
  );
}
