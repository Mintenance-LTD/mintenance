import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';

// Type definitions for testimonials
interface ReviewJob {
  id: string;
  title: string;
  category: string;
  budget: number | null;
}

interface ReviewRecord {
  id: string;
  rating: number;
  review_text: string | null;
  title: string | null;
  is_featured: boolean;
  is_verified: boolean;
  created_at: string;
  job_id: string;
  reviewer_id: string;
  jobs: ReviewJob | ReviewJob[] | null;
}

interface ReviewerRecord {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get avatar emoji based on name (simple hash-based selection)
 */
function getAvatarEmoji(name: string): string {
  const avatars = ['👩‍💼', '👨‍💻', '👩‍🎨', '👨‍🔧', '👩‍🏫', '👨‍💼', '👩‍⚕️', '👨‍🎓'];
  if (!name) return avatars[0];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatars[hash % avatars.length];
}

/**
 * GET /api/testimonials
 * Public endpoint - fetch featured testimonials for the landing page
 */
export const GET = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 30 } },
  async () => {
    // Fetch featured reviews
    let { data: reviews, error } = await serverSupabase
      .from('reviews')
      .select(`
        id, rating, review_text, title, is_featured, is_verified, created_at, job_id, reviewer_id,
        jobs!reviews_job_id_fkey (id, title, category, budget)
      `)
      .eq('is_visible', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(6);

    // Fallback to top-rated visible reviews
    if (!reviews || reviews.length === 0) {
      const { data: allReviews } = await serverSupabase
        .from('reviews')
        .select(`
          id, rating, review_text, title, is_featured, is_verified, created_at, job_id, reviewer_id,
          jobs!reviews_job_id_fkey (id, title, category, budget)
        `)
        .eq('is_visible', true)
        .order('rating', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);

      if (allReviews) {
        reviews = allReviews;
        error = null;
      }
    }

    if (error) {
      logger.error('Failed to fetch testimonials', error, { service: 'testimonials-api' });
      return NextResponse.json({ testimonials: [] });
    }

    // Fetch reviewer information
    const reviewerIds = [...new Set((reviews || []).map((r: ReviewRecord) => r.reviewer_id).filter(Boolean))];
    let reviewerMap = new Map<string, ReviewerRecord>();

    if (reviewerIds.length > 0) {
      const { data: reviewers, error: reviewerError } = await serverSupabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', reviewerIds);

      if (reviewerError) {
        logger.warn('Failed to fetch reviewer information', { service: 'testimonials-api', error: reviewerError });
      } else {
        reviewerMap = new Map((reviewers || []).map((r: ReviewerRecord) => [r.id, r]));
      }
    }

    // Transform reviews to testimonial format
    const testimonials = (reviews || []).map((review: ReviewRecord) => {
      const reviewer = reviewerMap.get(review.reviewer_id) || ({} as ReviewerRecord);
      const job = Array.isArray(review.jobs) ? review.jobs[0] : review.jobs || ({} as ReviewJob);

      const savings = job.budget
        ? `£${Math.round(Number(job.budget) * 0.15)}`
        : 'Contact for quote';

      const location = reviewer.email?.split('@')[1]?.includes('co.uk')
        ? 'UK'
        : 'London';

      return {
        id: review.id,
        name: `${reviewer.first_name || ''} ${reviewer.last_name || ''}`.trim() || 'Anonymous',
        location,
        role: 'Homeowner',
        rating: review.rating || 5,
        text: review.review_text || review.title || 'Great service!',
        project: job.title || job.category || 'Home Improvement',
        savings,
        avatar: getAvatarEmoji(reviewer.first_name || ''),
        verified: review.is_verified || false,
        createdAt: review.created_at,
      };
    });

    return NextResponse.json({ testimonials });
  }
);
