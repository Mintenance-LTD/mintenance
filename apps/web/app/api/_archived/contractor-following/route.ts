import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/contractor/following - list contractors the user follows (or check follow status).
 */
export const GET = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user }) => {
    const searchParams = request.nextUrl.searchParams;
    const contractorId = searchParams.get('contractor_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // If contractor_id provided, check if currently following
    if (contractorId) {
      const { data: follow, error: followError } = await serverSupabase
        .from('contractor_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', contractorId)
        .single();

      if (followError && followError.code !== 'PGRST116') {
        logger.error('Error checking follow status', followError, {
          service: 'contractor_following',
          userId: user.id,
          contractorId,
        });
        throw new InternalServerError('Failed to check follow status');
      }

      return NextResponse.json({ following: !!follow, contractor_id: contractorId });
    }

    // Get list of contractors user is following
    const { data: following, error: followingError } = await serverSupabase
      .from('contractor_follows')
      .select(`
        id,
        following_id,
        created_at,
        contractor:following_id (
          id, first_name, last_name, profile_image_url,
          city, country, rating, total_jobs_completed
        )
      `)
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (followingError) {
      logger.error('Error fetching following list', followingError, {
        service: 'contractor_following',
        userId: user.id,
      });
      throw new InternalServerError('Failed to fetch following list');
    }

    interface ContractorData {
      id: string;
      first_name: string | null;
      last_name: string | null;
      profile_image_url: string | null;
      city: string | null;
      country: string | null;
      rating: number | null;
      total_jobs_completed: number | null;
    }

    interface FollowData {
      id: string;
      following_id: string;
      created_at: string;
      contractor?: ContractorData | ContractorData[] | null;
    }

    const formattedFollowing = (following || []).map((follow: FollowData) => {
      const contractor = Array.isArray(follow.contractor) ? follow.contractor[0] : follow.contractor;
      return {
        id: follow.id,
        contractor_id: follow.following_id,
        created_at: follow.created_at,
        contractor: contractor
          ? {
              id: contractor.id,
              first_name: contractor.first_name,
              last_name: contractor.last_name,
              profile_image_url: contractor.profile_image_url,
              city: contractor.city,
              country: contractor.country,
              rating: contractor.rating,
              total_jobs_completed: contractor.total_jobs_completed,
            }
          : null,
      };
    });

    return NextResponse.json({
      following: formattedFollowing,
      total: formattedFollowing.length,
      limit,
      offset,
    });
  },
);
