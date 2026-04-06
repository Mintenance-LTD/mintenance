import React from 'react';
import { Search, Filter, RefreshCw, Download, FileText, Loader2 } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { Form1099Status } from './types';
import { STATUS_OPTIONS } from './types';

interface FiltersBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | Form1099Status;
  onStatusFilterChange: (value: 'all' | Form1099Status) => void;
  onRefresh: () => void;
  onExportCSV: () => void;
  onGenerateAll: () => void;
  generatingAll: boolean;
}

export function FiltersBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  onExportCSV,
  onGenerateAll,
  generatingAll,
}: FiltersBarProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Search and Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <label htmlFor="contractor-search" className="sr-only">
              Search contractors
            </label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <input
              id="contractor-search"
              type="text"
              placeholder="Search by name, email, or TIN..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" aria-hidden="true" />
            <fieldset>
              <legend className="sr-only">Filter by 1099 status</legend>
              <div className="flex items-center gap-1" role="radiogroup" aria-label="1099 status filter">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    role="radio"
                    aria-checked={statusFilter === option.value}
                    onClick={() => onStatusFilterChange(option.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === option.value
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        {/* Right: Bulk Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            aria-label="Refresh data"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={onExportCSV}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            aria-label="Export contractor tax data as CSV"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Export CSV
          </button>
          <button
            onClick={onGenerateAll}
            disabled={generatingAll}
            className="px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            aria-label="Generate all pending 1099-NEC forms"
          >
            {generatingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileText className="w-4 h-4" aria-hidden="true" />
            )}
            {generatingAll ? 'Generating...' : 'Generate All Pending'}
          </button>
        </div>
      </div>
    </MotionDiv>
  );
}
