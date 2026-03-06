'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import toast from 'react-hot-toast';
import { JobViewTracker } from '@/app/jobs/[id]/components/JobViewTracker';
import { logger } from '@mintenance/shared';
import { getCsrfHeaders } from '@/lib/csrf-client';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  PoundSterling,
  Briefcase,
  User,
  Phone,
  Mail,
  Clock,
  AlertCircle,
  CheckCircle,
  Star,
  Camera,
  Heart
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description?: string;
  budget: string | number;
  status: string;
  category?: string;
  created_at: string;
  homeowner_id: string;
  priority?: string;
  location?: {
    address?: string;
    city?: string;
    postcode?: string;
  };
  timeline?: {
    start_date?: string;
    end_date?: string;
  };
  requirements?: string[];
  photos?: string[];
  view_count?: number;
  bid_count?: number;
  save_count?: number;
}

interface Homeowner {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url?: string;
  created_at: string;
  phone?: string;
}

interface ExistingBid {
  bid_amount?: number;
  amount?: number;
  status: string;
}

interface JobDetailsClientProps {
  job: Job;
  homeowner: Homeowner;
  existingBid: ExistingBid | null;
}

export function JobDetailsClient({ job, homeowner, existingBid }: JobDetailsClientProps) {
  const router = useRouter();
  const [selectedPhoto, setSelectedPhoto] = useState<number>(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check if job is already saved on mount
  useEffect(() => {
    checkIfSaved();
  }, [job.id]);

  const checkIfSaved = async () => {
    try {
      const response = await fetch('/api/contractor/saved-jobs');
      if (response.ok) {
        const data = await response.json();
        setIsSaved(data.jobIds?.includes(job.id) || false);
      }
    } catch (error) {
      logger.error('Error checking saved status:', error, { service: 'ui' });
    }
  };

  const handleSaveToggle = async () => {
    setIsSaving(true);
    try {
      if (isSaved) {
        // Unsave the job
        const response = await fetch(`/api/contractor/saved-jobs?jobId=${job.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...await getCsrfHeaders(),
          },
        });

        if (!response.ok) {
          throw new Error('Failed to unsave job');
        }

        setIsSaved(false);
        toast.success('Job removed from saved');
      } else {
        // Save the job
        const response = await fetch('/api/contractor/saved-jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...await getCsrfHeaders(),
          },
          body: JSON.stringify({ jobId: job.id }),
        });

        if (!response.ok) {
          const error = await response.json();
          // If already saved, still mark as saved locally
          if (response.status === 409) {
            setIsSaved(true);
            return;
          }
          throw new Error(error.error || 'Failed to save job');
        }

        setIsSaved(true);
        toast.success('Job saved! You can view it in your saved jobs.');
      }
    } catch (error) {
      logger.error('Error toggling save:', error, { service: 'ui' });
      toast.error(isSaved ? 'Failed to unsave job' : 'Failed to save job');
    } finally {
      setIsSaving(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'emergency':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'posted':
        return 'bg-blue-100 text-blue-700';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <ContractorPageWrapper>
      <JobViewTracker jobId={job.id} />
      <div className="max-w-6xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/contractor/discover')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Jobs</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
                      {job.status?.replace('_', ' ').charAt(0).toUpperCase() + job.status?.slice(1).replace('_', ' ')}
                    </span>
                    {job.priority && (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(job.priority)}`}>
                        {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)} Priority
                      </span>
                    )}
                    {job.category && (
                      <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                        {job.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="flex items-center gap-3">
                  <PoundSterling className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Budget</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(typeof job.budget === 'number' ? job.budget : parseFloat(String(job.budget)))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {job.location && typeof job.location === 'object'
                        ? [job.location.address, job.location.city, job.location.postcode].filter(Boolean).join(', ') || 'Not specified'
                        : (job.location || 'Not specified')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Posted</p>
                    <p className="text-lg font-semibold text-gray-900">{formatDate(job.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Timeline</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {job.timeline && typeof job.timeline === 'object'
                        ? [job.timeline.start_date, job.timeline.end_date].filter(Boolean).join(' - ') || 'Flexible'
                        : (job.timeline || 'Flexible')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Job Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {job.description || 'No description provided.'}
              </p>

              {job.requirements && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h3>
                  <ul className="space-y-2">
                    {(() => {
                      const requirements = job.requirements;

                      // Safe check for split function - avoid using 'in' operator on primitives
                      const hasSplitMethod = (val: unknown): val is string => {
                        if (typeof val !== 'string') return false;
                        try {
                          // Test if split method exists and is callable
                          const testString = String(val);
                          return typeof testString.split === 'function';
                        } catch {
                          return false;
                        }
                      };

                      // Handle various types of requirements
                      if (Array.isArray(requirements)) {
                        return requirements;
                      }
                      
                      if (hasSplitMethod(requirements)) {
                        try {
                          // Double-check before calling split - convert to string to ensure it's a primitive
                          const reqString = String(requirements);
                          if (typeof reqString.split === 'function') {
                            return reqString.split('\n').filter((req: string) => req.trim() !== '');
                          } else {
                            // Fallback if split somehow doesn't exist
                            return [reqString];
                          }
                        } catch (splitError) {
                          // Fallback: treat as single requirement
                          return [String(requirements)];
                        }
                      }
                      
                      // Handle other types (object, number, etc.)
                      if (requirements !== null && requirements !== undefined) {
                        return [String(requirements)];
                      }
                      
                      return [];
                    })().map((req: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Photos */}
            {job.photos && job.photos.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Photos</h2>
                <div className="space-y-4">
                  {/* Main Photo Display */}
                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={job.photos[selectedPhoto]}
                      alt={`Job photo ${selectedPhoto + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Photo Thumbnails */}
                  {job.photos.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {job.photos.map((photo: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => setSelectedPhoto(index)}
                          className={`relative aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 transition-all ${
                            selectedPhoto === index ? 'border-teal-500' : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={photo}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            {/* Homeowner Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Posted By</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {homeowner?.profile_image_url ? (
                    <img
                      src={homeowner.profile_image_url}
                      alt={`${homeowner.first_name} ${homeowner.last_name}`}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {homeowner?.first_name?.charAt(0) || 'H'}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {homeowner?.first_name} {homeowner?.last_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Member since {formatDate(homeowner?.created_at || job.created_at)}
                    </p>
                  </div>
                </div>

                {homeowner?.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{homeowner.email}</span>
                  </div>
                )}

                {homeowner?.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{homeowner.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {existingBid ? (
                <div className="space-y-4">
                  <div className="p-4 bg-teal-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-teal-600" />
                      <span className="font-semibold text-teal-900">You've Already Bid</span>
                    </div>
                    <p className="text-sm text-teal-700">
                      Your bid: {formatCurrency(existingBid.bid_amount || existingBid.amount || 0)}
                    </p>
                    <p className="text-sm text-teal-600 mt-1">
                      Status: {existingBid.status}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/contractor/bid/${job.id}`)}
                    className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    View/Edit Your Bid
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => router.push(`/contractor/bid/${job.id}`)}
                    className="w-full px-6 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-emerald-600 transition-all transform hover:scale-[1.02] shadow-lg"
                  >
                    Place Bid
                  </button>
                  <button
                    onClick={handleSaveToggle}
                    disabled={isSaving}
                    className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                      isSaved
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-teal-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {isSaved ? (
                          <CheckCircle className="w-5 h-5 text-teal-600" />
                        ) : (
                          <Heart className="w-5 h-5" />
                        )}
                        <span>{isSaved ? 'Saved' : 'Save Job'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Bidding Tips</p>
                    <ul className="mt-2 space-y-1 text-xs text-amber-700">
                      <li>• Be competitive but fair with pricing</li>
                      <li>• Highlight your relevant experience</li>
                      <li>• Provide a clear timeline</li>
                      <li>• Include all costs upfront</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Views</span>
                  <span className="font-semibold text-gray-900">{job.view_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Bids Placed</span>
                  <span className="font-semibold text-gray-900">{job.bid_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Saved By</span>
                  <span className="font-semibold text-gray-900">{job.save_count || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContractorPageWrapper>
  );
}