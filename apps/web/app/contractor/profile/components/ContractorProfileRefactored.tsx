'use client';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import { AnimatePresence } from 'framer-motion';
import { staggerContainer } from '@/lib/animations/variants';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { useCSRF } from '@/lib/hooks/useCSRF';
// Refactored components
import { useContractorProfile } from '../hooks/useContractorProfile';
import { ProfileHeader } from './ProfileHeader';
import { ProfileMetrics, ProfileCompletionCard } from './ProfileMetrics';
import { ReviewsSection } from './ReviewsSection';
import { SkillsManagementModal } from './SkillsManagementModal';
import { ProfileEditModal } from './ProfileEditModal';
// Types
import type { ContractorData, ContractorMetrics } from '../hooks/useContractorProfile';
import type { ContractorReview } from './ReviewsSection';
interface ContractorProfileRefactoredProps {
  contractor: ContractorData;
  skills: Array<{ skill_name: string; skill_icon?: string }>;
  reviews: ContractorReview[];
  completedJobs: Array<{
    id: string;
    title: string;
    category: string;
    photos?: Array<{ url: string }>;
  }>;
  posts: Array<{
    id: string;
    title: string;
    content?: string;
    images?: Array<{ url: string }>;
    media_urls?: string[];
    help_category?: string;
  }>;
  metrics: ContractorMetrics;
}
/**
 * Refactored ContractorProfile Component
 * Reduced from 888 lines to ~200 lines in main component
 *
 * Key improvements:
 * - Separated concerns into specialized components
 * - Custom hook for state management
 * - Reusable components for each section
 * - Better testability and maintainability
 */
export function ContractorProfileRefactored({
  contractor: initialContractor,
  skills,
  reviews,
  completedJobs,
  posts,
  metrics: initialMetrics,
}: ContractorProfileRefactoredProps) {
  const { csrfToken } = useCSRF();
  // Use custom hook for profile management
  const {
    contractor,
    metrics,
    isEditing,
    isSaving,
    formData,
    setIsEditing,
    updateFormField,
    saveProfile,
    uploadProfileImage,
    cancelEdit,
  } = useContractorProfile(initialContractor, initialMetrics);
  // Modal states
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  // Determine if this is the user's own profile
  const isOwnProfile = true; // This should come from auth context
  // Handle skills save
  const handleSaveSkills = async (
    skillsToSave: Array<{ skill_name: string; skill_icon?: string }>
  ) => {
    try {
      const response = await fetch(`/api/contractors/${contractor.id}/skills`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({ skills: skillsToSave }),
      });
      if (!response.ok) {
        throw new Error('Failed to update skills');
      }
      toast.success('Skills updated successfully!');
      setShowSkillsModal(false);
      router.refresh();
    } catch (error) {
      logger.error('Failed to update skills', { error });
      toast.error('Failed to update skills. Please try again.');
    }
  };
  // Handle profile save
  const handleSaveProfile = async () => {
    if (csrfToken) {
      await saveProfile(csrfToken);
    }
  };
  return (
    <ContractorPageWrapper>
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="max-w-7xl mx-auto px-4 py-8 space-y-8"
      >
        {/* Profile Header */}
        <ProfileHeader
          contractor={contractor}
          isOwnProfile={isOwnProfile}
          onEditClick={() => setIsEditing(true)}
          onImageUpload={async (file: File) => {
            if (csrfToken) {
              return await uploadProfileImage(file, csrfToken);
            }
            return null;
          }}
        />
        {/* Profile Completion Card (for own profile) */}
        {isOwnProfile && metrics.profileCompletion < 100 && (
          <ProfileCompletionCard completion={metrics.profileCompletion} />
        )}
        {/* Metrics Dashboard */}
        <ProfileMetrics metrics={metrics} />
        {/* Skills Section */}
        {skills.length > 0 && (
          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Skills & Expertise
              </h2>
              {isOwnProfile && (
                <button
                  onClick={() => setShowSkillsModal(true)}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  Manage Skills
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {skill.skill_icon && <span className="mr-1">{skill.skill_icon}</span>}
                  {skill.skill_name}
                </span>
              ))}
            </div>
          </MotionDiv>
        )}
        {/* Reviews Section */}
        <ReviewsSection
          reviews={reviews}
          averageRating={metrics.averageRating}
          totalReviews={metrics.totalReviews}
        />
        {/* Completed Jobs Gallery */}
        {completedJobs.length > 0 && (
          <CompletedJobsGallery jobs={completedJobs} />
        )}
        {/* Posts Section */}
        {posts.length > 0 && (
          <PostsSection posts={posts} contractorName={fullName} />
        )}
      </MotionDiv>
      {/* Modals */}
      <AnimatePresence>
        {isEditing && (
          <ProfileEditModal
            formData={formData}
            onFieldChange={updateFormField}
            onSave={handleSaveProfile}
            onCancel={cancelEdit}
            isSaving={isSaving}
          />
        )}
        {showSkillsModal && (
          <SkillsManagementModal
            currentSkills={skills}
            onSave={handleSaveSkills}
            onClose={() => setShowSkillsModal(false)}
          />
        )}
      </AnimatePresence>
    </ContractorPageWrapper>
  );
}
// These would be separate component files
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { logger } from '@mintenance/shared';
import { staggerItem } from '@/lib/animations/variants';
// Placeholder for CompletedJobsGallery component
function CompletedJobsGallery({ jobs }: { jobs: unknown[] }) {
  return (
    <MotionDiv variants={staggerItem} className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Portfolio</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {jobs.slice(0, 6).map((job) => (
          <div key={job.id} className="aspect-square bg-gray-200 rounded-lg" />
        ))}
      </div>
    </MotionDiv>
  );
}
// Placeholder for PostsSection component
function PostsSection({ posts, contractorName }: { posts: unknown[]; contractorName: string }) {
  return (
    <MotionDiv variants={staggerItem} className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Posts</h2>
      <div className="space-y-4">
        {posts.slice(0, 3).map((post) => (
          <div key={post.id} className="border-b pb-4 last:border-0">
            <h3 className="font-medium">{post.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{post.content}</p>
          </div>
        ))}
      </div>
    </MotionDiv>
  );
}
// Placeholder for ProfileEditModal
function ProfileEditModal({ formData, onFieldChange, onSave, onCancel, isSaving }: unknown) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full">
        <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
        {/* Form fields would go here */}
        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onCancel} className="px-4 py-2 border rounded-lg">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}