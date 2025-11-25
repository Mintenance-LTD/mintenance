import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch contractor data
    const { data: contractor } = await supabase
      .from('users')
      .select('*')
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
      .select('*')
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
    logger.error('Error fetching profile data', error, {
      service: 'contractor_profile',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
