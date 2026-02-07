'use client';

import Image from 'next/image';
import {
  Star,
  MapPin,
  Briefcase,
  Share2,
  Heart,
  Shield,
} from 'lucide-react';

interface Contractor {
  id: string;
  name: string;
  company: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  location: string;
  verified: boolean;
  premium: boolean;
}

interface ContractorProfileHeaderProps {
  contractor: Contractor;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
}

export function ContractorProfileHeader({
  contractor,
  isFavorite,
  onToggleFavorite,
  onShare,
}: ContractorProfileHeaderProps) {
  return (
    <div className="relative">
      {/* Cover Image */}
      <div className="relative h-96 bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600">
        <div className="absolute inset-0 bg-black bg-opacity-10" />
      </div>

      {/* Profile Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* Profile Photo - Overlapping Cover */}
          <div className="absolute -top-24 left-0">
            <div className="relative w-48 h-48 rounded-3xl border-6 border-white shadow-2xl bg-white overflow-hidden">
              <Image
                src={contractor.avatar}
                alt={contractor.name}
                fill
                className="object-cover rounded-3xl"
                sizes="192px"
                unoptimized={contractor.avatar.startsWith('http') && !contractor.avatar.includes('dicebear.com')}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${contractor.id}`;
                }}
              />
              {contractor.verified && (
                <div className="absolute bottom-3 right-3 bg-teal-600 rounded-full p-3 border-4 border-white shadow-lg z-10">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="pt-32 pb-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-gray-900">{contractor.name}</h1>
                  {contractor.premium && (
                    <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-sm font-bold rounded-full shadow-md">
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-xl text-gray-700 mb-4">{contractor.company}</p>
                <div className="flex items-center gap-4 flex-wrap mb-6">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-gray-900 text-gray-900" />
                    <span className="text-lg font-semibold text-gray-900">
                      {contractor.rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-gray-400">·</span>
                  <button className="font-semibold text-gray-900 underline hover:text-gray-700">
                    {contractor.reviewCount} reviews
                  </button>
                  <span className="text-gray-400">·</span>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Briefcase className="w-5 h-5" />
                    <span className="font-semibold">{contractor.completedJobs}</span>
                    <span>jobs</span>
                  </div>
                  <span className="text-gray-400">·</span>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-5 h-5" />
                    <span>{contractor.location}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={onShare}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium shadow-sm"
                  aria-label="Share contractor profile"
                >
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                  Share
                </button>
                <button
                  onClick={onToggleFavorite}
                  className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-all font-medium shadow-sm ${
                    isFavorite
                      ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
