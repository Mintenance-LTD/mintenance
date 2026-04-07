'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import type { SearchBarProps, SearchParams } from './types';

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  variant = 'hero',
  className = '',
}) => {
  const [params, setParams] = useState<SearchParams>({});
  const router = useRouter();

  const handleSearch = useCallback(() => {
    // Build search query parameters
    const searchParams = new URLSearchParams();
    if (params.service) searchParams.set('service', params.service);
    if (params.location) searchParams.set('location', params.location);
    if (params.date) searchParams.set('date', params.date);

    // Navigate to contractors search page with query parameters
    router.push(`/contractors?${searchParams.toString()}`);

    // Also call the onSearch callback for any custom handling
    onSearch(params);
  }, [params, onSearch, router]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  return (
    <div className={`search-bar-${variant} ${className}`}>
      {/* Service Field */}
      <div className='search-field'>
        <label htmlFor='service'>What</label>
        <input
          id='service'
          type='text'
          placeholder='Service type'
          value={params.service || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setParams({ ...params, service: e.target.value })
          }
          onKeyPress={handleKeyPress}
        />
      </div>

      {/* Location Field */}
      <div className='search-field'>
        <label htmlFor='location'>Where</label>
        <input
          id='location'
          type='text'
          placeholder='Postcode or area'
          value={params.location || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setParams({ ...params, location: e.target.value })
          }
          onKeyPress={handleKeyPress}
        />
      </div>

      {/* Date Field */}
      <div className='search-field'>
        <label htmlFor='date'>When</label>
        <input
          id='date'
          type='date'
          placeholder='Add date'
          value={params.date || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setParams({ ...params, date: e.target.value })
          }
          onKeyPress={handleKeyPress}
        />
      </div>

      {/* Search Button */}
      <button
        className='search-button'
        onClick={handleSearch}
        aria-label='Search'
      >
        <Search className='w-5 h-5 text-white' />
      </button>
    </div>
  );
};
