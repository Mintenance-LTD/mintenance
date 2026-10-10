'use client';

import { useEffect } from 'react';

/** Handle recovery links redirected to the configured Supabase site root. */
export function PasswordRecoveryRedirect() {
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1));
    if (params.get('type') === 'recovery' && params.get('access_token') && params.get('refresh_token')) {
      // Keep credentials in the fragment, on the same origin, never in logs.
      window.location.replace(`/reset-password${hash}`);
    }
  }, []);
  return null;
}
