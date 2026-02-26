'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Star,
  Search,
  Briefcase,
  Reply,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Review {
  id: string;
  jobId: string;
  jobTitle: string;
  jobCategory: string;
  client: string;
  clientAvatar: string | null;
  rating: number;
  comment: string;
  response: string | null;
  responded: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  responseRate: number;
}

export default function ContractorReviewsPage() {
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResponseForm, setShowResponseForm] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ totalReviews: 0, averageRating: 0, responseRate: 0 });
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/contractor/reviews', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch reviews');
      const data = await res.json();
      setReviews(data.reviews || []);
      setStats(data.stats || { totalReviews: 0, averageRating: 0, responseRate: 0 });
    } catch (error) {
      logger.error('Error fetching reviews:', error, { service: 'app' });
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const ratingDistribution = useMemo(() => {
    return [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: reviews.filter((r) => r.rating === stars).length,
    }));
  }, [reviews]);

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

  const handleSubmitResponse = async (reviewId: string) => {
    if (!responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }
    setSubmittingResponse(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch('/api/contractor/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({ reviewId, response: responseText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit response');
      }
      // Update local state
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, response: responseText.trim(), responded: true } : r
        )
      );
      setStats((prev) => ({
        ...prev,
        responseRate: Math.round(
          ((reviews.filter((r) => r.responded).length + 1) / reviews.length) * 100
        ),
      }));
      toast.success('Response posted');
      setShowResponseForm(null);
      setResponseText('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit response');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="min-h-0 bg-gray-50 flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-0 bg-gray-50">
      {/* Hero Header */}
      <MotionDiv initial="hidden" animate="visible" variants={fadeIn} className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Reviews & Ratings</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col justify-center">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-6xl font-bold text-gray-900">
                  {stats.averageRating.toFixed(1)}
                </span>
                <Star className="w-10 h-10 fill-amber-400 text-amber-400" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 ${
                      star <= Math.round(stats.averageRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-gray-600 text-lg">{stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}</p>
            </div>

            <div className="space-y-3">
              {ratingDistribution.map((item) => {
                const percentage = stats.totalReviews > 0 ? (item.count / stats.totalReviews) * 100 : 0;
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
        {/* Filter Tabs */}
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

        {/* Reviews List */}
        <MotionDiv variants={staggerContainer} initial="hidden" animate="visible" className="space-y-8">
          {filteredReviews.map((review) => (
            <MotionDiv key={review.id} variants={staggerItem} className="pb-8 border-b border-gray-200 last:border-0">
              {/* Review Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg flex-shrink-0">
                  {review.client.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{review.client}</h3>
                  <p className="text-sm text-gray-500">{formatRelativeDate(review.createdAt)}</p>
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
                      star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>

              {/* Comment */}
              <p className="text-gray-700 leading-relaxed mb-4">{review.comment}</p>

              {/* Contractor Response */}
              {review.responded && review.response && (
                <div className="ml-16 mt-4 p-4 bg-gray-50 rounded-lg border-l-2 border-teal-600">
                  <div className="flex items-start gap-3">
                    <Reply className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">Response from contractor</p>
                      <p className="text-gray-700">{review.response}</p>
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
                      disabled={submittingResponse}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      {submittingResponse && <Loader2 className="w-4 h-4 animate-spin" />}
                      Post reply
                    </MotionButton>
                    <MotionButton
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setShowResponseForm(null); setResponseText(''); }}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Cancel
                    </MotionButton>
                  </div>
                </div>
              )}

              {/* Reply button for unresponded reviews */}
              {!review.responded && showResponseForm !== review.id && (
                <div className="mt-4">
                  <MotionButton
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setShowResponseForm(review.id); setResponseText(''); }}
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

        {filteredReviews.length === 0 && !loading && (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No reviews found</h3>
            <p className="text-gray-500">
              {reviews.length === 0
                ? 'Complete jobs to receive reviews from homeowners'
                : 'Try adjusting your filters or search query'}
            </p>
          </MotionDiv>
        )}
      </div>
    </div>
  );
}
