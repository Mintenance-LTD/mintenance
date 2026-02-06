/**
 * Shared Authentication Helper for Supabase Edge Functions
 *
 * SECURITY: All payment edge functions MUST call verifyAuth() before processing.
 * This verifies the caller has a valid Supabase JWT token.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsResponse } from './cors.ts';

export interface AuthResult {
  userId: string;
  email?: string;
  role?: string;
}

/**
 * Verify the request has a valid Supabase auth token.
 * Returns the authenticated user or throws with a 401 response.
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header');
  }

  const token = authHeader.replace('Bearer ', '');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new AuthError('Server misconfiguration: missing Supabase credentials');
  }

  // Create a client scoped to the user's JWT to verify authentication
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError('Invalid or expired authentication token');
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.user_metadata?.role,
  };
}

/**
 * Custom error class for auth failures.
 * Catches should check `instanceof AuthError` to return 401.
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Create a 401 Unauthorized response with CORS headers
 */
export function unauthorizedResponse(req: Request, message: string): Response {
  return createCorsResponse(
    req,
    JSON.stringify({ error: message }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 401,
    }
  );
}
