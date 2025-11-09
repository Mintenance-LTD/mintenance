import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

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

    const searchParams = request.nextUrl.searchParams;
    const contractorId = searchParams.get('contractor_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // If contractor_id is provided, check if current user is following that contractor
    if (contractorId) {
      const { data: follow, error: followError } = await supabase
        .from('contractor_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', contractorId)
        .single();

      if (followError && followError.code !== 'PGRST116') {
        console.error('Error checking follow status:', followError);
        return NextResponse.json({ error: 'Failed to check follow status' }, { status: 500 });
      }

      return NextResponse.json({ 
        following: !!follow,
        contractor_id: contractorId
      });
    }

    // Otherwise, get list of contractors the user is following
    const { data: following, error: followingError } = await supabase
      .from('contractor_follows')
      .select(`
        id,
        following_id,
        created_at,
        contractor:following_id (
          id,
          first_name,
          last_name,
          profile_image_url,
          city,
          country,
          rating,
          total_jobs_completed
        )
      `)
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (followingError) {
      console.error('Error fetching following list:', followingError);
      return NextResponse.json({ error: 'Failed to fetch following list' }, { status: 500 });
    }

    const formattedFollowing = (following || []).map((follow: any) => ({
      id: follow.id,
      contractor_id: follow.following_id,
      created_at: follow.created_at,
      contractor: follow.contractor ? {
        id: follow.contractor.id,
        first_name: follow.contractor.first_name,
        last_name: follow.contractor.last_name,
        profile_image_url: follow.contractor.profile_image_url,
        city: follow.contractor.city,
        country: follow.contractor.country,
        rating: follow.contractor.rating,
        total_jobs_completed: follow.contractor.total_jobs_completed,
      } : null,
    }));

    return NextResponse.json({ 
      following: formattedFollowing,
      total: formattedFollowing.length,
      limit,
      offset 
    });
  } catch (error) {
    console.error('Error in GET /api/contractor/following:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

