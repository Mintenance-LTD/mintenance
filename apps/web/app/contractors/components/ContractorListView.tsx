'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Star, Briefcase, Heart, GitCompare, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
  distance?: number;
  priceRange?: string;
  yearsExperience?: number;
}

interface ContractorListViewProps {
  contractors: ContractorData[];
  savedContractors: string[];
  compareList: string[];
  onToggleSave: (id: string) => void;
  onToggleCompare: (id: string) => void;
}

export function ContractorListView({
  contractors,
  savedContractors,
  compareList,
  onToggleSave,
  onToggleCompare,
}: ContractorListViewProps) {
  return (
    <div className="space-y-4">
      {contractors.map((contractor) => {
        const isSaved = savedContractors.includes(contractor.id);
        const isComparing = compareList.includes(contractor.id);

        return (
          <div
            key={contractor.id}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {contractor.avatar ? (
                  <img
                    src={contractor.avatar}
                    alt={contractor.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
                    <span className="text-xl font-semibold text-teal-700">
                      {contractor.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {contractor.name}
                      </h3>
                      {contractor.verified && (
                        <CheckCircle className="w-5 h-5 text-teal-600" />
                      )}
                    </div>
                    {contractor.company && (
                      <p className="text-sm text-gray-600">{contractor.company}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleSave(contractor.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isSaved
                          ? 'bg-red-50 text-red-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      aria-label={isSaved ? 'Remove from saved' : 'Save contractor'}
                    >
                      <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={() => onToggleCompare(contractor.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isComparing
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      aria-label={
                        isComparing ? 'Remove from comparison' : 'Add to comparison'
                      }
                    >
                      <GitCompare className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Bio */}
                {contractor.bio && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{contractor.bio}</p>
                )}

                {/* Specialties */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {contractor.specialties.slice(0, 4).map((specialty) => (
                    <span
                      key={specialty}
                      className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                    >
                      {specialty}
                    </span>
                  ))}
                  {contractor.specialties.length > 4 && (
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                      +{contractor.specialties.length - 4} more
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-current" />
                    <span className="text-sm font-medium text-gray-900">
                      {contractor.rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({contractor.reviewCount} reviews)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Briefcase className="w-4 h-4" />
                    {contractor.completedJobs} jobs
                  </div>
                  {contractor.distance !== undefined && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {contractor.distance.toFixed(1)} miles away
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {contractor.responseTime && (
                      <span>Responds in {contractor.responseTime}</span>
                    )}
                    {contractor.priceRange && (
                      <span className="font-medium text-gray-900">{contractor.priceRange}</span>
                    )}
                  </div>

                  <Link href={`/contractors/${contractor.id}`}>
                    <Button variant="primary" size="sm">
                      View Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
