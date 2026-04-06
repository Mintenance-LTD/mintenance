'use client';

import Image from 'next/image';
import { Search, Star, Shield, Users, ChevronRight } from 'lucide-react';
import { SERVICES } from './constants';
import type { SearchState, Stats } from './types';

interface HeroSectionProps {
  searchState: SearchState;
  setSearchState: React.Dispatch<React.SetStateAction<SearchState>>;
  stats: Stats;
  handleSearch: () => void;
  handleServiceChange: (service: string) => void;
  handleLocationChange: (location: string) => void;
}

export function HeroSection({
  searchState,
  setSearchState,
  stats,
  handleSearch,
  handleServiceChange,
  handleLocationChange,
}: HeroSectionProps) {
  return (
    <section className="relative h-screen min-h-[600px] max-h-[900px] flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1920&q=90"
          alt="Professional contractor at work"
          fill
          priority
          className="object-cover"
          sizes="100vw"
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-full">
              <Star className="w-5 h-5 text-teal-500" fill="currentColor" />
              <span className="text-sm font-semibold text-gray-900">{stats.avgRating} Average Rating</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-full">
              <Shield className="w-5 h-5 text-teal-500" />
              <span className="text-sm font-semibold text-gray-900">All Verified</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-full">
              <Users className="w-5 h-5 text-teal-500" />
              <span className="text-sm font-semibold text-gray-900">{stats.contractors.toLocaleString()}+ Contractors</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-white mb-6">
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-3">
              Find the perfect
            </span>
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              contractor for your home
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-white/90 mb-12 leading-relaxed">
            Connect with trusted, verified professionals. Get competitive quotes. Hire with confidence.
          </p>

          {/* Search Bar */}
          <div className="search-bar-hero max-w-4xl mx-auto">
            <div className="search-field flex-1 min-w-[200px]">
              <label htmlFor="service-select">What do you need?</label>
              <select
                id="service-select"
                value={searchState.service}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleServiceChange(e.target.value)}
                className="w-full outline-none border-none bg-transparent text-gray-900 font-medium cursor-pointer"
              >
                {SERVICES.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </div>

            <div className="search-field flex-1 min-w-[200px]">
              <label htmlFor="location-input">Where?</label>
              <input
                id="location-input"
                type="text"
                placeholder="Enter postcode or city"
                value={searchState.location}
                onChange={(e) => handleLocationChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div className="search-field flex-1 min-w-[180px] hidden md:flex">
              <label htmlFor="date-input">When?</label>
              <input
                id="date-input"
                type="text"
                placeholder="Add dates"
                value={searchState.date}
                onChange={(e) => setSearchState((prev) => ({ ...prev, date: e.target.value }))}
                onFocus={(e) => e.target.type = 'date'}
                onBlur={(e) => !e.target.value && (e.target.type = 'text')}
              />
            </div>

            <button
              onClick={handleSearch}
              className="search-button"
              aria-label="Search contractors"
            >
              <Search className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Popular Searches */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-white/70">Popular:</span>
            {['Emergency Plumber', 'Licensed Electrician', 'Kitchen Remodel', 'Roof Repair'].map((term) => (
              <button
                key={term}
                onClick={() => {
                  const service = term.split(' ').pop() || term;
                  handleServiceChange(service);
                }}
                className="px-3 py-1 text-sm bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors backdrop-blur-sm"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronRight className="w-6 h-6 text-white rotate-90" />
      </div>
    </section>
  );
}
