'use client';

import React, { useState } from 'react';
import { AnimatePresence, useMotionValue, useTransform } from 'framer-motion';;
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { fadeIn } from '@/lib/animations/variants';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: string;
  location: string;
  urgency: string;
  photos?: string[];
  postedBy: {
    name: string;
    rating: number;
  };
  matchScore: number;
}

export default function ContractorDiscoverPage2025() {
  return (
    <ErrorBoundary componentName="ContractorDiscoverPage">
      <ContractorDiscoverContent />
    </ErrorBoundary>
  );
}

function ContractorDiscoverContent() {
  const { user } = useCurrentUser();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitX, setExitX] = useState(0);

  // Mock jobs data
  const jobs: Job[] = [
    {
      id: '1',
      title: 'Kitchen Renovation',
      description: 'Complete kitchen remodel including new cabinets, countertops, and appliances. Looking for experienced contractor with references.',
      category: 'Renovation',
      budget: '15000',
      location: 'London, UK',
      urgency: 'Medium',
      postedBy: { name: 'Sarah Johnson', rating: 4.8 },
      matchScore: 95,
    },
    {
      id: '2',
      title: 'Bathroom Plumbing Repair',
      description: 'Need urgent plumbing repair for bathroom sink and shower. Water pressure issues.',
      category: 'Plumbing',
      budget: '800',
      location: 'Manchester, UK',
      urgency: 'High',
      postedBy: { name: 'Mike Wilson', rating: 4.5 },
      matchScore: 88,
    },
    {
      id: '3',
      title: 'Garden Landscaping',
      description: 'Transform backyard with new patio, plants, and lighting. Looking for creative landscaper.',
      category: 'Landscaping',
      budget: '5000',
      location: 'Birmingham, UK',
      urgency: 'Low',
      postedBy: { name: 'Emma Davis', rating: 5.0 },
      matchScore: 82,
    },
  ];

  const currentJob = jobs[currentIndex];
  const hasMoreJobs = currentIndex < jobs.length;

  const userDisplayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user?.email || '';

  const handleSwipe = async (direction: 'like' | 'pass') => {
    if (!currentJob) return;

    setExitX(direction === 'like' ? 300 : -300);

    try {
      await fetch('/api/discover/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: direction,
          itemId: currentJob.id,
          itemType: 'job',
        }),
      });

      if (direction === 'like') {
        toast.success('Saved to interested jobs!');
      }
    } catch (error) {
      toast.error('Failed to save action');
    }

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setExitX(0);
    }, 300);
  };

  const handleUndo = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      toast.success('Undone!');
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high':
        return 'bg-rose-100 text-rose-700 border-rose-600';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-600';
      case 'low':
        return 'bg-emerald-100 text-emerald-700 border-emerald-600';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-600';
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="contractor"
        userInfo={{
          name: userDisplayName,
          email: user?.email || '',
          avatar: (user as any)?.profile_image_url,
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
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                  <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-1">Discover Jobs</h1>
                  <p className="text-teal-100 text-lg">Swipe to find your next project</p>
                </div>
              </div>

              {/* Progress */}
              <div className="text-right">
                <div className="text-3xl font-bold mb-1">{currentIndex} / {jobs.length}</div>
                <div className="text-teal-100 text-sm">Jobs Reviewed</div>
                <div className="w-32 h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${(currentIndex / jobs.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1000px] mx-auto px-8 py-12 w-full">
          {!hasMoreJobs || !currentJob ? (
            <MotionDiv
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center"
              variants={fadeIn}
              initial="initial"
              animate="animate"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">You're All Caught Up!</h2>
              <p className="text-gray-600 text-lg mb-6">No more jobs to review right now</p>
              <button
                onClick={() => setCurrentIndex(0)}
                className="px-8 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 shadow-sm transition-all"
              >
                Review Again
              </button>
            </MotionDiv>
          ) : (
            <div className="relative">
              {/* Card Stack */}
              <AnimatePresence>
                <MotionDiv
                  key={currentJob.id}
                  className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ x: exitX, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = Math.abs(offset.x) * velocity.x;
                    if (swipe > 10000) {
                      handleSwipe(offset.x > 0 ? 'like' : 'pass');
                    }
                  }}
                >
                  {/* Match Score Badge */}
                  <div className="absolute top-6 right-6 z-10">
                    <div className="px-4 py-2 bg-teal-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {currentJob.matchScore}% Match
                    </div>
                  </div>

                  {/* Job Image/Placeholder */}
                  <div className="h-64 bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                    <svg className="w-24 h-24 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>

                  {/* Job Details */}
                  <div className="p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">{currentJob.title}</h2>
                        <div className="flex items-center gap-3 flex-wrap mb-4">
                          <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-lg text-sm font-semibold">
                            {currentJob.category}
                          </span>
                          <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getUrgencyColor(currentJob.urgency)}`}>
                            {currentJob.urgency} Urgency
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-6 leading-relaxed">{currentJob.description}</p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-600">Budget</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">£{Number(currentJob.budget).toLocaleString()}</div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-600">Location</span>
                        </div>
                        <div className="text-lg font-semibold text-gray-900">{currentJob.location}</div>
                      </div>
                    </div>

                    {/* Posted By */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                        {currentJob.postedBy.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{currentJob.postedBy.name}</div>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-700">{currentJob.postedBy.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </MotionDiv>
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-6 mt-8">
                <MotionButton
                  onClick={() => handleSwipe('pass')}
                  className="w-20 h-20 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg className="w-10 h-10 text-gray-600 group-hover:text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </MotionButton>

                {currentIndex > 0 && (
                  <MotionButton
                    onClick={handleUndo}
                    className="w-16 h-16 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all group"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg className="w-6 h-6 text-gray-600 group-hover:text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </MotionButton>
                )}

                <MotionButton
                  onClick={() => handleSwipe('like')}
                  className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-500 border-2 border-teal-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </MotionButton>
              </div>

              {/* Keyboard Hints */}
              <div className="flex items-center justify-center gap-8 mt-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">←</kbd>
                  <span>Pass</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">→</kbd>
                  <span>Like</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
