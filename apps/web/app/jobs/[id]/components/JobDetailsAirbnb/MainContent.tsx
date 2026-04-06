'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge, Button, RatingStars } from '@/components/airbnb-system';
import {
  MapPin,
  Calendar,
  Tag,
  Clock,
  User,
  MessageCircle,
  Shield,
  Briefcase,
} from 'lucide-react';
import { formatMoney } from '@/lib/utils/currency';
import {
  JobDetailsAirbnbJob,
  JobDetailsAirbnbHomeowner,
  JobDetailsAirbnbProperty,
  JobDetailsAirbnbContractor,
  JobDetailsAirbnbBid,
  getStatusBadgeVariant,
  getPriorityColor,
  formatDate,
} from './types';

interface MainContentProps {
  job: JobDetailsAirbnbJob;
  homeowner: JobDetailsAirbnbHomeowner;
  property?: JobDetailsAirbnbProperty | null;
  contractor?: JobDetailsAirbnbContractor | null;
  bids: JobDetailsAirbnbBid[];
  userRole: 'homeowner' | 'contractor';
  onContact?: () => void;
}

export function MainContent({
  job,
  homeowner,
  property,
  contractor,
  bids,
  userRole,
  onContact,
}: MainContentProps) {
  return (
    <div className="lg:col-span-2 space-y-8">
      {/* Job Header */}
      <section className="pb-8 border-b border-gray-200">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              {job.title}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant={getStatusBadgeVariant(job.status)}>
                {job.status.replace('_', ' ').toUpperCase()}
              </Badge>
              {job.priority && (
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(job.priority)}`}>
                  {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)} Priority
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Info Pills */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-500" />
            <span>{job.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>Posted {formatDate(job.createdAt)}</span>
          </div>
          {job.estimatedDuration && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>{job.estimatedDuration}</span>
            </div>
          )}
        </div>
      </section>

      {/* Description */}
      <section className="pb-8 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-line text-base">
          {job.description}
        </p>
      </section>

      {/* Property Details */}
      {property && (
        <section className="pb-8 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Details</h2>
          <div className="card-airbnb p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-6 h-6 text-teal-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {property.name}
                </h3>
                <p className="text-gray-600 mb-2">{property.address}</p>
                {property.propertyType && (
                  <span className="text-sm text-gray-500">
                    {property.propertyType}
                  </span>
                )}
              </div>
              <Link
                href={`/properties/${property.id}`}
                className="text-teal-600 font-semibold text-sm hover:text-teal-700 transition-colors"
              >
                View Details →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Assigned Contractor */}
      {contractor && (
        <section className="pb-8 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Assigned Contractor</h2>
          <div className="card-airbnb p-6 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              {contractor.avatar ? (
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
                  <Image
                    src={contractor.avatar}
                    alt={contractor.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-8 h-8 text-teal-600" />
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {contractor.name}
                  </h3>
                  {contractor.isVerified && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-teal-50 rounded-full">
                      <Shield className="w-3 h-3 text-teal-600" />
                      <span className="text-xs font-semibold text-teal-700">Verified</span>
                    </div>
                  )}
                </div>
                {contractor.companyName && (
                  <p className="text-gray-600 mb-2">{contractor.companyName}</p>
                )}
                <div className="flex items-center gap-4 text-sm">
                  {contractor.rating && (
                    <div className="flex items-center gap-1">
                      <RatingStars rating={contractor.rating} size="sm" showNumber />
                    </div>
                  )}
                  {contractor.completedJobs && (
                    <span className="text-gray-600">
                      {contractor.completedJobs} jobs completed
                    </span>
                  )}
                </div>
              </div>

              {onContact && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onContact}
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contact
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Bids Section (for homeowners) */}
      {userRole === 'homeowner' && bids.length > 0 && (
        <section className="pb-8 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Bids Received ({bids.length})
            </h2>
            <Link
              href={`/jobs/${job.id}#bids`}
              className="text-teal-600 font-semibold text-sm hover:text-teal-700 transition-colors"
            >
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {bids.slice(0, 3).map((bid) => (
              <div
                key={bid.id}
                className="card-airbnb p-4 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {bid.contractorAvatar ? (
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden">
                        <Image
                          src={bid.contractorAvatar}
                          alt={bid.contractorName}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-gray-900">
                        {bid.contractorName}
                      </div>
                      {bid.contractorRating && (
                        <div className="flex items-center gap-1 text-xs">
                          <RatingStars
                            rating={bid.contractorRating}
                            size="sm"
                            showNumber
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">
                      {formatMoney(bid.amount, 'GBP')}
                    </div>
                    <Badge
                      variant={bid.status === 'accepted' ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {bid.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Posted By */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Posted By</h2>
        <div className="card-airbnb p-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            {homeowner.avatar ? (
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
                <Image
                  src={homeowner.avatar}
                  alt={homeowner.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                <span className="text-teal-700 font-bold text-xl">
                  {homeowner.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {homeowner.name}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                {homeowner.rating && (
                  <div className="flex items-center gap-1">
                    <RatingStars rating={homeowner.rating} size="sm" showNumber />
                  </div>
                )}
                {homeowner.jobsPosted && (
                  <span>{homeowner.jobsPosted} jobs posted</span>
                )}
              </div>
              {homeowner.memberSince && (
                <p className="text-sm text-gray-500">
                  Member since {new Date(homeowner.memberSince).getFullYear()}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
