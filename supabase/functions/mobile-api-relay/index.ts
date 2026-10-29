import { createMobileRelay } from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

Deno.serve(
  createMobileRelay({
    bypassSecret: Deno.env.get('MOBILE_RELAY_VERCEL_BYPASS') ?? '',
    allowedUserIds: (Deno.env.get('MOBILE_BETA_USER_IDS') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
    async verifyUser(token, signal) {
      if (!supabaseUrl || !anonKey) throw new Error('Auth unavailable');
      // Online Auth verification; never authorize from an unverified JWT or user_metadata.
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: anonKey, authorization: `Bearer ${token}` },
        signal,
        redirect: 'error',
      });
      if ([401, 403].includes(response.status)) return null;
      if (!response.ok) throw new Error('Auth unavailable');
      const user = await response.json();
      return typeof user.id === 'string'
        ? { id: user.id, confirmed: !!user.email_confirmed_at }
        : null;
    },
    fetch,
  })
);
