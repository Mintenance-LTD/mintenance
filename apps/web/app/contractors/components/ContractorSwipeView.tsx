'use client';

import React, { useState } from 'react';
import { Heart, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ContractorData {
  id: string;
  name: string;
  company?: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  completedJobs: number;
  location: string;
  avatar?: string;
  verified: boolean;
  bio?: string;
  responseTime?: string;
  portfolio?: string[];
  distance?: number;
  priceRange?: string;
  yearsExperience?: number;
}

interface ContractorSwipeViewProps {
  contractors: ContractorData[];
  savedContractors: string[];
  onToggleSave: (id: string) => void;
}

export function ContractorSwipeView({
  contractors,
  savedContractors,
  onToggleSave,
}: ContractorSwipeViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (contractors.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No contractors to display</p>
      </div>
    );
  }

  const currentContractor = contractors[currentIndex];
  const isSaved = savedContractors.includes(currentContractor.id);

  const handleNext = () => {
    if (currentIndex < contractors.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSave = () => {
    onToggleSave(currentContractor.id);
    handleNext();
  };

  const handleSkip = () => {
    handleNext();
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">
            {currentIndex + 1} of {contractors.length}
          </span>
          <span className="text-sm text-gray-600">
            {contractors.length - currentIndex - 1} remaining
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-teal-600 h-2 rounded-full transition-all"
            style={{
              width: `${((currentIndex + 1) / contractors.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Contractor Card */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
        {/* Portfolio/Avatar */}
        <div className="relative h-80 bg-gray-100">
          {currentContractor.portfolio && currentContractor.portfolio.length > 0 ? (
            <img
              src={currentContractor.portfolio[0]}
              alt={currentContractor.name}
              className="w-full h-full object-cover"
            />
          ) : currentContractor.avatar ? (
            <img
              src={currentContractor.avatar}
              alt={currentContractor.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-teal-200">
              <span className="text-6xl font-bold text-teal-700">
                {currentContractor.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {currentContractor.name}
            </h3>
            {currentContractor.company && (
              <p className="text-lg text-gray-600">{currentContractor.company}</p>
            )}
          </div>

          {currentContractor.bio && (
            <p className="text-gray-600 mb-4">{currentContractor.bio}</p>
          )}

          {/* Specialties */}
          <div className="flex flex-wrap gap-2 mb-4">
            {currentContractor.specialties.map((specialty) => (
              <span
                key={specialty}
                className="px-3 py-1 bg-teal-50 text-teal-700 text-sm rounded-full"
              >
                {specialty}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {currentContractor.rating.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {currentContractor.reviewCount}
              </div>
              <div className="text-sm text-gray-600">Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {currentContractor.completedJobs}
              </div>
              <div className="text-sm text-gray-600">Jobs</div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Location</span>
              <span className="font-medium text-gray-900">
                {currentContractor.location}
              </span>
            </div>
            {currentContractor.distance !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Distance</span>
                <span className="font-medium text-gray-900">
                  {currentContractor.distance.toFixed(1)} miles
                </span>
              </div>
            )}
            {currentContractor.responseTime && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Response Time</span>
                <span className="font-medium text-gray-900">
                  {currentContractor.responseTime}
                </span>
              </div>
            )}
            {currentContractor.priceRange && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Price Range</span>
                <span className="font-medium text-gray-900">
                  {currentContractor.priceRange}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Swipe Actions */}
      <div className="flex items-center justify-center gap-6 mt-8">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="p-4 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-label="Previous contractor"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={handleSkip}
          disabled={currentIndex === contractors.length - 1}
          className="p-6 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-label="Skip contractor"
        >
          <X className="w-8 h-8" />
        </button>

        <button
          onClick={handleSave}
          className={`p-6 rounded-full transition-all ${
            isSaved
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-teal-500 text-white hover:bg-teal-600'
          }`}
          aria-label={isSaved ? 'Saved' : 'Save contractor'}
        >
          <Heart className={`w-8 h-8 ${isSaved ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={handleNext}
          disabled={currentIndex === contractors.length - 1}
          className="p-4 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-label="Next contractor"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="text-center mt-6 text-sm text-gray-500">
        <p>Use ← → arrow keys to navigate</p>
      </div>
    </div>
  );
}
