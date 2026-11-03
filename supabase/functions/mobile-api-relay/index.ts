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
      if (typeof user.id !== 'string') return null;
      const access = await fetch(
        `${supabaseUrl}/rest/v1/rpc/mobile_beta_access`,
        {
          method: 'POST',
          headers: {
            apikey: anonKey,
            authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: '{}',
          signal,
          redirect: 'error',
        }
      );
      if (!access.ok) throw new Error('Beta access verification unavailable');
      const approved = await access.json();
      return typeof user.id === 'string'
        ? {
            id: user.id,
            confirmed: !!user.email_confirmed_at,
            ...(typeof approved === 'boolean'
              ? { betaApproved: approved }
              : {}),
          }
        : null;
    },
    fetch,
  })
);
