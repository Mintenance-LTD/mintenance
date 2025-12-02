'use client';

import React, { useState, useMemo } from 'react';
import { AreaChart, DonutChart } from '@tremor/react';
import {
  Star,
  MessageSquare,
  TrendingUp,
  ThumbsUp,
  Filter,
  Search,
  Calendar,
  User,
  Briefcase,
  Flag,
  Eye,
  Reply,
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
  rating: number;
  comment: string;
  date: string;
  helpful: number;
  responded: boolean;
  response?: string;
  responseDate?: string;
  categories: {
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

  // Mock data - replace with actual API calls
  const reviews: Review[] = [
    {
      id: 'REV-001',
      jobId: 'JOB-128',
      jobTitle: 'Kitchen sink replacement',
      client: 'Sarah Johnson',
      rating: 5,
      comment: 'Excellent work! Very professional and completed the job ahead of schedule. Would definitely recommend and use again.',
      date: '2025-01-25',
      helpful: 12,
      responded: true,
      response: 'Thank you so much for the kind words! It was a pleasure working on your kitchen.',
      responseDate: '2025-01-26',
      categories: {
        quality: 5,
        communication: 5,
        timeliness: 5,
        professionalism: 5,
      },
    },
    {
      id: 'REV-002',
      jobId: 'JOB-129',
      jobTitle: 'Boiler servicing',
      client: 'Michael Brown',
      rating: 5,
      comment: 'Thorough and knowledgeable. Explained everything clearly and provided useful maintenance tips.',
      date: '2025-01-20',
      helpful: 8,
      responded: false,
      categories: {
        quality: 5,
        communication: 5,
        timeliness: 5,
        professionalism: 5,
      },
    },
    {
      id: 'REV-003',
      jobId: 'JOB-130',
      jobTitle: 'Bathroom renovation',
      client: 'Emma Wilson',
      rating: 4,
      comment: 'Great quality work overall. Only minor issue was a slight delay in completion, but the end result was worth it.',
      date: '2025-01-15',
      helpful: 5,
      responded: true,
      response: 'Thank you for your feedback. I apologize for the delay - we encountered an unexpected issue with the pipework. Glad you\'re happy with the final result!',
      responseDate: '2025-01-16',
      categories: {
        quality: 5,
        communication: 4,
        timeliness: 3,
        professionalism: 5,
      },
    },
    {
      id: 'REV-004',
      jobId: 'JOB-131',
      jobTitle: 'Emergency leak repair',
      client: 'David Lee',
      rating: 5,
      comment: 'Responded quickly to our emergency. Fixed the leak efficiently and cleaned up thoroughly.',
      date: '2025-01-10',
      helpful: 15,
      responded: true,
      response: 'Happy to help! Emergency repairs are our priority.',
      responseDate: '2025-01-11',
      categories: {
        quality: 5,
        communication: 5,
        timeliness: 5,
        professionalism: 5,
      },
    },
    {
      id: 'REV-005',
      jobId: 'JOB-132',
      jobTitle: 'Heating system inspection',
      client: 'Lisa Anderson',
      rating: 3,
      comment: 'Job was completed but felt rushed. Would have appreciated more detailed explanation of findings.',
      date: '2025-01-05',
      helpful: 3,
      responded: false,
      categories: {
        quality: 4,
        communication: 2,
        timeliness: 4,
        professionalism: 3,
      },
    },
  ];

  const reviewStats = {
    averageRating: 4.4,
    totalReviews: reviews.length,
    responseRate: (reviews.filter((r) => r.responded).length / reviews.length) * 100,
    helpfulVotes: reviews.reduce((sum, r) => sum + r.helpful, 0),
  };

  const ratingDistribution = [
    { rating: '5 Star', count: reviews.filter((r) => r.rating === 5).length },
    { rating: '4 Star', count: reviews.filter((r) => r.rating === 4).length },
    { rating: '3 Star', count: reviews.filter((r) => r.rating === 3).length },
    { rating: '2 Star', count: reviews.filter((r) => r.rating === 2).length },
    { rating: '1 Star', count: reviews.filter((r) => r.rating === 1).length },
  ];

  const reviewsByMonth = [
    { month: 'Jul', reviews: 12, avgRating: 4.5 },
    { month: 'Aug', reviews: 15, avgRating: 4.3 },
    { month: 'Sep', reviews: 18, avgRating: 4.6 },
    { month: 'Oct', reviews: 14, avgRating: 4.4 },
    { month: 'Nov', reviews: 16, avgRating: 4.5 },
    { month: 'Dec', reviews: 20, avgRating: 4.7 },
    { month: 'Jan', reviews: 5, avgRating: 4.4 },
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      {/* Hero Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-emerald-600 via-amber-600 to-emerald-700 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <Star className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">Reviews & Ratings</h1>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.round(reviewStats.averageRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-emerald-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-2xl font-bold">{reviewStats.averageRating.toFixed(1)}</span>
                    <span className="text-emerald-100">({reviewStats.totalReviews} reviews)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <MotionDiv
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-200" />
                <p className="text-emerald-100 text-sm">Avg Rating</p>
              </div>
              <p className="text-3xl font-bold">{reviewStats.averageRating.toFixed(1)}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-emerald-200" />
                <p className="text-emerald-100 text-sm">Total Reviews</p>
              </div>
              <p className="text-3xl font-bold">{reviewStats.totalReviews}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Reply className="w-5 h-5 text-emerald-200" />
                <p className="text-emerald-100 text-sm">Response Rate</p>
              </div>
              <p className="text-3xl font-bold">{reviewStats.responseRate.toFixed(0)}%</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp className="w-5 h-5 text-emerald-200" />
                <p className="text-emerald-100 text-sm">Helpful Votes</p>
              </div>
              <p className="text-3xl font-bold">{reviewStats.helpfulVotes}</p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Reviews Trend */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Reviews Over Time</h2>
            <AreaChart
              data={reviewsByMonth}
              index="month"
              categories={['reviews']}
              colors={['orange']}
              valueFormatter={(value) => value.toString()}
              showAnimation={true}
              showLegend={false}
              showGridLines={true}
              className="h-64"
            />
          </MotionDiv>

          {/* Rating Distribution */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Rating Distribution</h2>
            <DonutChart
              data={ratingDistribution}
              category="count"
              index="rating"
              colors={['orange', 'amber', 'yellow', 'lime', 'emerald']}
              valueFormatter={(value) => value.toString()}
              showAnimation={true}
              className="h-64"
            />
          </MotionDiv>
        </div>

        {/* Filters */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>

            <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
              <Filter className="w-5 h-5" />
              More Filters
            </button>
          </div>
        </MotionDiv>

        {/* Reviews List */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {filteredReviews.map((review) => (
            <MotionDiv
              key={review.id}
              variants={staggerItem}
              whileHover={{ y: -2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
            >
              {/* Review Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-100 p-3 rounded-full">
                    <User className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{review.client}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Briefcase className="w-4 h-4" />
                      <span>{review.jobTitle}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>{review.date}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">{review.rating}.0</p>
                </div>
              </div>

              {/* Review Comment */}
              <p className="text-gray-700 mb-4">{review.comment}</p>

              {/* Category Ratings */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Quality</p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < review.categories.quality
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Communication</p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < review.categories.communication
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Timeliness</p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < review.categories.timeliness
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Professionalism</p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < review.categories.professionalism
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Contractor Response */}
              {review.responded && review.response && (
                <div className="mt-4 p-4 bg-emerald-50 border-l-4 border-emerald-600 rounded">
                  <div className="flex items-start gap-3">
                    <Reply className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">Your Response</p>
                      <p className="text-gray-700 mb-2">{review.response}</p>
                      <p className="text-xs text-gray-500">Responded on {review.responseDate}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Response Form */}
              {showResponseForm === review.id && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Write your response..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-3"
                  />
                  <div className="flex gap-2">
                    <MotionButton
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSubmitResponse(review.id)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Submit Response
                    </MotionButton>
                    <MotionButton
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowResponseForm(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </MotionButton>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{review.helpful} found this helpful</span>
                </div>

                <div className="flex gap-2">
                  {!review.responded && (
                    <MotionButton
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowResponseForm(review.id)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    >
                      <Reply className="w-4 h-4" />
                      Respond
                    </MotionButton>
                  )}
                  <MotionButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleReport(review.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Report"
                  >
                    <Flag className="w-4 h-4" />
                  </MotionButton>
                </div>
              </div>
            </MotionDiv>
          ))}
        </MotionDiv>

        {filteredReviews.length === 0 && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center"
          >
            <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No reviews found</h3>
            <p className="text-gray-500">Try adjusting your filters or search query</p>
          </MotionDiv>
        )}
      </div>
    </div>
  );
}
