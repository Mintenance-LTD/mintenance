import { supabase } from '../../config/supabase';
import { User } from '@mintenance/types';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { DatabaseUserRow, DatabaseReviewRow, UserProfile } from './types';

/**
 * Get user profile by ID with additional contractor data
 */
export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select(
        `
          id, role, first_name, last_name, bio, city, country, profile_image_url, avatar_url, rating, total_jobs_completed, verified, admin_verified, skills, is_available, company_name, hourly_rate, years_experience, portfolio_images, created_at,
          contractor_skills (
            skill_name
          )
        `
      )
      .eq('id', userId)
      .single();

    if (error) throw error;

    const typedUser = user as DatabaseUserRow;

    // Get reviews for this user if they're a contractor
    let reviews;
    if (typedUser.role === 'contractor') {
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .select(
          `
            rating,
            comment,
            created_at,
            reviewer:reviewer_id (
              first_name,
              last_name
            )
          `
        )
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!reviewError) {
        const typedReviewData = (reviewData || []) as DatabaseReviewRow[];
        reviews = typedReviewData.map((review) => ({
          rating: review.rating,
          comment: review.comment,
          reviewer:
            `${review.reviewer?.first_name || ''} ${review.reviewer?.last_name || ''}`.trim(),
          createdAt: review.created_at,
        }));
      }
    }

    return {
      id: typedUser.id,
      email: typedUser.email || '', // omitted on cross-user reads (PII)
      first_name: typedUser.first_name,
      last_name: typedUser.last_name,
      role: typedUser.role,
      phone: typedUser.phone, // omitted on cross-user reads (PII)
      bio: typedUser.bio,
      profile_image_url: typedUser.profile_image_url,
      created_at: typedUser.created_at,
      updated_at: typedUser.updated_at || typedUser.created_at,
      skills: typedUser.contractor_skills?.map((s) => ({
        skillName: s.skill_name,
      })),
      reviews,
    };
  } catch (error) {
    const errorInstance =
      error instanceof Error ? error : new Error(String(error));
    logger.error('Error fetching user profile:', errorInstance);
    return null;
  }
}

/**
 * Get homeowner profile data for job cards
 */
export async function getHomeownerForJob(homeownerId: string): Promise<{
  name: string;
  rating: number;
  reviewCount: number;
  memberSince: string;
} | null> {
  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('first_name, last_name, created_at, rating')
      .eq('id', homeownerId)
      .single();

    if (error) throw error;

    // Get review count for this homeowner
    const { count: reviewCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('reviewer_id', homeownerId);

    return {
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
      rating: user.rating || 0,
      reviewCount: reviewCount || 0,
      memberSince: new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      }),
    };
  } catch (error) {
    const errorInstance =
      error instanceof Error ? error : new Error(String(error));
    logger.error('Error fetching homeowner data:', errorInstance);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  _userId: string,
  updates: Partial<User>
): Promise<boolean> {
  try {
    // Identity is derived server-side from the auth token; do not send a userId.
    // profile_image_url is intentionally omitted (avatars use the dedicated endpoint).
    await mobileApiClient.put('/api/users/profile', {
      first_name: updates.first_name || updates.firstName,
      last_name: updates.last_name || updates.lastName,
      phone: updates.phone,
      bio: updates.bio,
      location: updates.location,
    });

    return true;
  } catch (error) {
    const errorInstance =
      error instanceof Error ? error : new Error(String(error));
    logger.error('Error updating user profile:', errorInstance);
    return false;
  }
}
