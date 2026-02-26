import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/contractor/followers - list contractors following the specified contractor.
 */
export const GET = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user }) => {
    const searchParams = request.nextUrl.searchParams;
    const contractorId = searchParams.get('contractor_id') || user.id;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { data: followers, error: followersError } = await serverSupabase
      .from('contractor_follows')
      .select(`
        id,
        follower_id,
        created_at,
        contractor:follower_id (
          id, first_name, last_name, profile_image_url,
          city, country, rating, total_jobs_completed
        )
      `)
      .eq('following_id', contractorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (followersError) {
      logger.error('Error fetching followers list', followersError, {
        service: 'contractor_followers',
        userId: user.id,
        contractorId,
      });
      throw new InternalServerError('Failed to fetch followers list');
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
      follower_id: string;
      created_at: string;
      contractor?: ContractorData | ContractorData[] | null;
    }

    const formattedFollowers = (followers || []).map((follow: FollowData) => {
      const contractor = Array.isArray(follow.contractor) ? follow.contractor[0] : follow.contractor;
      return {
        id: follow.id,
        contractor_id: follow.follower_id,
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
      followers: formattedFollowers,
      total: formattedFollowers.length,
      limit,
      offset,
    });
  },
);
