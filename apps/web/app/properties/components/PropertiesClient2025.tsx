'use client';

import React, { useState, useMemo } from 'react';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { formatMoney } from '@/lib/utils/currency';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Crown, Heart, Home, Lock, MapPin, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getCsrfHeaders } from '@/lib/csrf-client';
import Image from 'next/image';
import {
  PropertiesToolbar,
  PropertySortOption,
  PropertyTypeFilter,
} from './PropertiesToolbar';
import { logger } from '@mintenance/shared';

interface Property {
  id: string;
  property_name: string | null;
  address: string | null;
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_footage?: number | null;
  year_built?: number | null;
  is_primary?: boolean;
  is_favorited?: boolean;
  created_at: string;
  activeJobs: number;
  completedJobs: number;
  totalSpent: number;
  lastServiceDate: string | null;
  recentCategories: string[];
}

interface PropertiesClient2025Props {
  properties: Property[];
  propertyLimit: number | 'unlimited';
  tier: string;
  userInfo: {
    name: string;
    email: string;
    avatar?: string;
  };
}

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  landlord: 'Landlord',
  agency: 'Agency',
};

export function PropertiesClient2025({ properties, propertyLimit, tier, userInfo }: PropertiesClient2025Props) {
  const router = useRouter();

  // Initialize favorites from server data
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(properties.filter((p) => p.is_favorited).map((p) => p.id))
  );

  // Toolbar state
  const [sortBy, setSortBy] = useState<PropertySortOption>('newest');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<PropertyTypeFilter>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const toggleFavorite = async (propertyId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const isFavorited = favorites.has(propertyId);
    const method = isFavorited ? 'DELETE' : 'POST';

    // Optimistic update
    setFavorites((prev) => {
      const newSet = new Set(prev);
      if (isFavorited) {
        newSet.delete(propertyId);
      } else {
        newSet.add(propertyId);
      }
      return newSet;
    });

    try {
      const response = await fetch('/api/properties/favorites', {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...await getCsrfHeaders(),
        },
        body: JSON.stringify({ property_id: propertyId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite');
      }

      toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      // Revert optimistic update on error
      setFavorites((prev) => {
        const newSet = new Set(prev);
        if (isFavorited) {
          newSet.add(propertyId);
        } else {
          newSet.delete(propertyId);
        }
        return newSet;
      });

      logger.error('Error toggling favorite', error, { service: 'properties' });
      toast.error('Failed to update favorite');
    }
  };

  // Filter and sort properties
  const filteredAndSortedProperties = useMemo(() => {
    let result = [...properties];

    // Apply property type filter
    if (propertyTypeFilter !== 'all') {
      result = result.filter((p) => p.property_type === propertyTypeFilter);
    }

    // Apply favorites filter
    if (showFavoritesOnly) {
      result = result.filter((p) => favorites.has(p.id));
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'spent-high':
          return b.totalSpent - a.totalSpent;
        case 'spent-low':
          return a.totalSpent - b.totalSpent;
        case 'name-az':
          return (a.property_name || '').localeCompare(b.property_name || '');
        case 'name-za':
          return (b.property_name || '').localeCompare(a.property_name || '');
        case 'active-jobs':
          return b.activeJobs - a.activeJobs;
        default:
          return 0;
      }
    });

    return result;
  }, [properties, propertyTypeFilter, showFavoritesOnly, sortBy, favorites]);

  return (
    <HomeownerPageWrapper>
      {/* Back to Dashboard Button */}
      <button
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Dashboard</span>
      </button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-semibold text-gray-900">My Properties</h1>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
            {TIER_LABELS[tier] || 'Free'} plan
          </span>
        </div>
        <p className="text-gray-600">
          {propertyLimit === 'unlimited'
            ? `${properties.length} properties`
            : `${properties.length}/${propertyLimit} properties`}
          {' '}&middot; Manage your properties and maintenance
        </p>
      </div>

      {/* Toolbar */}
      {properties.length > 0 && (
        <PropertiesToolbar
          totalCount={properties.length}
          displayedCount={filteredAndSortedProperties.length}
          sortBy={sortBy}
          onSortChange={setSortBy}
          propertyTypeFilter={propertyTypeFilter}
          onPropertyTypeFilterChange={setPropertyTypeFilter}
          showFavoritesOnly={showFavoritesOnly}
          onToggleFavoritesOnly={() => setShowFavoritesOnly(!showFavoritesOnly)}
        />
      )}

      {/* Properties Grid */}
      {filteredAndSortedProperties.length === 0 && properties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No properties yet</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Add your first property to start managing maintenance jobs and tracking service history
          </p>
          <Link
            href="/properties/add"
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Your First Property
          </Link>
        </div>
      ) : filteredAndSortedProperties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No properties match your filters</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Try adjusting your filters or sort options to see more properties
          </p>
          <button
            onClick={() => {
              setPropertyTypeFilter('all');
              setShowFavoritesOnly(false);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          {/* Grid: 3 columns on desktop, responsive */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedProperties.map((property) => (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                className="group bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-200"
              >
                {/* Property Image */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <Home className="w-12 h-12 mb-2" />
                    <span className="text-sm font-medium">{property.property_type || 'Property'}</span>
                  </div>
                  {/* Heart Icon */}
                  <button
                    onClick={(e) => toggleFavorite(property.id, e)}
                    className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-colors z-10"
                  >
                    <Heart
                      className={`w-5 h-5 transition-colors ${
                        favorites.has(property.id)
                          ? 'fill-red-500 text-red-500'
                          : 'text-gray-700'
                      }`}
                    />
                  </button>
                  {/* Active Jobs Badge */}
                  {property.activeJobs > 0 && (
                    <div className="absolute top-3 left-3 bg-teal-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-md">
                      {property.activeJobs} Active {property.activeJobs === 1 ? 'Job' : 'Jobs'}
                    </div>
                  )}
                </div>

                {/* Property Details */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg line-clamp-1">
                      {property.property_name || 'Unnamed Property'}
                    </h3>
                  </div>

                  <div className="flex items-center text-gray-600 text-sm mb-2">
                    <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="line-clamp-1">{property.address || 'No address'}</span>
                  </div>

                  <div className="flex items-center gap-3 text-gray-600 text-sm mb-4">
                    <span className="capitalize">{property.property_type || 'House'}</span>
                    {property.bedrooms && (
                      <>
                        <span>•</span>
                        <span>{property.bedrooms} bed</span>
                      </>
                    )}
                    {property.bathrooms && (
                      <>
                        <span>•</span>
                        <span>{property.bathrooms} bath</span>
                      </>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      {property.completedJobs} completed jobs
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatMoney(property.totalSpent, 'GBP')} spent
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {/* Add Property / Upgrade Card */}
            {propertyLimit !== 'unlimited' && properties.length >= propertyLimit ? (
              <div className="bg-white rounded-xl overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center min-h-[320px]">
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Property limit reached</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Your {TIER_LABELS[tier] || 'Free'} plan allows {propertyLimit} {propertyLimit === 1 ? 'property' : 'properties'}.
                    {tier === 'free' ? ' Upgrade to Landlord for up to 25.' : ' Upgrade to Agency for unlimited.'}
                  </p>
                  <Link
                    href="/subscription-plans"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors text-sm"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade Plan
                  </Link>
                </div>
              </div>
            ) : (
              <Link
                href="/properties/add"
                className="group bg-white rounded-xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-teal-500 hover:shadow-lg transition-all duration-300 flex items-center justify-center min-h-[320px]"
              >
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-teal-200 transition-colors">
                    <Plus className="w-8 h-8 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Add property</h3>
                  <p className="text-gray-600 text-sm">Start managing a new property</p>
                </div>
              </Link>
            )}
          </div>
        </>
      )}
    </HomeownerPageWrapper>
  );
}
