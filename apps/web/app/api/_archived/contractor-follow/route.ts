import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError, NotFoundError, InternalServerError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

const followSchema = z.object({
  contractor_id: z.string().uuid('contractor_id must be a valid UUID'),
});

/**
 * POST /api/contractor/follow
 * Toggle follow/unfollow another contractor
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, followSchema);
    if (validation instanceof NextResponse) return validation;
    const { data } = validation;
    const { contractor_id } = data;

    if (contractor_id === user.id) {
      throw new BadRequestError('You cannot follow yourself');
    }

    // Verify contractor exists
    const { data: contractor, error: contractorError } = await serverSupabase
      .from('profiles')
      .select('id, role')
      .eq('id', contractor_id)
      .eq('role', 'contractor')
      .single();

    if (contractorError || !contractor) {
      throw new NotFoundError('Contractor not found');
    }

    // Check if already following
    const { data: existingFollow, error: followCheckError } = await serverSupabase
      .from('contractor_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', contractor_id)
      .single();

    if (followCheckError && followCheckError.code !== 'PGRST116') {
      logger.error('Error checking existing follow', followCheckError, {
        service: 'contractor_follow',
        userId: user.id,
        contractorId: contractor_id,
      });
      throw new InternalServerError('Failed to check follow status');
    }

    if (existingFollow) {
      // Unfollow: delete the follow relationship
      const { error: deleteError } = await serverSupabase
        .from('contractor_follows')
        .delete()
        .eq('id', existingFollow.id);

      if (deleteError) {
        logger.error('Error unfollowing contractor', deleteError, {
          service: 'contractor_follow',
          userId: user.id,
          contractorId: contractor_id,
        });
        throw new InternalServerError('Failed to unfollow contractor');
      }

      return NextResponse.json({
        following: false,
        message: 'Unfollowed successfully'
      });
    } else {
      // Follow: create the follow relationship
      const { data: newFollow, error: insertError } = await serverSupabase
        .from('contractor_follows')
        .insert({
          follower_id: user.id,
          following_id: contractor_id,
        })
        .select()
        .single();

      if (insertError) {
        logger.error('Error following contractor', insertError, {
          service: 'contractor_follow',
          userId: user.id,
          contractorId: contractor_id,
        });
        throw new InternalServerError('Failed to follow contractor');
      }

      return NextResponse.json({
        following: true,
        message: 'Followed successfully',
        follow: newFollow
      }, { status: 201 });
    }
  }
);
