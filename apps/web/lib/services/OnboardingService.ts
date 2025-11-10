import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, CACHE_DURATIONS } from '@/lib/cache';

export interface OnboardingStatus {
  completed: boolean;
  completedAt: string | null;
}

export class OnboardingService {
  /**
   * Check if user has completed onboarding
   */
  static async checkOnboardingStatus(userId: string): Promise<OnboardingStatus> {
    return unstable_cache(
      async () => {
        try {
          const { data, error } = await serverSupabase
            .from('users')
            .select('onboarding_completed, onboarding_completed_at')
            .eq('id', userId)
            .single();

          if (error) {
            logger.error('Error checking onboarding status', {
              service: 'onboarding',
              userId,
              error: error.message,
            });
            // Default to not completed if there's an error
            return { completed: false, completedAt: null };
          }

          return {
            completed: data?.onboarding_completed ?? false,
            completedAt: data?.onboarding_completed_at ?? null,
          };
        } catch (error) {
          logger.error('Unexpected error checking onboarding status', {
            service: 'onboarding',
            userId,
            error: error instanceof Error ? error.message : String(error),
          });
          return { completed: false, completedAt: null };
        }
      },
      [`onboarding-${userId}`],
      {
        tags: [CACHE_TAGS.USER_ONBOARDING],
        revalidate: CACHE_DURATIONS.SHORT, // 60 seconds
      }
    )();
  }

  /**
   * Mark onboarding as complete for a user
   */
  static async markOnboardingComplete(userId: string): Promise<boolean> {
    try {
      const { error } = await serverSupabase
        .from('users')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        logger.error('Error marking onboarding complete', {
          service: 'onboarding',
          userId,
          error: error.message,
        });
        return false;
      }

      logger.info('Onboarding marked as complete', {
        service: 'onboarding',
        userId,
      });

      return true;
    } catch (error) {
      logger.error('Unexpected error marking onboarding complete', {
        service: 'onboarding',
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

