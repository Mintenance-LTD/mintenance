'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  MapPin,
  Edit,
  Trash2,
  Share2,
  Heart,
  Plus,
  CheckCircle,
  Clock,
  Copy,
  BarChart2,
  Link2,
  Upload,
  Loader2,
  Settings,
  PoundSterling,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { logger } from '@mintenance/shared';
import { getCsrfHeaders, getCsrfToken } from '@/lib/csrf-client';
import {
  SpendingChart,
  aggregateSpendingByMonth,
} from '@/app/properties/components/SpendingChart';
import { calculatePropertyHealthScore } from '@/lib/utils/property-health-score';
import { safeCopyToClipboard } from '@/lib/utils/clipboard';
import { PropertyHealthScoreCard } from '@/app/properties/components/PropertyHealthScore';
import { FeatureGateCard } from '@/components/FeatureGateCard';
import RecurringMaintenance from './RecurringMaintenance';
import TenantContacts from './TenantContacts';
import TeamAccess from './TeamAccess';
import BulkOperations from './BulkOperations';
import RoomPhotoGallery from './RoomPhotoGallery';
import YearOverYearComparison from './YearOverYearComparison';
import PropertyAssessments from './PropertyAssessments';

interface Job {
  id: string;
  title: string;
  status: 'completed' | 'in_progress' | 'posted' | 'cancelled';
  contractor?: string | null;
  amount: number;
  date: string;
  category: string;
}

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  postcode: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  yearBuilt: number;
  images: string[];
  // 2026-05-23 audit: read-only surface for the access fields so
  // legacy-theme users at least see what's set (edit goes through
  // the editorial flow / mobile / future legacy form).
  access_mode?: 'key_safe' | 'smart_lock' | 'in_person' | null;
  access_notes?: string | null;
  stopcock_location?: string | null;
  gas_isolator_location?: string | null;
  consumer_unit_location?: string | null;
  // key_safe_code intentionally NOT surfaced here — the legacy theme
  // doesn't have the editorial Access view's authorisation context
  // (manager vs owner vs admin), so we don't render the most
  // sensitive field at all in the legacy fallback. Homeowners on
  // legacy theme can switch to the editorial cookie + see / edit it
  // there.
}

interface PropertyDetailsClientProps {
  property: Property;
  jobs: Job[];
  stats: {
    completedJobs: number;
    activeJobs: number;
    totalSpent: number;
  };
}

