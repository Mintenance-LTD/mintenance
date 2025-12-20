/**
 * JobDetailsAirbnb Component
 * Production-quality Airbnb-style job details page
 *
 * Design Principles:
 * - Photography-first with hero image gallery (Airbnb 5-photo grid)
 * - Clean typography hierarchy
 * - Subtle micro-interactions (hover effects, smooth transitions)
 * - Mobile-first responsive design
 * - Accessibility-first (ARIA labels, semantic HTML)
 */

'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  PhotoGallery,
  Badge,
  Button,
  RatingStars,
  Modal
} from '@/components/airbnb-system';
import {
  MapPin,
  Calendar,
  Tag,
  Clock,
  User,
  Edit3,
  CheckCircle,
  MessageCircle,
  Share2,
  Heart,
  Shield,
  Briefcase,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatMoney } from '@/lib/utils/currency';

/* ==========================================
   TYPE DEFINITIONS
   ========================================== */

interface JobDetailsAirbnbProps {
  job: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    budget: number;
    location: string;
    createdAt: string;
    updatedAt?: string;
    priority?: string;
    estimatedDuration?: string;
    scheduledStartDate?: string | null;
    scheduledEndDate?: string | null;
  };
  images: string[];
  homeowner: {
    id: string;
    name: string;
    avatar?: string;
    rating?: number;
    jobsPosted?: number;
    memberSince?: string;
  };
  property?: {
    id: string;
    name: string;
    address: string;
    propertyType?: string;
  } | null;
  contractor?: {
    id: string;
    name: string;
    companyName?: string;
    avatar?: string;
    rating?: number;
    completedJobs?: number;
    isVerified?: boolean;
  } | null;
  bids?: Array<{
    id: string;
    amount: number;
    status: string;
    contractorName: string;
    contractorAvatar?: string;
    contractorRating?: number;
  }>;
  userRole: 'homeowner' | 'contractor';
  isOwner: boolean;
  onEdit?: () => void;
  onComplete?: () => void;
  onContact?: () => void;
}

/* ==========================================
   MAIN COMPONENT
   ========================================== */

