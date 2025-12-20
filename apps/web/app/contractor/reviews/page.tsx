'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Star,
  MessageSquare,
  ThumbsUp,
  Search,
  Calendar,
  User,
  Briefcase,
  Reply,
  Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Review {
  id: string;
  jobId: string;
  jobTitle: string;
  client: string;
  clientAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  relativeDate: string;
  helpful: number;
  responded: boolean;
  response?: string;
  responseDate?: string;
  photos?: string[];
  categories?: {
    quality: number;
    communication: number;
    timeliness: number;
    professionalism: number;
  };
}

export default function ContractorReviewsPage2025() {
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResponseForm, setShowResponseForm] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  // TODO: Replace with real API data
  const reviews: Review[] = [
    {
      id: 'REV-001',
      jobId: 'JOB-128',
      jobTitle: 'Kitchen sink replacement',
      client: 'Sarah Johnson',
      clientAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
      rating: 5,
      comment: 'Excellent work! Very professional and completed the job ahead of schedule. The quality exceeded my expectations and the workspace was left spotless. Would definitely recommend and use again for future projects.',
      date: '2025-01-25',
      relativeDate: '2 weeks ago',
      helpful: 12,
      responded: true,
      response: 'Thank you so much for the kind words! It was a pleasure working on your kitchen.',
      responseDate: '2025-01-26',
      photos: ['/uploads/kitchen-1.jpg', '/uploads/kitchen-2.jpg'],
    },
    {
      id: 'REV-002',
      jobId: 'JOB-129',
      jobTitle: 'Boiler servicing',
      client: 'Michael Brown',
      clientAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael',
      rating: 5,
      comment: 'Thorough and knowledgeable. Explained everything clearly and provided useful maintenance tips. Very satisfied with the service.',
      date: '2025-01-20',
      relativeDate: '3 weeks ago',
      helpful: 8,
      responded: false,
    },
    {
      id: 'REV-003',
      jobId: 'JOB-130',
      jobTitle: 'Bathroom renovation',
      client: 'Emma Wilson',
      clientAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma',
      rating: 4,
      comment: 'Great quality work overall. Only minor issue was a slight delay in completion, but the end result was worth the wait. The attention to detail was impressive.',
      date: '2025-01-15',
      relativeDate: '1 month ago',
      helpful: 5,
      responded: true,
      response: 'Thank you for your feedback. I apologize for the delay - we encountered an unexpected issue with the pipework. Glad you\'re happy with the final result!',
      responseDate: '2025-01-16',
      photos: ['/uploads/bathroom-1.jpg'],
    },
    {
      id: 'REV-004',
      jobId: 'JOB-131',
      jobTitle: 'Emergency leak repair',
      client: 'David Lee',
      clientAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
      rating: 5,
      comment: 'Responded quickly to our emergency. Fixed the leak efficiently and cleaned up thoroughly. Highly recommend for emergency services.',
      date: '2025-01-10',
      relativeDate: '1 month ago',
      helpful: 15,
      responded: true,
      response: 'Happy to help! Emergency repairs are our priority.',
      responseDate: '2025-01-11',
    },
    {
      id: 'REV-005',
      jobId: 'JOB-132',
      jobTitle: 'Heating system inspection',
      client: 'Lisa Anderson',
      clientAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa',
      rating: 3,
      comment: 'Job was completed but felt rushed. Would have appreciated more detailed explanation of findings and recommendations.',
      date: '2025-01-05',
      relativeDate: '2 months ago',
      helpful: 3,
      responded: false,
    },
  ];

  const reviewStats = {
    averageRating: 4.4,
    totalReviews: reviews.length,
    responseRate: (reviews.filter((r) => r.responded).length / reviews.length) * 100,
    helpfulVotes: reviews.reduce((sum, r) => sum + r.helpful, 0),
  };

  const ratingDistribution = [
    { stars: 5, count: reviews.filter((r) => r.rating === 5).length },
    { stars: 4, count: reviews.filter((r) => r.rating === 4).length },
    { stars: 3, count: reviews.filter((r) => r.rating === 3).length },
    { stars: 2, count: reviews.filter((r) => r.rating === 2).length },
    { stars: 1, count: reviews.filter((r) => r.rating === 1).length },
  ];

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const matchesRating = selectedRating === 'all' || review.rating.toString() === selectedRating;
      const matchesSearch =
        searchQuery === '' ||
        review.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRating && matchesSearch;
    });
  }, [reviews, selectedRating, searchQuery]);

  const handleSubmitResponse = (reviewId: string) => {
    if (!responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }
    toast.success('Response submitted successfully!');
    setShowResponseForm(null);
    setResponseText('');
  };

  const handleReport = (reviewId: string) => {
    toast.success('Review reported for moderation');
  };

  return (
    <div className="min-h-0 bg-gray-50">
      {/* Hero Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-white border-b border-gray-200"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Reviews & Ratings</h1>

          {/* Overall Rating Summary - Airbnb Style */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Big Rating */}
            <div className="flex flex-col justify-center">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-6xl font-bold text-gray-900">
                  {reviewStats.averageRating.toFixed(1)}
                </span>
                <Star className="w-10 h-10 fill-amber-400 text-amber-400" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 ${
                      star <= Math.round(reviewStats.averageRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-gray-600 text-lg">
                {reviewStats.totalReviews} reviews
              </p>
            </div>

            {/* Right: Rating Bars */}
            <div className="space-y-3">
              {ratingDistribution.map((item) => {
                const percentage = reviewStats.totalReviews > 0
                  ? (item.count / reviewStats.totalReviews) * 100
                  : 0;
                return (
                  <div key={item.stars} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-12">{item.stars} star</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Filter Tabs - Airbnb Style */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setSelectedRating('all')}
              className={`px-4 py-2 rounded-full border transition-all whitespace-nowrap ${
                selectedRating === 'all'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
              }`}
            >
              All
            </button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => setSelectedRating(rating.toString())}
                className={`px-4 py-2 rounded-full border transition-all flex items-center gap-1 whitespace-nowrap ${
                  selectedRating === rating.toString()
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
                }`}
              >
                <span>{rating}</span>
                <Star className="w-4 h-4 fill-current" />
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </MotionDiv>

        {/* Reviews List - Airbnb Style */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {filteredReviews.map((review) => (
            <MotionDiv
              key={review.id}
              variants={staggerItem}
              className="pb-8 border-b border-gray-200 last:border-0"
            >
              {/* Review Header */}
              <div className="flex items-start gap-4 mb-4">
                <img
                  src={review.clientAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.client}`}
                  alt={review.client}
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{review.client}</h3>
                      <p className="text-sm text-gray-500">{review.relativeDate}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Badge */}
              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm font-medium">
                  <Briefcase className="w-3.5 h-3.5" />
                  {review.jobTitle}
                </span>
              </div>

              {/* Rating Stars */}
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= review.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>

              {/* Review Comment */}
              <p className="text-gray-700 leading-relaxed mb-4">{review.comment}</p>

              {/* Photos if available */}
              {review.photos && review.photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {review.photos.map((photo, idx) => (
                    <div key={idx} className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative">
                      {photo ? (
                        <Image
                          src={photo}
                          alt={`Review photo ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Contractor Response - Indented */}
              {review.responded && review.response && (
                <div className="ml-16 mt-4 p-4 bg-gray-50 rounded-lg border-l-2 border-teal-600">
                  <div className="flex items-start gap-3">
                    <Reply className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">Response from contractor</p>
                      <p className="text-gray-700 mb-2">{review.response}</p>
                      <p className="text-xs text-gray-500">{review.responseDate}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Response Form */}
              {showResponseForm === review.id && (
                <div className="ml-16 mt-4 p-4 bg-gray-50 rounded-lg">
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Write your response..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-3"
                  />
                  <div className="flex gap-2">
                    <MotionButton
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSubmitResponse(review.id)}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                    >
                      Post reply
                    </MotionButton>
                    <MotionButton
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowResponseForm(null)}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Cancel
                    </MotionButton>
                  </div>
                </div>
              )}

              {/* Actions */}
              {!review.responded && !showResponseForm && (
                <div className="mt-4">
                  <MotionButton
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowResponseForm(review.id)}
                    className="text-teal-600 font-semibold hover:underline flex items-center gap-2"
                  >
                    <Reply className="w-4 h-4" />
                    Reply
                  </MotionButton>
                </div>
              )}
            </MotionDiv>
          ))}
        </MotionDiv>

        {filteredReviews.length === 0 && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No reviews found</h3>
            <p className="text-gray-500">Try adjusting your filters or search query</p>
          </MotionDiv>
        )}

        {/* Pagination */}
        {filteredReviews.length > 0 && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                Previous
              </button>
              <button className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium">
                1
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                2
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
