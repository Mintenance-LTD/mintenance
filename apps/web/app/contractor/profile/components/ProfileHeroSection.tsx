'use client';

import React from 'react';
import Image from 'next/image';
import { MotionDiv } from '@/components/ui/MotionDiv';
import {
  Camera,
  Edit3,
  Star,
  Shield,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Check,
  CheckCircle,
} from 'lucide-react';
import type { ContractorProfileData, ProfileMetrics, ProfileFormData } from './contractorProfileTypes';

interface ProfileHeroProps {
  contractor: ContractorProfileData;
  contractorName: string;
  metrics: ProfileMetrics;
  isEditMode: boolean;
  isSaving: boolean;
  formData: ProfileFormData;
  onFormChange: (data: ProfileFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  coverPhotoRef: React.RefObject<HTMLInputElement | null>;
  profilePhotoRef: React.RefObject<HTMLInputElement | null>;
  onCoverPhotoUpload: () => void;
  onProfilePhotoUpload: () => void;
}

function renderStars(rating: number) {
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
}

export function ProfileHeroSection({
  contractor,
  contractorName,
  metrics,
  isEditMode,
  isSaving,
  formData,
  onFormChange,
  onSave,
  onCancel,
  onEdit,
  coverPhotoRef,
  profilePhotoRef,
  onCoverPhotoUpload,
  onProfilePhotoUpload,
}: ProfileHeroProps) {
  return (
    <>
      {/* Hidden file inputs */}
      <input ref={coverPhotoRef} type="file" accept="image/*" className="hidden" />
      <input ref={profilePhotoRef} type="file" accept="image/*" className="hidden" />

      {/* Cover Photo + Profile Photo */}
      <MotionDiv initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative mb-8">
        <div className="relative h-72 rounded-xl overflow-hidden bg-gradient-to-br from-teal-600 to-teal-700 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10" />
          {isEditMode && (
            <button
              onClick={onCoverPhotoUpload}
              className="absolute top-6 right-6 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all border border-gray-200"
            >
              <Camera className="w-4 h-4" />
              Update cover
            </button>
          )}
        </div>
        <div className="absolute -bottom-20 left-8">
          <div className="relative">
            <div className="w-40 h-40 rounded-xl border-4 border-white shadow-lg bg-white overflow-hidden">
              {contractor.profile_image_url ? (
                <Image src={contractor.profile_image_url} alt={contractorName} width={160} height={160} className="object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                  <span className="text-5xl font-bold text-white">{contractorName.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
            {contractor.admin_verified && (
              <div className="absolute -bottom-2 -right-2 w-11 h-11 bg-teal-500 rounded-xl flex items-center justify-center border-4 border-white shadow-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
            )}
            {isEditMode && (
              <button onClick={onProfilePhotoUpload} className="absolute top-0 right-0 p-2.5 bg-white rounded-lg shadow-sm hover:shadow-lg transition-all border border-gray-200">
                <Camera className="w-4 h-4 text-teal-600" />
              </button>
            )}
          </div>
        </div>
      </MotionDiv>

      {/* Profile Header */}
      <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl border border-gray-200 p-8 mt-24 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            {isEditMode ? (
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={formData.first_name} onChange={(e) => onFormChange({ ...formData, first_name: e.target.value })} placeholder="First name" className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg" />
                  <input type="text" value={formData.last_name} onChange={(e) => onFormChange({ ...formData, last_name: e.target.value })} placeholder="Last name" className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg" />
                </div>
                <input type="text" value={formData.company_name} onChange={(e) => onFormChange({ ...formData, company_name: e.target.value })} placeholder="Company name" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg" />
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
            <div className="flex items-center gap-6 flex-wrap text-slate-600 mb-4">
              {contractor.phone && (<div className="flex items-center gap-2"><Phone className="w-4 h-4" /><span className="text-sm">{contractor.phone}</span></div>)}
              {contractor.email && (<div className="flex items-center gap-2"><Mail className="w-4 h-4" /><span className="text-sm">{contractor.email}</span></div>)}
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span className="text-sm">{contractor.city || 'Location not set'}, {contractor.country || 'UK'}</span></div>
            </div>
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
          <div className="flex gap-3">
            {isEditMode ? (
              <>
                <button onClick={onSave} disabled={isSaving} className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Check className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={onCancel} disabled={isSaving} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={onEdit} className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Edit profile
              </button>
            )}
          </div>
        </div>
        <div className="bg-teal-50 rounded-lg p-4 border border-teal-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">Profile Completion</span>
            <span className="text-sm font-semibold text-teal-700">{metrics.profileCompletion}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-teal-600 h-2 rounded-full transition-all duration-500" style={{ width: metrics.profileCompletion + '%' }} />
          </div>
        </div>
      </MotionDiv>
    </>
  );
}