export function JobDetailsAirbnb({
  job,
  images,
  homeowner,
  property,
  contractor,
  bids = [],
  userRole,
  isOwner,
  onEdit,
  onComplete,
  onContact,
}: JobDetailsAirbnbProps) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // Ensure we have at least one placeholder image
  const displayImages = images.length > 0
    ? images
    : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800'];

  /* ==========================================
     HELPER FUNCTIONS
     ========================================== */

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
      posted: 'info',
      assigned: 'warning',
      in_progress: 'warning',
      review: 'info',
      completed: 'success',
      cancelled: 'neutral',
    };
    return variants[status] || 'neutral';
  };

  const getPriorityColor = (priority?: string) => {
    const colors: Record<string, string> = {
      low: 'text-blue-600 bg-blue-50',
      medium: 'text-amber-600 bg-amber-50',
      high: 'text-orange-600 bg-orange-50',
      emergency: 'text-red-600 bg-red-50',
    };
    return priority ? colors[priority] || 'text-gray-600 bg-gray-50' : 'text-gray-600 bg-gray-50';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleImageClick = useCallback((index: number) => {
    setSelectedImageIndex(index);
    setIsImageModalOpen(true);
  }, []);

  const handleNextImage = useCallback(() => {
    setSelectedImageIndex((prev) =>
      prev < displayImages.length - 1 ? prev + 1 : 0
    );
  }, [displayImages.length]);

  const handlePrevImage = useCallback(() => {
    setSelectedImageIndex((prev) =>
      prev > 0 ? prev - 1 : displayImages.length - 1
    );
  }, [displayImages.length]);

  /* ==========================================
     RENDER
     ========================================== */

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => window.history.back()}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-sm text-gray-500">Job Details</h1>
        </div>
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors group"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            className={`w-6 h-6 transition-all duration-200 ${
              isFavorite
                ? 'fill-teal-500 text-teal-500'
                : 'text-gray-700 group-hover:text-teal-500'
            }`}
          />
        </button>
        <button
          onClick={() => {
            navigator.share?.({
              title: job.title,
              text: job.description,
              url: window.location.href,
            });
          }}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          aria-label="Share job"
        >
          <Share2 className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* Photo Gallery - Airbnb 5-Photo Grid Layout */}
      <section className="animate-fade-in">
        {displayImages.length === 1 ? (
          // Single image layout
          <div
            className="relative h-[500px] rounded-2xl overflow-hidden cursor-pointer group"
            onClick={() => handleImageClick(0)}
          >
            <Image
              src={displayImages[0]}
              alt={job.title}
              fill
              sizes="(max-width: 768px) 100vw, 1200px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              priority
            />
            {displayImages.length > 1 && (
              <div className="absolute bottom-6 right-6">
                <button className="px-4 py-2 bg-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2">
                  <span>Show all photos</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          // Grid layout for multiple images (Airbnb style)
          <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[500px] rounded-2xl overflow-hidden">
            {/* Large Image (Left) */}
            <div
              className="col-span-2 row-span-2 relative cursor-pointer group"
              onClick={() => handleImageClick(0)}
            >
              <Image
                src={displayImages[0]}
                alt={`${job.title} - main`}
                fill
                sizes="50vw"
                className="object-cover group-hover:brightness-90 transition-all duration-300"
                priority
              />
            </div>

            {/* Top Right Small Images */}
            {displayImages.slice(1, 3).map((image, index) => (
              <div
                key={index}
                className="relative cursor-pointer group"
                onClick={() => handleImageClick(index + 1)}
              >
                <Image
                  src={image}
                  alt={`${job.title} - ${index + 2}`}
                  fill
                  sizes="25vw"
                  className="object-cover group-hover:brightness-90 transition-all duration-300"
                />
              </div>
            ))}

            {/* Bottom Right Small Images */}
            {displayImages.slice(3, 5).map((image, index) => (
              <div
                key={index}
                className="relative cursor-pointer group"
                onClick={() => handleImageClick(index + 3)}
              >
                <Image
                  src={image}
                  alt={`${job.title} - ${index + 4}`}
                  fill
                  sizes="25vw"
                  className="object-cover group-hover:brightness-90 transition-all duration-300"
                />
                {/* Show all photos button on last image */}
                {index === 1 && displayImages.length > 5 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <button
                      className="px-4 py-2 bg-white rounded-xl font-semibold shadow-lg text-gray-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageClick(0);
                      }}
                    >
                      +{displayImages.length - 5} more
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* View All Button */}
            {displayImages.length > 1 && (
              <div className="absolute bottom-6 right-6">
                <button
                  onClick={() => handleImageClick(0)}
                  className="px-4 py-2.5 bg-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 border border-gray-300"
                >
                  <span className="text-sm">Show all {displayImages.length} photos</span>
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
        {/* Left Column - Main Content */}
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

        {/* Right Column - Sticky Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            {/* Budget Card */}
            <div className="card-airbnb p-6 shadow-lg">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-gray-900">
                  {formatMoney(job.budget, 'GBP')}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-6">Total budget</p>

              {/* Action Buttons */}
              <div className="space-y-3">
                {isOwner && onEdit && (
                  <Button
                    variant="secondary"
                    fullWidth
                    size="lg"
                    onClick={onEdit}
                    className="flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-5 h-5" />
                    Edit Job
                  </Button>
                )}

                {isOwner && onComplete && job.status === 'in_progress' && (
                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={onComplete}
                    className="flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Mark Complete
                  </Button>
                )}

                {!isOwner && userRole === 'contractor' && job.status === 'posted' && (
                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={() => window.location.href = `/contractor/bid/${job.id}`}
                  >
                    Submit Bid
                  </Button>
                )}

                {onContact && !isOwner && (
                  <Button
                    variant="secondary"
                    fullWidth
                    size="lg"
                    onClick={onContact}
                    className="flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Contact Homeowner
                  </Button>
                )}
              </div>
            </div>

            {/* Schedule Card */}
            {(job.scheduledStartDate || job.scheduledEndDate) && (
              <div className="card-airbnb p-6">
                <h3 className="font-bold text-gray-900 mb-4">Schedule</h3>
                <div className="space-y-3">
                  {job.scheduledStartDate && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Start Date</div>
                        <div className="font-semibold text-gray-900">
                          {formatDate(job.scheduledStartDate)}
                        </div>
                      </div>
                    </div>
                  )}
                  {job.scheduledEndDate && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">End Date</div>
                        <div className="font-semibold text-gray-900">
                          {formatDate(job.scheduledEndDate)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats Card */}
            <div className="card-airbnb p-6 bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-100">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-8 h-8 text-teal-600" />
                <h3 className="font-bold text-gray-900">Job Stats</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Views</span>
                  <span className="font-semibold text-gray-900">0</span>
                </div>
                {bids.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Bids</span>
                    <span className="font-semibold text-gray-900">{bids.length}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge variant={getStatusBadgeVariant(job.status)} size="sm">
                    {job.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Help Card */}
            <div className="card-airbnb p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Our support team is here to assist you
              </p>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => window.location.href = '/contact'}
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <Modal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        size="xl"
        title={`${job.title} - Photo ${selectedImageIndex + 1} of ${displayImages.length}`}
      >
        <div className="relative">
          <div className="relative h-[600px] rounded-xl overflow-hidden">
            <Image
              src={displayImages[selectedImageIndex]}
              alt={`${job.title} - ${selectedImageIndex + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          {/* Navigation */}
          {displayImages.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6 text-gray-900" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6 text-gray-900" />
              </button>
            </>
          )}

          {/* Thumbnails */}
          {displayImages.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {displayImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-200 ${
                    index === selectedImageIndex
                      ? 'ring-2 ring-teal-500 ring-offset-2'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
