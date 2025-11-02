import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    
    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contractor_id } = body;

    if (!contractor_id) {
      return NextResponse.json({ error: 'contractor_id is required' }, { status: 400 });
    }

    if (contractor_id === user.id) {
      return NextResponse.json({ error: 'You cannot follow yourself' }, { status: 400 });
    }

    // Verify contractor exists
    const { data: contractor, error: contractorError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', contractor_id)
      .eq('role', 'contractor')
      .single();

    if (contractorError || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Check if already following
    const { data: existingFollow, error: followCheckError } = await supabase
      .from('contractor_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', contractor_id)
      .single();

    if (followCheckError && followCheckError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is expected
      console.error('Error checking existing follow:', followCheckError);
      return NextResponse.json({ error: 'Failed to check follow status' }, { status: 500 });
    }

    if (existingFollow) {
      // Unfollow: delete the follow relationship
      const { error: deleteError } = await supabase
        .from('contractor_follows')
        .delete()
        .eq('id', existingFollow.id);

      if (deleteError) {
        console.error('Error unfollowing contractor:', deleteError);
        return NextResponse.json({ error: 'Failed to unfollow contractor' }, { status: 500 });
      }

      return NextResponse.json({ 
        following: false,
        message: 'Unfollowed successfully' 
      });
    } else {
      // Follow: create the follow relationship
      const { data: newFollow, error: insertError } = await supabase
        .from('contractor_follows')
        .insert({
          follower_id: user.id,
          following_id: contractor_id,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error following contractor:', insertError);
        return NextResponse.json({ error: 'Failed to follow contractor', details: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ 
        following: true,
        message: 'Followed successfully',
        follow: newFollow
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error in POST /api/contractor/follow:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

