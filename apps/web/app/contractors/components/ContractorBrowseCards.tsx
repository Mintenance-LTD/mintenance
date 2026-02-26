'use client';

import Image from 'next/image';
import {
  Star,
  MapPin,
  Shield,
  Award,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { ContractorData } from './ContractorsBrowseProfessional';

export function SkeletonGridCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
      {/* Image Skeleton */}
      <div className="h-56 bg-gray-200" />

      {/* Content Skeleton */}
      <div className="p-6">
        <div className="h-6 bg-gray-200 rounded-lg mb-2 w-3/4" />
        <div className="h-4 bg-gray-200 rounded-lg mb-4 w-1/2" />

        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 rounded-lg w-20" />
          <div className="h-4 bg-gray-200 rounded-lg w-16" />
        </div>

        <div className="flex gap-2 mb-4">
          <div className="h-6 bg-gray-200 rounded-full w-20" />
          <div className="h-6 bg-gray-200 rounded-full w-24" />
          <div className="h-6 bg-gray-200 rounded-full w-16" />
        </div>

        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
          <div className="h-4 bg-gray-200 rounded-lg w-16" />
          <div className="h-4 bg-gray-200 rounded-lg w-20" />
        </div>

        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded-lg w-24" />
          <div className="h-10 bg-gray-200 rounded-xl w-32" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonListCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
      <div className="flex gap-6">
        <div className="w-32 h-32 bg-gray-200 rounded-xl flex-shrink-0" />
        <div className="flex-1">
          <div className="h-7 bg-gray-200 rounded-lg mb-2 w-1/3" />
          <div className="h-5 bg-gray-200 rounded-lg mb-4 w-1/4" />
          <div className="flex gap-6 mb-4">
            <div className="h-4 bg-gray-200 rounded-lg w-24" />
            <div className="h-4 bg-gray-200 rounded-lg w-20" />
            <div className="h-4 bg-gray-200 rounded-lg w-28" />
          </div>
          <div className="flex gap-2 mb-4">
            <div className="h-6 bg-gray-200 rounded-full w-20" />
            <div className="h-6 bg-gray-200 rounded-full w-24" />
            <div className="h-6 bg-gray-200 rounded-full w-20" />
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <div className="h-8 bg-gray-200 rounded-lg w-28" />
            <div className="h-11 bg-gray-200 rounded-xl w-36" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContractorGridCard({ contractor }: { contractor: ContractorData }) {
  const imageUrl = contractor.profile_image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(contractor.name)}&background=14b8a6&color=fff&size=400`;

  return (
    <div
      className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden hover:border-teal-500 hover:shadow-2xl transition-all duration-300 group cursor-pointer relative"
      onClick={() => window.location.href = `/contractors/${contractor.id}`}
    >
      {/* Gradient Border Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />

      {/* Image Section */}
      <div className="relative h-56 overflow-hidden">
        <Image
          src={imageUrl}
          alt={contractor.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-110 transition-transform duration-500"
        />

        {/* Overlay Gradient on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Verified Badge */}
        {contractor.verified && (
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full flex items-center gap-1.5 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Shield className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold text-slate-900">Verified</span>
          </div>
        )}

        {/* Premium Badge */}
        {contractor.rating >= 4.8 && (
          <div className="absolute top-4 right-4 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center gap-1.5 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Award className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white">Top Rated</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Header */}
        <div className="mb-3">
          <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-teal-600 transition-colors">
            {contractor.name}
          </h3>
          <p className="text-sm text-gray-600 font-medium">
            {contractor.company_name || 'Independent Contractor'}
          </p>
        </div>

        {/* Rating & Location */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold text-slate-900">{contractor.rating.toFixed(1)}</span>
            <span className="text-sm text-gray-500">({contractor.review_count})</span>
          </div>
          {contractor.city && (
            <div className="flex items-center gap-1 text-gray-600">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{contractor.city}</span>
            </div>
          )}
        </div>

        {/* Skills */}
        {contractor.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {contractor.skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-semibold"
              >
                {skill}
              </span>
            ))}
            {contractor.skills.length > 3 && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                +{contractor.skills.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-1.5 text-gray-600">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-medium">{contractor.completed_jobs} jobs</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <Clock className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-medium">{contractor.response_time}</span>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between">
          {contractor.hourly_rate ? (
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                £{contractor.hourly_rate}
              </span>
              <span className="text-sm text-gray-600 ml-1">/hr</span>
            </div>
          ) : (
            <span className="text-sm text-gray-600 font-medium">Contact for pricing</span>
          )}
          <button className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95">
            View Profile
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContractorListCard({ contractor }: { contractor: ContractorData }) {
  const imageUrl = contractor.profile_image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(contractor.name)}&background=14b8a6&color=fff&size=200`;

  return (
    <div
      className="bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-teal-500 hover:shadow-2xl transition-all duration-300 group cursor-pointer relative"
      onClick={() => window.location.href = `/contractors/${contractor.id}`}
    >
      {/* Gradient Border Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 rounded-2xl" />
      <div className="flex gap-6">
        {/* Image */}
        <div className="relative w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden">
          <Image
            src={imageUrl}
            alt={contractor.name}
            fill
            sizes="128px"
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {contractor.verified && (
            <div className="absolute top-2 left-2 p-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg">
              <Shield className="w-4 h-4 text-teal-600" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                {contractor.name}
              </h3>
              <p className="text-gray-600 font-medium">
                {contractor.company_name || 'Independent Contractor'}
              </p>
            </div>
            {contractor.rating >= 4.8 && (
              <div className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center gap-1.5">
                <Award className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white">Top Rated</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-slate-900">{contractor.rating.toFixed(1)}</span>
              <span className="text-sm text-gray-500">({contractor.review_count} reviews)</span>
            </div>
            {contractor.city && (
              <div className="flex items-center gap-1 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">{contractor.city}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-gray-600">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium">{contractor.completed_jobs} jobs completed</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium">{contractor.response_time} response</span>
            </div>
          </div>

          {/* Skills */}
          {contractor.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {contractor.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-semibold"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Price & CTA */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            {contractor.hourly_rate ? (
              <div>
                <span className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  £{contractor.hourly_rate}
                </span>
                <span className="text-gray-600 ml-2">/hour</span>
              </div>
            ) : (
              <span className="text-gray-600 font-medium">Contact for pricing</span>
            )}
            <button className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95">
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
