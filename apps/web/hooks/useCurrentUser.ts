'use client';

import { useEffect, useState } from 'react';
import { fetchCurrentUser } from '@/lib/auth-client';
import type { User } from '@mintenance/types';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const current = await fetchCurrentUser(controller.signal);
        setUser(current);
      } catch (err) {
        console.error('[Auth] Failed to load current user', err);
        setError('Unable to load current user');
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, []);

  return { user, loading, error };
}

