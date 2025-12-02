'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StandardCard } from '@/components/ui/StandardCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, X } from 'lucide-react';

interface JobsTableFiltersProps {
  currentStatus: string;
  currentSearch: string;
}

export function JobsTableFilters({ currentStatus, currentSearch }: JobsTableFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(currentSearch);

  const statusOptions = [
    { value: 'all', label: 'All Jobs' },
    { value: 'posted', label: 'Posted' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    params.set('page', '1'); // Reset to first page
    router.push(`/contractor/jobs?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchValue.trim()) {
      params.set('search', searchValue.trim());
    } else {
      params.delete('search');
    }
    params.set('page', '1'); // Reset to first page
    router.push(`/contractor/jobs?${params.toString()}`);
  };

  const clearSearch = () => {
    setSearchValue('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    params.set('page', '1');
    router.push(`/contractor/jobs?${params.toString()}`);
  };

  return (
    <StandardCard>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Status Filter */}
        <div className="flex flex-wrap gap-2 flex-1">
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              variant={currentStatus === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleStatusChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search jobs..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchValue && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>
      </div>
    </StandardCard>
  );
}

