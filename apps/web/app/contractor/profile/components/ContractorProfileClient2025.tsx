'use client';

import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { useRouter } from 'next/navigation';
import { SkillsManagementModal } from './SkillsManagementModal';
import { ProfileHeroSection } from './ProfileHeroSection';
import { ProfileTabPanels } from './ProfileTabPanels';
import { logger } from '@mintenance/shared';
import { Briefcase, Award, Star, Shield, Image as ImageIcon } from 'lucide-react';
import type {
  ContractorProfileData,
  ContractorReview,
  ContractorPost,
  ProfileMetrics,
  ProfileFormData,
} from './contractorProfileTypes';

interface ContractorProfileClient2025Props {
  contractor: ContractorProfileData;
  skills: Array<{ skill_name: string; skill_icon?: string }>;
  reviews: ContractorReview[];
  completedJobs: Array<{ id: string; title: string; category: string; photos?: Array<{ url: string }> }>;
  posts: ContractorPost[];
  metrics: ProfileMetrics;
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

  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: contractor.first_name || '',
    last_name: contractor.last_name || '',
    company_name: contractor.company_name || '',
    bio: contractor.bio || '',
  });

  const contractorName = contractor.first_name && contractor.last_name
    ? `${contractor.first_name} ${contractor.last_name}`.trim()
    : contractor.email;

  const handleSaveSkills = async (skillsToSave: Array<{ skill_name: string; skill_icon?: string }>) => {
    try {
      const response = await fetch('/api/contractor/manage-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ skills: skillsToSave.map(skill => ({ skill_name: skill.skill_name, skill_icon: skill.skill_icon || '' })) }),
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
    if (!formData.first_name || formData.first_name.trim().length === 0) { toast.error('First name is required'); return; }
    if (!formData.last_name || formData.last_name.trim().length === 0) { toast.error('Last name is required'); return; }

    setIsSaving(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', formData.first_name.trim());
      formDataToSend.append('lastName', formData.last_name.trim());
      formDataToSend.append('companyName', (formData.company_name || '').trim());
      formDataToSend.append('bio', (formData.bio || '').trim());
      formDataToSend.append('city', (contractor.city || '').trim());
      formDataToSend.append('country', (contractor.country || '').trim());
      formDataToSend.append('phone', (contractor.phone || '').trim());
      formDataToSend.append('isAvailable', 'true');

      const response = await fetch('/api/contractor/update-profile', {
        method: 'POST',
        headers: { ...getCsrfHeaders() },
        credentials: 'include',
        body: formDataToSend,
      });
      const data = await response.json();
      if (!response.ok) {
        let errorMessage = data.error || 'Failed to update profile';
        if (errorMessage.includes('phone') || errorMessage.includes('Phone')) {
          errorMessage = 'Invalid phone number format. Please use UK format:\n+44 1234 567890\n01234 567890';
        } else if (data.details && Array.isArray(data.details)) {
          const validationErrors = data.details.map((err: { message?: string; path?: string[] }) => err.message || err.path?.join('.') || 'Invalid field').join(', ');
          if (validationErrors) errorMessage = 'Validation error: ' + validationErrors;
        }
        throw new Error(errorMessage);
      }
      setIsEditMode(false);
      toast.success('Profile updated successfully');
      router.refresh();
    } catch (error) {
      logger.error('Error saving profile:', error, { service: 'ui' });
      toast.error(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
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
        <ProfileHeroSection
          contractor={contractor}
          contractorName={contractorName}
          metrics={metrics}
          isEditMode={isEditMode}
          isSaving={isSaving}
          formData={formData}
          onFormChange={setFormData}
          onSave={handleSaveProfile}
          onCancel={() => {
            setIsEditMode(false);
            setFormData({ first_name: contractor.first_name || '', last_name: contractor.last_name || '', company_name: contractor.company_name || '', bio: contractor.bio || '' });
          }}
          onEdit={() => setIsEditMode(true)}
          coverPhotoRef={coverPhotoRef}
          profilePhotoRef={profilePhotoRef}
          onCoverPhotoUpload={() => coverPhotoRef.current?.click()}
          onProfilePhotoUpload={() => profilePhotoRef.current?.click()}
        />

        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-fit px-6 py-4 font-medium text-sm transition-colors border-b-2 flex items-center justify-center gap-2 ${
                  activeTab === tab.id ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <ProfileTabPanels
          activeTab={activeTab}
          contractor={contractor}
          metrics={metrics}
          skills={skills}
          currentSkills={currentSkills}
          reviews={reviews}
          posts={posts}
          isEditMode={isEditMode}
          formData={formData}
          onFormChange={setFormData}
          onRemoveSkill={async (index) => {
            const updated = currentSkills.filter((_, i) => i !== index);
            setCurrentSkills(updated);
            await handleSaveSkills(updated);
          }}
          onAddSkillClick={() => setShowAddSkillModal(true)}
          onAddPortfolioClick={() => setShowAddPortfolioModal(true)}
          showAddPortfolioModal={showAddPortfolioModal}
          onClosePortfolioModal={() => setShowAddPortfolioModal(false)}
          onAddPortfolioSubmit={() => { toast.success('Project added to portfolio'); setShowAddPortfolioModal(false); }}
        />

        {showAddSkillModal && (
          <SkillsManagementModal
            currentSkills={currentSkills}
            onClose={() => setShowAddSkillModal(false)}
            onSave={async (skillsToSave) => { await handleSaveSkills(skillsToSave); setShowAddSkillModal(false); }}
          />
        )}
      </div>
    </ContractorPageWrapper>
  );
}

function Building({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
