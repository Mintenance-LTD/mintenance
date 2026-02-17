'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';

type SortBy = 'distance' | 'budget' | 'newest' | 'skillMatch';
type ViewMode = 'map' | 'list';

interface FilterState {
  maxDistance: number;
  minBudget: number;
  maxBudget: number;
  minSkillMatch: number;
}

interface ContractorLocationForHeader {
  city?: string | null;
  country?: string | null;
}

interface JobsFilterBarProps {
  contractorLocation: ContractorLocationForHeader;
  jobCount: number;
  sortBy: SortBy;
  setSortBy: (value: SortBy) => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export function JobsFilterBar({
  contractorLocation,
  jobCount,
  sortBy,
  setSortBy,
  filters,
  setFilters,
  viewMode,
  setViewMode,
}: JobsFilterBarProps) {
  return (
    <>
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6">
        <div className="flex justify-between items-start flex-wrap gap-6">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center">
                <Icon name="mapPin" size={28} color={theme.colors.primary} />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Discover Jobs
              </h1>
            </div>
            <p className="text-base text-gray-600 leading-relaxed max-w-2xl">
              {contractorLocation.city || contractorLocation.country
                ? `Find your next project opportunity near ${[contractorLocation.city, contractorLocation.country].filter(Boolean).join(', ')}`
                : 'Find your next project opportunity'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {jobCount > 0 && (
              <div className="px-6 py-4 bg-gray-50 rounded-xl border border-gray-200 text-center min-w-[120px]">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  <AnimatedCounter value={jobCount} />
                </div>
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Available
                </div>
              </div>
            )}
            <Button
              variant="secondary"
              onClick={() =>
                setViewMode(viewMode === 'map' ? 'list' : 'map')
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}
            >
              <Icon
                name={viewMode === 'map' ? 'menu' : 'mapPin'}
                size={18}
              />
              {viewMode === 'map' ? 'List View' : 'Map View'}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Sorting - Collapsible */}
      <details className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group relative">
        {/* Gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
        <summary className="px-6 py-4 cursor-pointer list-none flex items-center justify-between hover:bg-gray-50 transition-colors">
          <h3 className="text-lg font-[560] text-gray-900 m-0 tracking-normal flex items-center gap-2">
            <Icon name="filter" size={20} color={theme.colors.primary} />
            Filters & Sorting
          </h3>
          <Icon
            name="chevronDown"
            size={20}
            color={theme.colors.textSecondary}
            className="transition-transform duration-200 details-open:rotate-180"
          />
        </summary>
        <div className="px-6 pb-4 pt-2 border-t border-gray-100">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold text-gray-900">
                Sort:
              </Label>
              <Select
                value={sortBy}
                onValueChange={(value: string) =>
                  setSortBy(value as SortBy)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skillMatch">Best Match</SelectItem>
                  <SelectItem value="distance">Closest First</SelectItem>
                  <SelectItem value="budget">Highest Budget</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold text-gray-900">
                Max Distance:
              </Label>
              <Select
                value={filters.maxDistance.toString()}
                onValueChange={(value: string) =>
                  setFilters({ ...filters, maxDistance: Number(value) })
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 km</SelectItem>
                  <SelectItem value="10">10 km</SelectItem>
                  <SelectItem value="25">25 km</SelectItem>
                  <SelectItem value="50">50 km</SelectItem>
                  <SelectItem value="100">100 km</SelectItem>
                  <SelectItem value="500">500+ km</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold text-gray-900">
                Min Skill Match:
              </Label>
              <Select
                value={filters.minSkillMatch.toString()}
                onValueChange={(value: string) =>
                  setFilters({ ...filters, minSkillMatch: Number(value) })
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any</SelectItem>
                  <SelectItem value="1">1+ skills</SelectItem>
                  <SelectItem value="2">2+ skills</SelectItem>
                  <SelectItem value="3">3+ skills</SelectItem>
                  <SelectItem value="4">4+ skills</SelectItem>
                  <SelectItem value="5">All skills</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </details>
    </>
  );
}
