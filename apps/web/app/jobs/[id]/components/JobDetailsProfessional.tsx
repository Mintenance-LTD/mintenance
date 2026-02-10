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
 */

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { BuildingAssessmentDisplay } from './BuildingAssessmentDisplay';
import { logger } from '@mintenance/shared';
import {
  MapPin,
  Calendar,
  Tag,
  Clock,
  Home,
  User,
  Phone,
  Mail,
  Edit,
  Check,
  MessageCircle,
  AlertCircle,
  Star,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

/* ==========================================
   TYPE DEFINITIONS
   ========================================== */

interface Property {
  id: string;
  property_name: string;
  address: string;
}

interface Homeowner {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  profile_image_url?: string;
}

interface Contractor {
  id: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email: string;
  phone?: string;
  profile_image_url?: string;
  admin_verified?: boolean;
  license_number?: string;
}

interface BidLineItem {
  type: 'labor' | 'material' | 'equipment';
  total: number;
}

interface Bid {
  id: string;
  amount: number;
  description?: string;
  status: string;
  created_at: string;
  contractor: Contractor;
  lineItems?: BidLineItem[];
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
  };
  property?: Property | null;
  homeowner?: Homeowner | null;
  contractor?: Contractor | null;
  bids?: Bid[];
  photos?: string[];
  currentUserId: string;
  userRole: 'homeowner' | 'contractor';
  buildingAssessment?: Record<string, unknown> | null;
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
                  <InfoItem icon={<MapPin />} label="Location" value={job.location} />
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
                      {property.address ? property.address.replace(/,\s*,/g, ',').replace(/,\s*$/, '') : 'Address not available'}
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

            {/* Bids Section (Homeowner View Only) */}
            {isOwner && bids.length > 0 && (
              <ContentCard title={`Bids Received (${bids.length})`}>
                <div className="space-y-4">
                  {bids.map((bid) => (
                    <BidCard key={bid.id} bid={bid} jobId={job.id} />
                  ))}
                </div>
              </ContentCard>
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

              {/* Job Stats Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
                  Job Details
                </h3>
                <div className="space-y-4">
                  <StatItem label="Status" value={currentStatus.label} />
                  <StatItem label="Category" value={formatCategory(job.category)} />
                  <StatItem label="Posted" value={formatRelativeDate(job.created_at)} />
                  {isOwner && (
                    <StatItem label="Bids" value={bids.length.toString()} />
                  )}
                </div>
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

                <button className="btn-secondary w-full flex items-center justify-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Contact {isOwner ? 'Contractor' : 'Homeowner'}
                </button>
              </div>

              {/* Help Card */}
              <div className="bg-teal-50 rounded-xl border border-teal-200 p-6">
                <div className="flex items-start gap-3 mb-3">
                  <AlertCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-teal-900 mb-1">Need Help?</h4>
                    <p className="text-sm text-teal-700">
                      Our support team is here to assist you with any questions.
                    </p>
                  </div>
                </div>
                <Link
                  href="/contact"
                  className="text-sm text-teal-600 font-semibold hover:text-teal-700 transition-colors"
                >
                  Contact Support →
                </Link>
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

/* ==========================================
   SUB-COMPONENTS
   ========================================== */

interface StatusBadgeProps {
  status: { label: string; color: string };
  icon: React.ReactNode;
}

function StatusBadge({ status, icon }: StatusBadgeProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    mint: 'bg-teal-100 text-teal-700 border-teal-200',
    gold: 'bg-amber-100 text-amber-700 border-amber-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${
        colorClasses[status.color as keyof typeof colorClasses] || colorClasses.gray
      }`}
    >
      {icon}
      {status.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const priorityConfig = {
    low: { label: 'Low Priority', color: 'bg-gray-100 text-gray-700' },
    medium: { label: 'Medium Priority', color: 'bg-blue-100 text-blue-700' },
    high: { label: 'High Priority', color: 'bg-amber-100 text-amber-700' },
    emergency: { label: 'Emergency', color: 'bg-rose-100 text-rose-700' },
  };

  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.color}`}>
      {config.label}
    </span>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200">
        {React.isValidElement<{ className?: string }>(icon) ? React.cloneElement(icon, {
          className: 'w-5 h-5 text-gray-600',
        }) : icon}
      </div>
      <div>
        <div className="text-sm text-gray-600">{label}</div>
        <div className="font-semibold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function ContentCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">{title}</h2>
      {children}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function UserCard({ user, isContractor = false }: { user: Homeowner | Contractor; isContractor?: boolean }) {
  const name = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : 'company_name' in user && user.company_name
    ? user.company_name
    : user.email;

  const isVerified = isContractor && 'admin_verified' in user && user.admin_verified;

  return (
    <div className="flex items-start gap-4">
      {/* Avatar */}
      {user.profile_image_url ? (
        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
          <Image
            src={user.profile_image_url}
            alt={name}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
      ) : (
        <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center border-2 border-gray-200 flex-shrink-0">
          <User className="w-8 h-8 text-teal-600" />
        </div>
      )}

      {/* Details */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-gray-900">{name}</h4>
          {isVerified && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold">
              <Shield className="w-3 h-3" />
              Verified
            </div>
          )}
        </div>

        {isContractor && 'license_number' in user && user.license_number && (
          <p className="text-sm text-gray-600 mb-2">License: {user.license_number}</p>
        )}

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="w-4 h-4" />
            <a href={`mailto:${user.email}`} className="hover:text-teal-600 transition-colors">
              {user.email}
            </a>
          </div>
          {user.phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4" />
              <a href={`tel:${user.phone}`} className="hover:text-teal-600 transition-colors">
                {user.phone}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BidCard({ bid, jobId }: { bid: Bid; jobId: string }) {
  const [accepting, setAccepting] = useState(false);

  const contractorName = bid.contractor.company_name ||
    (bid.contractor.first_name && bid.contractor.last_name
      ? `${bid.contractor.first_name} ${bid.contractor.last_name}`
      : bid.contractor.email);

  const handleAcceptBid = async () => {
    if (!confirm(`Are you sure you want to accept ${contractorName}'s bid of £${bid.amount.toLocaleString()}?`)) {
      return;
    }

    setAccepting(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const apiUrl = `/api/jobs/${jobId}/bids/${bid.id}/accept`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders,
        },
      });

      if (!response.ok) {
        const data = await response.json();

        // Handle specific error cases with better messages
        if (data.requiresPaymentSetup) {
          const contractorId = data.contractorId || bid.contractor.id;
          const message = `⚠️ Payment Setup Required\n\n` +
            `This contractor has not completed their payment account setup yet. ` +
            `They need to set up their Stripe Connect account to receive payments before you can accept their bid.\n\n` +
            `What to do:\n` +
            `• Contact the contractor and ask them to complete payment setup at: /contractor/payouts\n` +
            `• Or choose a different contractor who has completed payment setup\n\n` +
            `Once the contractor completes their payment setup, you'll be able to accept their bid.`;
          alert(message);
        } else if (response.status === 409) {
          // Conflict - bid already accepted
          alert('A bid has already been accepted for this job. Refreshing the page...');
          window.location.reload();
        } else if (response.status === 403) {
          alert(`Access denied: ${data.error || 'You are not authorised to accept bids for this job.'}`);
        } else if (response.status === 404) {
          alert(`Error: ${data.error || 'Bid or job not found. Please refresh the page.'}`);
          window.location.reload();
        } else {
          alert(`Failed to accept bid: ${data.error || data.message || 'An unexpected error occurred. Please try again.'}`);
        }
        
        setAccepting(false);
        return;
      }

      const result = await response.json();
      
      // Success - show confirmation and reload
      alert(`Bid accepted successfully! The contractor has been notified.`);
      window.location.reload(); // Refresh to show updated status
    } catch (error) {
      logger.error('Error accepting bid:', error, { service: 'ui' });
      alert(
        `Failed to accept bid: ${error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}\n\n` +
        `If this problem persists, please refresh the page and try again.`
      );
      setAccepting(false);
    }
  };

  return (
    <div className="p-6 border border-gray-200 rounded-xl hover:border-teal-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Avatar */}
          {bid.contractor.profile_image_url ? (
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
              <Image
                src={bid.contractor.profile_image_url}
                alt={contractorName}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center border-2 border-gray-200 flex-shrink-0">
              <User className="w-6 h-6 text-teal-600" />
            </div>
          )}

          {/* Contractor Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900">{contractorName}</h4>
              {bid.contractor.admin_verified && (
                <Shield className="w-4 h-4 text-teal-600" />
              )}
            </div>
            <p className="text-sm text-gray-600">
              Bid submitted {formatRelativeDate(bid.created_at)}
            </p>
          </div>
        </div>

        {/* Bid Amount */}
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            £{bid.amount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Description */}
      {bid.description &&
       !bid.description.toLowerCase().includes('ffff') &&
       !bid.description.toLowerCase().includes('lorem') &&
       bid.description.trim().length > 5 && (
        <p className="text-gray-700 text-sm mb-4 line-clamp-3">{bid.description}</p>
      )}
      {(!bid.description ||
        bid.description.toLowerCase().includes('ffff') ||
        bid.description.toLowerCase().includes('lorem') ||
        bid.description.trim().length <= 5) && (
        <p className="text-gray-500 text-sm mb-4 italic">No description provided</p>
      )}

      {/* Cost Breakdown - Labor vs Materials vs Equipment */}
      {bid.lineItems && bid.lineItems.length > 0 && (() => {
        const laborTotal = bid.lineItems
          .filter((item) => item.type === 'labor')
          .reduce((sum, item) => sum + item.total, 0);
        const materialTotal = bid.lineItems
          .filter((item) => item.type === 'material')
          .reduce((sum, item) => sum + item.total, 0);
        const equipmentTotal = bid.lineItems
          .filter((item) => item.type === 'equipment')
          .reduce((sum, item) => sum + item.total, 0);

        return (laborTotal > 0 || materialTotal > 0 || equipmentTotal > 0) ? (
          <div className="mb-4 flex gap-4 flex-wrap text-sm text-gray-600">
            {laborTotal > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Labor: £{laborTotal.toFixed(2)}</span>
              </div>
            )}
            {materialTotal > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Materials: £{materialTotal.toFixed(2)}</span>
              </div>
            )}
            {equipmentTotal > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Equipment: £{equipmentTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        ) : null;
      })()}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href={`/contractors/${bid.contractor.id}?returnTo=job&jobId=${jobId}`}
          className="btn-secondary text-sm flex-1"
        >
          View Profile
        </Link>
        {bid.status === 'pending' && (
          <button
            onClick={handleAcceptBid}
            disabled={accepting}
            className="btn-primary text-sm flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? 'Accepting...' : 'Accept Bid'}
          </button>
        )}
      </div>
    </div>
  );
}

function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const handlePrevious = () => {
    onNavigate(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
  };

  const handleNext = () => {
    onNavigate(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Image */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <Image
          src={images[currentIndex]}
          alt={`Photo ${currentIndex + 1}`}
          fill
          className="object-contain"
          sizes="100vw"
          priority
        />
      </div>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-semibold">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}

/* ==========================================
   UTILITY FUNCTIONS
   ========================================== */

function formatDate(dateString: string): string {
  if (!dateString) return 'Date not available';
  const date = new Date(dateString);
  
  // Validate date is not invalid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  // Check if date is in the future (likely data error) - show relative format
  const now = new Date();
  if (date > now) {
    const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
    if (diffInSeconds < 86400) return 'Today';
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days from now`;
    // For far future dates, show the date but indicate it's unusual
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) + ' (future date)';
  }
  
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatRelativeDate(dateString: string): string {
  if (!dateString) return 'Date not available';
  const date = new Date(dateString);
  const now = new Date();
  
  // Validate date
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  // For dates older than a week, use absolute format
  const formattedDate = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  
  // If date is in the future, show relative format anyway
  if (date > now) {
    return `${Math.floor(Math.abs(diffInSeconds) / 86400)} days from now`;
  }
  
  return formattedDate;
}

function formatCategory(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/* ==========================================
   STYLES (Add to globals or component)
   ========================================== */

const styles = `
.btn-primary {
  @apply px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-teal-800 transition-all duration-200 shadow-sm hover:shadow-md;
}

.btn-secondary {
  @apply px-6 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200;
}
`;