interface ReportToken {
  id: string;
  property_id: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

export default function PropertyDetailsClient({
  property,
  jobs,
  stats,
}: PropertyDetailsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'jobs' | 'assessments' | 'manage'
  >('overview');
  const [isFavorited, setIsFavorited] = useState(false);

  // Tenant reporting state
  const [reportTokens, setReportTokens] = useState<ReportToken[]>([]);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  const fetchReportTokens = useCallback(async () => {
    try {
      const res = await fetch(`/api/properties/${property.id}/report-token`);
      if (res.ok) {
        const data = await res.json();
        setReportTokens(data.tokens || []);
      }
    } catch {
      // Silently fail — tokens are a premium feature
    }
  }, [property.id]);

  useEffect(() => {
    fetchReportTokens();
  }, [fetchReportTokens]);

  const handleGenerateReportToken = async () => {
    setIsGeneratingToken(true);
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`/api/properties/${property.id}/report-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ label: `Report link for ${property.name}` }),
      });
      if (res.ok) {
        const data = await res.json();
        setReportTokens((prev) => [data.token, ...prev]);
        toast.success('Report link generated');
      } else {
        toast.error('Failed to generate report link');
      }
    } catch {
      toast.error('Failed to generate report link');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleToggleToken = async (tokenId: string, isActive: boolean) => {
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`/api/properties/${property.id}/report-token`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ token_id: tokenId, is_active: !isActive }),
      });
      if (res.ok) {
        setReportTokens((prev) =>
          prev.map((t) =>
            t.id === tokenId ? { ...t, is_active: !isActive } : t
          )
        );
        toast.success(isActive ? 'Link deactivated' : 'Link activated');
      }
    } catch {
      toast.error('Failed to update link');
    }
  };

  const copyReportLink = async (tokenId: string) => {
    const url = `${window.location.origin}/report/${tokenId}`;
    const ok = await safeCopyToClipboard(url);
    if (ok) {
      toast.success('Link copied to clipboard');
    } else {
      toast.error('Failed to copy. Please copy the link manually.');
    }
  };

  // Calculate property health score
  const completedJobsList = jobs.filter((j) => j.status === 'completed');
  const lastCompletedJob = completedJobsList.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];

  const healthScore = calculatePropertyHealthScore({
    completedJobs: stats.completedJobs,
    activeJobs: stats.activeJobs,
    lastServiceDate: lastCompletedJob?.date || null,
    totalSpent: stats.totalSpent,
    propertyAge: property.yearBuilt
      ? new Date().getFullYear() - property.yearBuilt
      : undefined,
    recentCategories: [
      ...new Set(
        jobs
          .slice(0, 10)
          .map((j) => j.category)
          .filter(Boolean)
      ),
    ],
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-700',
      in_progress: 'bg-blue-100 text-blue-700',
      posted: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return styles[status as keyof typeof styles] || styles.posted;
  };

  // Photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('photos', file));

      const uploadCsrf = await getCsrfToken();
      const res = await fetch('/api/properties/upload-photos', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': uploadCsrf,
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await res.json();
      const newPhotos = data.urls as string[];

      const updateCsrf = await getCsrfToken();
      const updateRes = await fetch(`/api/properties/${property.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': updateCsrf,
        },
        body: JSON.stringify({
          name: property.name,
          address: property.address,
          city: property.city,
          postcode: property.postcode,
          type: property.type,
          photos: [...property.images, ...newPhotos],
        }),
      });

