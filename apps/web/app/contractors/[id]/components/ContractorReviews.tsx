'use client';

import { Star } from 'lucide-react';

interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  jobType: string;
  helpful: number;
  verified: boolean;
}

interface ContractorReviewsProps {
  rating: number;
  reviewCount: number;
  reviews: Review[];
}

export function ContractorReviews({
  rating,
  reviewCount,
  reviews,
}: ContractorReviewsProps) {
  const displayCount = reviews.length > 0 ? reviews.length : reviewCount;
  const displayLabel = displayCount === 1 ? 'review' : 'reviews';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          <Star className="w-6 h-6 fill-gray-900 text-gray-900 inline mr-2" />
          {rating.toFixed(1)} · {displayCount} {displayLabel}
        </h2>
      </div>
      {reviews.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {reviews.map((review) => (
            <div key={review.id} className="pb-6 border-b border-gray-200 last:border-0">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold">{review.author.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{review.author}</h4>
                      <p className="text-sm text-gray-500">
                        {new Date(review.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating ? 'fill-gray-900 text-gray-900' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{review.comment}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-gray-200 rounded-xl bg-gray-50">
          <p className="text-gray-600">No reviews yet</p>
        </div>
      )}
    </div>
  );
}
