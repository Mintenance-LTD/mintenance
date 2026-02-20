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
  DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { logger } from '@mintenance/shared';
import { SpendingChart, aggregateSpendingByMonth } from '@/app/properties/components/SpendingChart';
import { calculatePropertyHealthScore } from '@/lib/utils/property-health-score';
import { PropertyHealthScoreCard } from '@/app/properties/components/PropertyHealthScore';
import { FeatureGateCard } from '@/components/FeatureGateCard';
import RecurringMaintenance from './RecurringMaintenance';
import TenantContacts from './TenantContacts';
import TeamAccess from './TeamAccess';
import BulkOperations from './BulkOperations';
import YearOverYearComparison from './YearOverYearComparison';

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

export default function PropertyDetailsClient({ property, jobs, stats }: PropertyDetailsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'manage'>('overview');
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
      const res = await fetch(`/api/properties/${property.id}/report-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': (window as { csrfToken?: string }).csrfToken || '',
        },
        body: JSON.stringify({ label: `Report link for ${property.name}` }),
      });
      if (res.ok) {
        const data = await res.json();
        setReportTokens(prev => [data.token, ...prev]);
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
      const res = await fetch(`/api/properties/${property.id}/report-token`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': (window as { csrfToken?: string }).csrfToken || '',
        },
        body: JSON.stringify({ token_id: tokenId, is_active: !isActive }),
      });
      if (res.ok) {
        setReportTokens(prev =>
          prev.map(t => t.id === tokenId ? { ...t, is_active: !isActive } : t)
        );
        toast.success(isActive ? 'Link deactivated' : 'Link activated');
      }
    } catch {
      toast.error('Failed to update link');
    }
  };

  const copyReportLink = (tokenId: string) => {
    const url = `${window.location.origin}/report/${tokenId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  // Calculate property health score
  const completedJobsList = jobs.filter(j => j.status === 'completed');
  const lastCompletedJob = completedJobsList.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];

  const healthScore = calculatePropertyHealthScore({
    completedJobs: stats.completedJobs,
    activeJobs: stats.activeJobs,
    lastServiceDate: lastCompletedJob?.date || null,
    totalSpent: stats.totalSpent,
    propertyAge: property.yearBuilt ? new Date().getFullYear() - property.yearBuilt : undefined,
    recentCategories: [...new Set(jobs.slice(0, 10).map(j => j.category).filter(Boolean))],
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
      Array.from(files).forEach(file => formData.append('photos', file));

      const res = await fetch('/api/properties/upload-photos', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': (window as { csrfToken?: string }).csrfToken || '',
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await res.json();
      const newPhotos = data.urls as string[];

      const updateRes = await fetch(`/api/properties/${property.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': (window as { csrfToken?: string }).csrfToken || '',
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
        toast.success(`${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''} uploaded`);
        router.refresh();
      } else {
        toast.error('Photos uploaded but failed to save to property');
      }
    } catch (error) {
      logger.error('Photo upload error', error, { service: 'ui' });
      toast.error(error instanceof Error ? error.message : 'Failed to upload photos');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this property?')) {
      try {
        const response = await fetch(`/api/properties/${property.id}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': window.csrfToken || '',
          },
        });

        if (response.ok) {
          toast.success('Property deleted successfully');
          router.push('/properties');
        } else {
          toast.error('Failed to delete property');
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
    { id: 'manage' as const, label: 'Manage', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back to Properties */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <button
          onClick={() => router.push('/properties')}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Properties</span>
        </button>
      </div>

      {/* Hero Image Gallery */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {property.images.length > 0 ? (
          <>
            <div className="grid grid-cols-4 gap-2 h-[400px] rounded-xl overflow-hidden">
              <div className="col-span-2 row-span-2 relative">
                <Image
                  src={property.images[0]}
                  alt="Property main"
                  fill
                  className="object-cover hover:brightness-90 transition-all cursor-pointer"
                />
              </div>
              {property.images.slice(1, 5).map((img, idx) => (
                <div key={idx} className="relative">
                  <Image
                    src={img}
                    alt={`Property ${idx + 2}`}
                    fill
                    className="object-cover hover:brightness-90 transition-all cursor-pointer"
                  />
                </div>
              ))}
            </div>
            <div className="absolute bottom-4 right-8 flex gap-2">
              <button className="px-4 py-2 bg-white rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 border border-gray-200 shadow-sm">
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => {
                  setIsFavorited(!isFavorited);
                  toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
                }}
                className="px-4 py-2 bg-white rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 border border-gray-200 shadow-sm"
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                Save
              </button>
            </div>
          </>
        ) : (
          <div className="h-[260px] bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center">
            <MapPin className="w-14 h-14 text-gray-300 mb-3" />
            <p className="text-gray-500 text-lg font-medium">No photos yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-4">Add photos to showcase your property</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-5 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-4 h-4" /> Add Photos</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Property Header + Stats Row */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          {/* Title Row */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">{property.name}</h1>
              <div className="flex items-center text-gray-500 text-sm">
                <MapPin className="w-4 h-4 mr-1.5" />
                <span>
                  {property.address}
                  {property.city && `, ${property.city}`}
                  {property.postcode && ` ${property.postcode}`}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/properties/${property.id}/edit`)}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 border border-gray-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>

          {/* Stats Row — horizontal */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Completed</div>
                <div className="text-lg font-semibold text-gray-900">{stats.completedJobs}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Active</div>
                <div className="text-lg font-semibold text-gray-900">{stats.activeJobs}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Total Spent</div>
                <div className="text-lg font-semibold text-gray-900">£{stats.totalSpent.toLocaleString()}</div>
              </div>
            </div>
            <div>
              <Link
                href={`/jobs/create?property_id=${property.id}`}
                className="flex items-center justify-center gap-2 h-full px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Post Job
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Tab Bar */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
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
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left — Property Details + Chart */}
            <div className="lg:col-span-2 space-y-6">
              {/* Property Details */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Type</div>
                    <div className="font-medium text-gray-900 capitalize">{property.type}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Year Built</div>
                    <div className="font-medium text-gray-900">{property.yearBuilt}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Bedrooms</div>
                    <div className="font-medium text-gray-900">{property.bedrooms || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Bathrooms</div>
                    <div className="font-medium text-gray-900">{property.bathrooms || '—'}</div>
                  </div>
                  {property.squareFeet > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Size</div>
                      <div className="font-medium text-gray-900">{property.squareFeet.toLocaleString()} sq m</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Spending Trend Chart */}
              {jobs.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Spending Trend</h2>
                  <SpendingChart data={aggregateSpendingByMonth(jobs)} height={280} />
                </div>
              )}
            </div>

            {/* Right — Health Score + YoY */}
            <div className="space-y-6">
              <PropertyHealthScoreCard healthScore={healthScore} showRecommendations={true} />

              <FeatureGateCard featureId="HOMEOWNER_YOY_COMPARISON">
                <YearOverYearComparison jobs={jobs} />
              </FeatureGateCard>
            </div>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Job History</h2>
              <Link
                href={`/jobs/create?property_id=${property.id}`}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium text-sm hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Post Job
              </Link>
            </div>

            {jobs.length === 0 ? (
              <div className="p-12 bg-white border border-gray-200 rounded-xl text-center">
                <p className="text-gray-500 mb-4">No jobs posted for this property yet</p>
                <Link
                  href={`/jobs/create?property_id=${property.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Post your first job
                </Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="block p-5 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1.5">
                          <h3 className="font-semibold text-gray-900">{job.title}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(job.status)}`}>
                            {job.status === 'in_progress' ? 'In Progress' : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{job.category}</span>
                          <span>{job.date}</span>
                          {job.contractor && <span>Contractor: {job.contractor}</span>}
                        </div>
                      </div>
                      <div className="text-xl font-semibold text-gray-900 ml-4">
                        £{job.amount.toLocaleString()}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Manage Tab — Premium Features */}
        {activeTab === 'manage' && (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">Manage your property with premium tools. Features are available based on your subscription plan.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tenant Reporting */}
              <FeatureGateCard featureId="HOMEOWNER_TENANT_REPORTING">
                <div className="p-5 bg-white border border-gray-200 rounded-xl h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <Link2 className="w-4 h-4 text-teal-600" />
                    <h4 className="text-sm font-semibold text-gray-900">Tenant Reporting Links</h4>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Share a link with tenants to report maintenance issues without an account.
                  </p>
                  <button
                    onClick={handleGenerateReportToken}
                    disabled={isGeneratingToken}
                    className="w-full px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 mb-2"
                  >
                    {isGeneratingToken ? 'Generating...' : 'Generate Report Link'}
                  </button>
                  {reportTokens.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {reportTokens.slice(0, 3).map(token => (
                        <div key={token.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                          <span className={`${token.is_active ? 'text-green-600' : 'text-gray-400'} font-medium`}>
                            {token.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyReportLink(token.id)}
                              className="p-1 hover:bg-gray-200 rounded"
                              title="Copy link"
                            >
                              <Copy className="w-3 h-3 text-gray-500" />
                            </button>
                            <button
                              onClick={() => handleToggleToken(token.id, token.is_active)}
                              className="p-1 hover:bg-gray-200 rounded text-xs text-gray-500"
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
              <FeatureGateCard featureId="HOMEOWNER_RECURRING_MAINTENANCE">
                <RecurringMaintenance propertyId={property.id} />
              </FeatureGateCard>

              {/* Tenant Contacts */}
              <FeatureGateCard featureId="HOMEOWNER_TENANT_CONTACTS">
                <TenantContacts propertyId={property.id} />
              </FeatureGateCard>

              {/* Team Access */}
              <FeatureGateCard featureId="HOMEOWNER_TEAM_ACCESS">
                <TeamAccess propertyId={property.id} />
              </FeatureGateCard>

              {/* Portfolio Analytics */}
              <FeatureGateCard featureId="HOMEOWNER_PORTFOLIO_ANALYTICS">
                <div className="p-5 bg-white border border-gray-200 rounded-xl h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart2 className="w-4 h-4 text-teal-600" />
                    <h4 className="text-sm font-semibold text-gray-900">Portfolio Analytics</h4>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Detailed spend tracking and maintenance analytics for this property.</p>
                  <Link href="/properties/compliance" className="inline-flex px-3 py-2 bg-gray-100 rounded-lg text-xs font-medium text-teal-600 hover:bg-gray-200 transition-colors">
                    View Compliance Dashboard
                  </Link>
                </div>
              </FeatureGateCard>

              {/* Bulk Operations */}
              <FeatureGateCard featureId="HOMEOWNER_BULK_OPERATIONS">
                <BulkOperations propertyId={property.id} jobs={jobs} />
              </FeatureGateCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