      if (updateRes.ok) {
        toast.success(
          `${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''} uploaded`
        );
        router.refresh();
      } else {
        toast.error('Photos uploaded but failed to save to property');
      }
    } catch (error) {
      logger.error('Photo upload error', error, { service: 'ui' });
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload photos'
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    // Fetch retention preview so the confirmation dialog can warn the
    // homeowner about records that will be PRESERVED (compliance
    // certs, tenants, contacts, anonymous reports, recurring schedules
    // + historical jobs — all `ON DELETE SET NULL` per the FK retention
    // migrations) vs the records that will be CASCADE-DELETED (room
    // photos + closed maintenance_tickets).
    //
    // 2026-05-26 audit-65 P2: previously this fell back to a plain
    // confirm when the preview fetch failed, letting the homeowner
    // commit a high-impact delete without seeing authoritative
    // counts. Now we block the action and ask them to refresh —
    // safer than letting them blow away records sight-unseen.
    let confirmMessage = '';
    let previewSucceeded = false;
    try {
      const previewRes = await fetch(
        `/api/properties/${property.id}/delete-preview`,
        { credentials: 'include' }
      );
      if (previewRes.ok) {
        const preview = (await previewRes.json()) as {
          preserved: {
            compliance_certificates: number;
            property_tenants: number;
            property_contacts: number;
            anonymous_reports: number;
            recurring_schedules: number;
            // 2026-05-21: jobs.property_id is `SET NULL` live, so
            // historical jobs survive a property delete and now
            // surface under "preserved" rather than the previous
            // (incorrect) "cascaded".
            jobs: number;
          };
          // Real cascading photo table is property_room_photos —
          // earlier shape referenced a non-existent `property_photos`
          // and silently always reported 0.
          // 2026-05-26 audit-65 P1: also surfaces maintenance_tickets
          // (CASCADE FK) so portfolio users see the impact before
          // committing.
          cascaded: {
            property_room_photos: number;
            maintenance_tickets?: number;
          };
          preservedTotal: number;
          cascadedTotal: number;
        };
        const lines: string[] = [
          'Are you sure you want to delete this property?',
          '',
        ];
        if (preview.preservedTotal > 0) {
          lines.push('The following records will be PRESERVED for legal');
          lines.push(
            'retention (gas safety ≥2yr, EICR ≥5yr, HMRC tenancy 6yr):'
          );
          if (preview.preserved.compliance_certificates > 0) {
            lines.push(
              `  • ${preview.preserved.compliance_certificates} compliance cert${preview.preserved.compliance_certificates === 1 ? '' : 's'}`
            );
          }
          if (preview.preserved.property_tenants > 0) {
            lines.push(
              `  • ${preview.preserved.property_tenants} tenant record${preview.preserved.property_tenants === 1 ? '' : 's'}`
            );
          }
          if (preview.preserved.property_contacts > 0) {
            lines.push(
              `  • ${preview.preserved.property_contacts} contact${preview.preserved.property_contacts === 1 ? '' : 's'}`
            );
          }
          if (preview.preserved.anonymous_reports > 0) {
            lines.push(
              `  • ${preview.preserved.anonymous_reports} anonymous report${preview.preserved.anonymous_reports === 1 ? '' : 's'}`
            );
          }
          if (preview.preserved.recurring_schedules > 0) {
            lines.push(
              `  • ${preview.preserved.recurring_schedules} recurring schedule${preview.preserved.recurring_schedules === 1 ? '' : 's'}`
            );
          }
          if (preview.preserved.jobs > 0) {
            lines.push(
              `  • ${preview.preserved.jobs} historical job${preview.preserved.jobs === 1 ? '' : 's'}`
            );
          }
          lines.push('');
        }
        if (preview.cascadedTotal > 0) {
          lines.push('The following will be PERMANENTLY DELETED:');
          if (preview.cascaded.property_room_photos > 0) {
            lines.push(
              `  • ${preview.cascaded.property_room_photos} room photo${preview.cascaded.property_room_photos === 1 ? '' : 's'}`
            );
          }
          if ((preview.cascaded.maintenance_tickets ?? 0) > 0) {
            lines.push(
              `  • ${preview.cascaded.maintenance_tickets} maintenance ticket${preview.cascaded.maintenance_tickets === 1 ? '' : 's'} (closed/resolved history)`
            );
          }
          lines.push('');
        }
        lines.push('This cannot be undone.');
        confirmMessage = lines.join('\n');
        previewSucceeded = true;
      } else {
        logger.warn('Delete preview returned non-OK status', {
          service: 'ui',
          status: previewRes.status,
        });
      }
    } catch (err) {
      logger.warn('Delete preview failed', {
        service: 'ui',
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (!previewSucceeded) {
      toast.error(
        'We couldn’t verify what would be affected by deleting this property. Refresh the page and try again, or contact support.'
      );
      return;
    }

    if (confirm(confirmMessage)) {
      try {
        const response = await fetch(`/api/properties/${property.id}`, {
          method: 'DELETE',
          headers: {
            ...(await getCsrfHeaders()),
          },
        });

        if (response.ok) {
          toast.success('Property deleted successfully');
          router.push('/properties');
        } else {
          // 2026-05-26 audit-65 P2: previously this collapsed every
          // non-2xx into the same "Failed to delete property" toast,
          // so the 409 blocker payload (active jobs / open reports
          // / open tickets) was hidden from the user. Parse the
          // response, surface blocker[0].message, fall back to the
          // generic toast only when no message is provided.
          let serverMessage: string | undefined;
          try {
            const body = (await response.json()) as {
              error?: string;
              blockers?: Array<{ message?: string }>;
            };
            const blockerMsgs = (body.blockers ?? [])
              .map((b) => b.message)
              .filter((m): m is string => !!m);
            if (blockerMsgs.length > 0) {
              serverMessage = blockerMsgs.join('\n\n');
            } else if (body.error) {
              serverMessage = body.error;
            }
          } catch {
            // Body wasn't JSON — fall back below.
          }
          toast.error(serverMessage || 'Failed to delete property');
        }
      } catch (error) {
        logger.error('Error deleting property:', error, { service: 'ui' });
        toast.error('Failed to delete property');
      }
    }
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'jobs' as const, label: `Jobs (${jobs.length})` },
    { id: 'assessments' as const, label: 'Assessments' },
    { id: 'manage' as const, label: 'Manage', icon: Settings },
  ];

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Back to Properties */}
      <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6'>
        <button
          onClick={() => router.push('/properties')}
          className='flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mb-4'
        >
          <ArrowLeft className='w-5 h-5' />
          <span className='font-medium'>Back to Properties</span>
        </button>
      </div>

      {/* Hero Image Gallery */}
      <div className='relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'>
        {property.images.length > 0 ? (
          <>
            <div className='grid grid-cols-4 gap-2 h-[400px] rounded-xl overflow-hidden'>
              <div className='col-span-2 row-span-2 relative'>
                <Image
                  src={property.images[0]}
                  alt='Property main'
                  fill
                  className='object-cover hover:brightness-90 transition-all cursor-pointer'
                />
              </div>
              {property.images.slice(1, 5).map((img, idx) => (
                <div key={idx} className='relative'>
                  <Image
                    src={img}
                    alt={`Property ${idx + 2}`}
                    fill
                    className='object-cover hover:brightness-90 transition-all cursor-pointer'
                  />
                </div>
              ))}
            </div>
            <div className='absolute bottom-4 right-8 flex gap-2'>
              <button className='px-4 py-2 bg-white rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 border border-gray-200 shadow-sm'>
                <Share2 className='w-4 h-4' />
                Share
              </button>
              <button
                onClick={() => {
                  setIsFavorited(!isFavorited);
                  toast.success(
                    isFavorited
                      ? 'Removed from favorites'
                      : 'Added to favorites'
                  );
                }}
                className='px-4 py-2 bg-white rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 border border-gray-200 shadow-sm'
              >
                <Heart
                  className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`}
                />
                Save
              </button>
            </div>
          </>
        ) : (
          <div className='h-[260px] bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center'>
            <MapPin className='w-14 h-14 text-gray-300 mb-3' />
            <p className='text-gray-500 text-lg font-medium'>No photos yet</p>
            <p className='text-gray-400 text-sm mt-1 mb-4'>
              Add photos to showcase your property
            </p>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/jpeg,image/png,image/webp,image/gif'
              multiple
              className='hidden'
              onChange={handlePhotoUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className='px-5 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50'
            >
              {isUploading ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' /> Uploading...
                </>
              ) : (
                <>
                  <Upload className='w-4 h-4' /> Add Photos
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Property Header + Stats Row */}
      <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8'>
        <div className='bg-white rounded-xl border border-gray-200 p-6 mb-6'>
          {/* Title Row */}
          <div className='flex items-start justify-between mb-4'>
            <div>
              <h1 className='text-2xl font-semibold text-gray-900 mb-1'>
                {property.name}
              </h1>
              <div className='flex items-center text-gray-500 text-sm'>
                <MapPin className='w-4 h-4 mr-1.5' />
                <span>
                  {property.address}
                  {property.city && `, ${property.city}`}
                  {property.postcode && ` ${property.postcode}`}
                </span>
              </div>
            </div>
            <div className='flex gap-2'>
              <button
                onClick={() => router.push(`/properties/${property.id}/edit`)}
                className='p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'
              >
                <Edit className='w-4 h-4 text-gray-600' />
              </button>
              <button
                onClick={handleDelete}
                className='p-2 border border-gray-200 rounded-lg hover:bg-red-50 transition-colors'
              >
                <Trash2 className='w-4 h-4 text-red-500' />
              </button>
            </div>
          </div>

          {/* Stats Row — horizontal */}
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-green-50 rounded-lg'>
                <CheckCircle className='w-5 h-5 text-green-600' />
              </div>
              <div>
                <div className='text-xs text-gray-500'>Completed</div>
                <div className='text-lg font-semibold text-gray-900'>
                  {stats.completedJobs}
                </div>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-blue-50 rounded-lg'>
                <Clock className='w-5 h-5 text-blue-600' />
              </div>
              <div>
                <div className='text-xs text-gray-500'>Active</div>
                <div className='text-lg font-semibold text-gray-900'>
                  {stats.activeJobs}
                </div>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-teal-50 rounded-lg'>
                <PoundSterling className='w-5 h-5 text-teal-600' />
              </div>
              <div>
                <div className='text-xs text-gray-500'>Total Spent</div>
                <div className='text-lg font-semibold text-gray-900'>
                  £{stats.totalSpent.toLocaleString()}
                </div>
              </div>
            </div>
            <div>
              <Link
                href={`/jobs/create?property_id=${property.id}`}
                className='flex items-center justify-center gap-2 h-full px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors text-sm'
              >
                <Plus className='w-4 h-4' />
                Post Job
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Content */}
      <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12'>
        {/* Tab Bar */}
        <div className='flex gap-1 border-b border-gray-200 mb-6'>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-4 font-medium text-sm transition-colors relative flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-teal-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon && <tab.icon className='w-4 h-4' />}
              {tab.label}
              {activeTab === tab.id && (
                <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full' />
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            {/* Left — Property Details + Chart */}
            <div className='lg:col-span-2 space-y-6'>
              {/* Property Details */}
              <div className='bg-white rounded-xl border border-gray-200 p-6'>
                <h2 className='text-lg font-semibold text-gray-900 mb-4'>
                  Property Details
                </h2>
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
                  <div>
                    <div className='text-xs text-gray-500 mb-1'>Type</div>
                    <div className='font-medium text-gray-900 capitalize'>
                      {property.type}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-gray-500 mb-1'>Year Built</div>
                    <div className='font-medium text-gray-900'>
                      {property.yearBuilt}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-gray-500 mb-1'>Bedrooms</div>
                    <div className='font-medium text-gray-900'>
                      {property.bedrooms || '—'}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs text-gray-500 mb-1'>Bathrooms</div>
                    <div className='font-medium text-gray-900'>
                      {property.bathrooms || '—'}
                    </div>
                  </div>
                  {property.squareFeet > 0 && (
                    <div>
                      <div className='text-xs text-gray-500 mb-1'>Size</div>
                      <div className='font-medium text-gray-900'>
                        {property.squareFeet.toLocaleString()} sq m
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Spending Trend Chart — gated: landlord + agency */}
              {jobs.length > 0 && (
                <FeatureGateCard featureId='HOMEOWNER_PORTFOLIO_ANALYTICS'>
                  <div className='bg-white rounded-xl border border-gray-200 p-6'>
                    <h2 className='text-lg font-semibold text-gray-900 mb-4'>
                      Spending Trend
                    </h2>
                    <SpendingChart
                      data={aggregateSpendingByMonth(jobs)}
                      height={280}
                    />
                  </div>
                </FeatureGateCard>
              )}
            </div>

            {/* Right — Health Score + YoY */}
            <div className='space-y-6'>
              <PropertyHealthScoreCard
                healthScore={healthScore}
                showRecommendations={true}
              />

              <FeatureGateCard featureId='HOMEOWNER_YOY_COMPARISON'>
                <YearOverYearComparison jobs={jobs} />
              </FeatureGateCard>
            </div>

            {/* 2026-05-23 audit: read-only Access & contacts panel.
                Edit lives in the editorial theme — legacy users at
                least see what's configured. key_safe_code is
                deliberately not rendered here (no access-mode-aware
                authorisation context on legacy theme; the editorial
                Access view owns the sensitive reveal). */}
            {(property.access_mode ||
              property.access_notes ||
              property.stopcock_location ||
              property.gas_isolator_location ||
              property.consumer_unit_location) && (
              <div className='bg-white rounded-xl border border-gray-200 p-6 mt-6'>
                <div className='flex items-center justify-between mb-4'>
                  <h2 className='text-lg font-semibold text-gray-900'>
                    Access & contacts
                  </h2>
                  <a
                    href='?tab=access'
                    className='text-sm text-teal-600 hover:underline'
                    title='Edit access details in the new theme'
                  >
                    Edit →
                  </a>
                </div>
                <dl className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm'>
                  {property.access_mode && (
                    <div>
                      <dt className='text-gray-500 text-xs uppercase tracking-wide mb-1'>
                        Mode
                      </dt>
                      <dd className='text-gray-900'>
                        {property.access_mode === 'key_safe'
                          ? 'Key safe'
                          : property.access_mode === 'smart_lock'
                            ? 'Smart lock (instructions only)'
                            : "You'll be home"}
                      </dd>
                    </div>
                  )}
                  {property.access_notes && (
                    <div className='sm:col-span-2'>
                      <dt className='text-gray-500 text-xs uppercase tracking-wide mb-1'>
                        Notes
                      </dt>
                      <dd className='text-gray-900 whitespace-pre-line'>
                        {property.access_notes}
                      </dd>
                    </div>
                  )}
                  {property.stopcock_location && (
                    <div>
                      <dt className='text-gray-500 text-xs uppercase tracking-wide mb-1'>
                        Stopcock
                      </dt>
                      <dd className='text-gray-900'>
                        {property.stopcock_location}
                      </dd>
                    </div>
                  )}
                  {property.gas_isolator_location && (
                    <div>
                      <dt className='text-gray-500 text-xs uppercase tracking-wide mb-1'>
                        Gas isolator
                      </dt>
                      <dd className='text-gray-900'>
                        {property.gas_isolator_location}
                      </dd>
                    </div>
                  )}
                  {property.consumer_unit_location && (
                    <div>
                      <dt className='text-gray-500 text-xs uppercase tracking-wide mb-1'>
                        Consumer unit
                      </dt>
                      <dd className='text-gray-900'>
                        {property.consumer_unit_location}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-gray-900'>
                Job History
              </h2>
              <Link
                href={`/jobs/create?property_id=${property.id}`}
                className='px-4 py-2 bg-teal-600 text-white rounded-lg font-medium text-sm hover:bg-teal-700 transition-colors flex items-center gap-2'
              >
                <Plus className='w-4 h-4' />
                Post Job
              </Link>
            </div>

            {jobs.length === 0 ? (
              <div className='p-12 bg-white border border-gray-200 rounded-xl text-center'>
                <p className='text-gray-500 mb-4'>
                  No jobs posted for this property yet
                </p>
                <Link
                  href={`/jobs/create?property_id=${property.id}`}
                  className='inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors'
                >
                  <Plus className='w-4 h-4' />
                  Post your first job
                </Link>
              </div>
            ) : (
              <div className='grid gap-3'>
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className='block p-5 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all'
                  >
                    <div className='flex items-start justify-between'>
                      <div>
                        <div className='flex items-center gap-3 mb-1.5'>
                          <h3 className='font-semibold text-gray-900'>
                            {job.title}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(job.status)}`}
                          >
                            {job.status === 'in_progress'
                              ? 'In Progress'
                              : job.status.charAt(0).toUpperCase() +
                                job.status.slice(1)}
                          </span>
                        </div>
                        <div className='flex items-center gap-4 text-sm text-gray-500'>
                          <span>{job.category}</span>
                          <span>{job.date}</span>
                          {job.contractor && (
                            <span>Contractor: {job.contractor}</span>
                          )}
                        </div>
                      </div>
                      <div className='text-xl font-semibold text-gray-900 ml-4'>
                        £{job.amount.toLocaleString()}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assessments Tab — Building assessments captured on web/mobile */}
        {activeTab === 'assessments' && (
          <PropertyAssessments propertyId={property.id} />
        )}

        {/* Manage Tab — Premium Features */}
        {activeTab === 'manage' && (
          <div className='space-y-6'>
            <p className='text-sm text-gray-500'>
              Manage your property with premium tools. Features are available
              based on your subscription plan.
            </p>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {/* Room Photos */}
              <FeatureGateCard featureId='HOMEOWNER_ROOM_PHOTOS'>
                <RoomPhotoGallery propertyId={property.id} />
              </FeatureGateCard>

              {/* Tenant Reporting */}
              <FeatureGateCard featureId='HOMEOWNER_TENANT_REPORTING'>
                <div className='p-5 bg-white border border-gray-200 rounded-xl h-full'>
                  <div className='flex items-center gap-2 mb-3'>
                    <Link2 className='w-4 h-4 text-teal-600' />
                    <h4 className='text-sm font-semibold text-gray-900'>
                      Tenant Reporting Links
                    </h4>
                  </div>
                  <p className='text-xs text-gray-500 mb-3'>
                    Share a link with tenants to report maintenance issues
                    without an account.
                  </p>
                  <button
                    onClick={handleGenerateReportToken}
                    disabled={isGeneratingToken}
                    className='w-full px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 mb-2'
                  >
                    {isGeneratingToken
                      ? 'Generating...'
                      : 'Generate Report Link'}
                  </button>
                  {reportTokens.length > 0 && (
                    <div className='space-y-2 mt-2'>
                      {reportTokens.slice(0, 3).map((token) => (
                        <div
                          key={token.id}
                          className='flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs'
                        >
                          <span
                            className={`${token.is_active ? 'text-green-600' : 'text-gray-400'} font-medium`}
                          >
                            {token.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <div className='flex items-center gap-1'>
                            <button
                              onClick={() => copyReportLink(token.id)}
                              className='p-1 hover:bg-gray-200 rounded'
                              title='Copy link'
                            >
                              <Copy className='w-3 h-3 text-gray-500' />
                            </button>
                            <button
                              onClick={() =>
                                handleToggleToken(token.id, token.is_active)
                              }
                              className='p-1 hover:bg-gray-200 rounded text-xs text-gray-500'
                            >
                              {token.is_active ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FeatureGateCard>

              {/* Recurring Maintenance */}
              <FeatureGateCard featureId='HOMEOWNER_RECURRING_MAINTENANCE'>
                <RecurringMaintenance propertyId={property.id} />
              </FeatureGateCard>

              {/* Tenant Contacts */}
              <FeatureGateCard featureId='HOMEOWNER_TENANT_CONTACTS'>
                <TenantContacts propertyId={property.id} />
              </FeatureGateCard>

              {/* Team Access */}
              <FeatureGateCard featureId='HOMEOWNER_TEAM_ACCESS'>
                <TeamAccess propertyId={property.id} />
              </FeatureGateCard>

              {/* Portfolio Analytics */}
              <FeatureGateCard featureId='HOMEOWNER_PORTFOLIO_ANALYTICS'>
                <div className='p-5 bg-white border border-gray-200 rounded-xl h-full'>
                  <div className='flex items-center gap-2 mb-2'>
                    <BarChart2 className='w-4 h-4 text-teal-600' />
                    <h4 className='text-sm font-semibold text-gray-900'>
                      Portfolio Analytics
                    </h4>
                  </div>
                  <p className='text-xs text-gray-500 mb-3'>
                    Detailed spend tracking and maintenance analytics for this
                    property.
                  </p>
                  <Link
                    href='/properties/compliance'
                    className='inline-flex px-3 py-2 bg-gray-100 rounded-lg text-xs font-medium text-teal-600 hover:bg-gray-200 transition-colors'
                  >
                    View Compliance Dashboard
                  </Link>
                </div>
              </FeatureGateCard>

              {/* Bulk Operations */}
              <FeatureGateCard featureId='HOMEOWNER_BULK_OPERATIONS'>
                <BulkOperations propertyId={property.id} jobs={jobs} />
              </FeatureGateCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
