'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';;
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { fadeIn, staggerContainer, staggerItem, cardHover } from '@/lib/animations/variants';
import { formatMoney } from '@/lib/utils/currency';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'reviews'>('overview');
  const [showEditModal, setShowEditModal] = useState(false);

  const contractorName = contractor.first_name && contractor.last_name
    ? `${contractor.first_name} ${contractor.last_name}`.trim()
    : contractor.email;

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${star <= rating ? 'text-amber-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="contractor"
        userInfo={{
          name: contractorName,
          email: contractor.email,
          avatar: contractor.profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12">
            <div className="flex items-start gap-8">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center overflow-hidden">
                  {contractor.profile_image_url ? (
                    <img src={contractor.profile_image_url} alt={contractorName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl font-bold text-teal-600">
                      {contractorName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {contractor.admin_verified && (
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{contractorName}</h1>
                {contractor.company_name && (
                  <p className="text-xl text-teal-100 mb-3">{contractor.company_name}</p>
                )}
                <div className="flex items-center gap-4 mb-4">
                  {renderStars(Math.round(metrics.averageRating))}
                  <span className="text-teal-100">
                    {metrics.averageRating.toFixed(1)} ({metrics.totalReviews} reviews)
                  </span>
                </div>
                <p className="text-teal-100 max-w-2xl">{contractor.bio || 'No bio provided'}</p>
              </div>

              {/* Edit Button */}
              <button
                onClick={() => setShowEditModal(true)}
                className="px-6 py-3 bg-white text-teal-600 rounded-xl font-semibold hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all"
              >
                Edit Profile
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-5 gap-4 mt-8">
              {[
                { label: 'Profile Complete', value: `${metrics.profileCompletion}%`, icon: '📊' },
                { label: 'Jobs Completed', value: metrics.jobsCompleted, icon: '✅' },
                { label: 'Win Rate', value: `${metrics.winRate}%`, icon: '🎯' },
                { label: 'Total Earnings', value: formatMoney(metrics.totalEarnings, 'GBP'), icon: '💰' },
                { label: 'Total Bids', value: metrics.totalBids, icon: '📋' },
              ].map((stat) => (
                <MotionDiv
                  key={stat.label}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
                  variants={staggerItem}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">{stat.value}</div>
                  <div className="text-teal-100 text-sm">{stat.label}</div>
                </MotionDiv>
              ))}
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
          {/* Tabs */}
          <MotionDiv
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <div className="flex items-center gap-3">
              {[
                { label: 'Overview', value: 'overview' },
                { label: 'Portfolio', value: 'portfolio' },
                { label: 'Reviews', value: 'reviews' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value as any)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    activeTab === tab.value
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </MotionDiv>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <MotionDiv
                key="overview"
                variants={fadeIn}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                {/* Skills */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Skills & Expertise</h2>
                  {skills.length === 0 ? (
                    <p className="text-gray-600">No skills added yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {skills.map((skill, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 bg-teal-100 text-teal-700 rounded-xl font-medium flex items-center gap-2"
                        >
                          {skill.skill_icon && <span>{skill.skill_icon}</span>}
                          {skill.skill_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Location & Contact */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Location & Contact</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Location</p>
                      <p className="font-medium text-gray-900">
                        {contractor.city && contractor.country
                          ? `${contractor.city}, ${contractor.country}`
                          : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">License</p>
                      <p className="font-medium text-gray-900">
                        {contractor.license_number || 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>
              </MotionDiv>
            )}

            {activeTab === 'portfolio' && (
              <MotionDiv
                key="portfolio"
                variants={fadeIn}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Portfolio</h2>
                  {posts.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-600">No portfolio items yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-6">
                      {posts.map((post) => (
                        <div key={post.id} className="rounded-xl overflow-hidden border border-gray-200">
                          {post.media_urls && post.media_urls[0] && (
                            <img
                              src={post.media_urls[0]}
                              alt={post.title}
                              className="w-full h-48 object-cover"
                            />
                          )}
                          <div className="p-4">
                            <h3 className="font-semibold text-gray-900 mb-1">{post.title}</h3>
                            <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </MotionDiv>
            )}

            {activeTab === 'reviews' && (
              <MotionDiv
                key="reviews"
                variants={fadeIn}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Reviews ({metrics.totalReviews})
                  </h2>
                  {reviews.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-600">No reviews yet</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {reviews.map((review) => (
                        <div key={review.id} className="pb-6 border-b border-gray-200 last:border-0">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                              {review.reviewer?.profile_image_url ? (
                                <img
                                  src={review.reviewer.profile_image_url}
                                  alt={`${review.reviewer.first_name} ${review.reviewer.last_name}`}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-teal-600 font-semibold">
                                  {review.reviewer?.first_name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              )}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900">
                                  {review.reviewer
                                    ? `${review.reviewer.first_name} ${review.reviewer.last_name}`.trim()
                                    : 'Anonymous'}
                                </h4>
                                <span className="text-sm text-gray-500">
                                  {new Date(review.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>

                              {renderStars(review.rating)}

                              {review.job && (
                                <p className="text-sm text-gray-600 mt-2">
                                  Job: {review.job.title}
                                </p>
                              )}

                              <p className="text-gray-700 mt-3">{review.comment}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
