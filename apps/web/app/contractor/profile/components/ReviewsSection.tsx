'use client';
import { Star, User, Briefcase, Calendar } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { staggerItem } from '@/lib/animations/variants';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
export interface ContractorReview {
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
interface ReviewsSectionProps {
  reviews: ContractorReview[];
  averageRating: number;
  totalReviews: number;
}
export function ReviewsSection({ reviews, averageRating, totalReviews }: ReviewsSectionProps) {
  const ratingDistribution = calculateRatingDistribution(reviews);
  return (
    <MotionDiv
      variants={staggerItem}
      className="bg-white rounded-xl shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Customer Reviews</h2>
        <span className="text-sm text-gray-500">{totalReviews} reviews</span>
      </div>
      {reviews.length > 0 ? (
        <>
          {/* Rating Overview */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Average Rating */}
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {averageRating.toFixed(1)}
                  </span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-6 w-6 ${
                          star <= Math.round(averageRating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}
                </p>
              </div>
              {/* Rating Distribution */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 w-3">{rating}</span>
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(ratingDistribution?.[rating] / totalReviews) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-10 text-right">
                      {ratingDistribution[rating]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Individual Reviews */}
          <div className="space-y-6">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
          {reviews.length >= 5 && (
            <button className="mt-6 w-full py-2 text-center text-indigo-600 hover:text-indigo-700 font-medium">
              View all reviews
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No reviews yet
          </h3>
          <p className="text-gray-600">
            Complete your first job to start receiving reviews
          </p>
        </div>
      )}
    </MotionDiv>
  );
}
function ReviewCard({ review }: { review: ContractorReview }) {
  const reviewerName = review.reviewer
    ? `${review.reviewer.first_name || ''} ${review.reviewer.last_name || ''}`.trim()
    : review.reviewer_name || 'Anonymous';
  return (
    <div className="border-b border-gray-200 last:border-0 pb-6 last:pb-0">
      <div className="flex items-start space-x-4">
        {/* Reviewer Avatar */}
        <div className="flex-shrink-0">
          {review.reviewer?.profile_image_url ? (
            <Image
              src={review.reviewer.profile_image_url}
              alt={reviewerName}
              width={48}
              height={48}
              className="rounded-full"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-gray-500" />
            </div>
          )}
        </div>
        {/* Review Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-medium text-gray-900">{reviewerName}</h4>
              <div className="flex items-center space-x-3 mt-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= review.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(review.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          </div>
          {review.job && (
            <div className="flex items-center space-x-2 mb-3 text-sm text-gray-600">
              <Briefcase className="h-4 w-4" />
              <span>{review.job.title || 'Job'}</span>
            </div>
          )}
          <p className="text-gray-700 leading-relaxed">{review.comment}</p>
        </div>
      </div>
    </div>
  );
}
function calculateRatingDistribution(reviews: ContractorReview[]) {
  const distribution: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  reviews.forEach((review) => {
    if (review.rating >= 1 && review.rating <= 5) {
      const rating = Math.round(review.rating);
      distribution[rating] += 1;
    }
  });
  return distribution;
}