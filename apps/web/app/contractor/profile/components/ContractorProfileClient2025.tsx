'use client';

import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import React, { useState, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { fadeIn, staggerContainer, staggerItem, cardHover } from '@/lib/animations/variants';
import { formatMoney } from '@/lib/utils/currency';
import toast from 'react-hot-toast';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { useRouter } from 'next/navigation';
import { SkillsManagementModal } from './SkillsManagementModal';
import { logger } from '@mintenance/shared';
import {
  Camera,
  Upload,
  Edit3,
  Star,
  MapPin,
  Shield,
  Briefcase,
  Award,
  Clock,
  TrendingUp,
  Plus,
  Trash2,
  X,
  Check,
  Image as ImageIcon,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
} from 'lucide-react';

interface ContractorData {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  profile_image_url?: string;
  admin_verified?: boolean;
  bio?: string;
  city?: string;
  country?: string;
  phone?: string;
  company_name?: string;
  license_number?: string;
  created_at?: string;
}

interface ContractorReview {
  id: string;
  rating: number;
  comment: string;
  reviewer_name?: string;
  created_at: string;
  reviewer?: {
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };
  job?: {
    id: string;
    title?: string;
  };
}

interface CompletedJob {
  id: string;
  title: string;
  category: string;
  photos?: Array<{ url: string }>;
}

interface ContractorPost {
  id: string;
  title: string;
  content?: string;
  images?: Array<{ url: string }>;
  media_urls?: string[];
  help_category?: string;
}

interface ContractorProfileClient2025Props {
  contractor: ContractorData;
  skills: Array<{ skill_name: string; skill_icon?: string }>;
  reviews: ContractorReview[];
  completedJobs: CompletedJob[];
  posts: ContractorPost[];
  metrics: {
    profileCompletion: number;
    averageRating: number;
    totalReviews: number;
    jobsCompleted: number;
    winRate: number;
    totalEarnings: number;
    totalBids: number;
  };
}

export function ContractorProfileClient2025({
  contractor,
  skills,
  reviews,
  completedJobs,
  posts,
  metrics,
}: ContractorProfileClient2025Props) {
  const router = useRouter();
  const { getCsrfHeaders } = useCSRF();
  const [activeTab, setActiveTab] = useState<'overview' | 'company' | 'services' | 'portfolio' | 'reviews' | 'certifications'>('overview');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [showAddPortfolioModal, setShowAddPortfolioModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentSkills, setCurrentSkills] = useState(skills);
  const coverPhotoRef = useRef<HTMLInputElement>(null);
  const profilePhotoRef = useRef<HTMLInputElement>(null);

  // Form state for profile editing
  const [formData, setFormData] = useState({
    first_name: contractor.first_name || '',
    last_name: contractor.last_name || '',
    company_name: contractor.company_name || '',
    bio: contractor.bio || '',
  });

  const contractorName = contractor.first_name && contractor.last_name
    ? `${contractor.first_name} ${contractor.last_name}`.trim()
    : contractor.email;

  const handleCoverPhotoUpload = () => {
    coverPhotoRef.current?.click();
  };

  const handleProfilePhotoUpload = () => {
    profilePhotoRef.current?.click();
  };

  const handleSaveSkills = async (skillsToSave: Array<{ skill_name: string; skill_icon?: string }>) => {
    try {
      const response = await fetch('/api/contractor/manage-skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getCsrfHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          skills: skillsToSave.map(skill => ({
            skill_name: skill.skill_name,
            skill_icon: skill.skill_icon || '',
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save skills');
      }

      setCurrentSkills(skillsToSave);
      toast.success('Skills updated successfully');
      router.refresh();
    } catch (error) {
      logger.error('Error saving skills:', error, { service: 'ui' });
      toast.error(error instanceof Error ? error.message : 'Failed to save skills');
    }
  };

  const handleSaveProfile = async () => {
    // Validate required fields before sending
    if (!formData.first_name || formData.first_name.trim().length === 0) {
      toast.error('First name is required');
      setIsSaving(false);
      return;
    }

    if (!formData.last_name || formData.last_name.trim().length === 0) {
      toast.error('Last name is required');
      setIsSaving(false);
      return;
    }

    setIsSaving(true);
    try {
      // Create FormData for the API (which expects FormData)
      const formDataToSend = new FormData();
      // Trim and ensure non-empty for required fields
      formDataToSend.append('firstName', formData.first_name.trim());
      formDataToSend.append('lastName', formData.last_name.trim());
      formDataToSend.append('companyName', (formData.company_name || '').trim());
      const bioValue = (formData.bio || '').trim();
      formDataToSend.append('bio', bioValue);
      formDataToSend.append('city', (contractor.city || '').trim());
      formDataToSend.append('country', (contractor.country || '').trim());
      const phoneValue = (contractor.phone || '').trim();
      formDataToSend.append('phone', phoneValue);
      formDataToSend.append('isAvailable', 'true');

      const response = await fetch('/api/contractor/update-profile', {
        method: 'POST',
        headers: {
          ...getCsrfHeaders(),
        },
        credentials: 'include',
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.error || 'Failed to update profile';
        
        // Provide user-friendly error messages
        if (errorMessage.includes('phone') || errorMessage.includes('Phone')) {
          errorMessage = 'Invalid phone number format. Please use UK format:\n• +44 1234 567890\n• 01234 567890';
        } else if (data.details) {
          // Try to extract specific validation errors
          if (Array.isArray(data.details)) {
            const validationErrors = data.details
              .map((err: { message?: string; path?: string[] }) => err.message || err.path?.join('.') || 'Invalid field')
              .join(', ');
            if (validationErrors) {
              errorMessage = `Validation error: ${validationErrors}`;
            }
          }
        }
        
        throw new Error(errorMessage);
      }

      setIsEditMode(false);
      toast.success('Profile updated successfully');
      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      logger.error('Error saving profile:', error, { service: 'ui' });
      toast.error(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Briefcase },
    { id: 'company' as const, label: 'Company Info', icon: Building },
    { id: 'services' as const, label: 'Services', icon: Award },
    { id: 'portfolio' as const, label: 'Portfolio', icon: ImageIcon },
    { id: 'reviews' as const, label: 'Reviews', icon: Star },
    { id: 'certifications' as const, label: 'Certifications', icon: Shield },
  ];

  return (
    <ContractorPageWrapper>
      <div className="max-w-7xl mx-auto pb-12">
        {/* Hidden file inputs */}
        <input
          ref={coverPhotoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={() => toast.success('Cover photo uploaded')}
        />
        <input
          ref={profilePhotoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={() => toast.success('Profile photo uploaded')}
        />

        {/* Professional Hero Section with Navy Blue + Teal */}
        <MotionDiv
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8"
        >
          {/* Cover Photo - Clean Gradient */}
          <div className="relative h-72 rounded-xl overflow-hidden bg-gradient-to-br from-teal-600 to-teal-700 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10" />

            {/* Upload Cover Photo Button */}
            {isEditMode && (
              <button
                onClick={handleCoverPhotoUpload}
                className="absolute top-6 right-6 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all border border-gray-200"
              >
                <Camera className="w-4 h-4" />
                Update cover
              </button>
            )}
          </div>

          {/* Profile Photo (Overlapping) */}
          <div className="absolute -bottom-20 left-8">
            <div className="relative">
              <div className="w-40 h-40 rounded-xl border-4 border-white shadow-lg bg-white overflow-hidden">
                {contractor.profile_image_url ? (
                  <img
                    src={contractor.profile_image_url}
                    alt={contractorName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                    <span className="text-5xl font-bold text-white">
                      {contractorName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Verified Badge */}
              {contractor.admin_verified && (
                <div className="absolute -bottom-2 -right-2 w-11 h-11 bg-teal-500 rounded-xl flex items-center justify-center border-4 border-white shadow-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              )}

              {/* Upload Profile Photo Button */}
              {isEditMode && (
                <button
                  onClick={handleProfilePhotoUpload}
                  className="absolute top-0 right-0 p-2.5 bg-white rounded-lg shadow-sm hover:shadow-lg transition-all border border-gray-200"
                >
                  <Camera className="w-4 h-4 text-teal-600" />
                </button>
              )}
            </div>
          </div>
        </MotionDiv>

        {/* Profile Header Info */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-8 mt-24 mb-6"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              {/* Name & Company */}
              {isEditMode ? (
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="First name"
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
                    />
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Last name"
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
                    />
                  </div>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Company name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">{contractorName}</h1>
                  {contractor.company_name && (
                    <p className="text-xl text-slate-600 mb-4 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-teal-600" />
                      {contractor.company_name}
                    </p>
                  )}
                </>
              )}

              {/* Contact & Location Info */}
              <div className="flex items-center gap-6 flex-wrap text-slate-600 mb-4">
                {contractor.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{contractor.phone}</span>
                  </div>
                )}
                {contractor.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{contractor.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{contractor.city || 'Location not set'}, {contractor.country || 'UK'}</span>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="flex items-center gap-6 flex-wrap pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  {renderStars(Math.round(metrics.averageRating))}
                  <span className="font-semibold text-gray-900">{metrics.averageRating.toFixed(1)}</span>
                  <span className="text-gray-500">({metrics.totalReviews} reviews)</span>
                </div>
                <div className="w-px h-6 bg-gray-300" />
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-teal-600" />
                  <span className="font-semibold">{metrics.jobsCompleted}</span>
                  <span>jobs completed</span>
                </div>
                <div className="w-px h-6 bg-gray-300" />
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span>Member since {new Date(contractor.created_at || Date.now()).getFullYear()}</span>
                </div>
              </div>
            </div>

            {/* Edit Mode Toggle */}
            <div className="flex gap-3">
              {isEditMode ? (
                <>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      // Reset form data to original values
                      setFormData({
                        first_name: contractor.first_name || '',
                        last_name: contractor.last_name || '',
                        company_name: contractor.company_name || '',
                        bio: contractor.bio || '',
                      });
                    }}
                    disabled={isSaving}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit profile
                </button>
              )}
            </div>
          </div>

          {/* Profile Completion Badge */}
          <div className="bg-teal-50 rounded-lg p-4 border border-teal-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Profile Completion</span>
              <span className="text-sm font-semibold text-teal-700">{metrics.profileCompletion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics.profileCompletion}%` }}
              />
            </div>
          </div>
        </MotionDiv>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-fit px-6 py-4 font-medium text-sm transition-colors border-b-2 flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Bio Section */}
              <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">About Me</h2>
                {isEditMode ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell clients about yourself, your experience, and what makes you unique..."
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-700 leading-relaxed">
                    {formData.bio || contractor.bio || 'No bio provided yet. Click Edit profile to add information about yourself.'}
                  </p>
                )}
              </MotionDiv>

              {/* Performance Metrics */}
              <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl border border-gray-200 p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 justify-center">
                      <TrendingUp className="w-5 h-5 text-teal-600" />
                      <p className="text-gray-600 text-sm font-medium">Win Rate</p>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.winRate}%</p>
                  </div>
                  <div className="text-center p-4 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 justify-center">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                      <p className="text-gray-600 text-sm font-medium">Total Bids</p>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.totalBids}</p>
                  </div>
                  <div className="text-center p-4 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 justify-center">
                      <Star className="w-5 h-5 text-amber-600" />
                      <p className="text-gray-600 text-sm font-medium">Avg Rating</p>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.averageRating.toFixed(1)}</p>
                  </div>
                  <div className="text-center p-4 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 justify-center">
                      <Award className="w-5 h-5 text-emerald-600" />
                      <p className="text-gray-600 text-sm font-medium">Earnings</p>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">{formatMoney(metrics.totalEarnings)}</p>
                  </div>
                </div>
              </MotionDiv>

              {/* Verified Information */}
              {contractor.admin_verified && (
                <MotionDiv
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-xl border border-gray-200 p-6"
                >
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Verified Information</h2>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 rounded-lg">
                      <Shield className="w-5 h-5 text-teal-600" />
                      <span className="font-medium text-teal-900">Admin Verified</span>
                    </div>
                    {contractor.license_number && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <Award className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-900">Licensed Contractor</span>
                        <span className="text-sm text-blue-700">#{contractor.license_number}</span>
                      </div>
                    )}
                  </div>
                </MotionDiv>
              )}
            </>
          )}

          {/* Company Info Tab */}
          {activeTab === 'company' && (
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Company Information</h2>
                <p className="text-sm text-gray-600">Manage your company details and business information</p>
              </div>

              <div className="space-y-6">
                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Company Name</label>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="Enter your company name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                      {contractor.company_name || 'No company name set'}
                    </p>
                  )}
                </div>

                {/* Contact Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Contact Information</label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                      <Mail className="w-5 h-5 text-gray-600" />
                      <span className="text-gray-900">{contractor.email}</span>
                    </div>
                    {contractor.phone && (
                      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                        <Phone className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-900">{contractor.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-gray-600" />
                      <span className="text-gray-900">
                        {contractor.city || 'City not set'}, {contractor.country || 'Country not set'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Business Details */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Business Details</label>
                  <div className="space-y-3">
                    {contractor.license_number && (
                      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                        <Shield className="w-5 h-5 text-gray-600" />
                        <div>
                          <span className="text-sm text-gray-600">Licence Number:</span>
                          <span className="ml-2 text-gray-900 font-medium">{contractor.license_number}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      <div>
                        <span className="text-sm text-gray-600">Member Since:</span>
                        <span className="ml-2 text-gray-900 font-medium">
                          {contractor.created_at ? new Date(contractor.created_at).getFullYear() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Note about editing */}
                {!isEditMode && (
                  <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                    <p className="text-sm text-teal-800">
                      Click &quot;Edit profile&quot; above to update your company information.
                    </p>
                  </div>
                )}
              </div>
            </MotionDiv>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Skills & Expertise</h2>
                  <p className="text-sm text-gray-600 mt-1">Services you offer to clients</p>
                </div>
                {isEditMode && (
                  <button
                    onClick={() => setShowAddSkillModal(true)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add skill
                  </button>
                )}
              </div>

              {skills.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No skills added yet</p>
                  <p className="text-sm text-gray-500">Add skills to showcase your expertise</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {currentSkills.map((skill, index) => (
                    <div
                      key={index}
                      className="group relative flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-all"
                    >
                      {skill.skill_icon && <span className="text-lg">{skill.skill_icon}</span>}
                      <span className="font-medium text-gray-900 text-sm">{skill.skill_name}</span>
                      {isEditMode && (
                        <button
                          onClick={async () => {
                            const updatedSkills = currentSkills.filter((_, i) => i !== index);
                            setCurrentSkills(updatedSkills);
                            await handleSaveSkills(updatedSkills);
                          }}
                          className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-500 hover:bg-red-600 rounded-full transition-all"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </MotionDiv>
          )}

          {/* Portfolio Tab */}
          {activeTab === 'portfolio' && (
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Portfolio</h2>
                  <p className="text-sm text-gray-600 mt-1">Showcase your best work</p>
                </div>
                {isEditMode && (
                  <button
                    onClick={() => setShowAddPortfolioModal(true)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add project
                  </button>
                )}
              </div>

              {posts.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                  <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-700 mb-2 text-lg font-medium">No portfolio items yet</p>
                  <p className="text-gray-500 mb-6">Start building your portfolio to attract more clients</p>
                  {isEditMode && (
                    <button
                      onClick={() => setShowAddPortfolioModal(true)}
                      className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 inline-flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add first project
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {posts.map((post, index) => (
                    <MotionDiv
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -4 }}
                      className="group relative rounded-xl overflow-hidden hover:shadow-xl transition-all bg-white border border-gray-200"
                    >
                      {/* Project Image */}
                      <div className="relative h-56 bg-slate-100 overflow-hidden">
                        {post.media_urls && post.media_urls[0] ? (
                          <img
                            src={post.media_urls[0]}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-16 h-16 text-slate-300" />
                          </div>
                        )}

                        {/* Edit/Delete overlay in edit mode */}
                        {isEditMode && (
                          <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex gap-3">
                              <button className="p-2.5 bg-white rounded-xl hover:bg-slate-50 transition-colors shadow-lg">
                                <Edit3 className="w-4 h-4 text-teal-600" />
                              </button>
                              <button className="p-2.5 bg-white rounded-xl hover:bg-slate-50 transition-colors shadow-lg">
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Project Info */}
                      <div className="p-5">
                        <h3 className="font-semibold text-slate-900 text-base mb-2 line-clamp-1">{post.title}</h3>
                        {post.help_category && (
                          <span className="inline-block px-2.5 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-lg mb-2">
                            {post.help_category}
                          </span>
                        )}
                        {post.content && (
                          <p className="text-sm text-slate-600 line-clamp-2">{post.content}</p>
                        )}
                      </div>
                    </MotionDiv>
                  ))}

                  {/* Add Project Card (when in edit mode) */}
                  {isEditMode && (
                    <MotionButton
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowAddPortfolioModal(true)}
                      className="h-full min-h-[320px] border-2 border-dashed border-teal-300 rounded-xl bg-teal-50 hover:bg-teal-100 transition-all flex flex-col items-center justify-center gap-4 text-teal-700"
                    >
                      <div className="w-16 h-16 rounded-xl bg-teal-200 flex items-center justify-center">
                        <Plus className="w-8 h-8 text-teal-700" />
                      </div>
                      <span className="text-base font-semibold">Add new project</span>
                    </MotionButton>
                  )}
                </div>
              )}
            </MotionDiv>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Reviews ({metrics.totalReviews})
                </h2>
                <div className="flex items-center gap-4 mt-3">
                  {renderStars(Math.round(metrics.averageRating))}
                  <span className="text-2xl font-semibold text-gray-900">{metrics.averageRating.toFixed(1)}</span>
                  <span className="text-gray-600">out of 5</span>
                </div>
              </div>

              {reviews.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-700 text-lg font-medium">No reviews yet</p>
                  <p className="text-gray-500 mt-2">Complete jobs to start receiving reviews</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review, index) => (
                    <MotionDiv
                      key={review.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="pb-6 border-b border-slate-200 last:border-0"
                    >
                      <div className="flex items-start gap-4">
                        {/* Reviewer Avatar */}
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          {review.reviewer?.profile_image_url ? (
                            <img
                              src={review.reviewer.profile_image_url}
                              alt={`${review.reviewer.first_name} ${review.reviewer.last_name}`}
                              className="w-full h-full rounded-xl object-cover"
                            />
                          ) : (
                            <span className="text-white font-bold text-lg">
                              {review.reviewer?.first_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          )}
                        </div>

                        {/* Review Content */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-slate-900">
                                {review.reviewer
                                  ? `${review.reviewer.first_name} ${review.reviewer.last_name}`.trim()
                                  : 'Anonymous'}
                              </h4>
                              <span className="text-sm text-slate-500">
                                {new Date(review.created_at).toLocaleDateString('en-GB', {
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>

                          {renderStars(review.rating)}

                          {review.job && (
                            <div className="mt-2 inline-block px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-lg">
                              {review.job.title}
                            </div>
                          )}

                          <p className="text-slate-700 mt-3 leading-relaxed">{review.comment}</p>
                        </div>
                      </div>
                    </MotionDiv>
                  ))}
                </div>
              )}
            </MotionDiv>
          )}

          {/* Certifications Tab */}
          {activeTab === 'certifications' && (
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Certifications & Licences</h2>
                  <p className="text-sm text-gray-600 mt-1">Professional credentials and qualifications</p>
                </div>
                {isEditMode && (
                  <button
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add certification
                  </button>
                )}
              </div>

              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-700 mb-2">No certifications added yet</p>
                <p className="text-sm text-gray-500">Add your professional certifications to build trust</p>
              </div>
            </MotionDiv>
          )}
        </div>

        {/* Add Portfolio Modal */}
        <AnimatePresence>
          {showAddPortfolioModal && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <MotionDiv
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">Add Portfolio Project</h3>
                    <button
                      onClick={() => setShowAddPortfolioModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Project Title</label>
                      <input
                        type="text"
                        placeholder="e.g., Modern Kitchen Renovation"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Category</label>
                      <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                        <option>Kitchen</option>
                        <option>Bathroom</option>
                        <option>Plumbing</option>
                        <option>Electrical</option>
                        <option>General</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
                      <textarea
                        rows={4}
                        placeholder="Describe the project, challenges, and results..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Project Images</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-teal-500 transition-colors cursor-pointer">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                        <p className="text-sm text-gray-500">PNG, JPG up to 10MB</p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => {
                          toast.success('Project added to portfolio');
                          setShowAddPortfolioModal(false);
                        }}
                        className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                      >
                        Add Project
                      </button>
                      <button
                        onClick={() => setShowAddPortfolioModal(false)}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </MotionDiv>
            </div>
          )}
        </AnimatePresence>

        {/* Skills Management Modal */}
        {showAddSkillModal && (
          <SkillsManagementModal
            currentSkills={currentSkills}
            onClose={() => setShowAddSkillModal(false)}
            onSave={async (skillsToSave) => {
              await handleSaveSkills(skillsToSave);
              setShowAddSkillModal(false);
            }}
          />
        )}
      </div>
    </ContractorPageWrapper>
  );
}

// Helper component for building icon
function Building({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
