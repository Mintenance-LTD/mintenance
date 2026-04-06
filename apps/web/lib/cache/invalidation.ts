import { logger } from '@mintenance/shared';
import { CACHE_TAGS } from './config';

/**
 * Cache invalidation utilities
 */
export async function revalidateContractors() {
  try {
    const { revalidateTag } = await import('next/cache');
    (revalidateTag as (tag: string) => void)(CACHE_TAGS.CONTRACTORS);
  } catch (error) {
    logger.error('Error revalidating contractors', error, {
      service: 'cache',
    });
  }
}

export async function revalidateJobs() {
  try {
    const { revalidateTag } = await import('next/cache');
    (revalidateTag as (tag: string) => void)(CACHE_TAGS.JOBS);
  } catch (error) {
    logger.error('Error revalidating jobs', error, {
      service: 'cache',
    });
  }
}

export async function revalidateServiceCategories() {
  try {
    const { revalidateTag } = await import('next/cache');
    (revalidateTag as (tag: string) => void)(CACHE_TAGS.CATEGORIES);
  } catch (error) {
    logger.error('Error revalidating categories', error, {
      service: 'cache',
    });
  }
}

export async function revalidateUserProfile(userId: string) {
  try {
    const { revalidateTag } = await import('next/cache');
    (revalidateTag as (tag: string) => void)(CACHE_TAGS.USER_PROFILES);
  } catch (error) {
    logger.error('Error revalidating user profile', error, {
      service: 'cache',
      userId,
    });
  }
}
