import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Authentication required. Only contractors can access profile data');
    }

    // Fetch contractor data
    const { data: contractor } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, bio, city, country, profile_image_url, phone, company_name, license_number, insurance_expiry, created_at, updated_at')
      .eq('id', user.id)
      .single();

    // Fetch contractor skills
    const { data: skills } = await supabase
      .from('contractor_skills')
      .select('skill_name')
      .eq('contractor_id', user.id);

    // Fetch reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:reviewer_id (
          first_name,
          last_name,
          profile_image_url
        ),
        job:job_id (
          title,
          category
        )
      `)
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch completed jobs
    const { data: completedJobs } = await supabase
      .from('jobs')
      .select('*, photos')
      .eq('contractor_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(20);

    // Fetch contractor posts
    const { data: posts } = await supabase
      .from('contractor_posts')
      .select('id, contractor_id, post_type, title, content, media_urls, likes_count, comments_count, shares_count, views_count, created_at, updated_at')
      .eq('contractor_id', user.id)
      .eq('post_type', 'work_showcase')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);

    // Calculate profile completion
    const profileFields = [
      contractor?.first_name,
      contractor?.last_name,
      contractor?.bio,
      contractor?.city,
      contractor?.country,
      contractor?.profile_image_url,
      skills && skills.length > 0,
    ];

    const completedFields = profileFields.filter(Boolean).length;
    const profileCompletion = Math.round((completedFields / profileFields.length) * 100);

    // Calculate average rating
    const averageRating = reviews && reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    return NextResponse.json({
      contractor,
      skills: skills || [],
      reviews: reviews || [],
      completedJobs: completedJobs || [],
      posts: posts || [],
      metrics: {
        profileCompletion,
        averageRating,
        totalReviews: reviews?.length ?? 0,
        jobsCompleted: completedJobs?.length ?? 0,
      },
    });

  } catch (error) {
    return handleAPIError(error);
  }
}
