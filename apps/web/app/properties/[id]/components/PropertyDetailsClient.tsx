'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Edit,
  Trash2,
  FileText,
  Share2,
  Heart,
  Upload,
  Download,
  Plus,
  Eye,
  CheckCircle,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { logger } from '@mintenance/shared';

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

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  category: 'certificate' | 'invoice' | 'warranty' | 'inspection' | 'other';
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

export default function PropertyDetailsClient({ property, jobs, stats }: PropertyDetailsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'documents'>('overview');
  const [isFavorited, setIsFavorited] = useState(false);

  // Mock data for documents (until we have real documents API)
  const documents: Document[] = [
    {
      id: 'DOC-001',
      name: 'Gas Safety Certificate 2025',
      type: 'PDF',
      size: '2.4 MB',
      uploadDate: '2025-01-15',
      category: 'certificate',
    },
    {
      id: 'DOC-002',
      name: 'Kitchen Renovation Invoice',
      type: 'PDF',
      size: '1.8 MB',
      uploadDate: '2024-12-20',
      category: 'invoice',
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-700',
      in_progress: 'bg-blue-100 text-blue-700',
      posted: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return styles[status as keyof typeof styles] || styles.posted;
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this property?')) {
      try {
        const response = await fetch(`/api/properties/${property.id}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': (window as any).csrfToken || '',
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

  return (
    <div className="min-h-screen bg-white">
      {/* Back to Properties Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <button
          onClick={() => router.push('/properties')}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Properties</span>
        </button>
      </div>

      {/* Hero Image Gallery - Airbnb Style */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Grid */}
        <div className="grid grid-cols-4 gap-2 h-[500px] rounded-lg overflow-hidden">
          {/* Large left image */}
          <div className="col-span-2 row-span-2 relative">
            <Image
              src={property.images[0]}
              alt="Property main"
              fill
              className="object-cover hover:brightness-90 transition-all cursor-pointer"
            />
          </div>
          {/* Four smaller images */}
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

        {/* Overlay Buttons */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button className="px-4 py-2 bg-white rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 border border-gray-200">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={() => {
              setIsFavorited(!isFavorited);
              toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
            }}
            className="px-4 py-2 bg-white rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 border border-gray-200"
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            Save
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Property Header */}
            <div className="pb-6 border-b border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-semibold text-gray-900 mb-2">
                    {property.name}
                  </h1>
                  <div className="flex items-center text-gray-600 mb-3">
                    <MapPin className="w-5 h-5 mr-2" />
                    <span>
                      {property.address}
                      {property.city && `, ${property.city}`}
                      {property.postcode && ` ${property.postcode}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-gray-700">
                    {property.bedrooms > 0 && (
                      <>
                        <span>{property.bedrooms} bedroom{property.bedrooms !== 1 ? 's' : ''}</span>
                        <span>•</span>
                      </>
                    )}
                    {property.bathrooms > 0 && (
                      <>
                        <span>{property.bathrooms} bathroom{property.bathrooms !== 1 ? 's' : ''}</span>
                        <span>•</span>
                      </>
                    )}
                    {property.squareFeet > 0 && (
                      <span>{property.squareFeet.toLocaleString()} sq ft</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/properties/${property.id}/edit`)}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Edit className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div>
              <div className="flex gap-4 border-b border-gray-200 mb-6">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'jobs', label: `Jobs (${jobs.length})` },
                  { id: 'documents', label: `Documents (${documents.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-3 px-1 font-medium transition-colors relative ${
                      activeTab === tab.id
                        ? 'text-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
                    )}
                  </button>
                ))}
              </div>

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Property details</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-600 mb-1">Property Type</div>
                        <div className="font-semibold text-gray-900">{property.type}</div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-600 mb-1">Year Built</div>
                        <div className="font-semibold text-gray-900">{property.yearBuilt}</div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-600 mb-1">Total Jobs</div>
                        <div className="font-semibold text-gray-900">{jobs.length}</div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-600 mb-1">Total Spent</div>
                        <div className="font-semibold text-gray-900">£{stats.totalSpent.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Jobs Tab */}
              {activeTab === 'jobs' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Job history</h2>
                    <Link
                      href={`/jobs/create?property_id=${property.id}`}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Post job
                    </Link>
                  </div>

                  {jobs.length === 0 ? (
                    <div className="p-8 bg-gray-50 rounded-lg text-center">
                      <p className="text-gray-600 mb-4">No jobs posted for this property yet</p>
                      <Link
                        href={`/jobs/create?property_id=${property.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Post your first job
                      </Link>
                    </div>
                  ) : (
                    jobs.map((job) => (
                      <div
                        key={job.id}
                        className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(job.status)}`}>
                                {job.status === 'in_progress' ? 'In Progress' : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {job.contractor && <div>Contractor: {job.contractor}</div>}
                              <div>Category: {job.category}</div>
                              <div>Date: {job.date}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-semibold text-gray-900">
                              £{job.amount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                        >
                          View details →
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
                    <button className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload
                    </button>
                  </div>

                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-6 h-6 text-teal-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                            <div className="text-sm text-gray-600">
                              {doc.type} • {doc.size} • Uploaded {doc.uploadDate}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <Eye className="w-5 h-5 text-gray-600" />
                          </button>
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <Download className="w-5 h-5 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Quick Stats Card */}
              <div className="p-6 border border-gray-200 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-4">Quick stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Completed jobs</span>
                    </div>
                    <span className="font-semibold text-gray-900">{stats.completedJobs}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="text-gray-700">Active jobs</span>
                    </div>
                    <span className="font-semibold text-gray-900">{stats.activeJobs}</span>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Total maintenance spent</div>
                    <div className="text-2xl font-semibold text-gray-900">
                      £{stats.totalSpent.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Link
                href={`/jobs/create?property_id=${property.id}`}
                className="block w-full px-6 py-3 bg-teal-600 text-white text-center rounded-lg font-semibold hover:bg-teal-700 transition-colors"
              >
                Post a job for this property
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}