'use client';

/**
 * Professional Job Details Page
 * Birch/Revealbot Design System
 *
 * Features:
 * - Clean, minimal navy/mint/gold aesthetic
 * - 2-column layout (8-4 grid)
 * - Professional typography
 * - Sticky sidebar with actions
 * - Real data integration
 * - Mobile-responsive
 *
 * Sub-components extracted to:
 * - JobDetailHelpers.tsx (StatusBadge, PriorityBadge, InfoItem, ContentCard, StatItem, UserCard, formatters)
 * - BidCard.tsx (BidCard component with bid acceptance logic)
 * - ImageLightbox.tsx (Full-screen image gallery with navigation)
 * - JobLifecycleTimeline.tsx (JobLifecycleTimeline and NextActionCard components)
 */

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BuildingAssessmentDisplay } from './BuildingAssessmentDisplay';
import { cleanAddress } from '@/lib/utils/location';
import { logger } from '@mintenance/shared';
import { ContractorTravelTracking } from './ContractorTravelTracking';
import {
  MapPin,
  Calendar,
  Tag,
  Clock,
  Home,
  User,
  Edit,
  Check,
  MessageCircle,
  AlertCircle,
  Star,
  X,
  ChevronLeft,
} from 'lucide-react';

// Extracted sub-components
import {
  StatusBadge,
  PriorityBadge,
  InfoItem,
  ContentCard,
  StatItem,
  UserCard,
  formatDate,
  formatRelativeDate,
  formatCategory,
} from './JobDetailHelpers';
import { BidCard } from './BidCard';
import { ImageLightbox } from './ImageLightbox';
import { JobLifecycleTimeline, NextActionCard } from './JobLifecycleTimeline';

// Re-export types used by external consumers (e.g., page.tsx)
export type { Bid, BidLineItem } from './BidCard';
export type { Homeowner, Contractor } from './JobDetailHelpers';

/* ==========================================
   TYPE DEFINITIONS
   ========================================== */

interface Property {
  id: string;
  property_name: string;
  address: string;
}

interface LifecycleData {
  contractStatus: string;
  escrowStatus: string;
  bidCount: number;
  pendingBidCount: number;
  completionConfirmed: boolean;
}

export interface JobDetailsProfessionalProps {
  job: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    priority?: string;
    budget: number;
    location: string;
    created_at: string;
    scheduled_start_date?: string;
    scheduled_end_date?: string;
    scheduled_duration_hours?: number;
    contractor_id?: string;
    latitude?: number;
    longitude?: number;
  };
  property?: Property | null;
  homeowner?: import('./JobDetailHelpers').Homeowner | null;
  contractor?: import('./JobDetailHelpers').Contractor | null;
  bids?: import('./BidCard').Bid[];
  photos?: string[];
  currentUserId: string;
  userRole: 'homeowner' | 'contractor';
  buildingAssessment?: Record<string, unknown> | null;
  lifecycleData?: LifecycleData;
}

/* ==========================================
   MAIN COMPONENT
   ========================================== */

