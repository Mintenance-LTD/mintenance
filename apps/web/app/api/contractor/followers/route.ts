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
    const contractorId = searchParams.get('contractor_id') || user.id; // Default to current user
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get list of contractors following the specified contractor
    const { data: followers, error: followersError } = await supabase
      .from('contractor_follows')
      .select(`
        id,
        follower_id,
        created_at,
        contractor:follower_id (
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
      .eq('following_id', contractorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (followersError) {
      console.error('Error fetching followers list:', followersError);
      return NextResponse.json({ error: 'Failed to fetch followers list' }, { status: 500 });
    }

    const formattedFollowers = (followers || []).map((follow: any) => ({
      id: follow.id,
      contractor_id: follow.follower_id,
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
      followers: formattedFollowers,
      total: formattedFollowers.length,
      limit,
      offset 
    });
  } catch (error) {
    console.error('Error in GET /api/contractor/followers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

