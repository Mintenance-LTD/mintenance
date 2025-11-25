'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';

interface PropertyCardProps {
  property: {
    id: string;
    property_name: string | null;
    address: string | null;
    property_type: string | null;
    is_primary: boolean | null;
    photos?: string[] | null;
    activeJobs: number;
    completedJobs: number;
    totalSpent: number;
    lastServiceDate: string | null;
  };
}

const getPropertyIcon = (type: string | null) => {
  switch (type) {
    case 'residential':
      return 'home';
    case 'commercial':
      return 'building';
    case 'rental':
      return 'key';
    default:
      return 'home';
  }
};

const calculateHealthScore = (activeJobs: number, completedJobs: number, lastServiceDate: string | null): number => {
  let score = 100;

  // Deduct points for active jobs (more active jobs = lower score)
  score -= Math.min(activeJobs * 5, 30);

  // Add points for completed jobs (more completed = better maintenance)
  score += Math.min(completedJobs * 2, 20);

  // Deduct points if no recent service (older than 90 days)
  if (lastServiceDate) {
    const daysSinceService = (Date.now() - new Date(lastServiceDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceService > 90) {
      score -= Math.min((daysSinceService - 90) / 10, 30);
    }
  } else {
    // No service history = lower score
    score -= 20;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

const getHealthColor = (score: number): string => {
  if (score >= 80) return '#10B981'; // Green
  if (score >= 60) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
};

const getHealthLabel = (score: number): string => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Attention';
};

export function PropertyCard({ property }: PropertyCardProps) {
  const router = useRouter();
  const healthScore = calculateHealthScore(property.activeJobs, property.completedJobs, property.lastServiceDate);
  const healthColor = getHealthColor(healthScore);
  const healthLabel = getHealthLabel(healthScore);
  const hasPhotos = property.photos && property.photos.length > 0;
  const firstPhoto = property.photos?.[0] || null;

  const handleAddJob = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Navigate to job creation with property_id as query parameter
    // The create job page can be updated later to pre-select this property
    router.push(`/jobs/create?property_id=${property.id}&property_name=${encodeURIComponent(property.property_name || '')}`);
  };

  const handleViewJobs = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/properties/${property.id}#jobs`);
  };

  return (
    <div className="col-span-12 md:col-span-6 xl:col-span-4">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-gray-300 relative h-full group">
        {/* Gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>

        {/* Property Photo or Icon */}
        {firstPhoto ? (
          <div className="relative w-full h-48 overflow-hidden bg-gray-100">
            <Image
              src={firstPhoto}
              alt={property.property_name || 'Property'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            {property.is_primary && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                Primary
              </div>
            )}
            {/* Health Score Badge */}
            <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-white text-xs font-semibold flex items-center gap-1"
              style={{ backgroundColor: healthColor }}>
              <Icon name="activity" size={12} color="white" />
              {healthScore}
            </div>
          </div>
        ) : (
          <div className="relative w-full h-32 bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
            <Icon name={getPropertyIcon(property.property_type)} size={48} color={theme.colors.primary} />
            {property.is_primary && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                Primary
              </div>
            )}
            {/* Health Score Badge */}
            <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-white text-xs font-semibold flex items-center gap-1"
              style={{ backgroundColor: healthColor }}>
              <Icon name="activity" size={12} color="white" />
              {healthScore}
            </div>
          </div>
        )}

        <div className="p-6">
          {/* Property Header */}
          <div className="mb-4">
            <h3 className="text-lg font-[560] text-gray-900 mb-1 line-clamp-1">
              {property.property_name || 'Unnamed Property'}
            </h3>
            <p className="text-sm font-[460] text-gray-600 leading-[1.5] line-clamp-2">
              {property.address || 'Address not specified'}
            </p>
            {/* Health Label */}
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: healthColor }}></div>
              <span className="text-xs font-[460]" style={{ color: healthColor }}>
                {healthLabel}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-gray-200">
            <div>
              <div className="text-xs font-[460] text-gray-600 mb-0.5">Active</div>
              <div className="text-base font-[560] text-gray-900">{property.activeJobs}</div>
            </div>
            <div>
              <div className="text-xs font-[460] text-gray-600 mb-0.5">Completed</div>
              <div className="text-base font-[560] text-gray-900">{property.completedJobs}</div>
            </div>
            <div>
              <div className="text-xs font-[460] text-gray-600 mb-0.5">Spent</div>
              <div className="text-base font-[560] text-gray-900">£{property.totalSpent.toLocaleString()}</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddJob}
              className="flex-1 text-xs"
              leftIcon={<Icon name="plus" size={14} color={theme.colors.primary} />}
            >
              Add Job
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewJobs}
              className="flex-1 text-xs"
              leftIcon={<Icon name="briefcase" size={14} color={theme.colors.primary} />}
            >
              View Jobs
            </Button>
          </div>

          {/* Footer */}
          <Link
            href={`/properties/${property.id}`}
            className="flex items-center justify-between text-sm text-primary-600 hover:text-primary-700 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-gray-500">
              {property.lastServiceDate ? `Last service: ${property.lastServiceDate}` : 'No service history'}
            </span>
            <span className="flex items-center gap-1">
              View Details
              <Icon name="arrowRight" size={14} color={theme.colors.primary} />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

