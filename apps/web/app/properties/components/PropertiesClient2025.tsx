'use client';

import React, { useState } from 'react';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { formatMoney } from '@/lib/utils/currency';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Heart, Home, MapPin, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
  created_at: string;
  activeJobs: number;
  completedJobs: number;
  totalSpent: number;
  lastServiceDate: string | null;
  recentCategories: string[];
}

interface PropertiesClient2025Props {
  properties: Property[];
  userInfo: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export function PropertiesClient2025({ properties, userInfo }: PropertiesClient2025Props) {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFavorite = (propertyId: string) => {
    setFavorites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(propertyId)) {
        newSet.delete(propertyId);
        toast.success('Removed from favorites');
      } else {
        newSet.add(propertyId);
        toast.success('Added to favorites');
      }
      return newSet;
    });
  };

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
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">My Properties</h1>
        <p className="text-gray-600">Manage your properties and maintenance</p>
      </div>

      {/* Properties Grid */}
      {properties.length === 0 ? (
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
      ) : (
        <>
          {/* Grid: 3 columns on desktop, responsive */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                className="group bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-200"
              >
                {/* Property Image */}
                <div className="relative aspect-[4/3] bg-gray-200">
                  <Image
                    src="/placeholder-property.jpg"
                    alt={property.property_name || 'Property'}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Heart Icon */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite(property.id);
                    }}
                    className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-colors z-10"
                  >
                    <Heart
                      className={`w-5 h-5 ${
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

            {/* Add Property Card */}
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
          </div>
        </>
      )}
    </HomeownerPageWrapper>
  );
}
