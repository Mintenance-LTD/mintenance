'use client';

import { useEffect, useState } from 'react';
import { fetchCurrentUser } from '@/lib/auth-client';
import type { User } from '@mintenance/types';
import { logger } from '@mintenance/shared';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const load = async () => {
      try {
        const current = await fetchCurrentUser(controller.signal);
        if (mounted) {
          setUser(current);
        }
      } catch (err) {
        // Ignore abort errors - these are expected during unmount/route changes
        if (err && typeof err === 'object' && (err as any).name === 'AbortError') {
          return;
        }
        if (mounted) {
          logger.error('[Auth] Failed to load current user', err);
          setError('Unable to load current user');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
      // Use requestIdleCallback or setTimeout to suppress console errors during unmount
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(() => controller.abort(), { timeout: 0 });
      } else {
        setTimeout(() => controller.abort(), 0);
      }
    };
  }, []);

  return { user, loading, error };
}

