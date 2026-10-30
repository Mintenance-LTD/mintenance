'use client';

import type { User } from '@mintenance/types';

interface SessionResponse {
  user?: User | null;
  error?: string;
}

export async function fetchCurrentUser(
  signal?: AbortSignal
): Promise<User | null> {
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
    // A temporary failure is not proof that the session is unauthenticated.
    // Let useCurrentUser expose its error state instead of redirecting to login.
    // Never include response bodies, which may contain sensitive diagnostics.
    throw new Error(`Session request failed (HTTP ${response.status})`);
  }

  const data = (await response.json()) as SessionResponse;
  return data.user ?? null;
}
