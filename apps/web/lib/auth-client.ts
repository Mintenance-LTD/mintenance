'use client';

import type { User } from '@mintenance/types';
import { logger } from './logger';

interface SessionResponse {
  user?: User | null;
  error?: string;
}

export async function fetchCurrentUser(signal?: AbortSignal): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      const message = await response.text().catch(() => 'Failed to load session');
      throw new Error(message || 'Failed to load session');
    }

    const data = (await response.json()) as SessionResponse;
    return data.user ?? null;
  } catch (error) {
    logger.error('[Auth] Failed to fetch current user', error);
    return null;
  }
}