export function JobDetailsProfessional({
  job,
  property,
  homeowner,
  contractor,
  bids = [],
  photos = [],
  currentUserId,
  userRole,
  buildingAssessment,
  lifecycleData,
}: JobDetailsProfessionalProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const isOwner = userRole === 'homeowner';
  const canEdit = isOwner && job.status === 'posted';

  // Status configuration
  const statusConfig = {
    posted: { label: 'Open', color: 'blue', icon: AlertCircle },
    assigned: { label: 'Assigned', color: 'mint', icon: User },
    in_progress: { label: 'In Progress', color: 'gold', icon: Clock },
    review: { label: 'In Review', color: 'purple', icon: Star },
    completed: { label: 'Completed', color: 'green', icon: Check },
    cancelled: { label: 'Cancelled', color: 'gray', icon: X },
  };

  const currentStatus = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.posted;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Jobs
          </Link>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* LEFT COLUMN - Main Content (8 columns) */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Hero Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Photo Gallery */}
              {photos.length > 0 && (
                <div className="relative h-80 bg-gray-900">
                  <Image
                    src={photos[0]}
                    alt={job.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 66vw"
                    priority
                  />
                  {photos.length > 1 && (
                    <button
                      onClick={() => setSelectedImage(0)}
                      className="absolute bottom-4 right-4 px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      View all {photos.length} photos
                    </button>
                  )}
                </div>
              )}

              {/* Job Header */}
              <div className="p-8">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-semibold text-gray-900 mb-3">
                      {job.title}
                    </h1>
                    <div className="flex items-center gap-3 flex-wrap">
                      <StatusBadge status={currentStatus} icon={<StatusIcon className="w-4 h-4" />} />
                      {job.priority && <PriorityBadge priority={job.priority} />}
                    </div>
                  </div>
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 p-6 bg-gray-50 rounded-lg">
                  <InfoItem icon={<MapPin />} label="Location" value={cleanAddress(job.location)} />
                  <InfoItem icon={<Tag />} label="Category" value={formatCategory(job.category)} />
                  <InfoItem icon={<Calendar />} label="Posted" value={formatDate(job.created_at)} />
                </div>
              </div>
            </div>

            {/* Description Section */}
            <ContentCard title="Job Description">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {job.description}
              </p>
            </ContentCard>

            {/* AI Building Assessment */}
            {buildingAssessment && (
              <div className="mb-6">
                <BuildingAssessmentDisplay
                  assessment={buildingAssessment as unknown as React.ComponentProps<typeof BuildingAssessmentDisplay>['assessment']}
                  onCorrection={(assessmentId, corrections) => {
                    logger.info('Training data corrections submitted:', {
                      assessmentId,
                      correctionsCount: corrections.length,
                      service: 'ui',
                    });
                  }}
                />
              </div>
            )}

            {/* Property Information */}
            {property && (
              <ContentCard title="Property Information">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Home className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {property.property_name}
                    </h4>
                    <p className="text-gray-600">
                      {property.address ? cleanAddress(property.address) : 'Address not available'}
                    </p>
                  </div>
                </div>
              </ContentCard>
            )}

            {/* Homeowner/Posted By Card */}
            {homeowner && userRole === 'contractor' && (
              <ContentCard title="Posted By">
                <UserCard user={homeowner} />
              </ContentCard>
            )}

            {/* Assigned Contractor Card */}
            {contractor && (
              <ContentCard title="Assigned Contractor">
                <UserCard user={contractor} isContractor />
              </ContentCard>
            )}

            {/* Live Contractor Tracking (Homeowner View) */}
            {isOwner && job.contractor_id && job.latitude && job.longitude &&
              (job.status === 'assigned' || job.status === 'in_progress') && (
              <ContractorTravelTracking
                jobId={job.id}
                contractorId={job.contractor_id}
                destination={{ lat: job.latitude, lng: job.longitude }}
              />
            )}

            {/* Bids Section (Homeowner View Only) */}
            {isOwner && (
              <div id="bids-section">
                <ContentCard title={`Bids Received (${bids.length})`}>
                  {bids.length > 0 ? (
                    <div className="space-y-4">
                      {bids.map((bid) => (
                        <BidCard key={bid.id} bid={bid} jobId={job.id} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No bids received yet. Contractors will be able to submit bids for this job.</p>
                  )}
                </ContentCard>
              </div>
            )}

            {/* Timeline/Schedule */}
            {(job.scheduled_start_date || job.scheduled_end_date) && (
              <ContentCard title="Schedule">
                <div className="space-y-4">
                  {job.scheduled_start_date && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-600">Start Date</div>
                        <div className="font-semibold text-gray-900">
                          {formatDate(job.scheduled_start_date)}
                        </div>
                      </div>
                    </div>
                  )}
                  {job.scheduled_end_date && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-600">End Date</div>
                        <div className="font-semibold text-gray-900">
                          {formatDate(job.scheduled_end_date)}
                        </div>
                      </div>
                    </div>
                  )}
                  {job.scheduled_duration_hours && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-600">Duration</div>
                        <div className="font-semibold text-gray-900">
                          {job.scheduled_duration_hours} hours
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ContentCard>
            )}
          </div>

          {/* RIGHT COLUMN - Sticky Sidebar (4 columns) */}
          <div className="col-span-12 lg:col-span-4">
            <div className="sticky top-6 space-y-6">
              {/* Job Lifecycle Timeline */}
              {isOwner && lifecycleData && (
                <JobLifecycleTimeline
                  jobStatus={job.status}
                  contractStatus={lifecycleData.contractStatus}
                  escrowStatus={lifecycleData.escrowStatus}
                  bidCount={lifecycleData.bidCount}
                  completionConfirmed={lifecycleData.completionConfirmed}
                />
              )}

              {/* Next Action Card */}
              {isOwner && lifecycleData && (
                <NextActionCard
                  jobId={job.id}
                  jobStatus={job.status}
                  contractStatus={lifecycleData.contractStatus}
                  escrowStatus={lifecycleData.escrowStatus}
                  bidCount={lifecycleData.bidCount}
                  pendingBidCount={lifecycleData.pendingBidCount}
                  completionConfirmed={lifecycleData.completionConfirmed}
                />
              )}

              {/* Budget Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
                  Budget
                </h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  £{job.budget.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">Total budget for this job</p>
              </div>

              {/* Action Buttons */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-3">
                {canEdit && (
                  <Link
                    href={`/jobs/${job.id}/edit`}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Edit className="w-5 h-5" />
                    Edit Job
                  </Link>
                )}

                {!isOwner && job.status === 'posted' && (
                  <Link
                    href={`/contractor/bid/${job.id}`}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    Submit Bid
                  </Link>
                )}

                {job.status === 'in_progress' && isOwner && (
                  <button className="btn-primary w-full flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    Mark Complete
                  </button>
                )}

                {isOwner && bids.length > 0 ? (
                  <a
                    href="#bids-section"
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('bids-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <Star className="w-5 h-5" />
                    View {bids.length} {bids.length === 1 ? 'Bid' : 'Bids'}
                  </a>
                ) : (
                  <button className="btn-secondary w-full flex items-center justify-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Contact {isOwner ? 'Contractor' : 'Homeowner'}
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage !== null && photos.length > 0 && (
        <ImageLightbox
          images={photos}
          currentIndex={selectedImage}
          onClose={() => setSelectedImage(null)}
          onNavigate={setSelectedImage}
        />
      )}
    </div>
  );
}
