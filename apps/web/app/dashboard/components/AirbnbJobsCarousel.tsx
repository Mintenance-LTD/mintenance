'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, MapPin, Calendar } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  status: string;
  budget?: number;
  scheduled_date?: string;
  contractor_name?: string;
  description?: string;
  property_id?: string;
}

interface Property {
  id: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
}

interface AirbnbJobsCarouselProps {
  jobs: Job[];
  properties: Property[];
}

export function AirbnbJobsCarousel({ jobs, properties }: AirbnbJobsCarouselProps) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFavorite = (jobId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const getPropertyAddress = (propertyId?: string) => {
    if (!propertyId) return null;
    const property = properties.find((p) => p.id === propertyId);
    return property ? `${property.city || 'Unknown'}` : null;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      posted: 'bg-gray-100 text-gray-700',
      assigned: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-teal-100 text-teal-700',
      review: 'bg-amber-100 text-amber-700',
      completed: 'bg-emerald-100 text-emerald-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">No active projects yet</h2>
        <p className="text-base text-gray-600 mb-6">Start your first project and find the perfect contractor</p>
        <Link
          href="/jobs/create"
          className="inline-block px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          Post Your First Job
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-900">Active Projects</h2>
        <Link href="/jobs" className="text-base font-medium text-teal-600 hover:text-teal-700">
          View all
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => {
          const isFavorite = favorites.has(job.id);
          const propertyLocation = getPropertyAddress(job.property_id);

          return (
            <Link key={job.id} href={`/jobs/${job.id}`} className="group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
                {/* Image Placeholder */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-teal-100 to-teal-200 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl text-teal-300/50">
                      {job.title.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* Heart Icon - Top Right */}
                  <button
                    onClick={(e) => toggleFavorite(job.id, e)}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all shadow-sm"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700'
                      }`}
                    />
                  </button>

                  {/* Status Badge */}
                  <div className="absolute bottom-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  {/* Location */}
                  {propertyLocation && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{propertyLocation}</span>
                    </div>
                  )}

                  {/* Title */}
                  <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-1 group-hover:text-teal-600 transition-colors">
                    {job.title}
                  </h3>

                  {/* Contractor Name */}
                  {job.contractor_name && (
                    <p className="text-sm text-gray-600 mb-2">
                      with {job.contractor_name}
                    </p>
                  )}

                  {/* Description */}
                  {job.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {job.description}
                    </p>
                  )}

                  {/* Bottom Info */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      {job.scheduled_date && (
                        <>
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(job.scheduled_date).toLocaleDateString('en-GB', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </>
                      )}
                    </div>
                    {job.budget && (
                      <div className="text-base font-semibold text-gray-900">
                        £{job.budget.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Rating placeholder */}
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-sm text-gray-900">★</span>
                    <span className="text-sm text-gray-600">4.9 rating</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
