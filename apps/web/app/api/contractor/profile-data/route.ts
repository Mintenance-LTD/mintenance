import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/contractor/profile-data
 * Fetch complete contractor profile with skills, reviews, jobs, and posts
 */
export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    // Fetch all contractor data in parallel
    const [contractorResult, skillsResult, reviewsResult, completedJobsResult, postsResult, contractorProfileResult] = await Promise.all([
      serverSupabase
        .from('profiles')
        .select('id, first_name, last_name, email, bio, city, country, profile_image_url, phone, company_name, license_number, insurance_expiry_date, is_available, latitude, longitude, address, postcode, created_at, updated_at')
        .eq('id', user.id)
        .single(),
      serverSupabase
        .from('contractor_skills')
        .select('skill_name')
        .eq('contractor_id', user.id),
      serverSupabase
        .from('reviews')
        .select(`*, reviewer:reviewer_id (first_name, last_name, profile_image_url), job:job_id (title, category)`)
        .eq('contractor_id', user.id)
        .order('created_at', { ascending: false }),
      serverSupabase
        .from('jobs')
        .select('*, photos')
        .eq('contractor_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20),
      serverSupabase
        .from('contractor_posts')
        .select('id, contractor_id, post_type, title, content, media_urls, likes_count, comments_count, shares_count, views_count, created_at, updated_at')
        .eq('contractor_id', user.id)
        .eq('post_type', 'work_showcase')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20),
      serverSupabase
        .from('contractor_profiles')
        .select('hourly_rate')
        .eq('id', user.id)
        .single(),
    ]);

    const contractor = contractorResult.data;
    const skills = skillsResult.data;
    const reviews = reviewsResult.data;
    const completedJobs = completedJobsResult.data;
    const posts = postsResult.data;
    const contractorProfile = contractorProfileResult.data;

    // Calculate profile completion
    const profileFields = [
      contractor?.first_name,
      contractor?.last_name,
      contractor?.bio,
      contractor?.city,
      contractor?.profile_image_url,
      contractor?.phone,
      contractor?.company_name,
      contractor?.address,
      skills && skills.length > 0,
    ];

    const completedFields = profileFields.filter(Boolean).length;
    const profileCompletion = Math.round((completedFields / profileFields.length) * 100);

    const averageRating = reviews && reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    return NextResponse.json({
      contractor: {
        ...contractor,
        hourly_rate: contractorProfile?.hourly_rate ?? null,
      },
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
  }
);
