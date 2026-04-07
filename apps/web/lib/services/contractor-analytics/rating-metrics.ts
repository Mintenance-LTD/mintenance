import { serverSupabase } from '@/lib/api/supabaseServer';
import type { ReviewRow } from './types';

export async function getRatingMetrics(contractorId: string) {
  const { data: reviews, error } = await serverSupabase
    .from('reviews')
    .select('rating, comment, created_at')
    .eq('reviewee_id', contractorId)
    .returns<ReviewRow[]>();

  if (error) throw error;

  const reviewRows = reviews ?? [];
  const totalReviews = reviewRows.length;
  const averageRating =
    totalReviews > 0
      ? reviewRows.reduce((sum, review) => sum + review.rating, 0) /
        totalReviews
      : 0;

  const ratingDistribution = {
    5: reviewRows.filter((review) => review.rating === 5).length,
    4: reviewRows.filter((review) => review.rating === 4).length,
    3: reviewRows.filter((review) => review.rating === 3).length,
    2: reviewRows.filter((review) => review.rating === 2).length,
    1: reviewRows.filter((review) => review.rating === 1).length,
  };

  return {
    averageRating,
    totalReviews,
    ratingDistribution,
  };
}
